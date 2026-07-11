import { apiError, apiJson, authenticateReviewRequest, reviewErrorResponse } from "../../../../../lib/server/reviewApi";
import { reviewService } from "../../../../../lib/reviews/runtime";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await authenticateReviewRequest(request);
  if (!actor) return apiError(401, "UNAUTHENTICATED", "인증이 필요합니다.");
  try {
    const { id } = await context.params;
    const packet = await reviewService.remind(id, actor);
    return apiJson({ data: packet, message: "Mock 리마인더가 생성되었습니다. 실제 메일은 발송되지 않았습니다." });
  } catch (error) {
    return reviewErrorResponse(error);
  }
}

