import { DocumentInput, ScoringWeightSet, validateWeightSet } from "./matching";

export type StepState = "complete" | "active" | "upcoming";

export type DocumentValidationTarget = {
  label: string;
  document: DocumentInput;
  active?: boolean;
};

export function canRunAnalysis(input: {
  requiredDocuments: DocumentValidationTarget[];
  optionalDocuments?: DocumentValidationTarget[];
  weights: ScoringWeightSet;
}) {
  const reasons: string[] = [];
  const weightValidation = validateWeightSet(input.weights);

  for (const target of input.requiredDocuments) {
    if (isDocumentParsing(target.document)) {
      reasons.push(`${target.label} 문서 추출이 완료될 때까지 기다려 주세요.`);
      continue;
    }

    if (!isDocumentTextPresent(target.document)) {
      reasons.push(`${target.label}를 등록하세요.`);
      continue;
    }

    if (!isDocumentVerified(target.document)) {
      reasons.push(`${target.label} 내용을 확인 완료해 주세요.`);
    }
  }

  for (const target of input.optionalDocuments ?? []) {
    if (target.active === false) {
      continue;
    }

    if (isDocumentParsing(target.document)) {
      reasons.push(`${target.label} 문서 추출이 완료될 때까지 기다려 주세요.`);
      continue;
    }

    if (isDocumentTextPresent(target.document) && !isDocumentVerified(target.document)) {
      reasons.push(`${target.label} 내용을 확인 완료하거나 비워 주세요.`);
    }
  }

  if (!weightValidation.valid) {
    reasons.push(weightValidation.message);
  }

  return {
    ok: reasons.length === 0,
    reasons
  };
}

export function isDocumentTextPresent(document: DocumentInput) {
  return document.text.trim().length > 0;
}

export function isDocumentParsing(document: DocumentInput) {
  return document.parseStatus === "parsing";
}

export function isDocumentVerified(document: DocumentInput) {
  return document.extraction?.verified === true;
}

export function markDocumentTextChanged(document: DocumentInput, text: string): DocumentInput {
  if (!text.trim()) {
    return {
      ...document,
      text,
      parseStatus: document.parseStatus ?? "idle",
      extraction: undefined
    };
  }

  return {
    ...document,
    text,
    parseStatus: document.parseStatus ?? "idle",
    extraction: {
      method: "manual",
      warnings: [],
      requiresReview: false,
      verified: false
    }
  };
}

export function markDocumentCleared(_document: DocumentInput): DocumentInput {
  return {
    text: "",
    parseStatus: "idle"
  };
}

export function markDocumentVerified(document: DocumentInput): DocumentInput {
  if (!isDocumentTextPresent(document)) {
    return {
      ...document,
      extraction: undefined
    };
  }

  return {
    ...document,
    extraction: {
      method: document.extraction?.method ?? "manual",
      warnings: document.extraction?.warnings ?? [],
      requiresReview: document.extraction?.requiresReview ?? false,
      confidence: document.extraction?.confidence,
      provider: document.extraction?.provider,
      quality: document.extraction?.quality,
      verified: true
    }
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
