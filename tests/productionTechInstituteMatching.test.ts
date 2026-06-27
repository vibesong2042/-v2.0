import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  analyzeStructuredMatch,
  buildEvaluationRubric,
  evaluateCriterionEvidence
} from "../lib/matching";

const productionTechCoreWeightSet = {
  ...DEFAULT_WEIGHT_SET,
  items: DEFAULT_WEIGHT_SET.items.map((item) => ({
    ...item,
    weight: item.code === "jobDescription" ? 100 : 0
  }))
};

function reportFor(jobDescription: string, candidateResume: string) {
  return analyzeStructuredMatch({
    coreCriteria: {
      jobDescription,
      additionalMaterial: ""
    },
    candidateInfo: {
      candidateResume,
      referenceEmployeeResume: ""
    },
    supportingCriteria: {
      teamStrategy: "",
      managerMbo: "",
      subjectiveOpinion: ""
    },
    weights: productionTechCoreWeightSet,
    language: "ko"
  });
}

const manufacturingAiJob = [
  "조직명: 생산기술연구소",
  "조직 소개: 로봇, AI, 자동화, 스마트팩토리, 디지털 트윈 기반 제조 혁신을 추진합니다.",
  "담당 업무:",
  "- 제조 데이터 기반 불량 검출 모델과 비전 검사 알고리즘 개발",
  "- 영상/텍스트 딥러닝 모델 검증 및 MLOps 운영",
  "필요 역량:",
  "- Python 기반 딥러닝 모델 개발 경험",
  "- 제조 데이터 전처리와 모델 성능 검증 경험",
  "우대 역량:",
  "- MLOps pipeline 구축 및 모델 배포 경험"
].join("\n");

const manufacturingSoftwareJob = [
  "직무명: 제조 소프트웨어 개발",
  "담당 업무:",
  "- AMR/AGV 기반 무인 모바일 로봇 제어 소프트웨어 개발",
  "- Digital Twin 기반 생산 라인 시뮬레이션과 스케줄링 최적화",
  "필요 역량:",
  "- 자율 경로 계획, 위치 인식, 모션 제어, 원격 제어 경험",
  "우대 역량:",
  "- 스마트팩토리 자동화 설비 연동 경험"
].join("\n");

const circuitHardwareJob = [
  "직무명: 회로설계",
  "담당 업무:",
  "- 로봇/자동화 설비 전장과 모터 제어 회로 설계",
  "- PCB, RF, EMC/EMI, 전력 회로, 센서 인터페이스 검증",
  "필요 역량:",
  "- PLC, FPGA, 임베디드 회로 시스템 개발 또는 검증 경험"
].join("\n");

describe("production technology institute matching", () => {
  it("does not create required rubric criteria from organization names or promotional context", () => {
    const rubric = buildEvaluationRubric({
      jobDescription: manufacturingAiJob,
      additionalMaterial: ""
    });
    const titles = rubric.criteria.map((criterion) => criterion.title).join(" ");

    expect(titles).not.toContain("조직명");
    expect(titles).not.toContain("조직 소개");
    expect(titles).not.toContain("생산기술연구소");
    expect(titles).not.toContain("제조 혁신을 추진");
    expect(titles).toContain("제조 데이터");
    expect(titles).toContain("Python");
  });

  it("ranks strong manufacturing AI evidence above keyword-only and learning-only resumes", () => {
    const strong = reportFor(
      manufacturingAiJob,
      [
        "Python과 PyTorch로 제조 라인 비전 검사 딥러닝 모델을 10개월 개발하고 운영했습니다.",
        "불량 검출 데이터셋을 정제하고 모델 검증 지표를 개선해 오탐률을 18% 줄였습니다.",
        "MLOps pipeline을 구축해 모델 배포와 재학습 workflow를 자동화했습니다."
      ].join(" ")
    );
    const keywordOnly = reportFor(
      manufacturingAiJob,
      "제조 데이터, 딥러닝, 비전 검사, MLOps, 모델 검증 용어를 포트폴리오에 정리했습니다."
    );
    const learningOnly = reportFor(
      manufacturingAiJob,
      "Python 딥러닝 튜토리얼을 학습 중이며 제조 AI 업무에 관심이 있습니다. 실제 모델 운영 경험은 없음."
    );

    expect(strong.overallMatch.score).toBeGreaterThanOrEqual(70);
    expect(strong.overallMatch.score).toBeGreaterThan(keywordOnly.overallMatch.score);
    expect(keywordOnly.overallMatch.score).toBeGreaterThan(learningOnly.overallMatch.score);
    expect(learningOnly.overallMatch.score).toBeLessThanOrEqual(69);
  });

  it("matches production software synonyms for AMR, AGV, digital twin, and simulation work", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: manufacturingSoftwareJob,
      additionalMaterial: ""
    }).criteria.find((item) => item.title.includes("AMR") || item.title.includes("Digital Twin"));

    expect(criterion).toBeDefined();

    const assessment = evaluateCriterionEvidence(
      criterion!,
      "무인 모바일 로봇 fleet scheduling과 가상공장 모델 기반 시뮬레이션을 개선하고 자율 주행 경로 계획 모듈을 운영했습니다."
    );

    expect(assessment.semanticScore).toBeGreaterThanOrEqual(35);
    expect(assessment.evidence.type).not.toBe("none");
  });

  it("matches circuit and equipment control evidence for electronics-focused roles", () => {
    const report = reportFor(
      circuitHardwareJob,
      [
        "자동화 설비 전장 제어 보드를 설계하고 PCB bring-up과 EMC 사전 검증을 담당했습니다.",
        "BLDC motor control 전력 회로와 센서 인터페이스를 검증했습니다.",
        "PLC와 FPGA 기반 I/O 제어 로직을 시험 장비로 검증하고 회로 불량 원인을 분석했습니다."
      ].join(" ")
    );

    expect(report.overallMatch.score).toBeGreaterThanOrEqual(70);
    expect(report.coreIndicatorMatches.some((item) => item.matchRate >= 70)).toBe(true);
  });

  it("does not treat production technology keyword lists as direct experience", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: circuitHardwareJob,
      additionalMaterial: ""
    }).criteria[0];

    const assessment = evaluateCriterionEvidence(
      criterion,
      "PCB, RF, EMC, PLC, FPGA, motor control, sensor interface 키워드를 학습했고 자동화 설비 회로 업무를 희망합니다."
    );

    expect(assessment.score).toBeLessThanOrEqual(55);
    expect(assessment.evidence.type).not.toBe("direct");
    expect(assessment.scoreTrace.capApplied).toBe(true);
    expect(assessment.scoreTrace.capReason).not.toBe("none");
  });
});
