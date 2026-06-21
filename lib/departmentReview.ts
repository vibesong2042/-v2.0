import { DepartmentHead } from "./employees";

export type ReviewRequestPreview = {
  to: string;
  subject: string;
  body: string;
};

export type InterviewFinalOpinion = "추천" | "보류" | "비추천" | "추가 인터뷰 필요";

export type InterviewResultForm = {
  interviewDate: string;
  interviewer: string;
  summary: string;
  jobFit: string;
  strengths: string;
  concerns: string;
  followUps: string;
  finalOpinion: InterviewFinalOpinion | "";
};

export function canSendDepartmentReviewRequest(input: {
  hasReport: boolean;
  departmentHead: DepartmentHead | null;
}) {
  return input.hasReport && input.departmentHead !== null;
}

export function buildDepartmentReviewRequestPreview(input: {
  departmentHead: DepartmentHead;
  overallScore: number;
  topQuestions: string[];
}): ReviewRequestPreview {
  const questions =
    input.topQuestions.length > 0
      ? input.topQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")
      : "등록된 인터뷰 질문이 없습니다.";

  return {
    to: input.departmentHead.email,
    subject: `[RoleFit] 지원자 검토 요청 - ${input.departmentHead.department}`,
    body: [
      `${input.departmentHead.name} ${input.departmentHead.role}님,`,
      "",
      "RoleFit Workbench 분석 리포트 기반으로 지원자 전화인터뷰 검토를 요청드립니다.",
      `종합 매칭도: ${input.overallScore}%`,
      "",
      "[인터뷰 진행 시 필수 검증 질문 Top 3]",
      questions,
      "",
      "이 메시지는 데모 모드 미리보기입니다. 실제 메일은 발송되지 않습니다."
    ].join("\n")
  };
}

export function canSubmitInterviewResult(result: InterviewResultForm) {
  return (
    result.interviewDate.trim().length > 0 &&
    result.summary.trim().length > 0 &&
    result.finalOpinion.trim().length > 0
  );
}

export function buildInterviewResultPreview(input: {
  departmentHead: DepartmentHead;
  result: InterviewResultForm;
}): ReviewRequestPreview {
  return {
    to: "hr-review@example.com",
    subject: `[RoleFit] 전화인터뷰 결과 회신 - ${input.departmentHead.department}`,
    body: [
      `[부서장] ${input.departmentHead.name} / ${input.departmentHead.department}`,
      `[인터뷰 일시] ${input.result.interviewDate}`,
      `[인터뷰 담당자] ${input.result.interviewer || input.departmentHead.name}`,
      `[최종 의견] ${input.result.finalOpinion}`,
      "",
      "[종합 의견]",
      input.result.summary,
      "",
      "[직무 적합성]",
      input.result.jobFit || "문서상 확인 불가",
      "",
      "[확인된 강점]",
      input.result.strengths || "문서상 확인 불가",
      "",
      "[우려 사항]",
      input.result.concerns || "문서상 확인 불가",
      "",
      "[추가 확인 필요 사항]",
      input.result.followUps || "문서상 확인 불가",
      "",
      "이 메시지는 데모 모드 미리보기입니다. 실제 메일은 발송되지 않습니다."
    ].join("\n")
  };
}
