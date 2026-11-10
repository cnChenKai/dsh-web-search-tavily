import { describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { composeEntries, loadOverlayPatches } from "@deepseek-ai/dsh-app-boot";
import { Context } from "@deepseek-ai/cordis";
import { WebRuntime } from "@deepseek-ai/dsh-web";
import * as tavily from "../lib/index.js";

const bundle = fileURLToPath(new URL("../cordis.patch.yml", import.meta.url));

describe("DSH bundle composition", () => {
  it("registers Tavily without replacing pre-existing web configuration", () => {
    const original = { searchProvider: "existing-search", fetchProvider: "existing-fetch", custom: { retained: true } };
    const patches = loadOverlayPatches("dsh", bundle);
    const rows = composeEntries([[{ insert: [{ id: "web", name: "@deepseek-ai/dsh-web", config: original }] }], patches]);
    expect(rows.find(row => row.id === "web").config).toEqual(original);
    expect(rows.find(row => row.id === "web-search-tavily")?.name).toBe("dsh-web-search-tavily");
  });

  it("routes through Tavily and the existing fetch provider with multiple fetch providers", async () => {
    const original = { searchProvider: "tavily", fetchProvider: "existing-fetch" };
    const rows = composeEntries([
      [{ insert: [{ id: "web", name: "@deepseek-ai/dsh-web", config: original }] }],
      loadOverlayPatches("dsh", bundle)
    ]);
    const config = rows.find(row => row.id === "web").config;
    const providerConfig = rows.find(row => row.id === "web-search-tavily").config;
    const ctx = new Context();
    const originalFetch = globalThis.fetch;
    vi.stubEnv("TAVILY_API_KEY", "");
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ results: [{ url: "https://result.example", title: "Result" }] }), { status: 200 });
    };
    try {
      await ctx.plugin(WebRuntime, config);
      await ctx.plugin(tavily, providerConfig);
      for (const id of ["existing-fetch", "alternative-fetch"]) {
        ctx.web.registerFetchProvider({ id, available: () => true, fetch: async () => ({ provider: id }) });
      }
      expect(await ctx.web.fetch({ url: "https://example.org" })).toEqual({ provider: "existing-fetch" });
      const result = await ctx.web.search({ query: "integration" });
      expect(result.sources[0].url).toBe("https://result.example");
      expect(request.url).toBe("https://api.tavily.com/search");
      expect(request.options.headers["x-tavily-access-mode"]).toBe("keyless");
    } finally {
      globalThis.fetch = originalFetch;
      vi.unstubAllEnvs();
      await ctx.fiber.dispose();
    }
  });
});
