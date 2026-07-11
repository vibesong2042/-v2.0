import { isInterviewFeedbackDraft, type InterviewFeedbackDraft } from "./domain";
import type { ReviewWorkflowService } from "./service";

const SAFE_ID = /^[a-zA-Z0-9._:@-]+$/u;
const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 200;
const MAX_NOTE_LENGTH = 1_000;
const MAX_EVIDENCE_LENGTH = 2_000;
const MAX_CRITERIA = 12;

export type CreateReviewInput = Parameters<ReviewWorkflowService["create"]>[0];

export function validateCreateReviewInput(value: unknown): value is CreateReviewInput {
  if (!isRecord(value)) return false;
  const identifiers = [
    value.jobId,
    value.candidateId,
    value.reportId,
    value.resumeDocumentId,
    value.resumeVersion,
    value.reviewerId
  ];
  if (!identifiers.every(isSafeIdentifier)) return false;
  if (
    !isBoundedString(value.jobTitle, MAX_LABEL_LENGTH) ||
    !isBoundedString(value.candidateName, MAX_LABEL_LENGTH) ||
    !isBoundedString(value.recruiterName, MAX_LABEL_LENGTH) ||
    value.hrDecision !== "부서 검토 요청" ||
    !isBoundedString(value.hrNote, MAX_NOTE_LENGTH, true) ||
    typeof value.score !== "number" ||
    !Number.isFinite(value.score) ||
    value.score < 0 ||
    value.score > 100 ||
    !isBoundedString(value.confidence, MAX_LABEL_LENGTH) ||
    !isFutureIsoDate(value.dueAt) ||
    !Array.isArray(value.criteria) ||
    value.criteria.length === 0 ||
    value.criteria.length > MAX_CRITERIA ||
    !value.criteria.every(isCriterion) ||
    !isResume(value.resume)
  ) {
    return false;
  }
  return true;
}

export function validateFeedbackRequest(
  value: unknown
): value is { revision: number; feedback: InterviewFeedbackDraft } {
  if (
    !isRecord(value) ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  ) {
    return false;
  }
  if (!isInterviewFeedbackDraft(value.feedback)) return false;
  const feedback = value.feedback;
  return (
    feedback.criteria.length <= MAX_CRITERIA &&
    isBoundedString(feedback.interviewDate, MAX_LABEL_LENGTH, true) &&
    isBoundedString(feedback.interviewer, MAX_LABEL_LENGTH, true) &&
    isBoundedString(feedback.strengths, MAX_EVIDENCE_LENGTH, true) &&
    isBoundedString(feedback.concerns, MAX_EVIDENCE_LENGTH, true) &&
    isBoundedString(feedback.followUps, MAX_EVIDENCE_LENGTH, true) &&
    feedback.criteria.every(
      (criterion) =>
        isSafeIdentifier(criterion.criterionId) &&
        isBoundedString(criterion.evidence, MAX_EVIDENCE_LENGTH, true)
    )
  );
}

function isCriterion(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    isSafeIdentifier(value.id) &&
    isBoundedString(value.title, MAX_LABEL_LENGTH) &&
    typeof value.required === "boolean" &&
    ["MET", "NOT_MET", "UNDECIDED"].includes(String(value.status)) &&
    isBoundedString(value.evidence, MAX_EVIDENCE_LENGTH, true) &&
    isBoundedString(value.interviewQuestion, MAX_NOTE_LENGTH)
  );
}

function isResume(value: unknown) {
  return (
    isRecord(value) &&
    isBoundedString(value.fileName, MAX_LABEL_LENGTH) &&
    isBoundedString(value.contentType, MAX_LABEL_LENGTH) &&
    typeof value.text === "string"
  );
}

function isFutureIsoDate(value: unknown) {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function isSafeIdentifier(value: unknown) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    SAFE_ID.test(value)
  );
}

function isBoundedString(value: unknown, maxLength: number, allowEmpty = false) {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
