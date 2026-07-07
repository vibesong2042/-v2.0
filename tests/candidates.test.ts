import { describe, expect, it } from "vitest";

import {
  candidateNameFromFile,
  createCandidateCase,
  hasCandidateContent,
  removeCandidateCase,
  summarizeCandidateReports
} from "../lib/candidates";

describe("candidate case workflow", () => {
  it("uses a readable candidate name from the uploaded file name", () => {
    expect(candidateNameFromFile("CV_홍길동.pdf", 0)).toBe("CV_홍길동");
    expect(candidateNameFromFile("", 1)).toBe("지원자 2");
  });

  it("keeps one empty candidate slot when the last candidate is removed", () => {
    const onlyCandidate = createCandidateCase(0, "candidate-1");
    const result = removeCandidateCase([onlyCandidate], "candidate-1");

    expect(result).toHaveLength(1);
    expect(result[0].resume.text).toBe("");
    expect(result[0].resume.parseStatus).toBe("idle");
  });

  it("treats empty candidate slots as non-analysis targets", () => {
    expect(hasCandidateContent(createCandidateCase(0, "candidate-1"))).toBe(false);
    expect(
      hasCandidateContent({
        ...createCandidateCase(0, "candidate-1"),
        resume: { text: "", fileName: "candidate.pdf", parseStatus: "parsing" }
      })
    ).toBe(true);
    expect(
      hasCandidateContent({
        ...createCandidateCase(0, "candidate-1"),
        resume: { text: "지원자 경력", parseStatus: "idle" }
      })
    ).toBe(true);
  });

  it("sorts candidate report summaries by score descending", () => {
    const summaries = summarizeCandidateReports([
      {
        id: "candidate-1",
        name: "지원자 1",
        score: 68,
        confidence: "일부 확인 필요"
      },
      {
        id: "candidate-2",
        name: "지원자 2",
        score: 82,
        confidence: "근거 충분"
      }
    ]);

    expect(summaries.map((item) => item.name)).toEqual(["지원자 2", "지원자 1"]);
  });
});
