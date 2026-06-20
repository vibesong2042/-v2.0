import { describe, expect, it } from "vitest";

import { DEFAULT_WEIGHT_SET } from "../lib/matching";
import { canRunAnalysis, getStepState } from "../lib/workflow";

describe("workflow validation", () => {
  it("blocks analysis when the required candidate resume is missing", () => {
    const result = canRunAnalysis({
      hasJobDescription: true,
      hasCandidateResume: false,
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("지원자 CV/이력서를 등록하세요.");
  });

  it("blocks analysis when enabled weights do not total 100", () => {
    const result = canRunAnalysis({
      hasJobDescription: true,
      hasCandidateResume: true,
      weights: {
        ...DEFAULT_WEIGHT_SET,
        items: DEFAULT_WEIGHT_SET.items.map((item) =>
          item.code === "custom" ? { ...item, weight: 10 } : item
        )
      }
    });

    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toContain("100%");
  });

  it("allows analysis when required documents and weights are valid", () => {
    const result = canRunAnalysis({
      hasJobDescription: true,
      hasCandidateResume: true,
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it("marks previous steps as complete and the selected step as active", () => {
    expect(getStepState(0, 2)).toBe("complete");
    expect(getStepState(2, 2)).toBe("active");
    expect(getStepState(3, 2)).toBe("upcoming");
  });
});
