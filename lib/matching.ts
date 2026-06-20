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
};

export type AnalyzeStructuredMatchInput = {
  coreCriteria: CoreCriteriaInputs;
  candidateInfo: CandidateInputs;
  supportingCriteria: SupportingCriteriaInputs;
  weights: ScoringWeightSet;
  language: ReportLanguage;
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
  const coreIndicators = extractIndicators(
    `${input.coreCriteria.jobDescription}\n${input.coreCriteria.additionalMaterial}`,
    4
  );
  const coreIndicatorMatches = coreIndicators.map((indicator) =>
    buildCoreIndicatorMatch(indicator, candidateText)
  );
  const supportingIndicatorMatches = [
    buildSupportingMatch("팀별 전략자료", input.supportingCriteria.teamStrategy, candidateText),
    buildSupportingMatch("보직장 MBO", input.supportingCriteria.managerMbo, candidateText),
    buildSupportingMatch("기타 주관식 의견", input.supportingCriteria.subjectiveOpinion, candidateText)
  ];
  const weightedCore =
    average(coreIndicatorMatches.map((item) => item.matchRate)) *
    (weightFor(input.weights, "jobDescription") / 100);
  const weightedTeam =
    (supportingIndicatorMatches[0]?.matchRate ?? 0) *
    (weightFor(input.weights, "teamStrategy") / 100);
  const weightedMbo =
    (supportingIndicatorMatches[1]?.matchRate ?? 0) * (weightFor(input.weights, "mbo") / 100);
  const weightedCustom =
    (supportingIndicatorMatches[2]?.matchRate ?? 0) * (weightFor(input.weights, "custom") / 100);
  const overallScore = Math.round(weightedCore + weightedTeam + weightedMbo + weightedCustom);
  const missingCapabilities = buildMissingCapabilities(coreIndicators, candidateText);
  const interviewQuestions = buildInterviewQuestions(missingCapabilities, [
    ...coreIndicatorMatches,
    ...supportingIndicatorMatches
  ]);

  return {
    overallMatch: {
      score: overallScore,
      rationale: buildOverallRationale(coreIndicatorMatches, supportingIndicatorMatches),
      recommendation:
        overallScore >= 75
          ? "담당부서 검토 자료로 활용 가능합니다. 단, 문서상 확인 불가 항목은 인터뷰에서 검증하세요."
          : "추가 검토가 필요합니다. 낮은 매칭 항목과 확인 불가 역량을 우선 확인하세요."
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
        : "영어/중국어 리포트 생성은 확장 예정입니다. 현재 결과는 한국어로 제공됩니다."
  };
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

function tokenize(text: string) {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return tokens;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
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

function extractIndicators(text: string, limit: number) {
  const candidates = text
    .split(/[\n.!?。！？]+/u)
    .map((item) => item.replace(/^[-*•\d.\s]+/u, "").trim())
    .filter((item) => item.length >= 4);

  return (candidates.length > 0 ? candidates : ["핵심지표 입력 내용"]).slice(0, limit);
}

function buildCoreIndicatorMatch(indicator: string, candidateText: string): CoreIndicatorMatch {
  const matchRate = keywordMatchRate(indicator, candidateText);

  return {
    indicator,
    matchRate,
    evidence:
      matchRate >= 70
        ? "지원자 문서에서 관련 경험 또는 기술 키워드가 확인됩니다."
        : "지원자 문서에서 일부 키워드만 확인되며, 상세 경험은 추가 검증이 필요합니다."
  };
}

function buildSupportingMatch(
  source: string,
  criteria: string,
  candidateText: string
): SupportingIndicatorMatch {
  const matchRate = criteria.trim().length === 0 ? 0 : keywordMatchRate(criteria, candidateText);

  return {
    source,
    matchRate,
    evidence:
      criteria.trim().length === 0
        ? `${source} 입력이 없어 적합도를 산출하지 않았습니다.`
        : matchRate >= 70
          ? `${source} 기준과 연결되는 경험 키워드가 확인됩니다.`
          : `${source} 기준과 직접 연결되는 근거가 제한적입니다.`
  };
}

function buildMissingCapabilities(indicators: string[], candidateText: string) {
  const candidateTokens = new Set(tokenize(candidateText));
  const missing = Array.from(new Set(indicators.flatMap((indicator) => tokenize(indicator))))
    .filter((token) => !candidateTokens.has(token))
    .slice(0, 6)
    .map((token) => `${token}: 지원자 문서상 확인 불가`);

  return missing.length > 0 ? missing : ["핵심 역량 대부분이 문서상 확인됩니다."];
}

function buildInterviewQuestions(
  missingCapabilities: string[],
  matches: Array<{ matchRate: number; evidence: string }>
) {
  const lowMatch = matches.find((item) => item.matchRate < 70);
  const missingKeywords = missingCapabilities
    .filter((item) => item.includes("문서상 확인 불가"))
    .map((item) => item.split(":")[0]);

  return [
    `${missingKeywords[0] ?? "핵심 직무 역량"}에 대해 실제 수행 사례와 본인 역할을 설명해 주세요.`,
    `${missingKeywords[1] ?? "관련 프로젝트"} 경험에서 성과를 수치 또는 결과물 중심으로 설명해 주세요.`,
    lowMatch
      ? "문서상 근거가 제한적인 항목에 대해 추가로 검증할 경험이나 산출물이 있나요?"
      : "직무기술서의 핵심 요구사항 중 인터뷰에서 보완 설명하고 싶은 경험은 무엇인가요?"
  ];
}

function buildReferenceSimilarity(candidateText: string, referenceText: string): ReferenceSimilarity {
  if (referenceText.trim().length === 0) {
    return {
      status: "notProvided",
      summary: "비교 대상 미등록"
    };
  }

  const score = keywordMatchRate(referenceText, candidateText);

  return {
    status: "compared",
    score,
    summary:
      score >= 70
        ? "기존 입사자 문서와 기술 키워드 유사도가 높습니다."
        : "기존 입사자 문서와 일부 기술 키워드만 유사합니다."
  };
}

function buildOverallRationale(
  coreMatches: CoreIndicatorMatch[],
  supportingMatches: SupportingIndicatorMatch[]
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
      : "보조지표 입력이 제한적입니다."
  ];
}

function keywordMatchRate(criteria: string, target: string) {
  const criteriaTokens = Array.from(new Set(tokenize(criteria)));
  const targetTokens = new Set(tokenize(target));

  if (criteriaTokens.length === 0 || targetTokens.size === 0) {
    return 0;
  }

  const matched = criteriaTokens.filter((token) => targetTokens.has(token)).length;
  return Math.max(0, Math.min(100, Math.round(45 + (matched / criteriaTokens.length) * 55)));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightFor(weightSet: ScoringWeightSet, code: ScoreCode) {
  return weightSet.items.find((item) => item.code === code && item.enabled)?.weight ?? 0;
}
