import type { AiMatchingAdapter, AiMatchingProvider } from "./matching/aiAdapter";
import {
  sanitizeAiMatchingSuggestion,
  validateAiSuggestionEvidenceAgainstInput
} from "./matching/aiAdapter";
import { buildMatchConfidence, missingRequiredCount } from "./matching/confidence";
import { evaluateCriterionEvidence, evidenceLabel } from "./matching/evidence";
import { buildEvaluationRubric } from "./matching/rubric";
import { clampScore, roundOne, semanticTextSimilarity, tokenize } from "./matching/scoring";

export { evaluateCriterionEvidence } from "./matching/evidence";
export { buildEvaluationRubric } from "./matching/rubric";

export type ScoreCode = "jobDescription" | "teamStrategy" | "mbo" | "custom";

export type ScoringWeightItem = {
  code: ScoreCode;
  label: string;
  weight: number;
  enabled: boolean;
};

export type ScoringWeightSet = {
  id: string;
  name: string;
  isDefault: boolean;
  items: ScoringWeightItem[];
};

export type ScoreInput = {
  code: ScoreCode;
  label: string;
  rawScore: number;
  evidence: string;
  gaps: string[];
};

export type MatchScoreItem = ScoreInput & {
  weight: number;
  weightedScore: number;
};

export type MatchResult = {
  totalScore: number;
  items: MatchScoreItem[];
  appliedWeights: ScoringWeightSet;
  strengths: string[];
  risks: string[];
  recommendation: string;
};

export type AnalyzeMatchInput = {
  jobDescription: string;
  resume: string;
  teamStrategy: string;
  mbo: string;
  customCriteria: string;
  weights: ScoringWeightSet;
};

export type ReviewReportInput = {
  candidateName: string;
  roleName: string;
  organizationName: string;
  match: MatchResult;
};

export type ReportLanguage = "ko" | "en" | "zh";

export type DocumentInput = {
  text: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  parseStatus?: "idle" | "parsing" | "parsed" | "failed";
  parseError?: string;
};

export type CoreCriteriaInputs = {
  jobDescription: string;
  additionalMaterial: string;
};

export type CandidateInputs = {
  candidateResume: string;
  referenceEmployeeResume: string;
};

export type SupportingCriteriaInputs = {
  teamStrategy: string;
  managerMbo: string;
  subjectiveOpinion: string;
};

export type RubricCategory =
  | "필수 역량"
  | "우대 역량"
  | "경험 수준"
  | "도메인 경험"
  | "성과/임팩트"
  | "협업/커뮤니케이션";

export type RubricCriterion = {
  id: string;
  category: RubricCategory;
  title: string;
  description: string;
  importance: number;
  required: boolean;
  evidenceNeed: "높음" | "보통" | "낮음";
  keywords: string[];
  synonyms: string[];
};

export type EvaluationRubric = {
  criteria: RubricCriterion[];
};

export type EvidenceMatch = {
  type: "direct" | "indirect" | "none";
  sentence: string;
  confidence: "high" | "medium" | "low";
};

export type CriterionAssessment = {
  criterion: RubricCriterion;
  score: number;
  keywordScore: number;
  semanticScore: number;
  experienceScore: number;
  evidenceQualityScore: number;
  evidence: EvidenceMatch;
  supportingEvidence: EvidenceMatch[];
  missing: string[];
  interviewQuestion: string;
};

export type MatchConfidence = {
  level: "근거 충분" | "일부 확인 필요" | "문서 근거 부족";
  rationale: string;
};

export type CoreIndicatorMatch = {
  indicator: string;
  matchRate: number;
  evidence: string;
};

export type SupportingIndicatorMatch = {
  source: string;
  matchRate: number;
  evidence: string;
};

export type ReferenceSimilarity =
  | {
      status: "notProvided";
      summary: string;
    }
  | {
      status: "compared";
      score: number;
      summary: string;
    };

export type StructuredMatchReport = {
  overallMatch: {
    score: number;
    rationale: string[];
    recommendation: string;
  };
  coreIndicatorMatches: CoreIndicatorMatch[];
  supportingIndicatorMatches: SupportingIndicatorMatch[];
  missingCapabilities: string[];
  interviewQuestions: string[];
  referenceSimilarity: ReferenceSimilarity;
  appliedWeights: ScoringWeightSet;
  language: ReportLanguage;
  languageNotice: string;
  rubric: EvaluationRubric;
  criterionAssessments: CriterionAssessment[];
  confidence: MatchConfidence;
  adapterMetadata: {
    status: "notUsed" | "used" | "fallback";
    provider?: AiMatchingProvider;
    reason?: string;
  };
};

