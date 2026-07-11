"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useMemo, useRef, useState } from "react";
import { DocumentInputCard } from "./components/DocumentInputCard";
import { DepartmentReviewPanel } from "./components/DepartmentReviewPanel";
import { ReportView } from "./components/ReportView";
import { StepItem, StepNav } from "./components/StepNav";
import { WeightPanel } from "./components/WeightPanel";
import type { ExtractTextResult } from "../lib/documentExtraction";
import type { CandidateCase, CandidateReportSummary } from "../lib/candidates";
import {
  candidateNameFromFile,
  createCandidateCase,
  hasCandidateContent,
  removeCandidateCase,
  summarizeCandidateReports
} from "../lib/candidates";
import {
  DEFAULT_WEIGHT_SET,
  DocumentInput,
  ReportLanguage,
  ScoringWeightSet,
  StructuredMatchReport,
  analyzeStructuredMatchWithAdapter,
  generateStructuredReportText
} from "../lib/matching";
import { MockAiMatchingAdapter } from "../lib/matching/aiAdapter";
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

const mockAiMatchingAdapter = new MockAiMatchingAdapter();

type CandidateAnalysisReport = CandidateReportSummary & {
  report: StructuredMatchReport;
};

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [copyLabel, setCopyLabel] = useState("복사");
  const [language, setLanguage] = useState<ReportLanguage>("ko");
  const candidateBatchInputRef = useRef<HTMLInputElement>(null);
  const reportPdfRef = useRef<HTMLElement>(null);
  const batchRequestIdRef = useRef(0);
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
    jobDescription: { ...emptyDocument },
    additionalMaterial: { ...emptyDocument }
  });
  const [candidateCases, setCandidateCases] = useState<CandidateCase[]>([
    createCandidateCase(0, "candidate-1")
  ]);
  const [referenceResume, setReferenceResume] = useState<DocumentInput>({
    ...emptyDocument
  });
  const [supporting, setSupporting] = useState({
    teamStrategy: { ...emptyDocument },
    managerMbo: { ...emptyDocument },
    subjectiveOpinion: { ...emptyDocument }
  });
  const [candidateReports, setCandidateReports] = useState<CandidateAnalysisReport[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("candidate-1");
  const selectedReport =
    candidateReports.find((candidateReport) => candidateReport.id === selectedCandidateId)?.report ??
    candidateReports[0]?.report ??
    null;
  const activeCandidateCases = useMemo(
    () => candidateCases.filter(hasCandidateContent),
    [candidateCases]
  );
  const teamStrategyActive = isWeightedCriterionActive(weights, "teamStrategy");
  const managerMboActive = isWeightedCriterionActive(weights, "mbo");
  const subjectiveOpinionActive = isWeightedCriterionActive(weights, "custom");

  const analysisState = useMemo(() => {
    const documentState = canRunAnalysis({
        requiredDocuments: [
          { label: "직무기술서", document: core.jobDescription },
        ...activeCandidateCases.map((candidateCase) => ({
            label: `${candidateCase.name || "지원자"} CV/이력서`,
            document: candidateCase.resume
          }))
        ],
        optionalDocuments: [
          { label: "추가 설명자료", document: core.additionalMaterial },
          { label: "기존 입사자 CV/이력서", document: referenceResume },
        { label: "팀별 전략자료", document: supporting.teamStrategy, active: teamStrategyActive },
        { label: "보직장 MBO", document: supporting.managerMbo, active: managerMboActive },
        {
          label: "기타 주관식 의견",
          document: supporting.subjectiveOpinion,
          active: subjectiveOpinionActive
        }
        ],
        weights
    });
    const reasons =
      activeCandidateCases.length === 0
        ? ["지원자 CV/이력서를 1명 이상 등록하세요.", ...documentState.reasons]
        : documentState.reasons;

    return {
      ok: reasons.length === 0,
      reasons
    };
  }, [
    activeCandidateCases,
    core,
    managerMboActive,
    referenceResume,
    subjectiveOpinionActive,
    supporting,
    teamStrategyActive,
    weights
  ]);
  const analysisSummaryItems = [
    buildDocumentSummary("직무기술서", core.jobDescription, true),
    buildDocumentSummary("추가 설명자료", core.additionalMaterial, true, "미사용"),
    buildCandidateSummary(activeCandidateCases),
    buildDocumentSummary("기존 입사자 CV/이력서", referenceResume, true, "미사용"),
    buildDocumentSummary("팀별 전략자료", supporting.teamStrategy, teamStrategyActive, "분석 제외"),
    buildDocumentSummary("보직장 MBO", supporting.managerMbo, managerMboActive, "분석 제외"),
    buildDocumentSummary("기타 주관식 의견", supporting.subjectiveOpinion, subjectiveOpinionActive, "분석 제외")
  ];

  async function runAnalysis() {
    if (!analysisState.ok || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const reports: CandidateAnalysisReport[] = [];

      for (const candidateCase of activeCandidateCases) {
        const report = await analyzeStructuredMatchWithAdapter({
          coreCriteria: {
            jobDescription: core.jobDescription.text,
            additionalMaterial: core.additionalMaterial.text
          },
          candidateInfo: {
            candidateResume: candidateCase.resume.text,
            referenceEmployeeResume: referenceResume.text
          },
          supportingCriteria: {
            teamStrategy: teamStrategyActive ? supporting.teamStrategy.text : "",
            managerMbo: managerMboActive ? supporting.managerMbo.text : "",
            subjectiveOpinion: subjectiveOpinionActive ? supporting.subjectiveOpinion.text : ""
          },
          weights,
          language,
          adapter: mockAiMatchingAdapter
        });

        reports.push({
          id: candidateCase.id,
          name: candidateCase.name,
          score: report.overallMatch.score,
          confidence: report.confidence.level,
          report
        });
      }

      const nextReports = summarizeCandidateReports(reports);

      setCandidateReports(nextReports);
      setSelectedCandidateId(nextReports[0]?.id ?? activeCandidateCases[0]?.id ?? "candidate-1");
      setActiveStep(3);
      setCopyLabel("복사");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function copyReport() {
    if (!selectedReport) {
      return;
    }

    await navigator.clipboard.writeText(generateStructuredReportText(selectedReport));
    setCopyLabel("복사됨");
    window.setTimeout(() => setCopyLabel("복사"), 1400);
  }

  function downloadReport() {
    if (!selectedReport) {
      return;
    }

    const selectedCandidate = candidateReports.find(
      (candidateReport) => candidateReport.id === selectedCandidateId
    );
    const blob = new Blob([generateStructuredReportText(selectedReport)], {
      type: "text/plain;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rolefit-report-${fileSafeName(selectedCandidate?.name ?? "candidate")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdfReport() {
    if (!selectedReport || !reportPdfRef.current) {
      return;
    }

    const selectedCandidate = candidateReports.find(
      (candidateReport) => candidateReport.id === selectedCandidateId
    );
    const canvas = await html2canvas(reportPdfRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      format: "a4",
      orientation: "portrait",
      unit: "pt"
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    let yPosition = 0;
    let remainingHeight = imageHeight;

    pdf.addImage(imageData, "PNG", 0, yPosition, imageWidth, imageHeight);
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      yPosition -= pageHeight;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, yPosition, imageWidth, imageHeight);
      remainingHeight -= pageHeight;
    }

    pdf.save(`rolefit-report-${fileSafeName(selectedCandidate?.name ?? "candidate")}.pdf`);
  }

  function updateCandidateResume(candidateId: string, resume: DocumentInput) {
    setCandidateCases((current) =>
      current.map((candidateCase) =>
        candidateCase.id === candidateId ? { ...candidateCase, resume } : candidateCase
      )
    );
  }

  function updateCandidateName(candidateId: string, name: string) {
    setCandidateCases((current) =>
      current.map((candidateCase) =>
        candidateCase.id === candidateId ? { ...candidateCase, name } : candidateCase
      )
    );
  }

  function addCandidateCase() {
    setCandidateCases((current) => [
      ...current,
      createCandidateCase(current.length, `candidate-${Date.now()}`)
    ]);
  }

  function removeCandidate(candidateId: string) {
    setCandidateCases((current) => removeCandidateCase(current, candidateId));
  }

  function fillDemoExample() {
    setCore({
      jobDescription: demoDocument(
        [
          "React 기반 채용 검토 도구 개발",
          "TypeScript 기반 운영 경험",
          "담당부서가 이해할 수 있는 근거 리포트 작성"
        ].join("\n")
      ),
      additionalMaterial: demoDocument("HR 업무 자동화와 지원자 경험 데이터 구조화")
    });
    setCandidateCases([
      {
        ...createCandidateCase(0, "candidate-1"),
        name: "테스트 후보자 1",
        resume: demoDocument(
          "React와 TypeScript로 사내 HR 도구를 개발했고 검토 리포트 화면을 운영했습니다."
        )
      }
    ]);
    setReferenceResume({ ...emptyDocument });
    setSupporting({
      teamStrategy: demoDocument("HR 검토 리드타임 단축"),
      managerMbo: demoDocument("채용 검토 자동화율 향상"),
      subjectiveOpinion: demoDocument("부서 전달 자료의 설명 가능성")
    });
    setCandidateReports([]);
    setSelectedCandidateId("candidate-1");
    setCopyLabel("복사");
  }

  async function parseCandidateFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const requestId = batchRequestIdRef.current + 1;
    batchRequestIdRef.current = requestId;
    const timestamp = Date.now();
    const newCandidates = files.map((file, index) => ({
      id: `candidate-${timestamp}-${index}`,
      name: candidateNameFromFile(file.name, candidateCases.length + index),
      resume: {
        ...emptyDocument,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        parseStatus: "parsing" as const,
        parseError: ""
      }
    }));

    setCandidateCases((current) => {
      const hasOnlyEmptyCandidate =
        current.length === 1 && !current[0].resume.text.trim() && !current[0].resume.fileName;
      return hasOnlyEmptyCandidate ? newCandidates : [...current, ...newCandidates];
    });

    await Promise.all(
      files.map(async (file, index) => {
        const candidateId = newCandidates[index].id;
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/extract-text", {
            method: "POST",
            body: formData
          });
          const result = (await response.json()) as ExtractTextResult;

          if (requestId !== batchRequestIdRef.current) {
            return;
          }

          setCandidateCases((current) =>
            current.map((candidateCase) => {
              if (candidateCase.id !== candidateId) {
                return candidateCase;
              }

              if (!result.ok) {
                return {
                  ...candidateCase,
                  resume: {
                    ...candidateCase.resume,
                    fileName: result.fileName || file.name,
                    fileType: result.fileType || file.type,
                    fileSize: file.size,
                    parseStatus: "failed",
                    parseError: result.error,
                    extraction: undefined
                  }
                };
              }

              return {
                ...candidateCase,
                resume: {
                  ...candidateCase.resume,
                  text: result.plainText,
                  fileName: result.fileName,
                  fileType: result.fileType,
                  fileSize: file.size,
                  parseStatus: "parsed",
                  parseError: "",
                  extraction: {
                    method: "local",
                    warnings: result.warnings,
                    requiresReview: result.requiresReview,
                    confidence: result.confidence,
                    provider: result.provider,
                    quality: result.quality,
                    verified: false
                  }
                }
              };
            })
          );
        } catch {
          if (requestId !== batchRequestIdRef.current) {
            return;
          }

          setCandidateCases((current) =>
            current.map((candidateCase) =>
              candidateCase.id === candidateId
                ? {
                    ...candidateCase,
                    resume: {
                      ...candidateCase.resume,
                      fileName: file.name,
                      fileType: file.type || "application/octet-stream",
                      fileSize: file.size,
                      parseStatus: "failed",
                      parseError: "문서 텍스트 추출에 실패했습니다. 수동 입력으로 보정해 주세요.",
                      extraction: undefined
                    }
                  }
                : candidateCase
            )
          );
        }
      })
    );
  }

  return (
    <main className="shell">
      <header className="appHeader">
        <div className="productIdentity">
          <h1>RoleFit Workbench</h1>
          <span>JD/CV Matching Console</span>
        </div>
        <div className="workspaceStatus" aria-label="실행 환경">
          <span className="environmentBadge">Local</span>
          <span className="environmentBadge muted">Mock AI Shadow</span>
          <button type="button" onClick={fillDemoExample}>
            테스트 예시 채우기
          </button>
        </div>
      </header>

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
            <p>한 포지션에 여러 후보자를 등록하고, 후보자별 CV/이력서를 확인 완료합니다.</p>
          </div>
          <div className="candidateToolbar">
            <input
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
              hidden
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                void parseCandidateFiles(files);
              }}
              ref={candidateBatchInputRef}
              type="file"
            />
            <button type="button" onClick={() => candidateBatchInputRef.current?.click()}>
              복수 후보자 파일 업로드
            </button>
            <button type="button" onClick={addCandidateCase}>
              후보자 직접 추가
            </button>
          </div>

          <div className="candidateList">
            {candidateCases.map((candidateCase, index) => (
              <section className="candidateCase" key={candidateCase.id}>
                <div className="candidateCaseHeader">
                  <label>
                    후보자 표시명
                    <input
                      onChange={(event) => updateCandidateName(candidateCase.id, event.target.value)}
                      value={candidateCase.name}
                    />
                  </label>
                  <button type="button" onClick={() => removeCandidate(candidateCase.id)}>
                    후보자 제거
                  </button>
                </div>
                <DocumentInputCard
                  helperText="지원자 경력, 프로젝트, 기술 역량이 포함된 CV/이력서를 등록하세요."
                  label={`${candidateCase.name || `지원자 ${index + 1}`} CV/이력서`}
                  onChange={(value) => updateCandidateResume(candidateCase.id, value)}
                  required
                  value={candidateCase.resume}
                />
              </section>
            ))}
          </div>

          <div className="cardGrid">
            <DocumentInputCard
              helperText="동일/유사 포스트 기존 입사자의 CV가 있으면 유사도 계산에 사용합니다."
              label="기존 입사자 CV/이력서"
              onChange={setReferenceResume}
              value={referenceResume}
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

          <div className="analysisSetupGrid">
            <div className="analysisConfigColumn">
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
            </div>

            <section className="analysisTargetSummary" aria-label="분석 대상 요약">
              <div className="analysisTargetHeader">
                <h3>분석 대상 요약</h3>
                <p>분석에 포함되는 문서와 제외되는 문서를 확인합니다.</p>
              </div>
              <div className="analysisTargetGrid">
                {analysisSummaryItems.map((item) => (
                  <div className="analysisTargetItem" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.status}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {!analysisState.ok ? (
            <ul className="blockingReasons">
              {analysisState.reasons.map((reason) => {
                const targetStep = stepForBlockingReason(reason);
                return (
                  <li key={reason}>
                    <span>{reason}</span>
                    <button onClick={() => setActiveStep(targetStep)} type="button">
                      {targetStep === 0
                        ? "1단계로 이동"
                        : targetStep === 1
                          ? "2단계로 이동"
                          : "3단계에서 확인"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="footerActions analysisActions">
            <button onClick={() => setActiveStep(1)} type="button">
              이전
            </button>
            <button
              className="primary"
              disabled={!analysisState.ok || isAnalyzing}
              onClick={() => void runAnalysis()}
              type="button"
            >
              {isAnalyzing ? "분석 중" : "매칭 분석 실행"}
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
          {candidateReports.length > 0 ? (
            <section className="candidateSummaryPanel" aria-label="후보자 비교 요약">
              <div className="candidateSummaryHeader">
                <h3>후보자 비교 요약</h3>
                <p>점수 순으로 정렬되며, 후보자를 선택하면 아래 리포트가 변경됩니다.</p>
              </div>
              <div className="candidateSummaryColumns" aria-hidden="true">
                <span>순위</span>
                <span>후보자</span>
                <span>종합점수</span>
                <span>근거 충분성</span>
                <span>분석 출처</span>
              </div>
              <div className="candidateSummaryList">
                {candidateReports.map((candidateReport, index) => (
                  <button
                    className={candidateReport.id === selectedCandidateId ? "selected" : ""}
                    key={candidateReport.id}
                    onClick={() => {
                      setSelectedCandidateId(candidateReport.id);
                      setCopyLabel("복사");
                    }}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <strong>{candidateReport.name}</strong>
                    <em>{candidateReport.score}%</em>
                    <small>{candidateReport.confidence}</small>
                    <small>{candidateAnalysisSource(candidateReport.report)}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <ReportView
            copyLabel={copyLabel}
            onCopy={copyReport}
            onDownload={downloadReport}
            onPdfDownload={downloadPdfReport}
            report={selectedReport}
            reportContentRef={reportPdfRef}
          />
          <DepartmentReviewPanel report={selectedReport} />
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

function fileSafeName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_").trim() || "candidate";
}

function candidateAnalysisSource(report: StructuredMatchReport) {
  if (report.aiShadowReview.status === "completed") {
    return "Mock AI shadow";
  }

  if (report.aiShadowReview.status === "fallback") {
    return "Rule fallback";
  }

  return "Rule";
}

function isWeightedCriterionActive(
  weights: ScoringWeightSet,
  code: "teamStrategy" | "mbo" | "custom"
) {
  const item = weights.items.find((weight) => weight.code === code);
  return Boolean(item?.enabled && Number(item.weight) > 0);
}

function buildDocumentSummary(
  label: string,
  document: DocumentInput,
  active: boolean,
  emptyStatus = "등록 필요"
) {
  if (!active) {
    return { label, status: "분석 제외" };
  }

  if (document.parseStatus === "parsing") {
    return { label, status: "추출 중" };
  }

  if (!document.text.trim()) {
    return { label, status: emptyStatus };
  }

  return {
    label,
    status: document.extraction?.verified === true ? "확인 완료" : "확인 필요"
  };
}

function buildCandidateSummary(candidateCases: CandidateCase[]) {
  if (candidateCases.length === 0) {
    return { label: "후보자", status: "등록 필요" };
  }

  const parsingCount = candidateCases.filter(
    (candidateCase) => candidateCase.resume.parseStatus === "parsing"
  ).length;
  const unverifiedCount = candidateCases.filter(
    (candidateCase) => candidateCase.resume.extraction?.verified !== true
  ).length;

  if (parsingCount > 0) {
    return {
      label: "후보자",
      status: `${candidateCases.length}명 분석 대상, ${parsingCount}명 추출 중`
    };
  }

  if (unverifiedCount > 0) {
    return {
      label: "후보자",
      status: `${candidateCases.length}명 분석 대상, ${unverifiedCount}명 확인 필요`
    };
  }

  return {
    label: "후보자",
    status: `${candidateCases.length}명 분석 대상, 확인 완료`
  };
}

function stepForBlockingReason(reason: string) {
  if (reason.includes("직무기술서") || reason.includes("추가 설명자료")) {
    return 0;
  }

  if (reason.includes("지원자") || reason.includes("기존 입사자")) {
    return 1;
  }

  return 2;
}

function demoDocument(text: string): DocumentInput {
  return {
    ...emptyDocument,
    text,
    extraction: {
      method: "manual",
      warnings: [],
      requiresReview: false,
      verified: false
    }
  };
}
