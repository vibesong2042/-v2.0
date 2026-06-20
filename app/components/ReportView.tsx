"use client";

import { ReactNode } from "react";
import { StructuredMatchReport } from "../../lib/matching";

export function ReportView({
  report,
  onCopy,
  onDownload,
  copyLabel
}: {
  report: StructuredMatchReport | null;
  onCopy: () => void;
  onDownload: () => void;
  copyLabel: string;
}) {
  if (!report) {
    return (
      <section className="emptyReport">
        <h2>분석결과 리포트</h2>
        <p>3단계에서 분석을 실행하면 담당부서 검토용 리포트가 생성됩니다.</p>
      </section>
    );
  }

  const activeWeights = report.appliedWeights.items.filter((item) => item.enabled);

  return (
    <section className="reportSheet" aria-label="RoleFit Report">
      <div className="reportActions">
        <button onClick={onCopy} type="button">
          {copyLabel}
        </button>
        <button onClick={onDownload} type="button">
          다운로드
        </button>
      </div>

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
            <td>Mock 분석 결과</td>
            <th>리포트 언어</th>
            <td>{report.language === "ko" ? "한국어" : "한국어(확장 예정)"}</td>
          </tr>
          <tr>
            <th>적용 가중치</th>
            <td colSpan={3}>
              {activeWeights.map((item) => `${item.label} ${item.weight}%`).join(" / ")}
            </td>
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
        <table className="reportDataTable">
          <thead>
            <tr>
              <th>핵심내용</th>
              <th>매칭도</th>
              <th>판단 근거</th>
            </tr>
          </thead>
          <tbody>
            {report.coreIndicatorMatches.map((item, index) => (
              <tr key={`${item.indicator}-${index}`}>
                <td>{item.indicator}</td>
                <td>{item.matchRate}%</td>
                <td>{item.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
