import { NextResponse } from "next/server";

import { MockAuthAdapter, type AuthContext } from "./auth";
import { ReviewConflictError, ReviewServiceError } from "../reviews/service";
import { JsonBodyError, readBoundedJson } from "./requestBody";

const authAdapter = new MockAuthAdapter({ enabled: process.env.NODE_ENV !== "production" });

export async function authenticateReviewRequest(request: Request): Promise<AuthContext | null> {
  return authAdapter.authenticate(request);
}

export async function readReviewJson(request: Request) {
  return readBoundedJson(request, 5 * 1024 * 1024);
}

export function reviewErrorResponse(error: unknown) {
  if (error instanceof JsonBodyError) {
    return error.code === "PAYLOAD_TOO_LARGE"
      ? apiError(413, error.code, "검토 요청 크기가 허용 범위를 초과했습니다.")
      : apiError(400, error.code, "검토 요청 형식이 올바르지 않습니다.");
  }
  if (error instanceof ReviewConflictError) {
    return apiError(409, error.code, error.message);
  }
  if (error instanceof ReviewServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "VALIDATION_ERROR"
            ? 422
            : 410;
    return apiError(status, error.code, error.message, error.details);
  }
  return apiError(500, "INTERNAL_ERROR", "검토 요청 처리 중 오류가 발생했습니다.");
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers: noStoreHeaders() }
  );
}

export function apiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return { "cache-control": "no-store", "x-content-type-options": "nosniff" };
}
