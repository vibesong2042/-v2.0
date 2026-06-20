import type {
  CandidateInputs,
  CoreCriteriaInputs,
  ReportLanguage,
  SupportingCriteriaInputs
} from "../matching";
import { buildEvaluationRubric } from "./rubric";
import { evaluateCriterionEvidence } from "./evidence";

export type AiMatchingProvider = "mock" | "openai" | "anthropic" | "google";

export type AiRubricSuggestion = {
  title: string;
  category: string;
  required: boolean;
  rationale: string;
};

export type AiEvidenceSuggestion = {
  criterionTitle: string;
  evidenceType: "direct" | "indirect" | "none";
  sentence: string;
  rationale: string;
};

export type AiMatchingSuggestion = {
  provider: AiMatchingProvider;
  rubricCandidates: AiRubricSuggestion[];
  evidenceMatches: AiEvidenceSuggestion[];
  riskFlags: string[];
  confidence: "근거 충분" | "일부 확인 필요" | "문서 근거 부족";
  finalScore?: never;
  hiringDecision?: never;
};

export type AiMatchingValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export type AiMatchingAdapterInput = {
  coreCriteria: CoreCriteriaInputs;
  candidateInfo: CandidateInputs;
  supportingCriteria: SupportingCriteriaInputs;
  language: ReportLanguage;
};

export interface AiMatchingAdapter {
  provider: AiMatchingProvider;
  suggest(input: AiMatchingAdapterInput): Promise<AiMatchingSuggestion>;
}

export function validateAiMatchingSuggestion(value: unknown): AiMatchingValidationResult {
  if (!isRecord(value)) {
    return { valid: false, error: "Adapter suggestion must be an object." };
  }

  if ("finalScore" in value || "hiringDecision" in value) {
    return {
      valid: false,
      error: "Adapter suggestion must not include finalScore or hiringDecision."
    };
  }

  if (!isProvider(value.provider)) {
    return { valid: false, error: "Adapter suggestion provider is invalid." };
  }

  if (!Array.isArray(value.rubricCandidates)) {
    return { valid: false, error: "Adapter suggestion rubricCandidates must be an array." };
  }

  if (!Array.isArray(value.evidenceMatches)) {
    return { valid: false, error: "Adapter suggestion evidenceMatches must be an array." };
  }

  if (!Array.isArray(value.riskFlags) || !value.riskFlags.every((item) => typeof item === "string")) {
    return { valid: false, error: "Adapter suggestion riskFlags must be a string array." };
  }

  if (!isConfidence(value.confidence)) {
    return { valid: false, error: "Adapter suggestion confidence is invalid." };
  }

  if (!value.rubricCandidates.every(isRubricSuggestion)) {
    return { valid: false, error: "Adapter suggestion rubricCandidates schema is invalid." };
  }

  if (!value.evidenceMatches.every(isEvidenceSuggestion)) {
    return { valid: false, error: "Adapter suggestion evidenceMatches schema is invalid." };
  }

  return { valid: true };
}

export function sanitizeAiMatchingSuggestion(value: unknown): AiMatchingSuggestion | null {
  const validation = validateAiMatchingSuggestion(value);
  if (!validation.valid || !isRecord(value)) {
    return null;
  }

  const suggestion = value as AiMatchingSuggestion;

  return {
    provider: suggestion.provider,
    rubricCandidates: suggestion.rubricCandidates.map((item) => ({
      title: item.title,
      category: item.category,
      required: item.required,
      rationale: item.rationale
    })),
    evidenceMatches: suggestion.evidenceMatches.map((item) => ({
      criterionTitle: item.criterionTitle,
      evidenceType: item.evidenceType,
      sentence: item.sentence,
      rationale: item.rationale
    })),
    riskFlags: [...suggestion.riskFlags],
    confidence: suggestion.confidence
  };
}

export class MockAiMatchingAdapter implements AiMatchingAdapter {
  provider: AiMatchingProvider = "mock";

  async suggest(input: AiMatchingAdapterInput): Promise<AiMatchingSuggestion> {
    const rubric = buildEvaluationRubric(input.coreCriteria);
    const assessments = rubric.criteria.map((criterion) =>
      evaluateCriterionEvidence(criterion, input.candidateInfo.candidateResume)
    );

    return {
      provider: this.provider,
      rubricCandidates: rubric.criteria.map((criterion) => ({
        title: criterion.title,
        category: criterion.category,
        required: criterion.required,
        rationale: "입력된 직무 기준에서 추출한 mock 루브릭 후보입니다."
      })),
      evidenceMatches: assessments.map((assessment) => ({
        criterionTitle: assessment.criterion.title,
        evidenceType: assessment.evidence.type,
        sentence: assessment.evidence.sentence,
        rationale:
          assessment.evidence.type === "none"
            ? "지원자 문서에서 직접 근거가 확인되지 않았습니다."
            : "지원자 문서에서 관련 근거 후보가 확인되었습니다."
      })),
      riskFlags: assessments.flatMap((assessment) => assessment.missing),
      confidence: assessments.some((assessment) => assessment.evidence.type === "none")
        ? "문서 근거 부족"
        : "근거 충분"
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProvider(value: unknown): value is AiMatchingProvider {
  return value === "mock" || value === "openai" || value === "anthropic" || value === "google";
}

function isConfidence(value: unknown): value is AiMatchingSuggestion["confidence"] {
  return value === "근거 충분" || value === "일부 확인 필요" || value === "문서 근거 부족";
}

function isEvidenceType(value: unknown): value is AiEvidenceSuggestion["evidenceType"] {
  return value === "direct" || value === "indirect" || value === "none";
}

function isRubricSuggestion(value: unknown): value is AiRubricSuggestion {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.required === "boolean" &&
    typeof value.rationale === "string"
  );
}

function isEvidenceSuggestion(value: unknown): value is AiEvidenceSuggestion {
  return (
    isRecord(value) &&
    typeof value.criterionTitle === "string" &&
    isEvidenceType(value.evidenceType) &&
    typeof value.sentence === "string" &&
    typeof value.rationale === "string"
  );
}
