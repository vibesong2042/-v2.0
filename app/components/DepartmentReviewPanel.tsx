"use client";

import { useMemo, useState } from "react";
import {
  InterviewFinalOpinion,
  InterviewResultForm,
  buildDepartmentReviewRequestPreview,
  buildInterviewResultPreview,
  canSendDepartmentReviewRequest,
  canSubmitInterviewResult
} from "../../lib/departmentReview";
import { DepartmentHead, searchDepartmentHeads } from "../../lib/employees";
import { StructuredMatchReport } from "../../lib/matching";

const emptyInterviewResult: InterviewResultForm = {
  interviewDate: "",
  interviewer: "",
  summary: "",
  jobFit: "",
  strengths: "",
  concerns: "",
  followUps: "",
  finalOpinion: ""
};

const finalOpinions: InterviewFinalOpinion[] = ["추천", "보류", "비추천", "추가 인터뷰 필요"];

export function DepartmentReviewPanel({ report }: { report: StructuredMatchReport | null }) {
  const [query, setQuery] = useState("");
  const [selectedHead, setSelectedHead] = useState<DepartmentHead | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [viewMode, setViewMode] = useState<"hr" | "departmentHead">("hr");
  const [interviewResult, setInterviewResult] =
    useState<InterviewResultForm>(emptyInterviewResult);
  const [resultReturned, setResultReturned] = useState(false);

  const searchResults = useMemo(() => searchDepartmentHeads(query), [query]);
  const requestPreview =
    report && selectedHead
      ? buildDepartmentReviewRequestPreview({
          departmentHead: selectedHead,
          overallScore: report.overallMatch.score,
          topQuestions: report.interviewQuestions.slice(0, 3)
        })
      : null;
  const resultPreview =
    selectedHead && canSubmitInterviewResult(interviewResult)
      ? buildInterviewResultPreview({ departmentHead: selectedHead, result: interviewResult })
      : null;
  const canSendRequest = canSendDepartmentReviewRequest({
    hasReport: report !== null,
    departmentHead: selectedHead
  });
  const canReturnResult = canSubmitInterviewResult(interviewResult);

  function selectDepartmentHead(departmentHead: DepartmentHead) {
    setSelectedHead(departmentHead);
    setRequestSent(false);
    setResultReturned(false);
    setViewMode("hr");
  }

  function updateInterviewResult<K extends keyof InterviewResultForm>(
    key: K,
    value: InterviewResultForm[K]
  ) {
    setInterviewResult((current) => ({ ...current, [key]: value }));
    setResultReturned(false);
  }

  if (!report) {
    return (
      <section className="departmentReviewPanel">
        <div className="departmentReviewHeader">
          <span>Demo Mode</span>
          <h3>현업부서 검토 요청</h3>
          <p>분석결과 리포트가 생성되면 부서장 검토 요청 흐름을 확인할 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="departmentReviewPanel" aria-label="현업부서 검토 요청">
      <div className="departmentReviewHeader">
        <span>Demo Mode · 실제 메일은 발송되지 않습니다</span>
        <h3>현업부서 검토 요청</h3>
        <p>
          사내 메일/API 연결 전, 부서장 검토 요청과 전화인터뷰 결과 회신 흐름을 화면에서
          미리 확인합니다.
        </p>
      </div>

      <div className="reviewTimeline" aria-label="검토 진행 상태">
        <ReviewStep active label="리포트 생성" />
        <ReviewStep active={selectedHead !== null} label="부서장 선택" />
        <ReviewStep active={requestSent} label="검토 요청 Mock 발송" />
        <ReviewStep active={resultReturned} label="결과 회신 완료" />
      </div>

      {viewMode === "hr" ? (
        <div className="departmentReviewGrid">
          <div className="reviewCard">
            <label className="fieldLabel">
              부서장 검색
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름, 부서, 역할, 이메일 검색"
                type="search"
                value={query}
              />
            </label>
            <div className="employeeList">
              {searchResults.map((employee) => (
                <button
                  className={
                    selectedHead?.id === employee.id ? "employeeOption selected" : "employeeOption"
                  }
                  key={employee.id}
                  onClick={() => selectDepartmentHead(employee)}
                  type="button"
                >
                  <strong>{employee.name}</strong>
                  <span>{employee.department}</span>
                  <small>{employee.email}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="reviewCard">
            <h4>검토 요청 미리보기</h4>
            {requestPreview ? (
              <>
                <dl className="previewMeta">
                  <div>
                    <dt>수신자</dt>
                    <dd>{requestPreview.to}</dd>
                  </div>
                  <div>
                    <dt>제목</dt>
                    <dd>{requestPreview.subject}</dd>
                  </div>
                </dl>
                <pre className="mailPreview">{requestPreview.body}</pre>
              </>
            ) : (
              <p className="mutedText">부서장을 선택하면 검토 요청 미리보기가 표시됩니다.</p>
            )}
            <div className="reviewActions">
              <button
                className="primary"
                disabled={!canSendRequest}
                onClick={() => setRequestSent(true)}
                type="button"
              >
                Mock 검토 요청 발송
              </button>
              <button
                disabled={!requestSent}
                onClick={() => setViewMode("departmentHead")}
                type="button"
              >
                부서장 화면 미리보기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="departmentHeadView">
          <div className="reviewCard">
            <button onClick={() => setViewMode("hr")} type="button">
              HR 화면으로 돌아가기
            </button>
            <h4>부서장 검토 화면</h4>
            <p className="mutedText">
              {selectedHead?.name} {selectedHead?.role} / {selectedHead?.department}
            </p>
            <div className="scoreBadge compact">
              <span>종합 매칭도</span>
              <strong>{report.overallMatch.score}%</strong>
            </div>
            <h5>인터뷰 진행 시 필수 검증 질문 Top 3</h5>
            <ol className="reviewQuestionList">
              {report.interviewQuestions.slice(0, 3).map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </div>

          <form className="reviewCard interviewForm">
            <h4>전화인터뷰 결과표</h4>
            <div className="formGrid">
              <label className="fieldLabel">
                인터뷰 일시 *
                <input
                  onChange={(event) => updateInterviewResult("interviewDate", event.target.value)}
                  type="date"
                  value={interviewResult.interviewDate}
                />
              </label>
              <label className="fieldLabel">
                인터뷰 담당자
                <input
                  onChange={(event) => updateInterviewResult("interviewer", event.target.value)}
                  placeholder={selectedHead?.name ?? "담당자명"}
                  value={interviewResult.interviewer}
                />
              </label>
              <label className="fieldLabel">
                최종 의견 *
                <select
                  onChange={(event) =>
                    updateInterviewResult(
                      "finalOpinion",
                      event.target.value as InterviewResultForm["finalOpinion"]
                    )
                  }
                  value={interviewResult.finalOpinion}
                >
                  <option value="">선택</option>
                  {finalOpinions.map((opinion) => (
                    <option key={opinion} value={opinion}>
                      {opinion}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="fieldLabel">
              종합 의견 *
              <textarea
                onChange={(event) => updateInterviewResult("summary", event.target.value)}
                placeholder="전화인터뷰에서 확인된 핵심 판단을 입력하세요."
                value={interviewResult.summary}
              />
            </label>
            <label className="fieldLabel">
              직무 적합성
              <textarea
                onChange={(event) => updateInterviewResult("jobFit", event.target.value)}
                value={interviewResult.jobFit}
              />
            </label>
            <label className="fieldLabel">
              확인된 강점
              <textarea
                onChange={(event) => updateInterviewResult("strengths", event.target.value)}
                value={interviewResult.strengths}
              />
            </label>
            <label className="fieldLabel">
              우려 사항
              <textarea
                onChange={(event) => updateInterviewResult("concerns", event.target.value)}
                value={interviewResult.concerns}
              />
            </label>
            <label className="fieldLabel">
              추가 확인 필요 사항
              <textarea
                onChange={(event) => updateInterviewResult("followUps", event.target.value)}
                value={interviewResult.followUps}
              />
            </label>

            {resultPreview ? <pre className="mailPreview">{resultPreview.body}</pre> : null}
            <div className="reviewActions">
              <button
                className="primary"
                disabled={!canReturnResult}
                onClick={() => setResultReturned(true)}
                type="button"
              >
                Mock 결과 회신
              </button>
              {resultReturned ? <strong className="returnedState">결과 회신 완료</strong> : null}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function ReviewStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={active ? "reviewStep active" : "reviewStep"}>
      <span aria-hidden="true">{active ? "●" : "○"}</span>
      <strong>{label}</strong>
    </div>
  );
}
