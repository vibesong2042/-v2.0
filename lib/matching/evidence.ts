import type { CriterionAssessment, EvidenceMatch, RubricCriterion } from "../matching";
import {
  clampScore,
  directKeywordScore,
  evidenceQuality,
  experienceSignalScore,
  semanticMatchScore,
  splitSentences,
  tokenize
} from "./scoring";

const NEGATIVE_OR_LEARNING_ONLY_PATTERN =
  /없음|없다|없습니다|경험 없음|경험은 없음|경험은 없습니다|문서에 없음|문서에 없습니다|문서상 확인 불가|문서상 확인되지|학습 중|튜토리얼|교육\s*(수강|을 수강)|강의\s*(수강|를 수강)|관심 있음|관심이 있음|관심이 있으며|희망|예정|기초 이해|키워드.*이해/u;
const WEAK_EVIDENCE_PATTERN = /참관|보조|간접 경험|개인 프로젝트|토이 프로젝트|단기 참여|학습용/u;
const CONCRETE_DELIVERY_PATTERN =
  /\d+\s*(년|개월|%|건|명|회|배|억|만)|담당|주도|리드|책임|개선|저감|향상|단축|달성|구축(했|하|함)|운영(했|하|하며|함)|배포(했|하|함)|개발(했|하|하며|함)|관리(했|하|하며|함)/u;

type EvidenceCandidate = {
  sentence: string;
  score: number;
};

export function evaluateCriterionEvidence(
  criterion: RubricCriterion,
  candidateText: string
): CriterionAssessment {
  const sentences = splitSentences(candidateText);
  const candidates = findEvidenceCandidates(criterion, sentences);
  const best = candidates[0] ?? { sentence: "", score: 0 };
  const evidenceText = best.sentence || (hasKeywordOnlySignal(candidateText) ? candidateText : "");
  const keywordScore = directKeywordScore(criterion.keywords, tokenize(evidenceText));
  const semanticScore = semanticMatchScore(criterion, evidenceText);
  const experienceScore = experienceSignalScore(evidenceText);
  const evidenceQualityScore = evidenceQuality(best.sentence);
  const rawScore = clampScore(
    keywordScore * 0.24 + semanticScore * 0.31 + experienceScore * 0.15 + evidenceQualityScore * 0.3
  );
  const cappedScore = applyEvidenceScoreCap(
    rawScore,
    best.sentence,
    experienceScore,
    evidenceQualityScore
  );
  const score = cappedScore.score;
  const evidence = buildEvidenceMatch(score, keywordScore, semanticScore, best.sentence);
  const supportingEvidence = candidates
    .slice(1, 3)
    .map((candidate) => buildSupportingEvidenceMatch(criterion, candidate.sentence))
    .filter((item) => item.type !== "none");
  const missing =
    evidence.type === "none" || score < 55
      ? [`${criterion.title}: 지원자 문서상 확인 불가`]
      : [];

  return {
    criterion,
    score,
    keywordScore,
    semanticScore,
    experienceScore,
    evidenceQualityScore,
    scoreTrace: {
      keywordScore,
      semanticScore,
      experienceScore,
      evidenceQualityScore,
      rawScore,
      finalScore: score,
      capApplied: cappedScore.capApplied,
      capReason: cappedScore.capReason
    },
    evidence,
    supportingEvidence,
    missing,
    interviewQuestion: buildCriterionQuestion(criterion, evidence)
  };
}

export function evidenceLabel(assessment: CriterionAssessment) {
  if (assessment.evidence.type === "none") {
    return `${assessment.criterion.title} 관련 근거는 지원자 문서상 확인 불가합니다.`;
  }

  const typeLabel = assessment.evidence.type === "direct" ? "직접 근거" : "간접 근거";
  return `${typeLabel}: ${assessment.evidence.sentence}`;
}

