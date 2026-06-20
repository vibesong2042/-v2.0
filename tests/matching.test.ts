import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  analyzeMatch,
  analyzeStructuredMatch,
  calculateWeightedScores,
  generateReviewReport,
  generateStructuredReportText,
  validateWeightSet
} from "../lib/matching";

describe("scoring weights", () => {
  it("uses the default 50/20/10/20 preset", () => {
    expect(DEFAULT_WEIGHT_SET.items.map((item) => [item.code, item.weight])).toEqual([
      ["jobDescription", 50],
      ["teamStrategy", 20],
      ["mbo", 10],
      ["custom", 20]
    ]);
  });

  it("accepts active custom weights only when they total 100", () => {
    const result = validateWeightSet({
      ...DEFAULT_WEIGHT_SET,
      items: [
        { code: "jobDescription", label: "Job description", weight: 60, enabled: true },
        { code: "teamStrategy", label: "Team strategy", weight: 20, enabled: true },
        { code: "mbo", label: "Manager MBO", weight: 20, enabled: true },
        { code: "custom", label: "Custom criteria", weight: 30, enabled: false }
      ]
    });

    expect(result).toEqual({ valid: true, total: 100, message: "" });
  });

  it("rejects enabled weights that do not total 100", () => {
    const result = validateWeightSet({
      ...DEFAULT_WEIGHT_SET,
      items: [
        { code: "jobDescription", label: "Job description", weight: 50, enabled: true },
        { code: "teamStrategy", label: "Team strategy", weight: 10, enabled: true },
        { code: "mbo", label: "Manager MBO", weight: 10, enabled: true },
        { code: "custom", label: "Custom criteria", weight: 10, enabled: true }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.total).toBe(80);
    expect(result.message).toContain("100%");
  });
});

describe("matching analysis", () => {
  it("calculates weighted total and keeps the applied weight snapshot", () => {
    const result = calculateWeightedScores(DEFAULT_WEIGHT_SET, [
      {
        code: "jobDescription",
        label: "Job description",
        rawScore: 80,
        evidence: "Most required qualifications are covered.",
        gaps: ["Cloud operations depth needs review."]
      },
      {
        code: "teamStrategy",
        label: "Team strategy",
        rawScore: 70,
        evidence: "Some experience maps to the team strategy.",
        gaps: []
      },
      {
        code: "mbo",
        label: "Manager MBO",
        rawScore: 90,
        evidence: "Directly supports the stated MBO.",
        gaps: []
      },
      {
        code: "custom",
        label: "Custom criteria",
        rawScore: 60,
        evidence: "Partially satisfies the additional criteria.",
        gaps: ["Industry-specific experience is limited."]
      }
    ]);

    expect(result.totalScore).toBe(75);
    expect(result.appliedWeights.items.map((item) => item.weight)).toEqual([50, 20, 10, 20]);
    expect(result.items[0]).toMatchObject({
      code: "jobDescription",
      rawScore: 80,
      weight: 50,
      weightedScore: 40
    });
  });

  it("returns a practical mock analysis from text inputs", () => {
    const result = analyzeMatch({
      jobDescription: "React TypeScript HR system operations frontend role",
      resume: "Built internal HR tools with React and TypeScript for 3 years",
      teamStrategy: "Automate HR work and reduce review time",
      mbo: "Reduce hiring lead time by 30 percent",
      customCriteria: "Provide explainable evidence for department review",
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result.totalScore).toBeGreaterThanOrEqual(70);
    expect(result.recommendation).toContain("review");
    expect(result.items.every((item) => item.evidence.length > 0)).toBe(true);
  });
});

describe("review report", () => {
  it("includes scores, evidence, gaps, and applied weights for department handoff", () => {
    const match = analyzeMatch({
      jobDescription: "React TypeScript HR system",
      resume: "React TypeScript internal HR system development",
      teamStrategy: "Automation",
      mbo: "Lead time reduction",
      customCriteria: "Explainable evidence",
      weights: DEFAULT_WEIGHT_SET
    });

    const report = generateReviewReport({
      candidateName: "Sample Candidate",
      roleName: "Frontend Developer",
      organizationName: "HR Innovation Team",
      match
    });

    expect(report).toContain("Sample Candidate");
    expect(report).toContain("Frontend Developer");
    expect(report).toContain("Applied weights");
    expect(report).toContain("Job description 50%");
    expect(report).toContain("Score table");
    expect(report).toContain("Department review note");
  });
});

describe("structured Korean report", () => {
  it("generates all requested report sections in Korean", () => {
    const report = analyzeStructuredMatch({
      coreCriteria: {
        jobDescription:
          "React 기반 채용 검토 도구 개발\nTypeScript 기반 운영 경험\n담당부서가 이해할 수 있는 근거 리포트 작성",
        additionalMaterial: "HR 업무 자동화와 지원자 경험 데이터 구조화"
      },
      candidateInfo: {
        candidateResume:
          "React와 TypeScript로 사내 HR 도구를 개발했고 검토 리포트 화면을 운영했습니다.",
        referenceEmployeeResume: ""
      },
      supportingCriteria: {
        teamStrategy: "HR 검토 리드타임 단축",
        managerMbo: "채용 검토 자동화율 향상",
        subjectiveOpinion: "부서 전달 자료의 설명 가능성"
      },
      weights: DEFAULT_WEIGHT_SET,
      language: "ko"
    });

    const text = generateStructuredReportText(report);

    expect(text).toContain("[종합 매칭도]");
    expect(text).toContain("[핵심지표 매칭 여부]");
    expect(text).toContain("[보조지표 매칭 여부]");
    expect(text).toContain("[직무기술서 / 채용공고 대비 미보유 역량 또는 확인 불가 역량]");
    expect(text).toContain("[인터뷰 진행 시 필수 검증 질문 Top 3]");
    expect(text).toContain("[기존 입사자 기술 유사도]");
    expect(text).toContain("비교 대상 미등록");
  });

  it("separates unavailable capabilities from unsupported hiring decisions", () => {
    const report = analyzeStructuredMatch({
      coreCriteria: {
        jobDescription: "클라우드 운영 경험\n보안 감사 대응 경험\n대용량 데이터 파이프라인",
        additionalMaterial: ""
      },
      candidateInfo: {
        candidateResume: "React 프론트엔드 화면 개발과 TypeScript 컴포넌트 설계 경험",
        referenceEmployeeResume: "React TypeScript HR 시스템 운영"
      },
      supportingCriteria: {
        teamStrategy: "보안 운영 안정화",
        managerMbo: "감사 대응 시간 단축",
        subjectiveOpinion: "운영 장애 대응 경험 선호"
      },
      weights: DEFAULT_WEIGHT_SET,
      language: "en"
    });

    expect(report.languageNotice).toContain("확장 예정");
    expect(report.missingCapabilities.every((item) => item.includes("문서상 확인 불가"))).toBe(
      true
    );
    expect(report.interviewQuestions).toHaveLength(3);
    expect(report.referenceSimilarity.status).toBe("compared");
    if (report.referenceSimilarity.status === "compared") {
      expect(report.referenceSimilarity.score).toBeGreaterThanOrEqual(0);
    }
  });
});
