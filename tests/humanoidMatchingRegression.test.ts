import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  analyzeStructuredMatch,
  buildEvaluationRubric,
  evaluateCriterionEvidence
} from "../lib/matching";

const humanoidCoreCriteria = {
  jobDescription: [
    "직무명: 휴머노이드 로봇 SW 개발 엔지니어",
    "조직명: Robotics Intelligence Platform Team",
    "수행업무:",
    "- 휴머노이드 로봇의 동작 제어, 경로 계획, 상태 추정, 센서 융합 소프트웨어 개발",
    "- ROS2 기반 로봇 제어 프레임워크 설계 및 구현",
    "- 카메라, LiDAR, IMU, Force/Torque Sensor 등 멀티센서 데이터를 활용한 인지/제어 파이프라인 개발",
    "- 실시간 제어 루프, 로봇 미들웨어, 시뮬레이션 환경과 실제 로봇 간 검증 체계 구축",
    "필수요건:",
    "- C++ 또는 Python 기반 로봇 소프트웨어 개발 경험",
    "- ROS 또는 ROS2 기반 개발 경험",
    "- 로봇 제어, 경로 계획, 상태 추정, 센서 융합 중 하나 이상의 실무 경험",
    "우대요건:",
    "- 휴머노이드, 모바일 매니퓰레이터, 사족보행 로봇 개발 경험"
  ].join("\n"),
  additionalMaterial: [
    "중점 과제:",
    "- ROS2 기반 제어 소프트웨어 구조 개선",
    "- 시뮬레이션과 실제 로봇 간 동작 차이 분석",
    "- 센서 데이터 품질 저하 상황에서 안정적인 상태 추정 유지",
    "채용 시 특히 확인할 항목:",
    "- 실제 로봇에서 문제를 재현하고 수정한 경험"
  ].join("\n")
};

const supportingCriteria = {
  teamStrategy: "ROS2 기반 로봇 SW 아키텍처 표준화와 실제 로봇 하드웨어 테스트 안정화",
  managerMbo: "휴머노이드 로봇 통합 테스트 실패율 감소와 실험 재현 시간 단축",
  subjectiveOpinion: "실제 로봇에서 로그, 센서 timestamp, 제어 command를 함께 보며 원인을 좁히는 경험 선호"
};

const strongCv = [
  "로봇 소프트웨어 개발 6년 경력.",
  "ROS2 기반 모바일 매니퓰레이터와 휴머노이드 상체 제어 소프트웨어 개발 경험이 있습니다.",
  "C++17과 Python으로 control node, sensor processing node, motion execution pipeline을 구현했습니다.",
  "카메라, LiDAR, IMU 데이터를 활용한 상태 추정 및 장애 감지 모듈을 개발했습니다.",
  "Gazebo와 Isaac Sim에서 시뮬레이션 테스트 후 실제 로봇에 배포했습니다.",
  "로봇 팔 조작 실패 로그를 수집하고 replay tool을 개발해 디버깅 시간을 35% 단축했습니다."
].join("\n");

const partialCv = [
  "자율주행 인지 소프트웨어 개발 4년 경력.",
  "Python과 C++로 카메라/LiDAR 데이터 전처리 모듈을 구현했습니다.",
  "ROS 기반 topic subscribe/publish 구조를 활용한 sensor data viewer를 개발했습니다.",
  "실제 로봇 제어 루프 개발 경험은 없음.",
  "ROS2 lifecycle, action, service 구조는 학습 중이며 휴머노이드 보행 제어 경험은 제한적입니다."
].join("\n");

const weakCv = [
  "웹 백엔드 개발 5년 경력.",
  "최근 로봇 소프트웨어 분야로 직무 전환을 희망하고 있습니다.",
  "개인 학습 프로젝트로 ROS2 기초 튜토리얼을 따라 publisher/subscriber를 실습했습니다.",
  "실제 로봇 하드웨어 검증 경험 없음.",
  "센서 융합, 상태 추정, 경로 계획 경험 없음."
].join("\n");

describe("humanoid robot matching regression", () => {
  it("does not create rubric criteria from metadata or section headers", () => {
    const rubric = buildEvaluationRubric(humanoidCoreCriteria);
    const titles = rubric.criteria.map((criterion) => criterion.title);

    expect(titles.some((title) => title.includes("조직명"))).toBe(false);
    expect(titles.some((title) => title.includes("수행업무"))).toBe(false);
    expect(titles.some((title) => title.includes("필수요건"))).toBe(false);
    expect(titles.some((title) => title.includes("우대요건"))).toBe(false);
  });

  it("keeps humanoid CV ranking in expected order", () => {
    const reports = [strongCv, partialCv, weakCv].map((candidateResume) =>
      analyzeStructuredMatch({
        coreCriteria: humanoidCoreCriteria,
        candidateInfo: {
          candidateResume,
          referenceEmployeeResume: ""
        },
        supportingCriteria,
        weights: DEFAULT_WEIGHT_SET,
        language: "ko"
      })
    );

    expect(reports[0].overallMatch.score).toBeGreaterThanOrEqual(70);
    expect(reports[0].overallMatch.score).toBeGreaterThan(reports[1].overallMatch.score);
    expect(reports[1].overallMatch.score).toBeGreaterThan(reports[2].overallMatch.score);
    expect(reports[0].interviewQuestions.join(" ")).not.toContain("조직명");
    expect(reports[0].interviewQuestions.join(" ")).not.toContain("수행업무");
  });

  it("does not treat negative or learning-only statements as supporting evidence", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: "필수: 실제 로봇 제어 루프 개발 경험",
      additionalMaterial: ""
    }).criteria[0];

    const negative = evaluateCriterionEvidence(
      criterion,
      "실제 로봇 제어 루프 개발 경험은 없음. ROS2 기초 튜토리얼을 학습 중입니다."
    );

    expect(negative.evidence.type).toBe("none");
    expect(negative.missing.join(" ")).toContain("문서상 확인 불가");
  });
});
