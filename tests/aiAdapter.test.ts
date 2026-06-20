import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  analyzeStructuredMatch,
  analyzeStructuredMatchWithAdapter
} from "../lib/matching";
import {
  MockAiMatchingAdapter,
  sanitizeAiMatchingSuggestion,
  validateAiMatchingSuggestion
} from "../lib/matching/aiAdapter";

const adapterInput = {
  coreCriteria: {
    jobDescription: "필수: React 기반 HR 도구 개발",
    additionalMaterial: "성과: 검토 리포트 자동화"
  },
  candidateInfo: {
    candidateResume: "React로 HR 리포트 화면을 개발했습니다.",
    referenceEmployeeResume: ""
  },
  supportingCriteria: {
    teamStrategy: "채용 검토 자동화",
    managerMbo: "리포트 품질 개선",
    subjectiveOpinion: "근거 중심 설명 선호"
  },
  language: "ko" as const
};

const analysisInput = {
  ...adapterInput,
  weights: DEFAULT_WEIGHT_SET
};

describe("AI matching adapter boundary", () => {
  it("returns schema-safe suggestions without deciding final score", async () => {
    const adapter = new MockAiMatchingAdapter();

    const result = await adapter.suggest(adapterInput);

    expect(result.provider).toBe("mock");
    expect(result.rubricCandidates.length).toBeGreaterThan(0);
    expect(result.evidenceMatches.length).toBeGreaterThan(0);
    expect(result.finalScore).toBeUndefined();
    expect(result.hiringDecision).toBeUndefined();
    expect(validateAiMatchingSuggestion(result).valid).toBe(true);
  });

  it("rejects adapter suggestions that try to decide score or hiring outcome", () => {
    const invalid = {
      provider: "openai",
      rubricCandidates: [],
      evidenceMatches: [],
      riskFlags: [],
      confidence: "근거 충분",
      finalScore: 95,
      hiringDecision: "합격"
    };

    expect(validateAiMatchingSuggestion(invalid).valid).toBe(false);
    expect(sanitizeAiMatchingSuggestion(invalid)).toBeNull();
  });

  it("falls back to rule-based analysis when adapter throws", async () => {
    const baseline = analyzeStructuredMatch(analysisInput);
    const report = await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      adapter: {
        provider: "mock",
        async suggest() {
          throw new Error("adapter unavailable");
        }
      }
    });

    expect(report.overallMatch.score).toBe(baseline.overallMatch.score);
    expect(report.adapterMetadata?.status).toBe("fallback");
    expect(report.adapterMetadata?.reason).toContain("adapter unavailable");
  });

  it("falls back to rule-based analysis when adapter returns invalid schema", async () => {
    const baseline = analyzeStructuredMatch(analysisInput);
    const report = await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      adapter: {
        provider: "mock",
        async suggest() {
          return {
            provider: "mock",
            rubricCandidates: [],
            evidenceMatches: [],
            riskFlags: [],
            confidence: "근거 충분",
            finalScore: 99
          } as never;
        }
      }
    });

    expect(report.overallMatch.score).toBe(baseline.overallMatch.score);
    expect(report.adapterMetadata?.status).toBe("fallback");
    expect(report.adapterMetadata?.reason).toContain("Invalid adapter suggestion");
  });

  it("does not call an adapter during default rule-based analysis", () => {
    const report = analyzeStructuredMatch(analysisInput);

    expect(report.adapterMetadata).toEqual({ status: "notUsed" });
  });
});