export type AnalyzeStructuredMatchInput = {
  coreCriteria: CoreCriteriaInputs;
  candidateInfo: CandidateInputs;
  supportingCriteria: SupportingCriteriaInputs;
  weights: ScoringWeightSet;
  language: ReportLanguage;
};

export type AnalyzeStructuredMatchWithAdapterInput = AnalyzeStructuredMatchInput & {
  adapter?: AiMatchingAdapter;
  adapterTimeoutMs?: number;
};

export const DEFAULT_WEIGHT_SET: ScoringWeightSet = {
  id: "default",
  name: "Default MVP preset",
  isDefault: true,
  items: [
    { code: "jobDescription", label: "Job description", weight: 50, enabled: true },
    { code: "teamStrategy", label: "Team strategy", weight: 20, enabled: true },
    { code: "mbo", label: "Manager MBO", weight: 10, enabled: true },
    { code: "custom", label: "Custom criteria", weight: 20, enabled: true }
  ]
};

export function validateWeightSet(weightSet: ScoringWeightSet) {
  const total = weightSet.items
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + Number(item.weight || 0), 0);

  if (total !== 100) {
    return {
      valid: false,
      total,
      message: `Enabled weights must total 100%. Current total is ${total}%.`
    };
  }

  return { valid: true, total, message: "" };
}

export function calculateWeightedScores(
  weightSet: ScoringWeightSet,
  scores: ScoreInput[]
): MatchResult {
  const validation = validateWeightSet(weightSet);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const scoreByCode = new Map(scores.map((score) => [score.code, score]));
  const items = weightSet.items
    .filter((weight) => weight.enabled)
    .map((weight) => {
      const score = scoreByCode.get(weight.code) ?? {
        code: weight.code,
        label: weight.label,
        rawScore: 0,
        evidence: "No matching evidence was produced.",
        gaps: ["Review this criterion manually."]
      };
      const rawScore = clampScore(score.rawScore);

      return {
        ...score,
        rawScore,
        label: weight.label,
        weight: weight.weight,
        weightedScore: roundOne((rawScore * weight.weight) / 100)
      };
    });

  const totalScore = Math.round(items.reduce((sum, item) => sum + item.weightedScore, 0));
  const risks = items.flatMap((item) => item.gaps);

  return {
    totalScore,
    items,
    appliedWeights: structuredClone(weightSet),
    strengths: buildStrengths(items),
    risks,
    recommendation: buildRecommendation(totalScore, risks)
  };
}

export function analyzeMatch(input: AnalyzeMatchInput): MatchResult {
  const scores: ScoreInput[] = [
    scoreCriterion(
      "jobDescription",
      "Job description",
      input.jobDescription,
      input.resume,
      "Resume content maps to the role requirements.",
      "Role requirement match needs manual review."
    ),
    scoreCriterion(
      "teamStrategy",
      "Team strategy",
      input.teamStrategy,
      input.resume,
      "Resume content supports the team strategy.",
      "Team strategy fit is not strongly evidenced."
    ),
    scoreCriterion(
      "mbo",
      "Manager MBO",
      input.mbo,
      input.resume,
      "Resume content supports the manager MBO.",
      "MBO linkage needs department review."
    ),
    scoreCriterion(
      "custom",
      "Custom criteria",
      input.customCriteria,
      input.resume,
      "Resume content satisfies custom review criteria.",
      "Custom criteria fit is partial."
    )
  ];

  return calculateWeightedScores(input.weights, scores);
}

export function generateReviewReport(input: ReviewReportInput) {
  const weightLine = input.match.appliedWeights.items
    .filter((item) => item.enabled)
    .map((item) => `${item.label} ${item.weight}%`)
    .join(" / ");
  const scoreRows = input.match.items
    .map(
      (item) =>
        `- ${item.label}: raw ${item.rawScore}, weight ${item.weight}%, weighted ${item.weightedScore}. Evidence: ${item.evidence}`
    )
    .join("\n");
  const gapRows =
    input.match.risks.length > 0
      ? input.match.risks.map((risk) => `- ${risk}`).join("\n")
      : "- No material gaps in the MVP mock analysis.";

  return [
    `Candidate: ${input.candidateName}`,
    `Role: ${input.roleName}`,
    `Organization: ${input.organizationName}`,
    "",
    `Overall fit score: ${input.match.totalScore}/100`,
    `Applied weights: ${weightLine}`,
    "",
    "Score table",
    scoreRows,
    "",
    "Strengths",
    input.match.strengths.map((strength) => `- ${strength}`).join("\n"),
    "",
    "Gaps and review points",
    gapRows,
    "",
    "Department review note",
    input.match.recommendation
  ].join("\n");
}

