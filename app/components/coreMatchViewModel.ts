import type { CriterionAssessment, EvidenceMatch } from "../../lib/matching";

export type CoreMatchStatus = "strong" | "review" | "missing";

const MAX_EVIDENCE_DISPLAY_LENGTH = 2_000;
const EVIDENCE_OMISSION_NOTICE = "원문이 길어 일부 생략되었습니다.";

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

export function formatCoreEvidenceForDisplay(evidence: string) {
  if (evidence.length <= MAX_EVIDENCE_DISPLAY_LENGTH) {
    return evidence;
  }

  const candidate = evidence.slice(0, MAX_EVIDENCE_DISPLAY_LENGTH);
  const lastWhitespace = candidate.search(/\s+\S*$/u);
  const cutAt = lastWhitespace >= MAX_EVIDENCE_DISPLAY_LENGTH * 0.8
    ? lastWhitespace
    : MAX_EVIDENCE_DISPLAY_LENGTH;

  return `${candidate.slice(0, cutAt).trimEnd()}\n${EVIDENCE_OMISSION_NOTICE}`;
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