function findEvidenceCandidates(criterion: RubricCriterion, sentences: string[]): EvidenceCandidate[] {
  return sentences
    .reduce<EvidenceCandidate[]>((items, sentence) => {
      if (isNegativeOrLearningOnly(sentence) || isUnsupportedWeakEvidence(sentence)) {
        return items;
      }

      const score =
        directKeywordScore(criterion.keywords, tokenize(sentence)) * 0.35 +
        semanticMatchScore(criterion, sentence) * 0.35 +
        evidenceQuality(sentence) * 0.3;

      return score > 0 ? [...items, { sentence, score }] : items;
    }, [])
    .sort((a, b) => b.score - a.score);
}

function buildEvidenceMatch(
  score: number,
  keywordScore: number,
  semanticScore: number,
  sentence: string
): EvidenceMatch {
  if (!sentence || isNegativeOrLearningOnly(sentence) || isUnsupportedWeakEvidence(sentence) || score < 45) {
    return { type: "none", sentence: "", confidence: "low" };
  }

  if (score <= 55 && keywordScore < 50) {
    return { type: "none", sentence: "", confidence: "low" };
  }

  if (isWeakEvidence(sentence)) {
    return { type: "indirect", sentence, confidence: "medium" };
  }

  if (keywordScore >= 60 || score >= 75 || (keywordScore >= 50 && score >= 55)) {
    return { type: "direct", sentence, confidence: score >= 75 ? "high" : "medium" };
  }

  if (semanticScore > keywordScore && semanticScore >= 35) {
    return { type: "indirect", sentence, confidence: "medium" };
  }

  return { type: "none", sentence: "", confidence: "low" };
}

function buildSupportingEvidenceMatch(criterion: RubricCriterion, sentence: string): EvidenceMatch {
  const keywordScore = directKeywordScore(criterion.keywords, tokenize(sentence));
  const semanticScore = semanticMatchScore(criterion, sentence);
  const score = clampScore(
    keywordScore * 0.24 +
      semanticScore * 0.31 +
      experienceSignalScore(sentence) * 0.15 +
      evidenceQuality(sentence) * 0.3
  );

  return buildEvidenceMatch(score, keywordScore, semanticScore, sentence);
}

function buildCriterionQuestion(criterion: RubricCriterion, evidence: EvidenceMatch) {
  if (evidence.type === "none") {
    return `${criterion.title}에 대한 실제 수행 경험과 산출물을 구체적으로 설명해 주세요.`;
  }

  return `${criterion.title} 관련 경험에서 본인의 역할, 성과, 검증 가능한 결과를 설명해 주세요.`;
}

function isNegativeOrLearningOnly(sentence: string) {
  return NEGATIVE_OR_LEARNING_ONLY_PATTERN.test(sentence);
}

function isWeakEvidence(sentence: string) {
  return WEAK_EVIDENCE_PATTERN.test(sentence);
}

function isUnsupportedWeakEvidence(sentence: string) {
  return isWeakEvidence(sentence) && !hasConcreteDeliverySignal(sentence);
}

function hasConcreteDeliverySignal(sentence: string) {
  return CONCRETE_DELIVERY_PATTERN.test(sentence);
}

function hasKeywordOnlySignal(text: string) {
  return (
    /(키워드|용어|개념).*(이해|정리|숙지)|\bkeyword\b/i.test(text) &&
    !/없음|없다|없습니다|경험 없음|경험은 없음|경험은 없습니다|학습 중|튜토리얼|교육\s*(수강|을 수강)|강의\s*(수강|를 수강)|관심 있음|관심이 있음|관심이 있으며|희망|예정/u.test(
      text
    )
  );
}

function applyEvidenceScoreCap(
  score: number,
  sentence: string,
  experienceScore: number,
  evidenceQualityScore: number
) {
  if (!sentence || isNegativeOrLearningOnly(sentence) || isUnsupportedWeakEvidence(sentence)) {
    return {
      score: Math.min(score, 44),
      capApplied: score > 44 || !sentence,
      capReason: "noEvidence" as const
    };
  }

  if (experienceScore < 35 && evidenceQualityScore < 45) {
    return {
      score: Math.min(score, 55),
      capApplied: score > 55,
      capReason: "weakExperienceEvidence" as const
    };
  }

  return { score, capApplied: false, capReason: "none" as const };
}
