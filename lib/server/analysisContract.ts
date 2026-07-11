import {
  validateWeightSet,
  type ReportLanguage,
  type ScoringWeightSet,
  type StructuredMatchReport
} from "../matching";

const MAX_IDENTIFIER_LENGTH = 128;
const MAX_DOCUMENT_TEXT_LENGTH = 2_000_000;
const MAX_TOTAL_TEXT_LENGTH = 4_000_000;

export type VerifiedTextInput = {
  text: string;
  verified: boolean;
};

export type AnalyzeMatchRequest = {
  requestId: string;
  idempotencyKey: string;
  coreCriteria: {
    jobDescription: VerifiedTextInput;
    additionalMaterial: VerifiedTextInput;
  };
  candidateInfo: {
    candidateId: string;
    candidateResume: VerifiedTextInput;
    referenceEmployeeResume: VerifiedTextInput;
  };
  supportingCriteria: {
    teamStrategy: VerifiedTextInput;
    managerMbo: VerifiedTextInput;
    subjectiveOpinion: VerifiedTextInput;
  };
  weights: ScoringWeightSet;
  language: ReportLanguage;
};

export type AnalyzeMatchErrorCode =
  | "INVALID_REQUEST"
  | "DOCUMENT_NOT_VERIFIED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "IDEMPOTENCY_CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

export type AnalyzeMatchError = {
  code: AnalyzeMatchErrorCode;
  message: string;
};

export type AnalyzeMatchResponse =
  | {
      ok: true;
      requestId: string;
      candidateId: string;
      report: StructuredMatchReport;
    }
  | { ok: false; error: AnalyzeMatchError };

export type AnalyzeMatchValidation =
  | { valid: true; value: AnalyzeMatchRequest }
  | { valid: false; error: AnalyzeMatchError };

export function validateAnalyzeMatchRequest(value: unknown): AnalyzeMatchValidation {
  if (!isRecord(value)) {
    return invalidRequest();
  }

  if (
    !isIdentifier(value.requestId) ||
    !isIdentifier(value.idempotencyKey) ||
    !isRecord(value.coreCriteria) ||
    !isRecord(value.candidateInfo) ||
    !isRecord(value.supportingCriteria) ||
    !isIdentifier(value.candidateInfo.candidateId)
  ) {
    return invalidRequest();
  }

  const documents = [
    value.coreCriteria.jobDescription,
    value.coreCriteria.additionalMaterial,
    value.candidateInfo.candidateResume,
    value.candidateInfo.referenceEmployeeResume,
    value.supportingCriteria.teamStrategy,
    value.supportingCriteria.managerMbo,
    value.supportingCriteria.subjectiveOpinion
  ];

  if (!documents.every(isVerifiedTextInput)) {
    return invalidRequest();
  }

  const [jobDescription, additionalMaterial, candidateResume, referenceEmployeeResume,
    teamStrategy, managerMbo, subjectiveOpinion] = documents;

  if (!jobDescription.text.trim() || !candidateResume.text.trim()) {
    return invalidRequest();
  }

  if (documents.some((document) => document.text.trim() && !document.verified)) {
    return {
      valid: false,
      error: {
        code: "DOCUMENT_NOT_VERIFIED",
        message: "확인 완료된 문서만 분석할 수 있습니다."
      }
    };
  }

  if (
    documents.some((document) => document.text.length > MAX_DOCUMENT_TEXT_LENGTH) ||
    documents.reduce((total, document) => total + document.text.length, 0) > MAX_TOTAL_TEXT_LENGTH
  ) {
    return invalidRequest();
  }

  if (!isWeightSet(value.weights) || !validateWeightSet(value.weights).valid) {
    return invalidRequest();
  }

  if (value.language !== "ko" && value.language !== "en" && value.language !== "zh") {
    return invalidRequest();
  }

  return {
    valid: true,
    value: {
      requestId: value.requestId,
      idempotencyKey: value.idempotencyKey,
      coreCriteria: { jobDescription, additionalMaterial },
      candidateInfo: {
        candidateId: value.candidateInfo.candidateId,
        candidateResume,
        referenceEmployeeResume
      },
      supportingCriteria: { teamStrategy, managerMbo, subjectiveOpinion },
      weights: value.weights,
      language: value.language
    }
  };
}

function invalidRequest(): AnalyzeMatchValidation {
  return {
    valid: false,
    error: { code: "INVALID_REQUEST", message: "분석 요청 형식이 올바르지 않습니다." }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_IDENTIFIER_LENGTH;
}

function isVerifiedTextInput(value: unknown): value is VerifiedTextInput {
  return isRecord(value) && typeof value.text === "string" && typeof value.verified === "boolean";
}

function isWeightSet(value: unknown): value is ScoringWeightSet {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.isDefault === "boolean" &&
    Array.isArray(value.items) &&
    value.items.length === 4 &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.code === "string" &&
        typeof item.label === "string" &&
        typeof item.weight === "number" &&
        Number.isFinite(item.weight) &&
        item.weight >= 0 &&
        item.weight <= 100 &&
        typeof item.enabled === "boolean"
    )
  );
}
