import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("DSH compatibility", () => {
  it("declares the versions provided by DSH 0.2.2-rc.1", () => {
    expect(manifest.engines.dsh).toBe("0.2.2-rc.1");
    expect(manifest.engines.node).toBe(">=24.9.0");
    expect(manifest.peerDependencies).toMatchObject({
      "@deepseek-ai/dsh-credentials": "0.2.2-rc.1",
      "@deepseek-ai/dsh-launch-environment": "0.2.2-rc.1",
      "@deepseek-ai/dsh-web": "0.2.2-rc.1",
      "@deepseek-ai/schemastery": "~3.19.0"
    });
  });
});