export function analyzeStructuredMatch(input: AnalyzeStructuredMatchInput): StructuredMatchReport {
  const validation = validateWeightSet(input.weights);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const candidateText = input.candidateInfo.candidateResume;
  const rubric = buildEvaluationRubric(input.coreCriteria);
  const criterionAssessments = rubric.criteria.map((criterion) =>
    evaluateCriterionEvidence(criterion, candidateText)
  );
  const coreIndicatorMatches = criterionAssessments.map((assessment) => ({
    indicator: `${assessment.criterion.category}: ${assessment.criterion.title}`,
    matchRate: assessment.score,
    evidence: evidenceLabel(assessment)
  }));
  const teamWeight = weightFor(input.weights, "teamStrategy");
  const mboWeight = weightFor(input.weights, "mbo");
  const customWeight = weightFor(input.weights, "custom");
  const teamMatch = buildWeightedSupportingMatch(
    teamWeight,
    "팀별 전략자료",
    input.supportingCriteria.teamStrategy,
    candidateText
  );
  const mboMatch = buildWeightedSupportingMatch(
    mboWeight,
    "보직장 MBO",
    input.supportingCriteria.managerMbo,
    candidateText
  );
  const customMatch = buildWeightedSupportingMatch(
    customWeight,
    "기타 주관식 의견",
    input.supportingCriteria.subjectiveOpinion,
    candidateText
  );
  const supportingIndicatorMatches = [teamMatch, mboMatch, customMatch].filter(
    (item): item is SupportingIndicatorMatch => item !== null
  );
  const weightedCore =
    weightedAssessmentAverage(criterionAssessments) * (weightFor(input.weights, "jobDescription") / 100);
  const weightedTeam = (teamMatch?.matchRate ?? 0) * (teamWeight / 100);
  const weightedMbo = (mboMatch?.matchRate ?? 0) * (mboWeight / 100);
  const weightedCustom = (customMatch?.matchRate ?? 0) * (customWeight / 100);
  const requiredPenalty = missingRequiredCount(criterionAssessments) * 7;
  const confidence = buildMatchConfidence(criterionAssessments);
  const confidenceBonus = confidence.level === "근거 충분" ? 6 : 0;
  const preliminaryScore = clampScore(
    Math.round(weightedCore + weightedTeam + weightedMbo + weightedCustom - requiredPenalty + confidenceBonus)
  );
  const overallScore = applyRequiredEvidenceCap(preliminaryScore, criterionAssessments);
  const missingCapabilities = buildMissingCapabilitiesFromAssessments(criterionAssessments);
  const interviewQuestions = buildInterviewQuestionsFromAssessments(
    criterionAssessments,
    supportingIndicatorMatches
  );

  return {
    overallMatch: {
      score: overallScore,
      rationale: buildOverallRationale(coreIndicatorMatches, supportingIndicatorMatches, confidence),
      recommendation:
        overallScore >= 75 && confidence.level === "근거 충분"
          ? "담당부서 검토 자료로 활용 가능합니다. 최종 판단 전 인터뷰에서 핵심 근거를 재확인하세요."
          : "추가 검토가 필요합니다. 낮은 매칭 항목과 문서상 확인 불가 역량을 인터뷰에서 우선 확인하세요."
    },
    coreIndicatorMatches,
    supportingIndicatorMatches,
    missingCapabilities,
    interviewQuestions,
    referenceSimilarity: buildReferenceSimilarity(
      candidateText,
      input.candidateInfo.referenceEmployeeResume
    ),
    appliedWeights: structuredClone(input.weights),
    language: input.language,
    languageNotice:
      input.language === "ko"
        ? ""
        : "영어/중국어 리포트 생성은 확장 예정입니다. 현재 결과는 한국어로 제공됩니다.",
    rubric,
    criterionAssessments,
    confidence,
    adapterMetadata: { status: "notUsed" }
  };
}

