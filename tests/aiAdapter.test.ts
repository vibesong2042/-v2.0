import { describe, expect, it } from "vitest";

import { MockAiMatchingAdapter } from "../lib/matching/aiAdapter";

describe("AI matching adapter boundary", () => {
  it("returns schema-safe suggestions without deciding final score", async () => {
    const adapter = new MockAiMatchingAdapter();

    const result = await adapter.suggest({
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
      language: "ko"
    });

    expect(result.provider).toBe("mock");
    expect(result.rubricCandidates.length).toBeGreaterThan(0);
    expect(result.evidenceMatches.length).toBeGreaterThan(0);
    expect(result.finalScore).toBeUndefined();
    expect(result.hiringDecision).toBeUndefined();
  });
});
