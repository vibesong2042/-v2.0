import { describe, expect, it } from "vitest";

import { createEmptyInterviewFeedback } from "../lib/reviews/domain";
import {
  InMemoryReviewRepository,
  ReviewConflictError,
  ReviewWorkflowService,
  type ReviewPacket
} from "../lib/reviews/service";

function packet(): ReviewPacket {
  return {
    request: {
      id: "review-1",
      jobId: "job-1",
      candidateId: "candidate-1",
      reportId: "report-1",
      resumeDocumentId: "resume-1",
      resumeVersion: "v1",
      recruiterId: "recruiter-1",
      reviewerId: "reviewer-1",
      status: "SENT",
      dueAt: "2099-07-20T09:00:00.000Z",
      revision: 0
    },
    jobTitle: "로봇 소프트웨어 엔지니어",
    candidateName: "합성 후보자",
    recruiterName: "테스트 채용담당자",
    hrDecision: "부서 검토 요청",
    hrNote: "직무 필수요건을 중심으로 확인해 주세요.",
    score: 78,
    confidence: "충분",
    criteria: [
      {
        id: "criterion-1",
        title: "TypeScript 운영 경험",
        required: true,
        status: "MET",
        evidence: "합성 CV에서 서비스 운영 사례를 확인했습니다.",
        interviewQuestion: "장애 대응 사례를 설명해 주세요."
      }
    ],
    resume: { fileName: "synthetic-resume.txt", contentType: "text/plain", text: "합성 CV 본문" },
    feedback: createEmptyInterviewFeedback(["criterion-1"])
  };
}

describe("review workflow service", () => {
  it("creates a sent review snapshot with a blank independent scorecard", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository());
    const created = await service.create(
      {
        jobId: "job-1",
        candidateId: "candidate-1",
        reportId: "report-1",
        resumeDocumentId: "resume-1",
        resumeVersion: "v1",
        reviewerId: "reviewer-1",
        dueAt: "2099-07-20T09:00:00.000Z",
        jobTitle: "로봇 소프트웨어 엔지니어",
        candidateName: "합성 후보자",
        recruiterName: "테스트 채용담당자",
        hrDecision: "부서 검토 요청",
        hrNote: "필수요건을 확인해 주세요.",
        score: 78,
        confidence: "충분",
        criteria: packet().criteria,
        resume: packet().resume
      },
      { userId: "recruiter-1", role: "Recruiter" }
    );

    expect(created.request.status).toBe("SENT");
    expect(created.feedback.criteria[0].rating).toBe("NOT_ASSESSED");
  });

  it("limits reads to the owning recruiter or assigned reviewer", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository([packet()]));

    await expect(service.get("review-1", { userId: "reviewer-1", role: "DepartmentReviewer" })).resolves.toBeTruthy();
    await expect(service.get("review-1", { userId: "other", role: "DepartmentReviewer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("moves an opened review to in progress when the assigned reviewer saves", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository([packet()]));
    const current = await service.get("review-1", { userId: "reviewer-1", role: "DepartmentReviewer" });
    const next = await service.saveDraft(
      "review-1",
      { revision: current.request.revision, feedback: current.feedback },
      { userId: "reviewer-1", role: "DepartmentReviewer" }
    );

    expect(next.request.status).toBe("IN_PROGRESS");
    expect(next.request.revision).toBe(current.request.revision + 1);
  });

  it("rejects a stale draft revision", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository([packet()]));
    await service.saveDraft(
      "review-1",
      { revision: 0, feedback: createEmptyInterviewFeedback(["criterion-1"]) },
      { userId: "reviewer-1", role: "DepartmentReviewer" }
    );

    await expect(
      service.saveDraft(
        "review-1",
        { revision: 0, feedback: createEmptyInterviewFeedback(["criterion-1"]) },
        { userId: "reviewer-1", role: "DepartmentReviewer" }
      )
    ).rejects.toBeInstanceOf(ReviewConflictError);
  });

  it("submits complete feedback as a terminal state", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository([packet()]));
    const feedback = {
      ...createEmptyInterviewFeedback(["criterion-1"]),
      interviewDate: "2026-07-18",
      interviewer: "현업 부서장",
      criteria: [{ criterionId: "criterion-1", rating: "MET" as const, evidence: "면접 사례 확인" }],
      overallOpinion: "RECOMMEND" as const
    };

    const next = await service.submit(
      "review-1",
      { revision: 0, feedback },
      { userId: "reviewer-1", role: "DepartmentReviewer" }
    );

    expect(next.request.status).toBe("SUBMITTED");
    expect(next.request.submittedAt).toBeTruthy();
  });

  it("allows only the owning recruiter to cancel an active request", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository([packet()]));
    const cancelled = await service.cancel("review-1", { userId: "recruiter-1", role: "Recruiter" });
    expect(cancelled.request.status).toBe("CANCELLED");
    await expect(
      service.cancel("review-1", { userId: "other", role: "Recruiter" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows only the owning recruiter to request an active-review reminder", async () => {
    const service = new ReviewWorkflowService(new InMemoryReviewRepository([packet()]));
    await expect(
      service.remind("review-1", { userId: "recruiter-1", role: "Recruiter" })
    ).resolves.toMatchObject({ request: { status: "SENT" } });
    await expect(
      service.remind("review-1", { userId: "reviewer-1", role: "DepartmentReviewer" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
