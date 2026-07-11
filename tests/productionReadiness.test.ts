import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production readiness gates", () => {
  it("documents company-only policy gates before real data storage", () => {
    const document = readFileSync("docs/production-readiness-gates.md", "utf8");

    expect(document).toContain("실제 CV 사용 금지");
    expect(document).toContain("SSO");
    expect(document).toContain("Object Storage");
    expect(document).toContain("보존기간");
    expect(document).toContain("legal hold");
  });

  it("configures baseline response hardening without inventing a CSP", () => {
    const config = readFileSync("next.config.ts", "utf8");

    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("X-Frame-Options");
    expect(config).toContain("Referrer-Policy");
    expect(config).not.toContain("Content-Security-Policy");
  });
});
