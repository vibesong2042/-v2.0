import { describe, expect, it } from "vitest";

import { POST } from "../app/api/analyze-match/route";
import { DEFAULT_WEIGHT_SET } from "../lib/matching";

function payload(key: string) {
  const verified = (text: string) => ({ text, verified: true });
  return {
    requestId: `request-${key}`,
    idempotencyKey: key,
    coreCriteria: {
      jobDescription: verified("TypeScript 운영 경험"),
      additionalMaterial: verified("")
    },
    candidateInfo: {
      candidateId: `candidate-${key}`,
      candidateResume: verified("TypeScript 서비스를 3년간 개발하고 운영했습니다."),
      referenceEmployeeResume: verified("")
    },
    supportingCriteria: {
      teamStrategy: verified(""),
      managerMbo: verified(""),
      subjectiveOpinion: verified("")
    },
    weights: DEFAULT_WEIGHT_SET,
    language: "ko"
  };
}

function request(body: unknown, role?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (role) {
    headers.set("x-rolefit-mock-user", `user-${role}`);
    headers.set("x-rolefit-mock-role", role);
  }
  return new Request("http://localhost/api/analyze-match", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

describe("POST /api/analyze-match", () => {
  it("returns 401 without an authenticated user", async () => {
    const response = await POST(request(payload("unauthenticated")));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" }
    });
  });

  it("returns 403 for a department reviewer", async () => {
    const response = await POST(request(payload("reviewer"), "DepartmentReviewer"));

    expect(response.status).toBe(403);
  });

  it("returns 400 for an invalid request without exposing internals", async () => {
    const response = await POST(request({ requestId: "broken" }, "Recruiter"));
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "분석 요청 형식이 올바르지 않습니다." }
    });
    expect(JSON.stringify(result)).not.toContain("stack");
  });

  it("returns a candidate-isolated report for a recruiter", async () => {
    const response = await POST(request(payload("success"), "Recruiter"));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(result).toMatchObject({
      ok: true,
      requestId: "request-success",
      candidateId: "candidate-success"
    });
    expect(result.report.overallMatch.score).toBeGreaterThanOrEqual(0);
  });

  it("returns 409 when the same idempotency key is reused for another payload", async () => {
    const first = payload("conflict");
    await POST(request(first, "Recruiter"));
    const changed = payload("conflict");
    changed.candidateInfo.candidateResume.text = "전혀 다른 후보자 문서";

    const response = await POST(request(changed, "Recruiter"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "IDEMPOTENCY_CONFLICT" }
    });
  });
});
