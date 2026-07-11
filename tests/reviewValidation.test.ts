import { describe, expect, it } from "vitest";

import { validateCreateReviewInput } from "../lib/reviews/validation";

function input() {
  return {
    jobId: "job-1",
    candidateId: "candidate-1",
    reportId: "report-1",
    resumeDocumentId: "resume-1",
    resumeVersion: "v1",
    reviewerId: "reviewer-1",
    dueAt: "2099-07-20T09:00:00.000Z",
    jobTitle: "합성 직무",
    candidateName: "합성 후보자",
    recruiterName: "테스트 담당자",
    hrDecision: "부서 검토 요청",
    hrNote: "합성 메모",
    score: 70,
    confidence: "충분",
    criteria: [
      {
        id: "criterion-1",
        title: "합성 기준",
        required: true,
        status: "MET",
        evidence: "합성 근거",
        interviewQuestion: "합성 질문"
      }
    ],
    resume: { fileName: "synthetic.txt", contentType: "text/plain", text: "합성 CV" }
  };
}

describe("review input validation", () => {
  it("accepts a bounded synthetic review request", () => {
    expect(validateCreateReviewInput(input())).toBe(true);
  });

  it("rejects more than twelve criteria", () => {
    const value = input();
    value.criteria = Array.from({ length: 13 }, (_, index) => ({
      ...value.criteria[0],
      id: `criterion-${index}`
    }));
    expect(validateCreateReviewInput(value)).toBe(false);
  });

  it("rejects an expired due date and out-of-range score", () => {
    expect(validateCreateReviewInput({ ...input(), dueAt: "2020-01-01T00:00:00.000Z" })).toBe(false);
    expect(validateCreateReviewInput({ ...input(), score: 101 })).toBe(false);
  });
});
