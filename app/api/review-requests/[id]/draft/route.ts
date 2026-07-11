import { apiError, apiJson, authenticateReviewRequest, readReviewJson, reviewErrorResponse } from "../../../../../lib/server/reviewApi";
import { reviewService } from "../../../../../lib/reviews/runtime";
import { validateFeedbackRequest } from "../../../../../lib/reviews/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await authenticateReviewRequest(request);
  if (!actor) return apiError(401, "UNAUTHENTICATED", "인증이 필요합니다.");
  try {
    const { id } = await context.params;
    const body = await readReviewJson(request);
    if (!validateFeedbackRequest(body)) {
      return apiError(400, "INVALID_REQUEST", "임시저장 형식이 올바르지 않습니다.");
    }
    return apiJson({ data: await reviewService.saveDraft(id, body, actor) });
  } catch (error) {
    return reviewErrorResponse(error);
  }
}
