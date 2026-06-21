import type { CriterionAssessment, EvidenceMatch } from "../../lib/matching";

export type CoreMatchStatus = "strong" | "review" | "missing";

export type CoreMatchSummary = {
  strong: number;
  review: number;
  missing: number;
  requiredUnmet: number;
};

export function getCoreMatchStatus(
  score: number,
  evidenceType: EvidenceMatch["type"]
): CoreMatchStatus {
  if (evidenceType === "none") {
    return "missing";
  }

  if (score >= 75) {
    return "strong";
  }

  if (score >= 55) {
    return "review";
  }

  return "missing";
}

export function getCoreMatchLabel(status: CoreMatchStatus) {
  if (status === "strong") return "강한 매칭";
  if (status === "review") return "추가 확인";
  return "문서상 확인 불가";
}

export function getCoreMatchIcon(status: CoreMatchStatus) {
  if (status === "strong") return "✓";
  if (status === "review") return "!";
  return "×";
}

export function summarizeCoreMatches(assessments: CriterionAssessment[]): CoreMatchSummary {
  return assessments.reduce<CoreMatchSummary>(
    (summary, assessment) => {
      const status = getCoreMatchStatus(assessment.score, assessment.evidence.type);

      summary[status] += 1;

      if (assessment.criterion.required && status !== "strong") {
        summary.requiredUnmet += 1;
      }

      return summary;
    },
    { strong: 0, review: 0, missing: 0, requiredUnmet: 0 }
  );
}

export function sortCoreMatchCards(assessments: CriterionAssessment[]) {
  return [...assessments].sort((left, right) => {
    if (left.criterion.required !== right.criterion.required) {
      return left.criterion.required ? -1 : 1;
    }

    return left.score - right.score;
  });
}