export async function analyzeStructuredMatchWithAdapter(
  input: AnalyzeStructuredMatchWithAdapterInput
): Promise<StructuredMatchReport> {
  const baseReport = analyzeStructuredMatch(input);

  if (!input.adapter) {
    return baseReport;
  }

  try {
    const suggestion = await withTimeout(
      input.adapter.suggest({
        coreCriteria: input.coreCriteria,
        candidateInfo: input.candidateInfo,
        supportingCriteria: input.supportingCriteria,
        language: input.language
      }),
      input.adapterTimeoutMs ?? 3000
    );
    const sanitized = sanitizeAiMatchingSuggestion(suggestion);

    if (!sanitized) {
      return {
        ...baseReport,
        adapterMetadata: {
          status: "fallback",
          provider: input.adapter.provider,
          reason: "Invalid adapter suggestion schema."
        }
      };
    }

    const evidenceValidation = validateAiSuggestionEvidenceAgainstInput(sanitized, {
      coreCriteria: input.coreCriteria,
      candidateInfo: input.candidateInfo,
      supportingCriteria: input.supportingCriteria,
      language: input.language
    });

    if (!evidenceValidation.valid) {
      return {
        ...baseReport,
        adapterMetadata: {
          status: "fallback",
          provider: input.adapter.provider,
          reason: evidenceValidation.error
        }
      };
    }

    return {
      ...baseReport,
      adapterMetadata: {
        status: "used",
        provider: sanitized.provider
      }
    };
  } catch (error) {
    return {
      ...baseReport,
      adapterMetadata: {
        status: "fallback",
        provider: input.adapter.provider,
        reason: error instanceof Error ? error.message : "Adapter failed."
      }
    };
  }
}

