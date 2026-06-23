import type { CriterionAssessment, MatchConfidence } from "../matching";

export function buildMatchConfidence(assessments: CriterionAssessment[]): MatchConfidence {
  const supportedCount = assessments.filter(
    (item) => item.evidence.type !== "none" && item.score >= 65
  ).length;
  const noneCount = assessments.filter((item) => item.evidence.type === "none").length;
  const requiredMissing = missingRequiredCount(assessments);
  const weakRequired = assessments.filter(
    (item) => item.criterion.required && item.score < 65
  ).length;
  const ratio = assessments.length === 0 ? 0 : supportedCount / assessments.length;

  if (
    ratio >= 0.6 &&
    requiredMissing === 0 &&
    weakRequired === 0 &&
    noneCount <= 1
  ) {
    return {
      level: "근거 충분",
      rationale: "핵심 항목 대부분에서 문서 근거가 확인됩니다."
    };
  }

  if (
    noneCount >= Math.ceil(assessments.length / 2) ||
    requiredMissing > 0 ||
    weakRequired > 0
  ) {
    return {
      level: "문서 근거 부족",
      rationale: "필수 항목 또는 다수 핵심 항목의 근거가 문서상 확인되지 않습니다."
    };
  }

  return {
    level: "일부 확인 필요",
    rationale: "일부 항목은 간접 근거만 있어 인터뷰 확인이 필요합니다."
  };
}

export function missingRequiredCount(assessments: CriterionAssessment[]) {
  return assessments.filter(
    (assessment) => assessment.criterion.required && assessment.evidence.type === "none"
  ).length;
}
