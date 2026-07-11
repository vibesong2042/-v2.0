"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { mockDepartmentHeads, searchDepartmentHeads, type DepartmentHead } from "../../lib/employees";
import type { StructuredMatchReport } from "../../lib/matching";
import type { ReviewPacket } from "../../lib/reviews/service";

type CreatedReview = Pick<ReviewPacket, "request" | "candidateName" | "jobTitle">;

export function DepartmentReviewPanel({
  report,
  candidateName,
  resumeText
}: {
  report: StructuredMatchReport | null;
  candidateName: string;
  resumeText: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedHead, setSelectedHead] = useState<DepartmentHead>(mockDepartmentHeads[0]);
  const [dueAt, setDueAt] = useState(defaultDueDate());
  const [hrNote, setHrNote] = useState("필수요건과 문서상 확인 불가 항목을 인터뷰에서 검증해 주세요.");
  const [createdReview, setCreatedReview] = useState<CreatedReview | null>(null);
  const [requestError, setRequestError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const searchResults = useMemo(() => searchDepartmentHeads(query), [query]);

  if (!report) {
    return (
      <section className="departmentReviewPanel">
        <div className="departmentReviewHeader">
          <span>Mock workflow</span>
          <h3>현업 부서 검토 요청</h3>
          <p>분석 결과가 생성되면 부서장 검토 키트를 만들 수 있습니다.</p>
        </div>
      </section>
    );
  }
  const activeReport = report;

  const mailPreview = [
    `수신: ${selectedHead.name} ${selectedHead.role} (${selectedHead.email})`,
    `제목: [RoleFit] ${candidateName || "후보자"} 검토 요청`,
    "",
    `${selectedHead.name}님, 후보자 1차 스크리닝 검토를 요청드립니다.`,
    `검토 기한: ${dueAt}`,
    "사내 SSO 검토 링크에서 스크리닝 요약, CV 원본, 인터뷰 키트를 확인해 주세요.",
    "",
    "※ 이 Mock 메일에는 CV 원문과 상세 평가 근거가 포함되지 않으며 실제 발송되지 않습니다."
  ].join("\n");

  async function createReviewRequest() {
    setIsSending(true);
    setRequestError("");
    try {
      const response = await fetch("/api/review-requests", {
        method: "POST",
        headers: mockHeaders("recruiter-1", "Local Recruiter", "Recruiter"),
        body: JSON.stringify({
          jobId: "local-job",
          candidateId: `local-${candidateName || "candidate"}`,
          reportId: `report-${Date.now()}`,
          resumeDocumentId: `resume-${Date.now()}`,
          resumeVersion: "v1",
          reviewerId: selectedHead.id,
          dueAt: new Date(`${dueAt}T18:00:00+09:00`).toISOString(),
          jobTitle: "현재 채용 포지션",
          candidateName: candidateName || "합성 후보자",
          recruiterName: "테스트 채용담당자",
          hrDecision: "부서 검토 요청",
          hrNote,
          score: activeReport.overallMatch.score,
          confidence: activeReport.confidence.level,
          criteria: activeReport.criterionAssessments.map((assessment) => ({
            id: assessment.criterion.id,
            title: assessment.criterion.title,
            required: assessment.criterion.required,
            status:
              assessment.evidence.type === "none"
                ? "UNDECIDED"
                : assessment.score >= 70
                  ? "MET"
                  : "NOT_MET",
            evidence:
              assessment.evidence.type === "none"
                ? assessment.missing[0] ?? "문서상 확인 불가"
                : assessment.evidence.sentence,
            interviewQuestion: assessment.interviewQuestion ?? "관련 경험을 구체적으로 확인해 주세요."
          })),
          resume: {
            fileName: `${candidateName || "synthetic-candidate"}-resume.txt`,
            contentType: "text/plain",
            text: resumeText || "합성 CV 본문이 아직 등록되지 않았습니다."
          }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "검토 요청을 만들지 못했습니다.");
      setCreatedReview(result.data);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "검토 요청을 만들지 못했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="departmentReviewPanel" aria-labelledby="department-review-title">
      <div className="departmentReviewHeader">
        <span>Mock workflow · 실제 메일 미발송</span>
        <h3 id="department-review-title">현업 부서 검토 요청</h3>
        <p>수신자와 CV 버전을 확인한 뒤 사내 SSO 검토 키트를 생성합니다.</p>
      </div>

      <div className="reviewTimeline" aria-label="검토 진행 상태">
        <ReviewStep active label="HR 스크리닝 완료" />
        <ReviewStep active={Boolean(selectedHead)} label="부서장 지정" />
        <ReviewStep active={Boolean(createdReview)} label="검토 요청 생성" />
        <ReviewStep active={createdReview?.request.status === "SUBMITTED"} label="결과 회신" />
      </div>

      <div className="departmentReviewGrid">
        <div className="reviewCard">
          <h4>요청 설정</h4>
          <label className="fieldLabel">
            부서장 검색
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="이름, 부서, 이메일"
              type="search"
              value={query}
            />
          </label>
          <div className="employeeList">
            {searchResults.map((employee) => (
              <button
                className={selectedHead.id === employee.id ? "employeeOption selected" : "employeeOption"}
                key={employee.id}
                onClick={() => {
                  setSelectedHead(employee);
                  setCreatedReview(null);
                }}
                type="button"
              >
                <strong>{employee.name}</strong>
                <span>{employee.department}</span>
                <small>{employee.email}</small>
              </button>
            ))}
          </div>
          <label className="fieldLabel">
            검토 기한
            <input min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} />
          </label>
          <label className="fieldLabel">
            HR 전달 메모
            <textarea maxLength={1000} onChange={(event) => setHrNote(event.target.value)} value={hrNote} />
          </label>
        </div>

        <div className="reviewCard">
          <h4>전송 전 확인</h4>
          <dl className="previewMeta">
            <div><dt>후보자</dt><dd>{candidateName || "합성 후보자"}</dd></div>
            <div><dt>CV 버전</dt><dd>v1 · 요청 생성 시점 고정</dd></div>
            <div><dt>검토 기준</dt><dd>{report.criterionAssessments.length}개</dd></div>
            <div><dt>수신자</dt><dd>{selectedHead.email}</dd></div>
          </dl>
          <pre className="mailPreview">{mailPreview}</pre>
          {requestError ? <p className="analysisError" role="alert">{requestError}</p> : null}
          <div className="reviewActions">
            <button className="primary" disabled={isSending || !dueAt} onClick={createReviewRequest} type="button">
              {isSending ? "요청 생성 중…" : "Mock 검토 요청 생성"}
            </button>
            {createdReview ? (
              <Link className="buttonLink" href={`/reviews/${createdReview.request.id}?reviewer=${selectedHead.id}`}>
                부서장 검토 키트 열기
              </Link>
            ) : null}
          </div>
          {createdReview ? (
            <p className="mockNotice" role="status">
              요청이 인메모리에 생성되었습니다. 개발 서버가 재시작되면 사라집니다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReviewStep({ active, label }: { active: boolean; label: string }) {
  return <div className={active ? "reviewStep active" : "reviewStep"}><span aria-hidden="true">{active ? "✓" : "○"}</span><strong>{label}</strong></div>;
}

function mockHeaders(userId: string, name: string, role: string) {
  return {
    "content-type": "application/json",
    "x-rolefit-mock-user": userId,
    "x-rolefit-mock-name": name,
    "x-rolefit-mock-role": role
  };
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}
