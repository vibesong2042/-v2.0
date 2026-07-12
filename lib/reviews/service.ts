import {
  createEmptyInterviewFeedback,
  isReviewTransitionAllowed,
  validateInterviewFeedback,
  type InterviewFeedbackDraft,
  type ReviewRequest
} from "./domain";
import { NoopAuditAdapter, type AuditAdapter, type ReviewAuditEvent } from "./adapters";

export type ReviewCriterion = {
  id: string;
  title: string;
  required: boolean;
  status: "MET" | "NOT_MET" | "UNDECIDED";
  evidence: string;
  interviewQuestion: string;
};

export type ReviewPacket = {
  request: ReviewRequest;
  jobTitle: string;
  candidateName: string;
  recruiterName: string;
  hrDecision: "부서 검토 요청" | "보류" | "제외";
  hrNote: string;
  score: number;
  confidence: string;
  criteria: ReviewCriterion[];
  resume: { fileName: string; contentType: string; text: string };
  feedback: InterviewFeedbackDraft;
};

export type ReviewActor = {
  userId: string;
  role: "Recruiter" | "DepartmentReviewer" | "Admin";
};

export interface ReviewRepository {
  get(id: string): Promise<ReviewPacket | null>;
  insert(packet: ReviewPacket): Promise<ReviewPacket>;
  save(packet: ReviewPacket, expectedRevision: number): Promise<ReviewPacket>;
}

export class ReviewServiceError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" | "VALIDATION_ERROR",
    message: string,
    readonly details?: unknown
  ) {
    super(message);
  }
}

export class ReviewConflictError extends Error {
  readonly code = "REVISION_CONFLICT";
}

export class InMemoryReviewRepository implements ReviewRepository {
  private readonly packets = new Map<string, { packet: ReviewPacket; createdAt: number }>();

  constructor(
    initialPackets: ReviewPacket[] = [],
    private readonly options: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}
  ) {
    initialPackets.forEach((packet) =>
      this.packets.set(packet.request.id, { packet: clone(packet), createdAt: this.now() })
    );
  }

  async get(id: string) {
    this.pruneExpired();
    const entry = this.packets.get(id);
    return entry ? clone(entry.packet) : null;
  }

  async insert(packet: ReviewPacket) {
    this.pruneExpired();
    if (this.packets.has(packet.request.id)) {
      throw new ReviewConflictError("이미 존재하는 검토 요청입니다.");
    }
    this.packets.set(packet.request.id, { packet: clone(packet), createdAt: this.now() });
    this.pruneCapacity();
    return clone(packet);
  }

  async save(packet: ReviewPacket, expectedRevision: number) {
    this.pruneExpired();
    const current = this.packets.get(packet.request.id);
    if (!current || current.packet.request.revision !== expectedRevision) {
      throw new ReviewConflictError("다른 사용자가 먼저 검토 내용을 변경했습니다.");
    }
    const next = clone(packet);
    next.request.revision = expectedRevision + 1;
    this.packets.set(next.request.id, { packet: next, createdAt: current.createdAt });
    return clone(next);
  }

  private pruneExpired() {
    const expiresBefore = this.now() - (this.options.ttlMs ?? 30 * 60 * 1000);
    for (const [id, entry] of this.packets) {
      if (entry.createdAt < expiresBefore) this.packets.delete(id);
    }
  }

  private pruneCapacity() {
    const maxEntries = this.options.maxEntries ?? 50;
    while (this.packets.size > maxEntries) {
      const entries = [...this.packets.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
      const terminal = entries.find(([, entry]) =>
        ["SUBMITTED", "CANCELLED", "EXPIRED"].includes(entry.packet.request.status)
      );
      this.packets.delete((terminal ?? entries[0])[0]);
    }
  }

  private now() {
    return this.options.now?.() ?? Date.now();
  }
}

export class ReviewWorkflowService {
  constructor(
    private readonly repository: ReviewRepository,
    private readonly audit: AuditAdapter = new NoopAuditAdapter()
  ) {}

