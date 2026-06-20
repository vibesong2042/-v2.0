import { ScoringWeightSet, validateWeightSet } from "./matching";

export type StepState = "complete" | "active" | "upcoming";

export function canRunAnalysis(input: {
  hasJobDescription: boolean;
  hasCandidateResume: boolean;
  weights: ScoringWeightSet;
}) {
  const reasons: string[] = [];
  const weightValidation = validateWeightSet(input.weights);

  if (!input.hasJobDescription) {
    reasons.push("직무기술서를 등록하세요.");
  }

  if (!input.hasCandidateResume) {
    reasons.push("지원자 CV/이력서를 등록하세요.");
  }

  if (!weightValidation.valid) {
    reasons.push(weightValidation.message);
  }

  return {
    ok: reasons.length === 0,
    reasons
  };
}

export function getStepState(stepIndex: number, activeStepIndex: number): StepState {
  if (stepIndex < activeStepIndex) {
    return "complete";
  }

  if (stepIndex === activeStepIndex) {
    return "active";
  }

  return "upcoming";
}
