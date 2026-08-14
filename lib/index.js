import z from "@deepseek-ai/schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { WebError } from "@deepseek-ai/dsh-web";

/**
 * Tavily-backed search provider for the web capability seam (ctx.web).
 * Calls Tavily Search (POST {baseURL}/search).
 *
 * Keyless mode (official, https://docs.tavily.com/documentation/keyless):
 * when no API key is configured the provider sends the
 * "X-Tavily-Access-Mode: keyless" header instead - no account, no key,
 * responses identical to keyed ones. A key (literal config, the credentials
 * store, or $TAVILY_API_KEY) upgrades the request to the keyed tier and is
 * resolved fresh for every search.
 */
const TAVILY_PROVIDER_ID = "tavily";
const TAVILY_DEFAULT_BASE_URL = "https://api.tavily.com";
const DEFAULT_API_KEY_ENV = "TAVILY_API_KEY";
const USER_AGENT = "deepseek-harness/0.1.0";

export const name = "web-search-tavily";
export const inject = ["web"];

export const Config = z.object({
  apiKey: z.string().role("secret"),
  apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV),
  baseURL: z.string(),
  // Official guidance: "basic" for quick lookups (1 credit), "advanced" for
  // source discovery / high precision (2 credits). API default is "basic".
  searchDepth: z.union(["advanced", "basic", "fast", "ultra-fast"]).default("basic"),
  // Official guidance: max_results=5 focused answers, 10 broader research.
  maxResults: z.number().step(1).min(1).max(20).default(5),
  // Official agent guide says avoid include_answer unless a quick answer seed
  // is needed - verify results against sources regardless.
  includeAnswer: z.boolean().default(false),
  // Relevant chunks per source (1-3); richer snippets for the model.
  chunksPerSource: z.number().step(1).min(1).max(3).default(3),
  searchTimeoutMs: z.number().step(1).min(1).default(30000)
});

function resolveOptions(ctx, config) {
  const apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV);
  const literalApiKey = config.apiKey !== void 0 && config.apiKey.length > 0 ? config.apiKey : void 0;
  return {
    ...(literalApiKey === void 0 ? {} : { apiKey: literalApiKey }),
    resolveApiKey: async () => {
      const credentials = ctx.get("credentials");
      if (credentials !== void 0) return (await credentials.resolve(apiKeyEnv))?.value;
      const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv);
      return ambient !== void 0 && ambient.value.length > 0 ? ambient.value : void 0;
    },
    apiKeyEnv,
    baseURL: config.baseURL ?? TAVILY_DEFAULT_BASE_URL,
    searchDepth: config.searchDepth ?? "basic",
    maxResults: config.maxResults ?? 5,
    includeAnswer: config.includeAnswer ?? false,
    chunksPerSource: config.chunksPerSource ?? 3,
    searchTimeoutMs: config.searchTimeoutMs ?? 30000
  };
}

class TavilySearchProvider {
  constructor(options) {
    this.options = options;
  }
  get id() {
    return TAVILY_PROVIDER_ID;
  }
  /** Keyless mode is always usable, so the provider is always available. */
  available() {
    return true;
  }
  async search(request, signal) {
    const options = this.options();
    const apiKey = await this.apiKey(options, signal);
    throwIfSearchAborted(signal);
    const endpoint = options.baseURL.replace(/\/+$/u, "") + "/search";
    const headers = {
      "content-type": "application/json",
      "accept": "application/json",
      "user-agent": USER_AGENT
    };
    if (apiKey !== void 0) headers["authorization"] = "Bearer " + apiKey;
    else headers["x-tavily-access-mode"] = "keyless";
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        redirect: "error",
        headers,
        body: JSON.stringify({
          query: request.query,
          search_depth: options.searchDepth,
          max_results: request.maxResults ?? options.maxResults,
          include_answer: options.includeAnswer,
          chunks_per_source: options.chunksPerSource,
          include_raw_content: false,
          include_images: false
        }),
        ...(signal !== void 0 ? { signal } : {})
      });
    } catch (error) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
      throw new WebError("Tavily search request failed: " + String(error), "WEB_PROVIDER_ERROR", { cause: error });
    }
    if (!response.ok) {
      throw new WebError(await apiErrorMessage(response, "Tavily"), "WEB_PROVIDER_ERROR");
    }
    try {
      return mapTavilyResponse(await response.json());
    } catch (error) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
      if (error instanceof WebError) throw error;
      throw new WebError("Tavily returned an unprocessable response body: " + String(error), "WEB_PROVIDER_ERROR", { cause: error });
    }
  }
  async apiKey(options, signal) {
    throwIfSearchAborted(signal);
    if (options.apiKey !== void 0 && options.apiKey.length > 0) return options.apiKey;
    let resolved;
    try {
      resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(void 0), signal);
    } catch (error) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
      throw new WebError("Tavily search credential resolution failed: " + String(error), "WEB_PROVIDER_ERROR", { cause: error });
    }
    // No key at all -> keyless mode (undefined; the caller sends the keyless
    // header). This is the zero-setup path.
    if (resolved !== void 0 && resolved.length > 0) return resolved;
    return void 0;
  }
}

function mapTavilyResponse(body) {
  const results = Array.isArray(body?.results) ? body.results : [];
  const sources = results
    .filter((item) => typeof item?.url === "string" && item.url.length > 0)
    .map((item) => {
      const source = { url: item.url };
      if (typeof item.title === "string" && item.title.length > 0) source.title = item.title;
      if (typeof item.content === "string" && item.content.length > 0) source.snippet = item.content;
      // Tavily docs no longer list published_date on results; keep best-effort.
      if (typeof item.published_date === "string" && item.published_date.length > 0) source.publishedAt = item.published_date;
      return source;
    });
  const result = { sources, truncated: false };
  // include_answer defaults to false, so answer is usually absent; map it
  // when the caller opted in.
  if (typeof body?.answer === "string" && body.answer.length > 0) result.content = body.answer;
  return result;
}

export function apply(ctx, config) {
  let current = () => config;
  ctx.web.registerSearchProvider(new TavilySearchProvider(() => resolveOptions(ctx, current())));
}

function abortable(operation, signal) {
  if (signal === void 0) return operation;
  if (signal.aborted) return Promise.reject(searchAborted(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(searchAborted(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then((value) => {
      signal.removeEventListener("abort", onAbort);
      resolve(value);
    }, (error) => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error(String(error).replace(/^Error: /u, ""), { cause: error }));
    });
  });
}

function throwIfSearchAborted(signal) {
  if (signal?.aborted === true) throw searchAborted(signal);
}

function searchAborted(signal, fallback) {
  return new WebError("Tavily search aborted", "WEB_ABORTED", { cause: signal?.aborted === true ? signal.reason : fallback });
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function apiErrorMessage(response, provider) {
  let message = provider + " API error (HTTP " + response.status + ")";
  try {
    const parsed = await response.json();
    const detail = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? parsed.message;
    if (detail !== void 0 && detail.length > 0) message = detail;
  } catch {
    // non-JSON error body: keep the status-line message
  }
  return message;
}

export { TAVILY_PROVIDER_ID, TAVILY_DEFAULT_BASE_URL, DEFAULT_API_KEY_ENV, TavilySearchProvider, mapTavilyResponse };
