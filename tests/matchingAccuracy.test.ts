import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  analyzeStructuredMatch,
  buildEvaluationRubric,
  evaluateCriterionEvidence
} from "../lib/matching";
import {
  CALIBRATION_CORE_CRITERIA,
  CALIBRATION_SUPPORTING_CRITERIA,
  MATCHING_CALIBRATION_SAMPLES
} from "../lib/matching/calibration";

describe("rubric based matching accuracy", () => {
  it("builds a structured rubric from core criteria", () => {
    const rubric = buildEvaluationRubric({
      jobDescription:
        "필수: React 기반 HR 도구 개발\n필수: TypeScript 운영 경험\n우대: 채용 리포트 작성 경험\n협업: 담당부서와 커뮤니케이션",
      additionalMaterial: "성과: 검토 시간을 30% 단축하는 자동화 경험"
    });

    expect(rubric.criteria.map((item) => item.category)).toEqual(
      expect.arrayContaining(["필수 역량", "우대 역량", "성과/임팩트", "협업/커뮤니케이션"])
    );
    expect(rubric.criteria.some((item) => item.required)).toBe(true);
    expect(rubric.criteria.every((item) => item.importance > 0)).toBe(true);
  });

  it("rewards semantic evidence even when wording differs", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: "필수: 채용 검토 자동화 도구 운영",
      additionalMaterial: ""
    }).criteria[0];

    const assessment = evaluateCriterionEvidence(
      criterion,
      "인사 선발 프로세스의 스크리닝 workflow를 자동화하고 운영했습니다."
    );

    expect(assessment.semanticScore).toBeGreaterThan(assessment.keywordScore);
    expect(assessment.evidence.type).not.toBe("none");
    expect(assessment.evidence.sentence).toContain("자동화");
  });

  it("does not give high scores when required criteria are missing", () => {
    const report = analyzeStructuredMatch({
      coreCriteria: {
        jobDescription: "필수: 보안 감사 경험\n필수: 클라우드 운영 경험\n우대: React 화면 개발",
        additionalMaterial: ""
      },
      candidateInfo: {
        candidateResume: "React 화면 개발과 TypeScript 컴포넌트 설계 경험이 있습니다.",
        referenceEmployeeResume: ""
      },
      supportingCriteria: CALIBRATION_SUPPORTING_CRITERIA,
      weights: DEFAULT_WEIGHT_SET,
      language: "ko"
    });

    expect(report.overallMatch.score).toBeLessThan(70);
    expect(report.missingCapabilities.some((item) => item.includes("문서상 확인 불가"))).toBe(true);
    expect(report.confidence.level).not.toBe("근거 충분");
  });

  it("keeps calibration samples within expected score ranges", () => {
    const reports = MATCHING_CALIBRATION_SAMPLES.map((sample) => ({
      sample,
      report: analyzeStructuredMatch({
        coreCriteria: CALIBRATION_CORE_CRITERIA,
        candidateInfo: {
          candidateResume: sample.resume,
          referenceEmployeeResume: sample.reference
        },
        supportingCriteria: CALIBRATION_SUPPORTING_CRITERIA,
        weights: DEFAULT_WEIGHT_SET,
        language: "ko"
      })
    }));

    for (const { sample, report } of reports) {
      expect(report.overallMatch.score, sample.name).toBeGreaterThanOrEqual(sample.min);
      expect(report.overallMatch.score, sample.name).toBeLessThanOrEqual(sample.max);
      expect(report.confidence.level, sample.name).toBe(sample.confidence);
    }

    const strong = reports[0].report;
    const weakEvidence = reports[2].report;
    expect(weakEvidence.overallMatch.score).toBeLessThan(strong.overallMatch.score);
  });

  it("normalizes rubric titles and gives stronger evidence quality to quantified experience", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: "필수: React 기반 HR 도구 개발",
      additionalMaterial: ""
    }).criteria[0];

    const keywordOnly = evaluateCriterionEvidence(
      criterion,
      "React TypeScript HR 도구 개발 리포트 자동화 키워드를 이해하고 있습니다."
    );
    const quantifiedExperience = evaluateCriterionEvidence(
      criterion,
      "React와 TypeScript로 HR 검토 도구를 8개월 운영하며 리포트 생성 시간을 30% 단축했습니다."
    );

    expect(criterion.title).toBe("React 기반 HR 도구 개발");
    expect(quantifiedExperience.evidenceQualityScore).toBeGreaterThan(
      keywordOnly.evidenceQualityScore
    );
    expect(quantifiedExperience.score).toBeGreaterThan(keywordOnly.score);
  });

  it("caps the overall score when required criteria are not supported by evidence", () => {
    const report = analyzeStructuredMatch({
      coreCriteria: {
        jobDescription:
          "필수: 보안 감사 경험\n필수: 클라우드 운영 경험\n우대: React TypeScript 리포트 자동화 경험\n우대: HR 채용 도메인 경험",
        additionalMaterial: ""
      },
      candidateInfo: {
        candidateResume:
          "React TypeScript HR 채용 리포트 자동화 경험이 있으며 화면 개발을 담당했습니다.",
        referenceEmployeeResume: ""
      },
      supportingCriteria: {
        teamStrategy: "리포트 자동화",
        managerMbo: "검토 효율화",
        subjectiveOpinion: "React 개발 경험 선호"
      },
      weights: DEFAULT_WEIGHT_SET,
      language: "ko"
    });

    expect(report.overallMatch.score).toBeLessThanOrEqual(69);
    expect(report.overallMatch.recommendation).toContain("추가 검토");
  });
});
