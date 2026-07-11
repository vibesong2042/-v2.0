import { describe, expect, it } from "vitest";

import type { CriterionAssessment, EvidenceMatch, RubricCriterion } from "../lib/matching";
import {
  formatCoreEvidenceForDisplay,
  getCoreMatchStatus,
  sortCoreMatchCards,
  summarizeCoreMatches
} from "../app/components/coreMatchViewModel";

function assessment({
  score,
  required,
  evidenceType,
  title
}: {
  score: number;
  required: boolean;
  evidenceType: EvidenceMatch["type"];
  title: string;
}): CriterionAssessment {
  const criterion: RubricCriterion = {
    id: title,
    category: "필수 역량",
    title,
    description: title,
    importance: required ? 5 : 3,
    required,
    evidenceNeed: "높음",
    keywords: [title],
    synonyms: []
  };

  return {
    criterion,
    score,
    keywordScore: score,
    semanticScore: score,
    experienceScore: score,
    evidenceQualityScore: score,
    scoreTrace: {
      keywordScore: score,
      semanticScore: score,
      experienceScore: score,
      evidenceQualityScore: score,
      rawScore: score,
      finalScore: score,
      capApplied: false,
      capReason: "none"
    },
    evidence: {
      type: evidenceType,
      sentence: evidenceType === "none" ? "" : `${title} 관련 근거 문장`,
      confidence: evidenceType === "direct" ? "high" : "medium"
    },
    supportingEvidence: [],
    missing: evidenceType === "none" ? [`${title}: 문서상 확인 불가`] : [],
    interviewQuestion: `${title} 경험을 설명해 주세요.`
  };
}

describe("core match view model", () => {
  it("keeps evidence up to 2,000 characters unchanged", () => {
    const evidence = "A".repeat(2_000);

    expect(formatCoreEvidenceForDisplay(evidence)).toBe(evidence);
  });

  it("truncates oversized evidence at a word boundary without mutating the source", () => {
    const evidence = `${"경험 ".repeat(800)}마지막 원문`;
    const original = evidence;
    const displayed = formatCoreEvidenceForDisplay(evidence);

    expect(displayed.length).toBeLessThan(evidence.length);
    expect(displayed).toContain("원문이 길어 일부 생략되었습니다.");
    expect(displayed).not.toContain("마지막 원문");
    expect(evidence).toBe(original);
  });

  it("prioritizes missing evidence over a high score", () => {
    expect(getCoreMatchStatus(90, "none")).toBe("missing");
  });

  it("classifies score bands for visual status", () => {
    expect(getCoreMatchStatus(75, "direct")).toBe("strong");
    expect(getCoreMatchStatus(55, "indirect")).toBe("review");
    expect(getCoreMatchStatus(54, "direct")).toBe("missing");
  });

  it("summarizes status counts including required unmet items", () => {
    const summary = summarizeCoreMatches([
      assessment({ title: "강점", score: 82, required: true, evidenceType: "direct" }),
      assessment({ title: "확인", score: 63, required: true, evidenceType: "indirect" }),
      assessment({ title: "누락", score: 91, required: false, evidenceType: "none" })
    ]);

    expect(summary).toEqual({
      strong: 1,
      review: 1,
      missing: 1,
      requiredUnmet: 1
    });
  });

  it("sorts required items first and lower scores first within each group", () => {
    const sorted = sortCoreMatchCards([
      assessment({ title: "선택 높은 점수", score: 90, required: false, evidenceType: "direct" }),
      assessment({ title: "필수 높은 점수", score: 88, required: true, evidenceType: "direct" }),
      assessment({ title: "필수 낮은 점수", score: 42, required: true, evidenceType: "none" }),
      assessment({ title: "선택 낮은 점수", score: 50, required: false, evidenceType: "direct" })
    ]);

    expect(sorted.map((item) => item.criterion.title)).toEqual([
      "필수 낮은 점수",
      "필수 높은 점수",
      "선택 낮은 점수",
      "선택 높은 점수"
    ]);
  });
});
