import { InMemoryReviewRepository, ReviewWorkflowService } from "./service";

const globalRuntime = globalThis as typeof globalThis & {
  roleFitReviewRepository?: InMemoryReviewRepository;
};

export const reviewRepository =
  globalRuntime.roleFitReviewRepository ?? new InMemoryReviewRepository();

if (process.env.NODE_ENV !== "production") {
  globalRuntime.roleFitReviewRepository = reviewRepository;
}

export const reviewService = new ReviewWorkflowService(reviewRepository);

