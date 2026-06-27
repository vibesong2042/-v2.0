"use client";

import { useMemo, useState } from "react";
import { DocumentInputCard } from "./components/DocumentInputCard";
import { DepartmentReviewPanel } from "./components/DepartmentReviewPanel";
import { ReportView } from "./components/ReportView";
import { StepItem, StepNav } from "./components/StepNav";
import { WeightPanel } from "./components/WeightPanel";
import {
  DEFAULT_WEIGHT_SET,
  DocumentInput,
  ReportLanguage,
  ScoringWeightSet,
  StructuredMatchReport,
  analyzeStructuredMatch,
  generateStructuredReportText
} from "../lib/matching";
import { canRunAnalysis } from "../lib/workflow";

const steps: StepItem[] = [
  { title: "평가 핵심지표", description: "직무기술서와 추가 설명자료" },
  { title: "지원자 정보", description: "CV/이력서 등록" },
  { title: "보조지표/가중치", description: "전략자료와 분석 조건" },
  { title: "분석결과", description: "부서 전달 리포트" }
];

const emptyDocument: DocumentInput = {
  text: "",
  parseStatus: "idle"
};

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [copyLabel, setCopyLabel] = useState("복사");
  const [language, setLanguage] = useState<ReportLanguage>("ko");
  const [weights, setWeights] = useState<ScoringWeightSet>({
    ...DEFAULT_WEIGHT_SET,
    items: DEFAULT_WEIGHT_SET.items.map((item) => ({
      ...item,
      label:
        item.code === "jobDescription"
          ? "핵심지표"
          : item.code === "teamStrategy"
            ? "팀별 전략자료"
            : item.code === "mbo"
              ? "보직장 MBO"
              : "기타 주관식 의견"
    }))
  });
  const [core, setCore] = useState({
    jobDescription: {
      ...emptyDocument,
      text: "React 기반 채용 검토 도구 개발\nTypeScript 기반 운영 경험\n담당부서가 이해할 수 있는 근거 리포트 작성"
    },
    additionalMaterial: {
      ...emptyDocument,
      text: "HR 업무 자동화와 지원자 경험 데이터 구조화"
    }
  });
  const [candidate, setCandidate] = useState({
    resume: {
      ...emptyDocument,
      text: "React와 TypeScript로 사내 HR 도구를 개발했고 검토 리포트 화면을 운영했습니다."
    },
    referenceResume: {
      ...emptyDocument
    }
  });
  const [supporting, setSupporting] = useState({
    teamStrategy: {
      ...emptyDocument,
      text: "HR 검토 리드타임 단축"
    },
    managerMbo: {
      ...emptyDocument,
      text: "채용 검토 자동화율 향상"
    },
    subjectiveOpinion: {
      ...emptyDocument,
      text: "부서 전달 자료의 설명 가능성"
    }
  });
  const [report, setReport] = useState<StructuredMatchReport | null>(null);

  const analysisState = useMemo(
    () =>
      canRunAnalysis({
        requiredDocuments: [
          { label: "직무기술서", document: core.jobDescription },
          { label: "지원자 CV/이력서", document: candidate.resume }
        ],
        optionalDocuments: [
          { label: "추가 설명자료", document: core.additionalMaterial },
          { label: "기존 입사자 CV/이력서", document: candidate.referenceResume },
          { label: "팀별 전략자료", document: supporting.teamStrategy },
          { label: "보직장 MBO", document: supporting.managerMbo },
          { label: "기타 주관식 의견", document: supporting.subjectiveOpinion }
        ],
        weights
      }),
    [candidate, core, supporting, weights]
  );

  function runAnalysis() {
    if (!analysisState.ok) {
      return;
    }

    const nextReport = analyzeStructuredMatch({
      coreCriteria: {
        jobDescription: core.jobDescription.text,
        additionalMaterial: core.additionalMaterial.text
      },
      candidateInfo: {
        candidateResume: candidate.resume.text,
        referenceEmployeeResume: candidate.referenceResume.text
      },
      supportingCriteria: {
        teamStrategy: supporting.teamStrategy.text,
        managerMbo: supporting.managerMbo.text,
        subjectiveOpinion: supporting.subjectiveOpinion.text
      },
      weights,
      language
    });
    setReport(nextReport);
    setActiveStep(3);
    setCopyLabel("복사");
  }

  async function copyReport() {
    if (!report) {
      return;
    }

    await navigator.clipboard.writeText(generateStructuredReportText(report));
    setCopyLabel("복사됨");
    window.setTimeout(() => setCopyLabel("복사"), 1400);
  }

  function downloadReport() {
    if (!report) {
      return;
    }

    const blob = new Blob([generateStructuredReportText(report)], {
      type: "text/plain;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rolefit-report.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <section className="appHero">
        <div>
          <p className="eyebrow">JD/CV Matching Console</p>
          <h1>RoleFit Workbench</h1>
          <p>
            직무 기준 문서와 지원자 자료를 구조화해 담당부서 검토용 매칭 리포트를 생성하는
            채용 검토 워크벤치입니다.
          </p>
        </div>
        <div className="heroStatus">
          <span>처리 방식</span>
          <strong>파일 파싱 + Mock 분석</strong>
        </div>
      </section>

      <StepNav activeStep={activeStep} onSelect={setActiveStep} steps={steps} />

      {activeStep === 0 ? (
        <section className="workflowPanel">
          <div className="sectionHeader">
            <span>1단계</span>
            <h2>평가 핵심지표 등록</h2>
            <p>직무기술서와 추가 설명자료를 등록합니다.</p>
          </div>
          <div className="cardGrid">
            <DocumentInputCard
              helperText="직무 수행요건, 필수 역량, 우대사항을 포함하세요."
              label="직무기술서"
              onChange={(value) => setCore((current) => ({ ...current, jobDescription: value }))}
              required
              value={core.jobDescription}
            />
            <DocumentInputCard
              helperText="포지션 관련 배경, 조직 설명, 추가 요구사항이 있으면 등록하세요."
              label="추가 설명자료"
              onChange={(value) => setCore((current) => ({ ...current, additionalMaterial: value }))}
              value={core.additionalMaterial}
            />
          </div>
          <div className="footerActions">
            <button className="primary" onClick={() => setActiveStep(1)} type="button">
              지원자 정보로 이동
            </button>
          </div>
        </section>
      ) : null}

      {activeStep === 1 ? (
        <section className="workflowPanel">
          <div className="sectionHeader">
            <span>2단계</span>
            <h2>지원자 정보 등록</h2>
            <p>지원자 CV/이력서는 필수이며, 기존 입사자 CV는 비교용 선택 자료입니다.</p>
          </div>
          <div className="cardGrid">
            <DocumentInputCard
              helperText="지원자 경력, 프로젝트, 기술 역량이 포함된 CV/이력서를 등록하세요."
              label="지원자 CV/이력서"
              onChange={(value) => setCandidate((current) => ({ ...current, resume: value }))}
              required
              value={candidate.resume}
            />
            <DocumentInputCard
              helperText="동일/유사 포스트 기존 입사자의 CV가 있으면 유사도 계산에 사용합니다."
              label="기존 입사자 CV/이력서"
              onChange={(value) =>
                setCandidate((current) => ({ ...current, referenceResume: value }))
              }
              value={candidate.referenceResume}
            />
          </div>
          <div className="footerActions">
            <button onClick={() => setActiveStep(0)} type="button">
              이전
            </button>
            <button className="primary" onClick={() => setActiveStep(2)} type="button">
              보조지표로 이동
            </button>
          </div>
        </section>
      ) : null}

      {activeStep === 2 ? (
        <section className="workflowPanel">
          <div className="sectionHeader">
            <span>3단계</span>
            <h2>평가 보조지표 및 가중치 설정</h2>
            <p>분석 조건을 먼저 확인한 뒤, 필요하면 팀 전략과 관리자 의견을 보강합니다.</p>
          </div>

          <WeightPanel onChange={setWeights} weights={weights} />

          <div className="languagePanel">
            <label>
              리포트 언어
              <select
                onChange={(event) => setLanguage(event.target.value as ReportLanguage)}
                value={language}
              >
                <option value="ko">한국어</option>
                <option value="en">English(준비중)</option>
                <option value="zh">中文(准备中)</option>
              </select>
            </label>
            {language !== "ko" ? (
              <p className="parseInfo">다국어 리포트는 확장 예정입니다. 현재 결과는 한국어로 제공됩니다.</p>
            ) : null}
          </div>

          {!analysisState.ok ? (
            <ul className="blockingReasons">
              {analysisState.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}

          <div className="footerActions analysisActions">
            <button onClick={() => setActiveStep(1)} type="button">
              이전
            </button>
            <button className="primary" disabled={!analysisState.ok} onClick={runAnalysis} type="button">
              매칭 분석 실행
            </button>
          </div>

          <div className="cardGrid supportingInputs">
            <DocumentInputCard
              helperText="팀별 전략자료 또는 주요 과제/분야를 등록하세요."
              label="팀별 전략자료"
              onChange={(value) => setSupporting((current) => ({ ...current, teamStrategy: value }))}
              value={supporting.teamStrategy}
            />
            <DocumentInputCard
              helperText="보직장 MBO 또는 관리자가 중점적으로 보는 성과 기준을 등록하세요."
              label="보직장 MBO"
              onChange={(value) => setSupporting((current) => ({ ...current, managerMbo: value }))}
              value={supporting.managerMbo}
            />
            <DocumentInputCard
              helperText="기타 주관식 의견 또는 부서 검토 기준을 입력하세요."
              label="기타 주관식 의견"
              onChange={(value) =>
                setSupporting((current) => ({ ...current, subjectiveOpinion: value }))
              }
              value={supporting.subjectiveOpinion}
            />
          </div>
        </section>
      ) : null}

      {activeStep === 3 ? (
        <section className="workflowPanel">
          <div className="sectionHeader">
            <span>4단계</span>
            <h2>분석결과 리포트</h2>
            <p>부서 검토에 필요한 점수, 근거, 확인 질문을 문서 형태로 확인합니다.</p>
          </div>
          <ReportView
            copyLabel={copyLabel}
            onCopy={copyReport}
            onDownload={downloadReport}
            report={report}
          />
          <DepartmentReviewPanel report={report} />
          <div className="footerActions">
            <button onClick={() => setActiveStep(2)} type="button">
              보조지표 수정
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
