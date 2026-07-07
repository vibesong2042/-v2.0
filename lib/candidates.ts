import type { DocumentInput, MatchConfidence } from "./matching";

export type CandidateCase = {
  id: string;
  name: string;
  resume: DocumentInput;
};

export type CandidateReportSummary = {
  id: string;
  name: string;
  score: number;
  confidence: MatchConfidence["level"];
};

const emptyDocument: DocumentInput = {
  text: "",
  parseStatus: "idle"
};

export function createCandidateCase(index: number, id = `candidate-${Date.now()}-${index}`): CandidateCase {
  return {
    id,
    name: `지원자 ${index + 1}`,
    resume: { ...emptyDocument }
  };
}

export function candidateNameFromFile(fileName: string, index: number) {
  const baseName = fileName.replace(/\.[^.]+$/u, "").trim();
  return baseName || `지원자 ${index + 1}`;
}

export function removeCandidateCase(candidates: CandidateCase[], candidateId: string) {
  const nextCandidates = candidates.filter((candidate) => candidate.id !== candidateId);

  return nextCandidates.length > 0 ? nextCandidates : [createCandidateCase(0, "candidate-1")];
}

export function hasCandidateContent(candidate: CandidateCase) {
  return candidate.resume.text.trim().length > 0 || Boolean(candidate.resume.fileName);
}

export function summarizeCandidateReports<T extends CandidateReportSummary>(reports: T[]) {
  return [...reports].sort((a, b) => b.score - a.score);
}
