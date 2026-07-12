import { describe, expect, it } from "vitest";

import { DEFAULT_WEIGHT_SET } from "../lib/matching";
import {
  MockAuthAdapter,
  authorizeRole,
  type AuthContext
} from "../lib/server/auth";
import {
  validateAnalyzeMatchRequest,
  type AnalyzeMatchRequest
} from "../lib/server/analysisContract";
import {
  AnalysisExecutionCoordinator,
  analyzeMatchOnServer
} from "../lib/server/analysisService";

function verified(text: string) {
  return { text, verified: true };
}

function validRequest(): AnalyzeMatchRequest {
  return {
    requestId: "request-001",
    idempotencyKey: "analysis-candidate-001",
    coreCriteria: {
      jobDescription: verified("TypeScript 기반 서비스 운영 경험"),
      additionalMaterial: verified("")
    },
    candidateInfo: {
      candidateId: "candidate-001",
      candidateResume: verified("TypeScript 서비스를 3년간 개발하고 운영했습니다."),
      referenceEmployeeResume: verified("")
    },
    supportingCriteria: {
      teamStrategy: verified("서비스 운영 자동화"),
      managerMbo: verified("운영 안정성 향상"),
      subjectiveOpinion: verified("문제 해결 경험")
    },
    weights: DEFAULT_WEIGHT_SET,
    language: "ko"
  };
}

const recruiter: AuthContext = {
  userId: "recruiter-001",
  displayName: "테스트 채용담당자",
  role: "Recruiter"
};

describe("production foundation", () => {
  it("fails closed when mock authentication is disabled", async () => {
    const adapter = new MockAuthAdapter({ enabled: false });
    const request = new Request("http://localhost/api/analyze-match", {
      headers: { "x-rolefit-mock-user": "recruiter-001", "x-rolefit-mock-role": "Recruiter" }
    });

    await expect(adapter.authenticate(request)).resolves.toBeNull();
  });

  it("allows only recruiters and admins to run analysis", () => {
    expect(authorizeRole(recruiter, ["Recruiter", "Admin"])).toBe(true);
    expect(
      authorizeRole(
        { ...recruiter, role: "DepartmentReviewer" },
        ["Recruiter", "Admin"]
      )
    ).toBe(false);
  });

  it("rejects an unverified required document", () => {
    const input = validRequest();
    input.candidateInfo.candidateResume.verified = false;

    const result = validateAnalyzeMatchRequest(input);

    expect(result).toEqual({
      valid: false,
      error: { code: "DOCUMENT_NOT_VERIFIED", message: "확인 완료된 문서만 분석할 수 있습니다." }
    });
  });

  it("rejects oversized or malformed request identifiers", () => {
    const input = validRequest();
    input.requestId = "x".repeat(129);

    expect(validateAnalyzeMatchRequest(input)).toMatchObject({
      valid: false,
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("runs one candidate on the server without changing the rule result contract", async () => {
    const result = await analyzeMatchOnServer(validRequest(), recruiter);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidateId).toBe("candidate-001");
      expect(result.report.overallMatch.score).toBeGreaterThanOrEqual(0);
      expect(result.report.aiShadowReview.status).toBe("completed");
    }
  });

  it("returns the same in-flight result for an identical idempotency key", async () => {
    const coordinator = new AnalysisExecutionCoordinator({ maxConcurrent: 2 });
    let calls = 0;
    const operation = async () => {
      calls += 1;
      return { value: "same" };
    };

    const [first, second] = await Promise.all([
      coordinator.execute("recruiter-001", "same-key", "same-payload", operation),
      coordinator.execute("recruiter-001", "same-key", "same-payload", operation)
    ]);

    expect(first).toEqual(second);
    expect(calls).toBe(1);
  });

  it("rejects reuse of an idempotency key with a different payload", async () => {
    const coordinator = new AnalysisExecutionCoordinator({ maxConcurrent: 2 });
    await coordinator.execute("recruiter-001", "same-key", "payload-a", async () => "done");

    await expect(
      coordinator.execute("recruiter-001", "same-key", "payload-b", async () => "other")
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("removes failed executions so the same key can be retried", async () => {
    const coordinator = new AnalysisExecutionCoordinator({ maxConcurrent: 2 });

    await expect(
      coordinator.execute("recruiter-001", "retry-key", "payload", async () => {
        throw new Error("synthetic failure");
      })
    ).rejects.toThrow("synthetic failure");

    await expect(
      coordinator.execute("recruiter-001", "retry-key", "payload", async () => "retried")
    ).resolves.toBe("retried");
  });

  it("expires completed executions after the configured TTL", async () => {
    let now = 1_000;
    const coordinator = new AnalysisExecutionCoordinator({
      maxConcurrent: 2,
      ttlMs: 5 * 60 * 1000,
      now: () => now
    });
    let calls = 0;
    const operation = async () => `result-${++calls}`;

    await expect(coordinator.execute("recruiter-001", "ttl-key", "payload", operation)).resolves.toBe("result-1");
    now += 5 * 60 * 1000 + 1;
    await expect(coordinator.execute("recruiter-001", "ttl-key", "payload", operation)).resolves.toBe("result-2");
  });
});
