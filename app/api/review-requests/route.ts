import { apiError, apiJson, authenticateReviewRequest, readReviewJson, reviewErrorResponse } from "../../../lib/server/reviewApi";
import { reviewService } from "../../../lib/reviews/runtime";
import { validateCreateReviewInput } from "../../../lib/reviews/validation";
import { authorizeRole } from "../../../lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await authenticateReviewRequest(request);
  if (!actor) return apiError(401, "UNAUTHENTICATED", "인증이 필요합니다.");
  if (!authorizeRole(actor, ["Recruiter", "Admin"])) {
    return apiError(403, "FORBIDDEN", "검토 요청 권한이 없습니다.");
  }

  try {
    const body = await readReviewJson(request);
    if (!validateCreateReviewInput(body)) return apiError(400, "INVALID_REQUEST", "검토 요청 형식이 올바르지 않습니다.");
    const packet = await reviewService.create(body, actor);
    return apiJson({ data: packet }, 201);
  } catch (error) {
    return reviewErrorResponse(error);
  }
}
