import { apiError, apiJson, authenticateReviewRequest, reviewErrorResponse } from "../../../../../lib/server/reviewApi";
import { reviewService } from "../../../../../lib/reviews/runtime";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await authenticateReviewRequest(request);
  if (!actor) return apiError(401, "UNAUTHENTICATED", "인증이 필요합니다.");
  try {
    const { id } = await context.params;
    const packet = await reviewService.get(id, actor);
    return apiJson({
      data: {
        documentId: packet.request.resumeDocumentId,
        version: packet.request.resumeVersion,
        ...packet.resume
      }
    });
  } catch (error) {
    return reviewErrorResponse(error);
  }
}
