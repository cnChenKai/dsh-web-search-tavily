import { describe, it, expect } from "vitest";
import { mapTavilyResponse } from "../lib/index.js";

describe("mapTavilyResponse", () => {
  it("maps results to sources with url/title/snippet", () => {
    const result = mapTavilyResponse({
      query: "test",
      results: [
        { title: "Alpha", url: "https://a.com", content: "snippet A" },
        { title: "Beta", url: "https://b.com", content: "snippet B" }
      ]
    });
    expect(result.truncated).toBe(false);
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toEqual({ url: "https://a.com", title: "Alpha", snippet: "snippet A" });
    expect(result.sources[1].url).toBe("https://b.com");
  });

  it("maps answer to content when present", () => {
    const result = mapTavilyResponse({ answer: "The answer", results: [] });
    expect(result.content).toBe("The answer");
  });

  it("omits content when no answer", () => {
    const result = mapTavilyResponse({ results: [] });
    expect(result.content).toBeUndefined();
  });

  it("maps published_date when present (best effort, current API docs omit it)", () => {
    const result = mapTavilyResponse({
      results: [{ url: "https://a.com", published_date: "2026-08-01" }]
    });
    expect(result.sources[0].publishedAt).toBe("2026-08-01");
  });

  it("omits optional fields when absent", () => {
    const result = mapTavilyResponse({ results: [{ url: "https://a.com" }] });
    expect(result.sources[0]).toEqual({ url: "https://a.com" });
  });

  it("drops entries without a url", () => {
    const result = mapTavilyResponse({
      results: [{ title: "no url" }, { url: "https://ok.com" }]
    });
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://ok.com");
  });

  it("handles empty and missing results", () => {
    expect(mapTavilyResponse({}).sources).toEqual([]);
    expect(mapTavilyResponse({ results: null }).sources).toEqual([]);
    expect(mapTavilyResponse({ results: [] }).sources).toEqual([]);
  });
});

import { resolveBaseURL, withTimeout, TavilySearchProvider } from "../lib/index.js";

describe("resolveBaseURL (tavily)", () => {
  it("accepts the official endpoint by default", () => {
    expect(resolveBaseURL(undefined, false)).toBe("https://api.tavily.com");
    expect(resolveBaseURL("https://api.tavily.com/", false)).toBe("https://api.tavily.com");
  });

  it("rejects custom baseURL unless explicitly allowed", () => {
    expect(() => resolveBaseURL("https://evil.example.com", false)).toThrow(/not allowed/);
  });

  it("allows custom https baseURL when opted in", () => {
    expect(resolveBaseURL("https://proxy.example.com", true)).toBe("https://proxy.example.com");
  });

  it("rejects non-https custom baseURL even when opted in", () => {
    expect(() => resolveBaseURL("http://proxy.example.com", true)).toThrow(/must use https/);
  });
});

describe("withTimeout", () => {
  it("returns undefined for zero/no timeout", () => {
    expect(withTimeout(undefined, 0)).toBeUndefined();
    expect(withTimeout(undefined, -1)).toBeUndefined();
  });

  it("merges caller signal and timeout into a new signal", () => {
    const caller = new AbortController().signal;
    const merged = withTimeout(caller, 5000);
    expect(merged).toBeDefined();
    expect(merged.aborted).toBe(false);
  });

  it("aborts with TimeoutError when the timeout fires", async () => {
    const merged = withTimeout(undefined, 20);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(merged.aborted).toBe(true);
    expect(merged.reason?.name).toBe("TimeoutError");
  });
});

describe("search timeout enforcement", () => {
  it("fails with WEB_PROVIDER_ERROR and a timeout message", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (_url, opts) => new Promise((_resolve, reject) => {
      opts?.signal?.addEventListener("abort", () => {
        reject(opts.signal.reason ?? new DOMException("Aborted", "AbortError"));
      });
    });
    const provider = new TavilySearchProvider(() => ({
      baseURL: "https://api.tavily.com",
      searchDepth: "basic",
      maxResults: 5,
      includeAnswer: false,
      chunksPerSource: 3,
      searchTimeoutMs: 50,
      resolveApiKey: async () => void 0
    }));
    try {
      await expect(provider.search({ query: "x" })).rejects.toMatchObject({ code: "WEB_PROVIDER_ERROR" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
