export type ReviewAuditEvent = {
  actorId: string;
  requestId: string;
  candidateId: string;
  action: "CREATED" | "OPENED" | "DRAFT_SAVED" | "SUBMITTED" | "REMINDER_SENT" | "CANCELLED";
  occurredAt: string;
  outcome: "SUCCESS" | "FAILURE";
};

export interface AuditAdapter {
  record(event: ReviewAuditEvent): Promise<void>;
}

export interface DocumentAccessAdapter {
  getSnapshot(input: {
    documentId: string;
    version: string;
    actorId: string;
  }): Promise<{ fileName: string; contentType: string; text: string } | null>;
}

export class MockAuditAdapter implements AuditAdapter {
  private readonly events: ReviewAuditEvent[] = [];

  async record(event: ReviewAuditEvent) {
    this.events.push(structuredClone(event));
  }

  list() {
    return structuredClone(this.events);
  }
}

