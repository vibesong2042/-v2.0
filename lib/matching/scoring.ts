import type { RubricCriterion } from "../matching";
import { getRelevantSynonymGroups } from "./domainDictionary";

const STOP_WORDS = new Set([
  "기반",
  "경험",
  "역량",
  "필수",
  "우대",
  "관련",
  "담당",
  "있는",
  "업무",
  "수행",
  "요건",
  "with",
  "and",
  "the",
  "for"
]);

export function tokenize(text: string) {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9가-힣+#.-]+/g) ?? []))
    .map(normalizeToken)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function expandSynonyms(tokens: string[], contextText = "") {
  const groups = getRelevantSynonymGroups(`${tokens.join(" ")} ${contextText}`);

  return Array.from(
    new Set(
      tokens.flatMap((token) => {
        const group = groups.find((item) =>
          item.terms.some((term) => isEquivalentToken(token, term))
        );
        return group?.terms ?? [token];
      })
    )
  );
}

export function directKeywordScore(criteriaTokens: string[], candidateTokens: string[]) {
  if (criteriaTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  const matched = criteriaTokens.filter((token) => candidateSet.has(token)).length;
  const denominator = Math.min(criteriaTokens.length, 5);
  return clampScore(Math.round((matched / denominator) * 100));
}

export function semanticMatchScore(criterion: RubricCriterion, candidateText: string) {
  const criteriaTokens = Array.from(new Set(criterion.keywords.map(canonicalToken)));
  const candidateTokens = new Set(tokenize(candidateText).map(canonicalToken));

  if (criteriaTokens.length === 0 || candidateTokens.size === 0) {
    return 0;
  }

  const matched = criteriaTokens.filter((token) => candidateTokens.has(token));
  const synonymMatched = criterion.synonyms
    .map(canonicalToken)
    .filter((token) => candidateTokens.has(token) && !matched.includes(token));
  const denominator = Math.min(criteriaTokens.length, 5);
  const score = ((matched.length + synonymMatched.length * 0.45) / denominator) * 100;
  return clampScore(Math.round(score));
}

export function splitSentences(text: string) {
  return text
    .replace(/(으나|지만|있지만|있으나)/gu, "$1\n")
    .split(/[\n.!?。；;]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function experienceSignalScore(text: string) {
  if (text.trim().length === 0) {
    return 0;
  }

  let score = 25;
  if (/\d+\s*(년|개월|%|건|명|회|배|억|만)/u.test(text)) score += 25;
  if (/개발|구현|운영|설계|리딩|개선|단축|향상|저감|관리|자동화|구축/u.test(text)) {
    score += 25;
  }
  if (/프로젝트|서비스|시스템|도구|리포트|플랫폼|workflow|process|pipeline/i.test(text)) {
    score += 15;
  }
  if (/담당|주도|리드|책임|배포|운영|달성/u.test(text)) score += 10;
  if (/학습|튜토리얼|교육 수강|관심|희망|예정|기초 이해|키워드/u.test(text)) {
    score -= 35;
  }
  return clampScore(score);
}

export function evidenceQuality(sentence: string) {
  if (!sentence.trim()) {
    return 0;
  }

  let score = 25;
  if (sentence.length >= 24) score += 15;
  if (/\d+\s*(년|개월|%|건|명|회|배|억|만)/u.test(sentence)) score += 25;
  if (/개발|구현|운영|설계|리딩|개선|단축|향상|저감|자동화|구축/u.test(sentence)) {
    score += 20;
  }
  if (/담당|주도|리드|책임|배포|운영|달성/u.test(sentence)) score += 10;
  if (/학습|튜토리얼|교육 수강|관심|희망|예정|기초 이해|키워드/u.test(sentence)) {
    score -= 35;
  }
  if (tokenize(sentence).length <= 5 && !/\d+\s*(년|개월|%|건|명|회|배|억|만)/u.test(sentence)) {
    score -= 15;
  }
  return clampScore(score);
}

export function semanticTextSimilarity(a: string, b: string) {
  const aTokens = Array.from(new Set(tokenize(a).map(canonicalToken)));
  const bTokens = new Set(tokenize(b).map(canonicalToken));
  if (aTokens.length === 0 || bTokens.size === 0) return 0;

  const matched = aTokens.filter((token) => bTokens.has(token)).length;
  return clampScore(Math.round(45 + (matched / aTokens.length) * 55));
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeToken(token: string) {
  return token
    .trim()
    .replace(/(으로|에서|에게|하고|처럼|까지|부터|보다|으로서|은|는|이|가|을|를|의|과|와|도|만|에)$/u, "")
    .replace(/^(필수|우대|성과|협업|경험|도메인)$/u, "")
    .trim();
}

function canonicalToken(token: string) {
  const normalized = normalizeToken(token.toLowerCase());
  const groups = getRelevantSynonymGroups(normalized);
  const group = groups.find((item) => item.terms.some((term) => isEquivalentToken(normalized, term)));
  return group?.terms[0].toLowerCase() ?? normalized;
}

function isEquivalentToken(a: string, b: string) {
  const normalizedA = normalizeToken(a.toLowerCase());
  const normalizedB = normalizeToken(b.toLowerCase());
  return (
    normalizedA === normalizedB ||
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  );
}
