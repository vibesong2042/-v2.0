import { createHash } from "node:crypto";

import { analyzeStructuredMatchWithAdapter } from "../matching";
import { MockAiMatchingAdapter } from "../matching/aiAdapter";
import type { AuthContext } from "./auth";
import {
  validateAnalyzeMatchRequest,
  type AnalyzeMatchRequest,
  type AnalyzeMatchResponse
} from "./analysisContract";

const mockAiAdapter = new MockAiMatchingAdapter();

export class AnalysisFoundationError extends Error {
  constructor(public readonly code: "IDEMPOTENCY_CONFLICT" | "TOO_MANY_REQUESTS") {
    super(code);
  }
}

type CachedExecution<T> = {
  fingerprint: string;
  promise: Promise<T>;
  createdAt: number;
};

export class AnalysisExecutionCoordinator {
  private readonly executions = new Map<string, CachedExecution<unknown>>();
  private activeCount = 0;

  constructor(
    private readonly options: { maxConcurrent: number; maxEntries?: number } = { maxConcurrent: 2 }
  ) {}

  async execute<T>(
    scope: string,
    idempotencyKey: string,
    fingerprint: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const cacheKey = `${scope}:${idempotencyKey}`;
    const existing = this.executions.get(cacheKey) as CachedExecution<T> | undefined;

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new AnalysisFoundationError("IDEMPOTENCY_CONFLICT");
      }
      return existing.promise;
    }

    if (this.activeCount >= this.options.maxConcurrent) {
      throw new AnalysisFoundationError("TOO_MANY_REQUESTS");
    }

    this.activeCount += 1;
    const promise = operation().finally(() => {
      this.activeCount -= 1;
    });
    this.executions.set(cacheKey, { fingerprint, promise, createdAt: Date.now() });
    this.prune();
    return promise;
  }

  private prune() {
    const maxEntries = this.options.maxEntries ?? 200;
    if (this.executions.size <= maxEntries) return;

    const oldest = [...this.executions.entries()].sort(
      (left, right) => left[1].createdAt - right[1].createdAt
    )[0];
    if (oldest) this.executions.delete(oldest[0]);
  }
}

export async function analyzeMatchOnServer(
  input: AnalyzeMatchRequest,
  actor: AuthContext
): Promise<AnalyzeMatchResponse> {
  const validation = validateAnalyzeMatchRequest(input);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const value = validation.value;
  const report = await analyzeStructuredMatchWithAdapter({
    coreCriteria: {
      jobDescription: value.coreCriteria.jobDescription.text,
      additionalMaterial: value.coreCriteria.additionalMaterial.text
    },
    candidateInfo: {
      candidateResume: value.candidateInfo.candidateResume.text,
      referenceEmployeeResume: value.candidateInfo.referenceEmployeeResume.text
    },
    supportingCriteria: {
      teamStrategy: value.supportingCriteria.teamStrategy.text,
      managerMbo: value.supportingCriteria.managerMbo.text,
      subjectiveOpinion: value.supportingCriteria.subjectiveOpinion.text
    },
    weights: value.weights,
    language: value.language,
    adapter: mockAiAdapter
  });

  void actor;
  return {
    ok: true,
    requestId: value.requestId,
    candidateId: value.candidateInfo.candidateId,
    report
  };
}

export function fingerprintAnalyzeMatchRequest(input: AnalyzeMatchRequest) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
