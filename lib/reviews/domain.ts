export type ReviewRequestStatus =
  | "DRAFT"
  | "SENT"
  | "OPENED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "CANCELLED"
  | "EXPIRED";

export type ReviewRequest = {
  id: string;
  jobId: string;
  candidateId: string;
  reportId: string;
  resumeDocumentId: string;
  resumeVersion: string;
  recruiterId: string;
  reviewerId: string;
  status: ReviewRequestStatus;
  dueAt: string;
  sentAt?: string;
  openedAt?: string;
  submittedAt?: string;
  revision: number;
};

export type CriterionFeedback = {
  criterionId: string;
  rating: "MET" | "PARTIALLY_MET" | "NOT_MET" | "NOT_ASSESSED";
  evidence: string;
};

export type InterviewFeedbackDraft = {
  interviewDate: string;
  interviewer: string;
  criteria: CriterionFeedback[];
  strengths: string;
  concerns: string;
  followUps: string;
  overallOpinion: "RECOMMEND" | "FURTHER_REVIEW" | "HOLD" | "DO_NOT_RECOMMEND" | "";
};

export type InterviewFeedbackValidationCode =
  | "INTERVIEW_DATE_REQUIRED"
  | "OVERALL_OPINION_REQUIRED"
  | "CRITERIA_INCOMPLETE";

const transitions: Record<ReviewRequestStatus, ReviewRequestStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["OPENED", "CANCELLED", "EXPIRED"],
  OPENED: ["IN_PROGRESS", "CANCELLED", "EXPIRED"],
  IN_PROGRESS: ["SUBMITTED", "CANCELLED", "EXPIRED"],
  SUBMITTED: [],
  CANCELLED: [],
  EXPIRED: []
};

export function isReviewTransitionAllowed(from: ReviewRequestStatus, to: ReviewRequestStatus) {
  return transitions[from].includes(to);
}

export function createEmptyInterviewFeedback(criterionIds: string[]): InterviewFeedbackDraft {
  return {
    interviewDate: "",
    interviewer: "",
    criteria: criterionIds.map((criterionId) => ({
      criterionId,
      rating: "NOT_ASSESSED",
      evidence: ""
    })),
    strengths: "",
    concerns: "",
    followUps: "",
    overallOpinion: ""
  };
}

export function validateInterviewFeedback(
  draft: InterviewFeedbackDraft
): InterviewFeedbackValidationCode[] {
  const errors: InterviewFeedbackValidationCode[] = [];
  if (!draft.interviewDate.trim()) errors.push("INTERVIEW_DATE_REQUIRED");
  if (!draft.overallOpinion) errors.push("OVERALL_OPINION_REQUIRED");
  if (
    draft.criteria.length === 0 ||
    draft.criteria.some(
      (criterion) => criterion.rating === "NOT_ASSESSED" || !criterion.evidence.trim()
    )
  ) {
    errors.push("CRITERIA_INCOMPLETE");
  }
  return errors;
}

export function isInterviewFeedbackDraft(value: unknown): value is InterviewFeedbackDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (
    typeof draft.interviewDate !== "string" ||
    typeof draft.interviewer !== "string" ||
    typeof draft.strengths !== "string" ||
    typeof draft.concerns !== "string" ||
    typeof draft.followUps !== "string" ||
    !["", "RECOMMEND", "FURTHER_REVIEW", "HOLD", "DO_NOT_RECOMMEND"].includes(
      String(draft.overallOpinion)
    ) ||
    !Array.isArray(draft.criteria)
  ) {
    return false;
  }
  return draft.criteria.every((item) => {
    if (!item || typeof item !== "object") return false;
    const criterion = item as Record<string, unknown>;
    return (
      typeof criterion.criterionId === "string" &&
      typeof criterion.evidence === "string" &&
      ["MET", "PARTIALLY_MET", "NOT_MET", "NOT_ASSESSED"].includes(String(criterion.rating))
    );
  });
}
