import { describe, expect, it } from "vitest";

import {
  createEmptyInterviewFeedback,
  isInterviewFeedbackDraft,
  isReviewTransitionAllowed,
  validateInterviewFeedback,
  type ReviewRequest
} from "../lib/reviews/domain";

const request = (status: ReviewRequest["status"]): ReviewRequest => ({
  id: "review-1",
  jobId: "job-1",
  candidateId: "candidate-1",
  reportId: "report-1",
  resumeDocumentId: "resume-1",
  resumeVersion: "v1",
  recruiterId: "recruiter-1",
  reviewerId: "reviewer-1",
  status,
  dueAt: "2026-07-20T09:00:00.000Z",
  revision: 0
});

describe("department review workflow domain", () => {
  it("allows only the documented forward workflow and terminal cancellation", () => {
    expect(isReviewTransitionAllowed("DRAFT", "SENT")).toBe(true);
    expect(isReviewTransitionAllowed("SENT", "OPENED")).toBe(true);
    expect(isReviewTransitionAllowed("OPENED", "IN_PROGRESS")).toBe(true);
    expect(isReviewTransitionAllowed("IN_PROGRESS", "SUBMITTED")).toBe(true);
    expect(isReviewTransitionAllowed("SENT", "CANCELLED")).toBe(true);
    expect(isReviewTransitionAllowed("SUBMITTED", "IN_PROGRESS")).toBe(false);
    expect(isReviewTransitionAllowed("CANCELLED", "SENT")).toBe(false);
  });

  it("creates an independent blank scorecard for every criterion", () => {
    const draft = createEmptyInterviewFeedback(["criterion-1", "criterion-2"]);

    expect(draft.overallOpinion).toBe("");
    expect(draft.criteria).toEqual([
      { criterionId: "criterion-1", rating: "NOT_ASSESSED", evidence: "" },
      { criterionId: "criterion-2", rating: "NOT_ASSESSED", evidence: "" }
    ]);
  });

  it("rejects submission until date, opinion, ratings, and evidence are complete", () => {
    const draft = createEmptyInterviewFeedback(["criterion-1"]);
    expect(validateInterviewFeedback(draft)).toEqual(
      expect.arrayContaining(["INTERVIEW_DATE_REQUIRED", "OVERALL_OPINION_REQUIRED", "CRITERIA_INCOMPLETE"])
    );

    const complete = {
      ...draft,
      interviewDate: "2026-07-18",
      interviewer: "현업 부서장",
      overallOpinion: "RECOMMEND" as const,
      criteria: [{ criterionId: "criterion-1", rating: "MET" as const, evidence: "구체적 사례 확인" }]
    };

    expect(validateInterviewFeedback(complete)).toEqual([]);
  });

  it("keeps the resume snapshot version on the request contract", () => {
    expect(request("SENT")).toMatchObject({ resumeDocumentId: "resume-1", resumeVersion: "v1" });
  });

  it("rejects malformed external feedback payloads at the API boundary", () => {
    expect(isInterviewFeedbackDraft(createEmptyInterviewFeedback(["criterion-1"]))).toBe(true);
    expect(isInterviewFeedbackDraft({ criteria: [{ rating: "HACKED" }] })).toBe(false);
    expect(isInterviewFeedbackDraft({ ...createEmptyInterviewFeedback([]), strengths: 123 })).toBe(false);
  });
});