export function generateStructuredReportText(report: StructuredMatchReport) {
  const coreLines = report.coreIndicatorMatches
    .map(
      (item, index) =>
        `핵심내용 ${index + 1}: ${item.indicator} → 매칭도 ${item.matchRate}%\n판단 근거: ${item.evidence}`
    )
    .join("\n\n");
  const supportingLines = report.supportingIndicatorMatches
    .map((item) => `${item.source}: 수행 적합도 ${item.matchRate}%\n판단 근거: ${item.evidence}`)
    .join("\n\n");
  const missingLines = report.missingCapabilities.map((item) => `- ${item}`).join("\n");
  const questionLines = report.interviewQuestions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");
  const referenceLine =
    report.referenceSimilarity.status === "compared"
      ? `기술 유사도 ${report.referenceSimilarity.score}%\n${report.referenceSimilarity.summary}`
      : report.referenceSimilarity.summary;

  return [
    report.languageNotice,
    `[종합 매칭도] ${report.overallMatch.score}%`,
    `[근거 충분성] ${report.confidence.level} - ${report.confidence.rationale}`,
    ...report.overallMatch.rationale.map((item) => `- ${item}`),
    `판단 의견: ${report.overallMatch.recommendation}`,
    "",
    "[핵심지표 매칭 여부]",
    coreLines,
    "",
    "[보조지표 매칭 여부]",
    supportingLines,
    "",
    "[직무기술서 / 채용공고 대비 미보유 역량 또는 확인 불가 역량]",
    missingLines,
    "",
    "[인터뷰 진행 시 필수 검증 질문 Top 3]",
    questionLines,
    "",
    "[기존 입사자 기술 유사도]",
    referenceLine
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function scoreCriterion(
  code: ScoreCode,
  label: string,
  criteria: string,
  resume: string,
  positiveEvidence: string,
  fallbackGap: string
): ScoreInput {
  const criteriaTokens = tokenize(criteria);
  const resumeTokens = new Set(tokenize(resume));
  const matchedCount = criteriaTokens.filter((token) => resumeTokens.has(token)).length;
  const coverage = criteriaTokens.length === 0 ? 0 : matchedCount / criteriaTokens.length;
  const rawScore = criteria.trim().length === 0 ? 0 : Math.round(60 + coverage * 40);
  const score = clampScore(rawScore);

  return {
    code,
    label,
    rawScore: score,
    evidence:
      matchedCount > 0
        ? `${positiveEvidence} Matched ${matchedCount} of ${criteriaTokens.length} key terms.`
        : `No direct key term overlap found for ${label}.`,
    gaps: score >= 75 ? [] : [fallbackGap]
  };
}

function buildSupportingMatch(
  source: string,
  criteria: string,
  candidateText: string
): SupportingIndicatorMatch {
  if (criteria.trim().length === 0) {
    return {
      source,
      matchRate: 0,
      evidence: `${source} 입력이 없어 적합도를 산출하지 않았습니다.`
    };
  }

  const criterion = buildEvaluationRubric({
    jobDescription: criteria,
    additionalMaterial: ""
  }).criteria[0];
  const assessment = evaluateCriterionEvidence(criterion, candidateText);

  return {
    source,
    matchRate: assessment.score,
    evidence: evidenceLabel(assessment)
  };
}

function buildWeightedSupportingMatch(
  weight: number,
  source: string,
  criteria: string,
  candidateText: string
): SupportingIndicatorMatch | null {
  if (weight <= 0) {
    return null;
  }

  return buildSupportingMatch(source, criteria, candidateText);
}

function buildMissingCapabilitiesFromAssessments(assessments: CriterionAssessment[]) {
  const missing = assessments.flatMap((assessment) => assessment.missing);

  return missing.length > 0 ? missing.slice(0, 6) : ["핵심 역량 대부분이 문서에서 확인됩니다."];
}

function buildInterviewQuestionsFromAssessments(
  assessments: CriterionAssessment[],
  supportingMatches: SupportingIndicatorMatch[]
) {
  const lowAssessments = [...assessments].sort((a, b) => a.score - b.score);
  const questions = lowAssessments.map((assessment) => assessment.interviewQuestion);
  const weakSupporting = supportingMatches.find((item) => item.matchRate < 60);

  if (weakSupporting) {
    questions.push(`${weakSupporting.source}와 직접 연결되는 경험 또는 산출물을 설명해 주세요.`);
  }

  return Array.from(new Set(questions)).slice(0, 3);
}

function buildReferenceSimilarity(candidateText: string, referenceText: string): ReferenceSimilarity {
  if (referenceText.trim().length === 0) {
    return {
      status: "notProvided",
      summary: "비교 대상 미등록"
    };
  }

  const score = semanticTextSimilarity(referenceText, candidateText);

  return {
    status: "compared",
    score,
    summary:
      score >= 70
        ? "기존 입사자 문서와 기술/경험 표현의 유사도가 높습니다."
        : "기존 입사자 문서와 일부 기술/경험 표현만 유사합니다."
  };
}

function buildOverallRationale(
  coreMatches: CoreIndicatorMatch[],
  supportingMatches: SupportingIndicatorMatch[],
  confidence: MatchConfidence
) {
  const bestCore = [...coreMatches].sort((a, b) => b.matchRate - a.matchRate)[0];
  const weakCore = [...coreMatches].sort((a, b) => a.matchRate - b.matchRate)[0];
  const bestSupporting = [...supportingMatches].sort((a, b) => b.matchRate - a.matchRate)[0];

  return [
    bestCore
      ? `가장 높은 핵심지표 매칭 항목은 "${bestCore.indicator}" (${bestCore.matchRate}%)입니다.`
      : "핵심지표 입력이 제한적입니다.",
    weakCore
      ? `추가 검증이 필요한 핵심지표는 "${weakCore.indicator}" (${weakCore.matchRate}%)입니다.`
      : "추가 검증 항목을 산출하지 못했습니다.",
    bestSupporting
      ? `보조지표 중 "${bestSupporting.source}" 적합도가 ${bestSupporting.matchRate}%로 산출되었습니다.`
      : "보조지표 입력이 제한적입니다.",
    `근거 충분성은 "${confidence.level}"입니다. ${confidence.rationale}`
  ];
}

function weightedAssessmentAverage(assessments: CriterionAssessment[]) {
  const totalWeight = assessments.reduce((sum, item) => sum + item.criterion.importance, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return (
    assessments.reduce((sum, item) => sum + item.score * item.criterion.importance, 0) /
    totalWeight
  );
}

function applyRequiredEvidenceCap(score: number, assessments: CriterionAssessment[]) {
  const requiredAssessments = assessments.filter((item) => item.criterion.required);
  const missingCount = missingRequiredCount(assessments);

  if (missingCount >= 2) {
    return Math.min(score, 69);
  }

  if (missingCount === 1) {
    return Math.min(score, 79);
  }

  if (requiredAssessments.length === 0) {
    return score;
  }

  const requiredAverage =
    requiredAssessments.reduce((sum, item) => sum + item.score, 0) / requiredAssessments.length;

  return requiredAverage <= 55 ? Math.min(score, 69) : score;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Adapter timed out after ${timeoutMs}ms.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function buildStrengths(items: MatchScoreItem[]) {
  const strengths = items
    .filter((item) => item.rawScore >= 75)
    .map((item) => `${item.label}: ${item.evidence}`);

  return strengths.length > 0 ? strengths : ["No strong match was detected in the mock analysis."];
}

function buildRecommendation(totalScore: number, risks: string[]) {
  if (totalScore >= 80 && risks.length <= 1) {
    return "Recommended for department review. Validate the evidence before final hiring judgment.";
  }

  if (totalScore >= 70) {
    return "Suitable for department review with focused follow-up on the listed gaps.";
  }

  return "Hold for manual review before sending to the department.";
}

function weightFor(weightSet: ScoringWeightSet, code: ScoreCode) {
  return weightSet.items.find((item) => item.code === code && item.enabled)?.weight ?? 0;
}
