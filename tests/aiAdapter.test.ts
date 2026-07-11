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

function validSuggestion() {
  return {
    provider: "mock" as const,
    rubricCandidates: [],
    evidenceMatches: [],
    riskFlags: [],
    confidence: "근거 충분" as const
  };
}

describe("AI matching adapter boundary", () => {
  it("returns schema-safe suggestions without deciding final score", async () => {
    const adapter = new MockAiMatchingAdapter();
    const controller = new AbortController();

    const result = await adapter.suggest(adapterInput, {
      signal: controller.signal,
      requestId: "test-request"
    });

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

    expect(validateAiMatchingSuggestion(invalid)).toEqual({
      valid: false,
      reasonCode: "FORBIDDEN_DECISION_FIELD"
    });
    expect(sanitizeAiMatchingSuggestion(invalid)).toBeNull();
  });

  it("rejects a response provider that differs from the adapter provider", () => {
    const result = validateAiMatchingSuggestion(
      { ...validSuggestion(), provider: "openai" },
      "mock"
    );

    expect(result).toEqual({ valid: false, reasonCode: "PROVIDER_MISMATCH" });
  });

  it("rejects suggestion arrays that exceed their bounded limits", () => {
    const result = validateAiMatchingSuggestion({
      ...validSuggestion(),
      riskFlags: Array.from({ length: 13 }, (_, index) => `risk-${index}`)
    });

    expect(result).toEqual({ valid: false, reasonCode: "OUTPUT_TOO_LARGE" });
  });

  it("rejects suggestion strings that exceed their bounded limits", () => {
    const result = validateAiMatchingSuggestion({
      ...validSuggestion(),
      rubricCandidates: [
        {
          title: "x".repeat(201),
          category: "기술 역량",
          required: true,
          rationale: "근거"
        }
      ]
    });

    expect(result).toEqual({ valid: false, reasonCode: "OUTPUT_TOO_LARGE" });
  });

  it("rejects a serialized suggestion larger than 64KB", () => {
    const result = validateAiMatchingSuggestion({
      ...validSuggestion(),
      riskFlags: ["x".repeat(64 * 1024)]
    });

    expect(result).toEqual({ valid: false, reasonCode: "OUTPUT_TOO_LARGE" });
  });

  it("rejects none evidence that still contains a sentence", () => {
    const result = validateAiMatchingSuggestion({
      ...validSuggestion(),
      evidenceMatches: [
        {
          criterionTitle: "React 역량",
          evidenceType: "none",
          sentence: "React로 HR 리포트 화면을 개발했습니다.",
          rationale: "근거 없음"
        }
      ]
    });

    expect(result).toEqual({ valid: false, reasonCode: "INVALID_SCHEMA" });
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
    expect(report.adapterMetadata?.reasonCode).toBe("ADAPTER_ERROR");
    expect(JSON.stringify(report)).not.toContain("adapter unavailable");
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
    expect(report.adapterMetadata?.reasonCode).toBe("FORBIDDEN_DECISION_FIELD");
  });

  it("falls back when adapter fabricates evidence that is not in the candidate document", async () => {
    const baseline = analyzeStructuredMatch(analysisInput);
    const report = await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      adapter: {
        provider: "mock",
        async suggest() {
          return {
            provider: "mock",
            rubricCandidates: [],
            evidenceMatches: [
              {
                criterionTitle: "React 기반 HR 도구 개발",
                evidenceType: "direct",
                sentence: "후보자는 존재하지 않는 사내 플랫폼을 5년 운영했습니다.",
                rationale: "문서에 없는 근거"
              }
            ],
            riskFlags: [],
            confidence: "근거 충분"
          };
        }
      }
    });

    expect(report.overallMatch.score).toBe(baseline.overallMatch.score);
    expect(report.adapterMetadata?.status).toBe("fallback");
    expect(report.adapterMetadata?.reasonCode).toBe("EVIDENCE_NOT_FOUND");
  });

  it("aborts the adapter request and falls back with a fixed reason code on timeout", async () => {
    let observedSignal: AbortSignal | undefined;
    const baseline = analyzeStructuredMatch(analysisInput);
    const report = await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      adapterTimeoutMs: 10,
      adapter: {
        provider: "mock",
        async suggest(_input, context) {
          observedSignal = context.signal;
          return new Promise((_, reject) => {
            context.signal.addEventListener("abort", () =>
              reject(new Error("private provider endpoint failed"))
            );
          });
        }
      }
    });

    expect(observedSignal?.aborted).toBe(true);
    expect(report.overallMatch.score).toBe(baseline.overallMatch.score);
    expect(report.adapterMetadata).toMatchObject({
      status: "fallback",
      provider: "mock",
      reasonCode: "TIMEOUT"
    });
    expect(JSON.stringify(report)).not.toContain("private provider endpoint failed");
  });

  it("preserves validated adapter suggestions in shadow mode without changing rule scores", async () => {
    const baseline = analyzeStructuredMatch(analysisInput);
    const report = await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      adapter: new MockAiMatchingAdapter()
    });

    expect(report.overallMatch).toEqual(baseline.overallMatch);
    expect(report.criterionAssessments).toEqual(baseline.criterionAssessments);
    expect(report.aiShadowReview.status).toBe("completed");
    expect(report.aiShadowReview.provider).toBe("mock");
    expect(report.aiShadowReview.rubricCandidates.length).toBeGreaterThan(0);
    expect(report.aiShadowReview.evidenceMatches.length).toBeGreaterThan(0);
  });

  it("keeps each candidate resume isolated in separate adapter calls", async () => {
    const observedResumes: string[] = [];
    const adapter = {
      provider: "mock" as const,
      async suggest(input: typeof adapterInput) {
        observedResumes.push(input.candidateInfo.candidateResume);
        return validSuggestion();
      }
    };

    await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      candidateInfo: { candidateResume: "후보자 A 전용 경력", referenceEmployeeResume: "" },
      adapter
    });
    await analyzeStructuredMatchWithAdapter({
      ...analysisInput,
      candidateInfo: { candidateResume: "후보자 B 전용 경력", referenceEmployeeResume: "" },
      adapter
    });

    expect(observedResumes).toEqual(["후보자 A 전용 경력", "후보자 B 전용 경력"]);
  });

  it("does not call an adapter during default rule-based analysis", () => {
    const report = analyzeStructuredMatch(analysisInput);

    expect(report.adapterMetadata).toEqual({ status: "notUsed" });
    expect(report.aiShadowReview).toEqual({
      status: "notUsed",
      rubricCandidates: [],
      evidenceMatches: [],
      riskFlags: []
    });
  });
});