  async create(
    input: Omit<ReviewPacket, "request" | "feedback"> & {
      jobId: string;
      candidateId: string;
      reportId: string;
      resumeDocumentId: string;
      resumeVersion: string;
      reviewerId: string;
      dueAt: string;
    },
    actor: ReviewActor
  ) {
    if (actor.role !== "Recruiter" && actor.role !== "Admin") {
      throw new ReviewServiceError("FORBIDDEN", "채용담당자만 검토를 요청할 수 있습니다.");
    }
    const now = new Date().toISOString();
    const packet: ReviewPacket = {
      request: {
        id: crypto.randomUUID(),
        jobId: input.jobId,
        candidateId: input.candidateId,
        reportId: input.reportId,
        resumeDocumentId: input.resumeDocumentId,
        resumeVersion: input.resumeVersion,
        recruiterId: actor.userId,
        reviewerId: input.reviewerId,
        status: "SENT",
        dueAt: input.dueAt,
        sentAt: now,
        revision: 0
      },
      jobTitle: input.jobTitle,
      candidateName: input.candidateName,
      recruiterName: input.recruiterName,
      hrDecision: input.hrDecision,
      hrNote: input.hrNote,
      score: input.score,
      confidence: input.confidence,
      criteria: clone(input.criteria),
      resume: clone(input.resume),
      feedback: createEmptyInterviewFeedback(input.criteria.map((criterion) => criterion.id))
    };
    const created = await this.repository.insert(packet);
    await this.record(created, actor, "CREATED");
    return created;
  }

  async get(id: string, actor: ReviewActor) {
    const packet = await this.requiredPacket(id);
    this.assertCanRead(packet, actor);
    this.assertAvailable(packet);

    return packet;
  }

  async open(id: string, actor: ReviewActor) {
    const packet = await this.requiredPacket(id);
    this.assertReviewer(packet, actor);
    this.assertAvailable(packet);
    if (packet.request.status !== "SENT") return packet;
    packet.request.status = "OPENED";
    packet.request.openedAt = new Date().toISOString();
    const opened = await this.repository.save(packet, packet.request.revision);
    await this.record(opened, actor, "OPENED");
    return opened;
  }

  async saveDraft(
    id: string,
    input: { revision: number; feedback: InterviewFeedbackDraft },
    actor: ReviewActor
  ) {
    const packet = await this.requiredPacket(id);
    this.assertReviewer(packet, actor);
    this.assertAvailable(packet);
    if (packet.request.revision !== input.revision) {
      throw new ReviewConflictError("다른 사용자가 먼저 검토 내용을 변경했습니다.");
    }
    if (packet.request.status === "SUBMITTED") {
      throw new ReviewServiceError("INVALID_STATE", "제출 완료된 평가는 직접 수정할 수 없습니다.");
    }
    if (packet.request.status === "SENT") {
      packet.request.status = "OPENED";
      packet.request.openedAt = new Date().toISOString();
    }
    if (packet.request.status === "OPENED") {
      packet.request.status = "IN_PROGRESS";
    }
    packet.feedback = clone(input.feedback);
    const saved = await this.repository.save(packet, input.revision);
    await this.record(saved, actor, "DRAFT_SAVED");
    return saved;
  }

