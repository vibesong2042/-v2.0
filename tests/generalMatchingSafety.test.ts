import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHT_SET,
  analyzeStructuredMatch,
  buildEvaluationRubric,
  evaluateCriterionEvidence
} from "../lib/matching";

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
    weights: DEFAULT_WEIGHT_SET,
    language: "ko"
  });
}

describe("general recruiting matching safety", () => {
  it("does not treat learning, interest, or planned work as direct evidence", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: "필수: Python 기반 데이터 모델 운영 경험",
      additionalMaterial: ""
    }).criteria[0];

    const assessment = evaluateCriterionEvidence(
      criterion,
      "Python 데이터 모델 튜토리얼을 학습 중이며 관련 업무에 관심 있음. 향후 모델 운영 업무 참여 예정입니다."
    );

    expect(assessment.evidence.type).toBe("none");
    expect(assessment.score).toBeLessThanOrEqual(44);
  });

  it("caps keyword-heavy statements when practical experience evidence is weak", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: "필수: 엔터프라이즈 SaaS 플랫폼 개발 및 운영 경험",
      additionalMaterial: ""
    }).criteria[0];

    const assessment = evaluateCriterionEvidence(
      criterion,
      "SaaS 플랫폼 개발 운영 아키텍처 배포 모니터링 키워드를 이해하고 관련 교육 수강 경험이 있습니다."
    );

    expect(assessment.score).toBeLessThanOrEqual(55);
    expect(assessment.evidence.type).not.toBe("direct");
  });

  it("collects supporting evidence candidates without changing the primary score contract", () => {
    const criterion = buildEvaluationRubric({
      jobDescription: "필수: TypeScript 기반 플랫폼 운영 경험",
      additionalMaterial: ""
    }).criteria[0];

    const assessment = evaluateCriterionEvidence(
      criterion,
      [
        "TypeScript 기반 플랫폼의 결제 모듈을 8개월 운영했습니다",
        "장애 대응 프로세스를 개선해 재처리 시간을 20% 단축했습니다",
        "배포 자동화 도구를 구축하고 운영 문서를 정리했습니다"
      ].join(". ")
    );

    expect(assessment.evidence.type).toBe("direct");
    expect(assessment.supportingEvidence.length).toBeGreaterThan(0);
    expect(assessment.supportingEvidence.length).toBeLessThanOrEqual(2);
    expect(assessment.supportingEvidence[0].sentence).not.toBe(assessment.evidence.sentence);
  });

  it("keeps supporting criteria from hiding weak required evidence", () => {
    const report = analyzeStructuredMatch({
      coreCriteria: {
        jobDescription: "필수: B2B 영업 파이프라인 구축 및 매출 전환 경험",
        additionalMaterial: ""
      },
      candidateInfo: {
        candidateResume:
          "영업 업무에 관심이 있으며 CRM 교육을 수강했습니다. 실제 고객 파이프라인 구축 경험은 없습니다.",
        referenceEmployeeResume: ""
      },
      supportingCriteria: {
        teamStrategy: "신규 고객 발굴과 매출 전환율 개선이 핵심 과제입니다.",
        managerMbo: "영업 리드 전환율 개선",
        subjectiveOpinion: "고객 커뮤니케이션 가능성을 선호"
      },
      weights: DEFAULT_WEIGHT_SET,
      language: "ko"
    });

    expect(report.overallMatch.score).toBeLessThanOrEqual(69);
    expect(report.confidence.level).not.toBe("근거 충분");
  });

  it("uses job-family dictionaries to match equivalent terms across domains", () => {
    const dataCriterion = buildEvaluationRubric({
      jobDescription: "필수: 머신러닝 모델 배포 및 운영 경험",
      additionalMaterial: ""
    }).criteria[0];
    const salesCriterion = buildEvaluationRubric({
      jobDescription: "필수: B2B 영업 파이프라인 관리와 매출 전환 경험",
      additionalMaterial: ""
    }).criteria[0];
    const qualityCriterion = buildEvaluationRubric({
      jobDescription: "필수: 제조 공정 품질 개선과 불량률 저감 경험",
      additionalMaterial: ""
    }).criteria[0];

    const dataAssessment = evaluateCriterionEvidence(
      dataCriterion,
      "ML model serving 파이프라인을 구축하고 운영했습니다."
    );
    const salesAssessment = evaluateCriterionEvidence(
      salesCriterion,
      "Enterprise sales funnel을 관리하며 revenue conversion을 개선했습니다."
    );
    const qualityAssessment = evaluateCriterionEvidence(
      qualityCriterion,
      "생산 라인 QA 프로세스를 개선해 defect rate를 낮췄습니다."
    );

    expect(dataAssessment.semanticScore).toBeGreaterThanOrEqual(35);
    expect(salesAssessment.semanticScore).toBeGreaterThanOrEqual(35);
    expect(qualityAssessment.semanticScore).toBeGreaterThanOrEqual(35);
  });

  it("keeps broad domain calibration order across representative job families", () => {
    const softwareStrong = reportFor(
      "필수: TypeScript 기반 SaaS 플랫폼 개발 및 운영 경험",
      "TypeScript로 SaaS 플랫폼 결제 모듈을 10개월 운영하며 장애 대응과 배포 자동화를 담당했습니다."
    );
    const aiWeak = reportFor(
      "필수: Python 기반 머신러닝 모델 배포 및 운영 경험",
      "Python 머신러닝 강의를 수강했고 모델 배포 업무에 관심이 있습니다."
    );
    const qualityStrong = reportFor(
      "필수: 제조 공정 품질 개선과 불량률 저감 경험",
      "생산 공정 품질 데이터를 분석해 불량률을 18% 낮추고 검사 프로세스를 운영했습니다."
    );

    expect(softwareStrong.overallMatch.score).toBeGreaterThan(aiWeak.overallMatch.score);
    expect(qualityStrong.overallMatch.score).toBeGreaterThan(aiWeak.overallMatch.score);
    expect(aiWeak.overallMatch.score).toBeLessThanOrEqual(69);
  });
});
