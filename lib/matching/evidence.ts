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

export function evaluateCriterionEvidence(
  criterion: RubricCriterion,
  candidateText: string
): CriterionAssessment {
  const sentences = splitSentences(candidateText);
  const best = findBestEvidence(criterion, sentences);
  const keywordScore = directKeywordScore(criterion.keywords, tokenize(best.sentence || candidateText));
  const semanticScore = semanticMatchScore(criterion, best.sentence || candidateText);
  const experienceScore = experienceSignalScore(best.sentence || candidateText);
  const evidenceQualityScore = evidenceQuality(best.sentence);
  const score = clampScore(
    keywordScore * 0.24 + semanticScore * 0.31 + experienceScore * 0.15 + evidenceQualityScore * 0.3
  );
  const evidence = buildEvidenceMatch(score, keywordScore, semanticScore, best.sentence);
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
    evidence,
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

function findBestEvidence(criterion: RubricCriterion, sentences: string[]) {
  return sentences.reduce(
    (best, sentence) => {
      const score =
        directKeywordScore(criterion.keywords, tokenize(sentence)) * 0.35 +
        semanticMatchScore(criterion, sentence) * 0.35 +
        evidenceQuality(sentence) * 0.3;

      return score > best.score ? { sentence, score } : best;
    },
    { sentence: "", score: 0 }
  );
}

function buildEvidenceMatch(
  score: number,
  keywordScore: number,
  semanticScore: number,
  sentence: string
): EvidenceMatch {
  if (!sentence || score < 45) {
    return { type: "none", sentence: "", confidence: "low" };
  }

  if (keywordScore >= 60 || score >= 75 || (keywordScore >= 50 && score >= 60)) {
    return { type: "direct", sentence, confidence: score >= 75 ? "high" : "medium" };
  }

  if (semanticScore > keywordScore && semanticScore >= 35) {
    return { type: "indirect", sentence, confidence: "medium" };
  }

  return { type: "none", sentence: "", confidence: "low" };
}

function buildCriterionQuestion(criterion: RubricCriterion, evidence: EvidenceMatch) {
  if (evidence.type === "none") {
    return `${criterion.title}에 대한 실제 수행 경험과 산출물을 구체적으로 설명해 주세요.`;
  }

  return `${criterion.title} 관련 경험에서 본인의 역할, 성과, 검증 가능한 결과를 설명해 주세요.`;
}
