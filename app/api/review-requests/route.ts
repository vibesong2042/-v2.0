import { apiError, apiJson, authenticateReviewRequest, reviewErrorResponse } from "../../../lib/server/reviewApi";
import { reviewService } from "../../../lib/reviews/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await authenticateReviewRequest(request);
  if (!actor) return apiError(401, "UNAUTHENTICATED", "인증이 필요합니다.");

  try {
    const body = await request.json();
    if (!isCreateInput(body)) return apiError(400, "INVALID_REQUEST", "검토 요청 형식이 올바르지 않습니다.");
    const packet = await reviewService.create(body, actor);
    return apiJson({ data: packet }, 201);
  } catch (error) {
    return reviewErrorResponse(error);
  }
}

function isCreateInput(value: unknown): value is Parameters<typeof reviewService.create>[0] {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.jobId === "string" &&
    typeof input.candidateId === "string" &&
    typeof input.reportId === "string" &&
    typeof input.resumeDocumentId === "string" &&
    typeof input.resumeVersion === "string" &&
    typeof input.reviewerId === "string" &&
    typeof input.dueAt === "string" &&
    typeof input.jobTitle === "string" &&
    typeof input.candidateName === "string" &&
    typeof input.recruiterName === "string" &&
    input.hrDecision === "부서 검토 요청" &&
    typeof input.hrNote === "string" &&
    typeof input.score === "number" &&
    typeof input.confidence === "string" &&
    Array.isArray(input.criteria) &&
    !!input.resume && typeof input.resume === "object"
  );
}

