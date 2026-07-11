import { describe, expect, it } from "vitest";

import { POST as createReview } from "../app/api/review-requests/route";
import { GET as getReview } from "../app/api/review-requests/[id]/route";

function recruiterHeaders() {
  return {
    "content-type": "application/json",
    "x-rolefit-mock-user": "recruiter-route-test",
    "x-rolefit-mock-name": "Test Recruiter",
    "x-rolefit-mock-role": "Recruiter"
  };
}

function payload() {
  return {
    jobId: "job-route-test",
    candidateId: "candidate-route-test",
    reportId: "report-route-test",
    resumeDocumentId: "resume-route-test",
    resumeVersion: "v1",
    reviewerId: "reviewer-route-test",
    dueAt: "2099-07-20T09:00:00.000Z",
    jobTitle: "합성 포지션",
    candidateName: "합성 후보자",
    recruiterName: "테스트 채용담당자",
    hrDecision: "부서 검토 요청",
    hrNote: "합성 검토 메모",
    score: 70,
    confidence: "충분",
    criteria: [
      {
        id: "criterion-route-test",
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

describe("review request routes", () => {
  it("requires authentication to create a review request", async () => {
    const response = await createReview(
      new Request("http://localhost/api/review-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload())
      })
    );
    expect(response.status).toBe(401);
  });

  it("allows only the assigned reviewer to read the created packet", async () => {
    const createdResponse = await createReview(
      new Request("http://localhost/api/review-requests", {
        method: "POST",
        headers: recruiterHeaders(),
        body: JSON.stringify(payload())
      })
    );
    const created = await createdResponse.json();
    const id = created.data.request.id as string;

    const denied = await getReview(
      new Request(`http://localhost/api/review-requests/${id}`, {
        headers: {
          "x-rolefit-mock-user": "other-reviewer",
          "x-rolefit-mock-name": "Other Reviewer",
          "x-rolefit-mock-role": "DepartmentReviewer"
        }
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(denied.status).toBe(403);

    const allowed = await getReview(
      new Request(`http://localhost/api/review-requests/${id}`, {
        headers: {
          "x-rolefit-mock-user": "reviewer-route-test",
          "x-rolefit-mock-name": "Assigned Reviewer",
          "x-rolefit-mock-role": "DepartmentReviewer"
        }
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).data.resume.text).toBe("합성 CV");
  });
});
