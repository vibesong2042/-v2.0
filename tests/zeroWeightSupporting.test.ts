import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  ScoringWeightSet,
  analyzeStructuredMatch,
  generateStructuredReportText
} from "../lib/matching";

function weightsWithMboZero(): ScoringWeightSet {
  return {
    ...DEFAULT_WEIGHT_SET,
    isDefault: false,
    items: DEFAULT_WEIGHT_SET.items.map((item) => {
      if (item.code === "jobDescription") return { ...item, weight: 80 };
      if (item.code === "teamStrategy") return { ...item, weight: 20 };
      return { ...item, weight: 0 };
    })
  };
}

function buildReport(managerMbo: string) {
  return analyzeStructuredMatch({
    coreCriteria: {
      jobDescription: "필수: ROS2 기반 로봇 제어 소프트웨어 개발\n필수: 센서 융합과 상태 추정 경험",
      additionalMaterial: "실제 로봇 검증과 장애 원인 분석 경험을 중점 확인"
    },
    candidateInfo: {
      candidateResume:
        "ROS2 기반 로봇 제어 소프트웨어를 개발했고 센서 융합, 상태 추정, 장애 원인 분석을 수행했습니다.",
      referenceEmployeeResume: ""
    },
    supportingCriteria: {
      teamStrategy: "로봇 플랫폼 안정화와 장애 분석 역량 강화",
      managerMbo,
      subjectiveOpinion: ""
    },
    weights: weightsWithMboZero(),
    language: "ko"
  });
}

describe("zero-weight supporting criteria", () => {
  it("excludes Manager MBO from supporting report and rationale when its weight is 0%", () => {
    const report = buildReport("ROS2 제어 안정화와 장애 분석 MBO를 직접 수행한 후보를 우선 검토");
    const reportText = generateStructuredReportText(report);

    expect(report.supportingIndicatorMatches.some((item) => item.source.includes("MBO"))).toBe(false);
    expect(report.overallMatch.rationale.join(" ")).not.toContain("MBO");
    expect(reportText).not.toContain("MBO");
  });

  it("keeps the overall score unchanged when only 0%-weighted Manager MBO text changes", () => {
    const strongMbo = buildReport("ROS2 제어 안정화와 장애 분석 MBO를 직접 수행한 후보를 우선 검토");
    const unrelatedMbo = buildReport("재무 결산 자동화와 비용 정산 정확도 개선을 우선 검토");

    expect(strongMbo.overallMatch.score).toBe(unrelatedMbo.overallMatch.score);
  });
});
