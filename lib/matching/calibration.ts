import type { CoreCriteriaInputs, MatchConfidence, SupportingCriteriaInputs } from "../matching";

export type MatchingCalibrationSample = {
  name: string;
  resume: string;
  reference: string;
  min: number;
  max: number;
  confidence: MatchConfidence["level"];
};

export const CALIBRATION_CORE_CRITERIA: CoreCriteriaInputs = {
  jobDescription:
    "필수: React 기반 HR 도구 개발\n필수: TypeScript 운영 경험\n성과: 검토 리포트로 리드타임 30% 단축",
  additionalMaterial: "협업: 담당부서와 커뮤니케이션"
};

export const CALIBRATION_SUPPORTING_CRITERIA: SupportingCriteriaInputs = {
  teamStrategy: "HR 검토 리드타임 단축과 담당부서 설명 가능성 향상",
  managerMbo: "채용 검토 자동화율 향상",
  subjectiveOpinion: "운영 가능한 리포트와 명확한 근거 제시 역량 선호"
};

export const MATCHING_CALIBRATION_SAMPLES: MatchingCalibrationSample[] = [
  {
    name: "명확히 적합한 후보",
    resume:
      "React와 TypeScript로 HR 검토 도구를 개발했고, 담당부서용 리포트로 검토 시간을 30% 단축했습니다.",
    reference: "React TypeScript HR 검토 리포트 운영",
    min: 75,
    max: 100,
    confidence: "근거 충분"
  },
  {
    name: "일부 기술만 맞는 후보",
    resume: "React 화면 개발 경험은 있으나 HR 도메인과 TypeScript 운영 경험은 문서에 없습니다.",
    reference: "",
    min: 35,
    max: 74,
    confidence: "문서 근거 부족"
  },
  {
    name: "키워드는 많지만 실제 경험 근거가 약한 후보",
    resume: "React, TypeScript, HR, 리포트 키워드를 이해하고 있습니다.",
    reference: "",
    min: 10,
    max: 74,
    confidence: "문서 근거 부족"
  },
  {
    name: "직무 전환형 후보",
    resume:
      "고객지원 업무에서 채용 운영 데이터를 정리했고, 간단한 자동화 도구를 학습해 업무 개선을 시도했습니다.",
    reference: "",
    min: 20,
    max: 70,
    confidence: "문서 근거 부족"
  },
  {
    name: "기존 입사자와 유사한 후보",
    resume: "TypeScript 기반 HR 리포트 화면을 운영하고 채용 검토 데이터 구조를 개선했습니다.",
    reference: "TypeScript HR 리포트 운영 채용 검토 데이터 개선",
    min: 40,
    max: 90,
    confidence: "문서 근거 부족"
  },
  {
    name: "보조지표만 강한 후보",
    resume: "담당부서와 커뮤니케이션하며 채용 검토 리포트 개선 의견을 정리했습니다.",
    reference: "",
    min: 20,
    max: 69,
    confidence: "문서 근거 부족"
  }
];
