import { describe, expect, it } from "vitest";

import {
  buildDepartmentReviewRequestPreview,
  buildInterviewResultPreview,
  canSendDepartmentReviewRequest,
  canSubmitInterviewResult
} from "../lib/departmentReview";
import { mockDepartmentHeads } from "../lib/employees";

describe("department review workflow rules", () => {
  const departmentHead = mockDepartmentHeads[0];

  it("allows review request only when a report and department head are selected", () => {
    expect(canSendDepartmentReviewRequest({ hasReport: false, departmentHead: null })).toBe(false);
    expect(canSendDepartmentReviewRequest({ hasReport: true, departmentHead: null })).toBe(false);
    expect(canSendDepartmentReviewRequest({ hasReport: true, departmentHead })).toBe(true);
  });

  it("builds a mock review request preview without claiming real mail delivery", () => {
    const preview = buildDepartmentReviewRequestPreview({
      departmentHead,
      overallScore: 78,
      topQuestions: ["ROS2 실전 경험을 확인해 주세요."]
    });

    expect(preview.to).toBe(departmentHead.email);
    expect(preview.subject).toContain("RoleFit");
    expect(preview.body).toContain("실제 메일은 발송되지 않습니다");
    expect(preview.body).toContain("ROS2 실전 경험");
  });

  it("requires date, summary, and final opinion before interview result submission", () => {
    expect(
      canSubmitInterviewResult({
        interviewDate: "",
        interviewer: "김부서",
        summary: "검토 완료",
        jobFit: "적합",
        strengths: "",
        concerns: "",
        followUps: "",
        finalOpinion: "추천"
      })
    ).toBe(false);

    expect(
      canSubmitInterviewResult({
        interviewDate: "2026-06-22",
        interviewer: "김부서",
        summary: "실제 로봇 제어 경험이 확인되었습니다.",
        jobFit: "핵심 요구사항과 대체로 일치합니다.",
        strengths: "ROS2 운영 경험",
        concerns: "휴머노이드 양산 경험은 추가 확인 필요",
        followUps: "레퍼런스 프로젝트 확인",
        finalOpinion: "추천"
      })
    ).toBe(true);
  });

  it("builds an HR return preview from submitted interview result fields", () => {
    const preview = buildInterviewResultPreview({
      departmentHead,
      result: {
        interviewDate: "2026-06-22",
        interviewer: "김부서",
        summary: "기술 깊이는 충분하나 조직 적응은 추가 확인이 필요합니다.",
        jobFit: "중상",
        strengths: "로봇 SW 디버깅 경험",
        concerns: "휴머노이드 제품화 경험 부족",
        followUps: "추가 기술면접",
        finalOpinion: "추가 인터뷰 필요"
      }
    });

    expect(preview.subject).toContain("전화인터뷰 결과");
    expect(preview.body).toContain("기술 깊이는 충분");
    expect(preview.body).toContain("추가 인터뷰 필요");
  });
});
