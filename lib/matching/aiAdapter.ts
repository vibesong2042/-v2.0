import type {
  CandidateInputs,
  CoreCriteriaInputs,
  ReportLanguage,
  SupportingCriteriaInputs
} from "../matching";
import { buildEvaluationRubric } from "./rubric";
import { evaluateCriterionEvidence } from "./evidence";

export type AiMatchingProvider = "mock" | "openai" | "anthropic" | "google";

export type AiFallbackReasonCode =
  | "INVALID_SCHEMA"
  | "PROVIDER_MISMATCH"
  | "OUTPUT_TOO_LARGE"
  | "EVIDENCE_NOT_FOUND"
  | "FORBIDDEN_DECISION_FIELD"
  | "TIMEOUT"
  | "ADAPTER_ERROR";

const MAX_RUBRIC_CANDIDATES = 12;
const MAX_EVIDENCE_MATCHES = 24;
const MAX_RISK_FLAGS = 12;
const MAX_ITEM_LENGTH = 200;
const MAX_EVIDENCE_LENGTH = 2_000;
const MAX_RATIONALE_LENGTH = 1_000;
const MAX_SERIALIZED_BYTES = 64 * 1024;

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
  | { valid: false; reasonCode: AiFallbackReasonCode };

export type AiMatchingAdapterInput = {
  coreCriteria: CoreCriteriaInputs;
  candidateInfo: CandidateInputs;
  supportingCriteria: SupportingCriteriaInputs;
  language: ReportLanguage;
};

export type AiAdapterContext = {
  signal: AbortSignal;
  requestId: string;
};

export interface AiMatchingAdapter {
  provider: AiMatchingProvider;
  suggest(input: AiMatchingAdapterInput, context: AiAdapterContext): Promise<AiMatchingSuggestion>;
}

export function validateAiMatchingSuggestion(
  value: unknown,
  expectedProvider?: AiMatchingProvider
): AiMatchingValidationResult {
  const serializedSize = getSerializedSize(value);
  if (serializedSize === null) {
    return invalid("INVALID_SCHEMA");
  }
  if (serializedSize > MAX_SERIALIZED_BYTES) {
    return invalid("OUTPUT_TOO_LARGE");
  }

  if (!isRecord(value)) {
    return invalid("INVALID_SCHEMA");
  }

  if ("finalScore" in value || "hiringDecision" in value) {
    return invalid("FORBIDDEN_DECISION_FIELD");
  }

  if (!isProvider(value.provider)) {
    return invalid("INVALID_SCHEMA");
  }

  if (expectedProvider && value.provider !== expectedProvider) {
    return invalid("PROVIDER_MISMATCH");
  }

  if (!Array.isArray(value.rubricCandidates)) {
    return invalid("INVALID_SCHEMA");
  }

  if (!Array.isArray(value.evidenceMatches)) {
    return invalid("INVALID_SCHEMA");
  }

  if (!Array.isArray(value.riskFlags) || !value.riskFlags.every((item) => typeof item === "string")) {
    return invalid("INVALID_SCHEMA");
  }

  if (
    value.rubricCandidates.length > MAX_RUBRIC_CANDIDATES ||
    value.evidenceMatches.length > MAX_EVIDENCE_MATCHES ||
    value.riskFlags.length > MAX_RISK_FLAGS ||
    value.riskFlags.some((item) => item.length > MAX_ITEM_LENGTH)
  ) {
    return invalid("OUTPUT_TOO_LARGE");
  }

  if (!isConfidence(value.confidence)) {
    return invalid("INVALID_SCHEMA");
  }

  if (!value.rubricCandidates.every(isRubricSuggestion)) {
    return invalid("INVALID_SCHEMA");
  }

  if (!value.evidenceMatches.every(isEvidenceSuggestion)) {
    return invalid("INVALID_SCHEMA");
  }

  if (
    value.rubricCandidates.some(hasOversizedRubricFields) ||
    value.evidenceMatches.some(hasOversizedEvidenceFields)
  ) {
    return invalid("OUTPUT_TOO_LARGE");
  }

  return { valid: true };
}

export function sanitizeAiMatchingSuggestion(
  value: unknown,
  expectedProvider?: AiMatchingProvider
): AiMatchingSuggestion | null {
  const validation = validateAiMatchingSuggestion(value, expectedProvider);
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

export function validateAiSuggestionEvidenceAgainstInput(
  suggestion: AiMatchingSuggestion,
  input: AiMatchingAdapterInput
): AiMatchingValidationResult {
  const candidateText = normalize(input.candidateInfo.candidateResume);

  for (const evidence of suggestion.evidenceMatches) {
    if (evidence.evidenceType === "none" || evidence.sentence.trim().length === 0) {
      continue;
    }

    if (!candidateText.includes(normalize(evidence.sentence))) {
      return invalid("EVIDENCE_NOT_FOUND");
    }
  }

  return { valid: true };
}

export class MockAiMatchingAdapter implements AiMatchingAdapter {
  provider: AiMatchingProvider = "mock";

  async suggest(
    input: AiMatchingAdapterInput,
    _context: AiAdapterContext
  ): Promise<AiMatchingSuggestion> {
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
    typeof value.rationale === "string" &&
    (value.evidenceType === "none"
      ? value.sentence.trim().length === 0
      : value.sentence.trim().length > 0)
  );
}

function hasOversizedRubricFields(value: AiRubricSuggestion) {
  return (
    value.title.length > MAX_ITEM_LENGTH ||
    value.category.length > MAX_ITEM_LENGTH ||
    value.rationale.length > MAX_RATIONALE_LENGTH
  );
}

function hasOversizedEvidenceFields(value: AiEvidenceSuggestion) {
  return (
    value.criterionTitle.length > MAX_ITEM_LENGTH ||
    value.sentence.length > MAX_EVIDENCE_LENGTH ||
    value.rationale.length > MAX_RATIONALE_LENGTH
  );
}

function getSerializedSize(value: unknown) {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? null : new TextEncoder().encode(serialized).byteLength;
  } catch {
    return null;
  }
}

function invalid(reasonCode: AiFallbackReasonCode): AiMatchingValidationResult {
  return { valid: false, reasonCode };
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
