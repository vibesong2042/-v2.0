import type { RubricCriterion } from "../matching";

const SYNONYM_GROUPS = [
  ["채용", "인사", "선발", "스크리닝", "recruiting", "hiring", "hr"],
  ["자동화", "workflow", "프로세스", "도구", "시스템"],
  ["검토", "평가", "심사", "screening", "review"],
  ["리포트", "보고서", "근거", "설명", "report", "evidence"],
  ["운영", "운용", "관리", "production", "operation"],
  ["개발", "구현", "설계", "build", "develop"],
  ["협업", "커뮤니케이션", "소통", "담당부서", "stakeholder"],
  ["성과", "개선", "단축", "향상", "절감", "impact"],
  ["보안", "감사", "security", "audit"],
  ["클라우드", "cloud", "aws", "azure", "gcp"]
];

const STOP_WORDS = new Set([
  "기반",
  "경험",
  "역량",
  "필수",
  "우대",
  "관련",
  "담당",
  "있는",
  "with",
  "and",
  "the",
  "for"
]);

export function tokenize(text: string) {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9가-힣]+/g) ?? []))
    .map(normalizeToken)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function expandSynonyms(tokens: string[]) {
  return Array.from(
    new Set(tokens.flatMap((token) => SYNONYM_GROUPS.find((items) => items.includes(token)) ?? [token]))
  );
}

export function directKeywordScore(criteriaTokens: string[], candidateTokens: string[]) {
  if (criteriaTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  const matched = criteriaTokens.filter((token) => candidateSet.has(token)).length;
  return Math.round((matched / criteriaTokens.length) * 100);
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
    .filter((token) => candidateTokens.has(token));
  const score = ((matched.length + synonymMatched.length * 0.35) / criteriaTokens.length) * 100;
  return clampScore(Math.round(score));
}

export function splitSentences(text: string) {
  return text
    .split(/[\n.!?。！？]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function experienceSignalScore(text: string) {
  if (text.trim().length === 0) {
    return 0;
  }

  let score = 25;
  if (/\d+\s*(년|개월|%|건|명|회)/u.test(text)) score += 25;
  if (/개발|구현|운영|설계|리딩|개선|단축|향상|관리|자동화/u.test(text)) score += 25;
  if (/프로젝트|서비스|시스템|도구|리포트|workflow|process/i.test(text)) score += 15;
  if (/담당|주도|리드|책임|배포|운영/u.test(text)) score += 10;
  return clampScore(score);
}

export function evidenceQuality(sentence: string) {
  if (!sentence.trim()) {
    return 0;
  }

  let score = 25;
  if (sentence.length >= 24) score += 15;
  if (/\d+\s*(년|개월|%|건|명|회)/u.test(sentence)) score += 25;
  if (/개발|구현|운영|설계|리딩|개선|단축|향상|자동화/u.test(sentence)) score += 20;
  if (/담당|주도|리드|책임|배포|운영/u.test(sentence)) score += 10;
  if (/이해|관심|학습|키워드/u.test(sentence)) score -= 35;
  if (tokenize(sentence).length <= 5 && !/\d+\s*(년|개월|%|건|명|회)/u.test(sentence)) {
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
    .replace(/(으로|에서|에게|하고|처럼|까지|부터|보다|와|과|로|를|을|이|가|은|는|에|의|용)$/u, "")
    .replace(/^(필수|우대|성과|협업|경험|도메인)$/u, "")
    .trim();
}

function canonicalToken(token: string) {
  const group = SYNONYM_GROUPS.find((items) =>
    items.some((item) => token.includes(item.toLowerCase()) || item.toLowerCase().includes(token))
  );
  return group?.[0] ?? token;
}