  async submit(
    id: string,
    input: { revision: number; feedback: InterviewFeedbackDraft },
    actor: ReviewActor
  ) {
    const packet = await this.requiredPacket(id);
    this.assertReviewer(packet, actor);
    this.assertAvailable(packet);
    if (packet.request.revision !== input.revision) {
      throw new ReviewConflictError("다른 사용자가 먼저 검토 내용을 변경했습니다.");
    }
    const validation = validateInterviewFeedback(input.feedback);
    if (validation.length > 0) {
      throw new ReviewServiceError(
        "VALIDATION_ERROR",
        "필수 인터뷰 평가를 모두 작성해 주세요.",
        validation
      );
    }
    const currentStatus = packet.request.status === "SENT" ? "OPENED" : packet.request.status;
    const from = currentStatus === "OPENED" ? "IN_PROGRESS" : currentStatus;
    if (!isReviewTransitionAllowed(from, "SUBMITTED")) {
      throw new ReviewServiceError("INVALID_STATE", "현재 상태에서는 평가를 제출할 수 없습니다.");
    }
    packet.feedback = clone(input.feedback);
    packet.request.status = "SUBMITTED";
    packet.request.openedAt ||= new Date().toISOString();
    packet.request.submittedAt = new Date().toISOString();
    const submitted = await this.repository.save(packet, input.revision);
    await this.record(submitted, actor, "SUBMITTED");
    return submitted;
  }

  async cancel(id: string, actor: ReviewActor) {
    const packet = await this.requiredPacket(id);
    if (
      actor.role !== "Admin" &&
      (actor.role !== "Recruiter" || packet.request.recruiterId !== actor.userId)
    ) {
      throw new ReviewServiceError("FORBIDDEN", "요청한 채용담당자만 검토를 취소할 수 있습니다.");
    }
    if (!isReviewTransitionAllowed(packet.request.status, "CANCELLED")) {
      throw new ReviewServiceError("INVALID_STATE", "현재 상태에서는 검토를 취소할 수 없습니다.");
    }
    packet.request.status = "CANCELLED";
    const cancelled = await this.repository.save(packet, packet.request.revision);
    await this.record(cancelled, actor, "CANCELLED");
    return cancelled;
  }

  async remind(id: string, actor: ReviewActor) {
    const packet = await this.requiredPacket(id);
    if (
      actor.role !== "Admin" &&
      (actor.role !== "Recruiter" || packet.request.recruiterId !== actor.userId)
    ) {
      throw new ReviewServiceError("FORBIDDEN", "요청한 채용담당자만 리마인더를 보낼 수 있습니다.");
    }
    this.assertAvailable(packet);
    if (packet.request.status === "SUBMITTED") {
      throw new ReviewServiceError("INVALID_STATE", "제출 완료된 요청에는 리마인더를 보낼 수 없습니다.");
    }
    await this.record(packet, actor, "REMINDER_SENT");
    return packet;
  }

  private async requiredPacket(id: string) {
    const packet = await this.repository.get(id);
    if (!packet) throw new ReviewServiceError("NOT_FOUND", "검토 요청을 찾을 수 없습니다.");
    return packet;
  }

  private assertCanRead(packet: ReviewPacket, actor: ReviewActor) {
    const allowed =
      actor.role === "Admin" ||
      (actor.role === "Recruiter" && packet.request.recruiterId === actor.userId) ||
      (actor.role === "DepartmentReviewer" && packet.request.reviewerId === actor.userId);
    if (!allowed) throw new ReviewServiceError("FORBIDDEN", "이 검토 요청에 접근할 수 없습니다.");
  }

  private assertReviewer(packet: ReviewPacket, actor: ReviewActor) {
    if (actor.role !== "DepartmentReviewer" || packet.request.reviewerId !== actor.userId) {
      throw new ReviewServiceError("FORBIDDEN", "지정된 부서장만 평가를 작성할 수 있습니다.");
    }
  }

  private assertAvailable(packet: ReviewPacket) {
    if (packet.request.status === "CANCELLED" || packet.request.status === "EXPIRED") {
      throw new ReviewServiceError("INVALID_STATE", "만료되었거나 취소된 검토 요청입니다.");
    }
  }

  private async record(
    packet: ReviewPacket,
    actor: ReviewActor,
    action: ReviewAuditEvent["action"]
  ) {
    await this.audit.record({
      actorId: actor.userId,
      requestId: packet.request.id,
      candidateId: packet.request.candidateId,
      action,
      occurredAt: new Date().toISOString(),
      outcome: "SUCCESS"
    });
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
