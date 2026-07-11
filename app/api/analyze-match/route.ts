import { NextResponse } from "next/server";

import { MockAuthAdapter, authorizeRole } from "../../../lib/server/auth";
import {
  validateAnalyzeMatchRequest,
  type AnalyzeMatchError,
  type AnalyzeMatchResponse
} from "../../../lib/server/analysisContract";
import {
  AnalysisExecutionCoordinator,
  AnalysisFoundationError,
  analyzeMatchOnServer,
  fingerprintAnalyzeMatchRequest
} from "../../../lib/server/analysisService";
import { JsonBodyError, readBoundedJson } from "../../../lib/server/requestBody";

export const runtime = "nodejs";

const MAX_JSON_BYTES = 5 * 1024 * 1024;
const coordinator = new AnalysisExecutionCoordinator({ maxConcurrent: 2 });
const authAdapter = new MockAuthAdapter({ enabled: process.env.NODE_ENV !== "production" });

export async function POST(request: Request) {
  const actor = await authAdapter.authenticate(request);
  if (!actor) {
    return errorResponse(401, "UNAUTHENTICATED", "인증이 필요합니다.");
  }

  if (!authorizeRole(actor, ["Recruiter", "Admin"])) {
    return errorResponse(403, "FORBIDDEN", "분석 실행 권한이 없습니다.");
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAX_JSON_BYTES);
  } catch (error) {
    if (error instanceof JsonBodyError && error.code === "PAYLOAD_TOO_LARGE") {
      return errorResponse(413, error.code, "분석 요청 크기가 허용 범위를 초과했습니다.");
    }
    return errorResponse(400, "INVALID_REQUEST", "분석 요청 형식이 올바르지 않습니다.");
  }

  const validation = validateAnalyzeMatchRequest(body);
  if (!validation.valid) {
    return json(validationError(validation.error), 400);
  }

  const input = validation.value;

  try {
    const result = await coordinator.execute(
      actor.userId,
      input.idempotencyKey,
      fingerprintAnalyzeMatchRequest(input),
      () => analyzeMatchOnServer(input, actor)
    );
    return json(result, result.ok ? 200 : 400);
  } catch (error) {
    if (error instanceof AnalysisFoundationError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return errorResponse(409, error.code, "동일한 요청 키가 다른 분석에 사용되었습니다.");
      }
      return errorResponse(429, error.code, "동시에 처리할 수 있는 분석 수를 초과했습니다.");
    }

    return errorResponse(500, "INTERNAL_ERROR", "분석 처리 중 오류가 발생했습니다.");
  }
}

function validationError(error: AnalyzeMatchError): AnalyzeMatchResponse {
  return { ok: false, error };
}

function errorResponse(status: number, code: AnalyzeMatchError["code"], message: string) {
  return json({ ok: false, error: { code, message } }, status);
}

function json(body: AnalyzeMatchResponse, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
