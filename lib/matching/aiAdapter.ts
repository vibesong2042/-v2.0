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
