import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OPENAI_GPT56_MODELS,
  buildOpenAiGpt56RequestDefaults,
  selectOpenAiGpt56Model
} from "../lib/matching/openaiModelConfig";

describe("OpenAI GPT-5.6 model configuration", () => {
  it("marks the setup document as an inactive evaluation draft", () => {
    const setupDocument = readFileSync(
      join(process.cwd(), "docs", "openai-gpt56-setup.md"),
      "utf8"
    );

    expect(setupDocument).toContain("Evaluation draft / inactive / no API connection");
    expect(setupDocument).toContain("not imported by the runtime application");
  });

  it("is not imported by production application modules", () => {
    const productionFiles = [
      join(process.cwd(), "app", "page.tsx"),
      join(process.cwd(), "lib", "matching.ts"),
      join(process.cwd(), "lib", "matching", "aiAdapter.ts")
    ];

    for (const filePath of productionFiles) {
      expect(readFileSync(filePath, "utf8")).not.toContain("openaiModelConfig");
    }
  });

  it("maps RoleFit workload roles to efficient GPT-5.6 tiers", () => {
    expect(selectOpenAiGpt56Model("default")).toBe("gpt-5.6-terra");
    expect(selectOpenAiGpt56Model("quality")).toBe("gpt-5.6-sol");
    expect(selectOpenAiGpt56Model("highVolume")).toBe("gpt-5.6-luna");
  });

  it("keeps explicit model ids available instead of relying on the family alias", () => {
    expect(OPENAI_GPT56_MODELS).toEqual({
      sol: "gpt-5.6-sol",
      terra: "gpt-5.6-terra",
      luna: "gpt-5.6-luna"
    });
  });

  it("uses low reasoning for the efficient default and medium for quality checks", () => {
    expect(buildOpenAiGpt56RequestDefaults("default")).toEqual({
      model: "gpt-5.6-terra",
      reasoning: { effort: "low" },
      text: { verbosity: "medium" }
    });

    expect(buildOpenAiGpt56RequestDefaults("quality")).toEqual({
      model: "gpt-5.6-sol",
      reasoning: { effort: "medium" },
      text: { verbosity: "medium" }
    });
  });
});
