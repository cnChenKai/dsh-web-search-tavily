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
