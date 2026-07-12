import { MockAuditAdapter } from "./adapters";
import { InMemoryReviewRepository, ReviewWorkflowService } from "./service";

const globalRuntime = globalThis as typeof globalThis & {
  roleFitReviewRepository?: InMemoryReviewRepository;
  roleFitReviewAudit?: MockAuditAdapter;
};

export const reviewRepository =
  globalRuntime.roleFitReviewRepository ?? new InMemoryReviewRepository();
export const reviewAudit = globalRuntime.roleFitReviewAudit ?? new MockAuditAdapter();

if (process.env.NODE_ENV !== "production") {
  globalRuntime.roleFitReviewRepository = reviewRepository;
  globalRuntime.roleFitReviewAudit = reviewAudit;
}

export const reviewService = new ReviewWorkflowService(reviewRepository, reviewAudit);
