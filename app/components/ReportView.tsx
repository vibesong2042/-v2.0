"use client";

import { ReactNode, RefObject } from "react";
import { StructuredMatchReport } from "../../lib/matching";
import {
  CoreMatchStatus,
  getCoreMatchIcon,
  getCoreMatchLabel,
  getCoreMatchStatus,
  sortCoreMatchCards,
  summarizeCoreMatches
} from "./coreMatchViewModel";

export function ReportView({
  report,
  onCopy,
  onDownload,
  onPdfDownload,
  reportContentRef,
  copyLabel
}: {
  report: StructuredMatchReport | null;
  onCopy: () => void;
  onDownload: () => void;
  onPdfDownload: () => void;
  reportContentRef: RefObject<HTMLElement | null>;
  copyLabel: string;
}) {
  if (!report) {
    return (
      <section className="emptyReport">
        <div className="reportActions">
          <button disabled type="button">
            PDF 다운로드
          </button>
          <button disabled type="button">
            TXT 다운로드
          </button>
        </div>
        <h2>분석결과 리포트</h2>
        <p>3단계에서 분석을 실행하면 담당부서 검토용 리포트가 생성됩니다.</p>
      </section>
    );
  }

  const activeWeights = report.appliedWeights.items.filter((item) => item.enabled);
  const coreSummary = summarizeCoreMatches(report.criterionAssessments);
  const sortedCoreMatches = sortCoreMatchCards(report.criterionAssessments);

  return (
    <section className="reportViewShell" aria-label="RoleFit Report">
      <div className="reportActions">
        <button onClick={onCopy} type="button">
          {copyLabel}
        </button>
        <button onClick={onPdfDownload} type="button">
          PDF 다운로드
        </button>
        <button onClick={onDownload} type="button">
          TXT 다운로드
        </button>
      </div>

      <section className="reportSheet" ref={reportContentRef} aria-label="RoleFit Report 문서">
        <header className="reportTitleBar">
        <div>
          <p>RoleFit Report</p>
          <h2>분석결과 리포트</h2>
        </div>
        <div className="scoreBadge">
          <span>종합 매칭도</span>
          <strong>{report.overallMatch.score}%</strong>
        </div>
      </header>

      {report.languageNotice ? <p className="parseInfo">{report.languageNotice}</p> : null}

      <table className="reportMetaTable">
        <tbody>
          <tr>
            <th>생성 상태</th>
            <td>
              <span className={`analysisSourceBadge ${report.aiShadowReview.status}`}>
                {analysisSourceLabel(report)}
              </span>
            </td>
            <th>리포트 언어</th>
            <td>{report.language === "ko" ? "한국어" : "한국어(확장 예정)"}</td>
          </tr>
          <tr>
            <th>적용 가중치</th>
            <td colSpan={3}>
              {activeWeights.map((item) => `${item.label} ${item.weight}%`).join(" / ")}
            </td>
          </tr>
          <tr>
            <th>근거 충분성</th>
            <td>{report.confidence.level}</td>
            <th>신뢰도 판단</th>
            <td>{report.confidence.rationale}</td>
          </tr>
        </tbody>
      </table>

      <ReportSection title="종합 매칭도">
        <p className="reportLead">{report.overallMatch.recommendation}</p>
        <ul className="reportList">
          {report.overallMatch.rationale.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="핵심지표 매칭 여부">
        <div className="coreSummaryStrip" aria-label="핵심지표 요약">
          <CoreSummaryPill label="강한 매칭" status="strong" value={coreSummary.strong} />
          <CoreSummaryPill label="추가 확인" status="review" value={coreSummary.review} />
          <CoreSummaryPill label="문서상 확인 불가" status="missing" value={coreSummary.missing} />
          <CoreSummaryPill label="필수 미충족" status="missing" value={coreSummary.requiredUnmet} />
        </div>
        <div className="coreMatchGrid">
          {sortedCoreMatches.map((assessment) => {
            const status = getCoreMatchStatus(assessment.score, assessment.evidence.type);
            const statusLabel = getCoreMatchLabel(status);
            const evidenceText =
              assessment.evidence.type === "none"
                ? assessment.missing[0] ?? "지원자 문서상 확인 불가"
                : assessment.evidence.sentence;

            return (
              <article
                className={`coreMatchCard ${statusClassName(status)}${
                  assessment.criterion.required && status !== "strong" ? " requiredRisk" : ""
                }`}
                key={assessment.criterion.id}
              >
                <div className="coreMatchHeader">
                  <div>
                    <div className="coreMatchBadges">
                      {assessment.criterion.required ? <span>필수</span> : <span>선택</span>}
                      <span>{assessment.criterion.category}</span>
                    </div>
                    <h4>{assessment.criterion.title}</h4>
                  </div>
                  <strong>{assessment.score}%</strong>
                </div>
                <div
                  aria-label={`${statusLabel} ${assessment.score}%`}
                  className="coreMatchProgress"
                  role="img"
                >
                  <span style={{ width: `${assessment.score}%` }} />
                </div>
                <div className="coreMatchStatus">
                  <span aria-hidden="true" className="coreMatchStatusIcon">
                    {getCoreMatchIcon(status)}
                  </span>
                  <strong>{statusLabel}</strong>
                  <span>{evidenceTypeLabel(assessment.evidence.type)}</span>
                </div>
                <p className="coreMatchEvidenceClamp">{evidenceText}</p>
                <details className="coreMatchEvidence">
                  <summary>판단 근거 더보기</summary>
                  <p>{evidenceText}</p>
                  {assessment.interviewQuestion ? (
                    <p>인터뷰 확인: {assessment.interviewQuestion}</p>
                  ) : null}
                </details>
              </article>
            );
          })}
        </div>
      </ReportSection>

      <ReportSection title="보조지표 매칭 여부">
        <table className="reportDataTable">
          <thead>
            <tr>
              <th>보조지표</th>
              <th>적합도</th>
              <th>판단 근거</th>
            </tr>
          </thead>
          <tbody>
            {report.supportingIndicatorMatches.map((item) => (
              <tr key={item.source}>
                <td>{item.source}</td>
                <td>{item.matchRate}%</td>
                <td>{item.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="직무기술서 / 채용공고 대비 미보유 역량 또는 확인 불가 역량">
        <ul className="reportList">
          {report.missingCapabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="인터뷰 진행 시 필수 검증 질문 Top 3">
        <div className="questionGrid">
          {report.interviewQuestions.map((question, index) => (
            <article className="questionCard" key={question}>
              <span>Q{index + 1}</span>
              <p>{question}</p>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="기존 입사자 기술 유사도">
        <div className="referenceBox">
          {report.referenceSimilarity.status === "compared" ? (
            <>
              <strong>{report.referenceSimilarity.score}%</strong>
              <p>{report.referenceSimilarity.summary}</p>
            </>
          ) : (
            <p>{report.referenceSimilarity.summary}</p>
          )}
        </div>
      </ReportSection>
      </section>
    </section>
  );
}

function CoreSummaryPill({
  label,
  status,
  value
}: {
  label: string;
  status: CoreMatchStatus;
  value: number;
}) {
  return (
    <div className={`coreSummaryPill ${statusClassName(status)}`}>
      <span aria-hidden="true" className="coreMatchStatusIcon">
        {getCoreMatchIcon(status)}
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="reportBlock">
      <h3 className="reportSectionBar">{title}</h3>
      {children}
    </section>
  );
}

function statusClassName(status: CoreMatchStatus) {
  if (status === "strong") return "statusStrong";
  if (status === "review") return "statusReview";
  return "statusMissing";
}

function evidenceTypeLabel(type: "direct" | "indirect" | "none") {
  if (type === "direct") return "직접 근거";
  if (type === "indirect") return "간접 근거";
  return "문서상 확인 불가";
}

function analysisSourceLabel(report: StructuredMatchReport) {
  if (report.aiShadowReview.status === "completed") return "AI shadow 완료";
  if (report.aiShadowReview.status === "fallback") return "AI 오류로 Rule 사용";
  return "Rule 분석";
}
