"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { InterviewFeedbackDraft } from "../../lib/reviews/domain";
import type { ReviewPacket } from "../../lib/reviews/service";

type Tab = "summary" | "evidence" | "resume" | "interview";

export function ReviewPortal({ requestId, reviewerId }: { requestId: string; reviewerId: string }) {
  const [packet, setPacket] = useState<ReviewPacket | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedbackDraft | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!reviewerId) {
      setError("검토 링크에 수신자 정보가 없습니다. 채용담당자에게 새 링크를 요청해 주세요.");
      return;
    }
    void loadPacket();
  }, [requestId, reviewerId]);

  async function loadPacket() {
    setError("");
    const response = await fetch(`/api/review-requests/${requestId}`, {
      headers: reviewerHeaders(reviewerId)
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error?.message ?? "검토 요청을 불러오지 못했습니다.");
      return;
    }
    setPacket(result.data);
    setFeedback(result.data.feedback);
  }

  async function persist(action: "draft" | "submit") {
    if (!packet || !feedback) return;
    setIsSaving(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch(`/api/review-requests/${requestId}/${action}`, {
        method: action === "draft" ? "PATCH" : "POST",
        headers: { "content-type": "application/json", ...reviewerHeaders(reviewerId) },
        body: JSON.stringify({ revision: packet.request.revision, feedback })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "저장하지 못했습니다.");
      setPacket(result.data);
      setFeedback(result.data.feedback);
      setStatusMessage(action === "draft" ? "임시저장했습니다." : "인터뷰 결과를 제출했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateFeedback<K extends keyof InterviewFeedbackDraft>(
    key: K,
    value: InterviewFeedbackDraft[K]
  ) {
    setFeedback((current) => (current ? { ...current, [key]: value } : current));
    setStatusMessage("");
  }

  if (error && !packet) {
    return <main className="reviewPortal"><section className="portalState" role="alert"><h1>검토 키트를 열 수 없습니다</h1><p>{error}</p><Link href="/">RoleFit 홈으로 이동</Link></section></main>;
  }
  if (!packet || !feedback) {
    return <main className="reviewPortal"><section className="portalState" aria-busy="true"><h1>검토 키트를 준비하고 있습니다</h1><p>Mock 저장소에서 요청과 CV 버전을 확인합니다.</p></section></main>;
  }

  const isSubmitted = packet.request.status === "SUBMITTED";

  return (
    <main className="reviewPortal">
      <header className="portalHeader">
        <div><span className="environmentBadge">Mock SSO</span><p>RoleFit Interview Kit</p></div>
        <div className="portalIdentity"><strong>{packet.jobTitle}</strong><span>{packet.candidateName}</span></div>
        <div className="portalDue"><span>검토 기한</span><strong>{formatDate(packet.request.dueAt)}</strong></div>
      </header>

      <section className="portalIntro">
        <div><p className="eyebrow">현업 부서 검토</p><h1>근거를 확인하고 독립적으로 평가해 주세요</h1><p>AI와 HR 스크리닝은 참고 정보입니다. 인터뷰에서 직접 확인한 사실을 기준으로 의견을 작성해 주세요.</p></div>
        <span className={`statusPill status-${packet.request.status.toLowerCase()}`}>{statusLabel(packet.request.status)}</span>
      </section>

      <nav className="portalTabs" aria-label="검토 키트 메뉴">
        {([
          ["summary", "검토 요약"],
          ["evidence", "스크리닝 근거"],
          ["resume", "CV 원본"],
          ["interview", "인터뷰 키트"]
        ] as const).map(([value, label]) => (
          <button aria-current={tab === value ? "page" : undefined} className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)} type="button">{label}</button>
        ))}
      </nav>

      <div className="portalLayout">
        <section className="portalContent">
          {tab === "summary" ? <Summary packet={packet} /> : null}
          {tab === "evidence" ? <Evidence packet={packet} /> : null}
          {tab === "resume" ? <Resume packet={packet} /> : null}
          {tab === "interview" ? (
            <InterviewForm feedback={feedback} isSubmitted={isSubmitted} packet={packet} updateFeedback={updateFeedback} />
          ) : null}
        </section>

        <aside className="portalAside">
          <h2>검토 진행</h2>
          <dl><div><dt>요청자</dt><dd>{packet.recruiterName}</dd></div><div><dt>CV 버전</dt><dd>{packet.request.resumeVersion}</dd></div><div><dt>저장 revision</dt><dd>{packet.request.revision}</dd></div></dl>
          <p className="privacyNotice">CV와 평가 내용은 민감한 채용 정보입니다. 승인된 업무 목적에만 사용해 주세요.</p>
          {error ? <p className="analysisError" role="alert">{error}</p> : null}
          {statusMessage ? <p className="saveStatus" role="status">{statusMessage}</p> : null}
          <div className="portalActions">
            <button disabled={isSaving || isSubmitted} onClick={() => void persist("draft")} type="button">임시저장</button>
            <button className="primary" disabled={isSaving || isSubmitted} onClick={() => void persist("submit")} type="button">최종 제출</button>
          </div>
          {isSubmitted ? <p className="submittedNotice">제출이 완료되어 읽기 전용으로 표시됩니다.</p> : null}
        </aside>
      </div>
    </main>
  );
}

function Summary({ packet }: { packet: ReviewPacket }) {
  const requiredRisks = packet.criteria.filter((item) => item.required && item.status !== "MET");
  return <div className="portalStack"><section className="portalSection"><p className="eyebrow">HR 스크리닝 의견</p><h2>{packet.hrDecision}</h2><p>{packet.hrNote}</p></section><section className="summaryMetrics"><article><span>필수요건 확인 필요</span><strong>{requiredRisks.length}개</strong></article><article><span>근거 충분성</span><strong>{packet.confidence}</strong></article><article className="scoreSecondary"><span>스크리닝 참고 점수</span><strong>{packet.score}%</strong><small>자동 추천이 아닌 검토 보조 정보</small></article></section><section className="portalSection"><h2>인터뷰 우선 확인사항</h2><ul>{packet.criteria.filter((item) => item.status !== "MET").map((item) => <li key={item.id}>{item.title}: {item.interviewQuestion}</li>)}</ul></section></div>;
}

function Evidence({ packet }: { packet: ReviewPacket }) {
  return <div className="portalStack"><div className="sourceLegend"><span>AI/Rule 기준 평가</span><span>HR 확정 의견과 별도 표시</span></div>{packet.criteria.map((criterion) => <article className="evidenceCard" key={criterion.id}><div><span className={`criterionState ${criterion.status.toLowerCase()}`}>{criterionStatus(criterion.status)}</span>{criterion.required ? <span className="required">필수</span> : <span className="optional">선택</span>}</div><h2>{criterion.title}</h2><blockquote>{criterion.evidence}</blockquote><p><strong>인터뷰 확인 질문</strong><br />{criterion.interviewQuestion}</p><button type="button">부정확한 평가 표시</button></article>)}</div>;
}

function Resume({ packet }: { packet: ReviewPacket }) {
  return <section className="resumeViewer"><div><p className="eyebrow">분석에 사용한 고정 원본</p><h2>{packet.resume.fileName}</h2><span>버전 {packet.request.resumeVersion}</span></div><pre>{packet.resume.text}</pre></section>;
}

function InterviewForm({ feedback, isSubmitted, packet, updateFeedback }: { feedback: InterviewFeedbackDraft; isSubmitted: boolean; packet: ReviewPacket; updateFeedback: <K extends keyof InterviewFeedbackDraft>(key: K, value: InterviewFeedbackDraft[K]) => void }) {
  return <form className="interviewKit" onSubmit={(event) => event.preventDefault()}><section className="portalSection"><p className="eyebrow">독립 평가</p><h2>인터뷰 결과</h2><div className="formGrid"><label className="fieldLabel">인터뷰 일시 *<input disabled={isSubmitted} onChange={(event) => updateFeedback("interviewDate", event.target.value)} type="date" value={feedback.interviewDate} /></label><label className="fieldLabel">인터뷰어<input disabled={isSubmitted} onChange={(event) => updateFeedback("interviewer", event.target.value)} value={feedback.interviewer} /></label></div></section>{packet.criteria.map((criterion, index) => { const item = feedback.criteria[index]; return <section className="criterionForm" key={criterion.id}><h3>{criterion.title}{criterion.required ? " *" : ""}</h3><label className="fieldLabel">평가<select disabled={isSubmitted} onChange={(event) => updateFeedback("criteria", feedback.criteria.map((current, currentIndex) => currentIndex === index ? { ...current, rating: event.target.value as typeof current.rating } : current))} value={item.rating}><option value="NOT_ASSESSED">확인하지 못함</option><option value="MET">충족</option><option value="PARTIALLY_MET">부분 충족</option><option value="NOT_MET">미충족</option></select></label><label className="fieldLabel">관찰 근거 *<textarea disabled={isSubmitted} onChange={(event) => updateFeedback("criteria", feedback.criteria.map((current, currentIndex) => currentIndex === index ? { ...current, evidence: event.target.value } : current))} value={item.evidence} /></label></section>; })}<div className="feedbackTextGrid"><label className="fieldLabel">강점<textarea disabled={isSubmitted} onChange={(event) => updateFeedback("strengths", event.target.value)} value={feedback.strengths} /></label><label className="fieldLabel">우려사항<textarea disabled={isSubmitted} onChange={(event) => updateFeedback("concerns", event.target.value)} value={feedback.concerns} /></label><label className="fieldLabel">추가 확인사항<textarea disabled={isSubmitted} onChange={(event) => updateFeedback("followUps", event.target.value)} value={feedback.followUps} /></label></div><label className="fieldLabel">종합 의견 *<select disabled={isSubmitted} onChange={(event) => updateFeedback("overallOpinion", event.target.value as InterviewFeedbackDraft["overallOpinion"])} value={feedback.overallOpinion}><option value="">선택</option><option value="RECOMMEND">추천</option><option value="FURTHER_REVIEW">추가 검토</option><option value="HOLD">보류</option><option value="DO_NOT_RECOMMEND">비추천</option></select></label></form>;
}

function reviewerHeaders(reviewerId: string) { return { "x-rolefit-mock-user": reviewerId, "x-rolefit-mock-name": "Mock Department Reviewer", "x-rolefit-mock-role": "DepartmentReviewer" }; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value)); }
function statusLabel(status: ReviewPacket["request"]["status"]) { return ({ DRAFT: "작성 전", SENT: "요청 발송", OPENED: "열람", IN_PROGRESS: "작성 중", SUBMITTED: "제출 완료", CANCELLED: "취소", EXPIRED: "만료" } as const)[status]; }
function criterionStatus(status: ReviewPacket["criteria"][number]["status"]) { return status === "MET" ? "충족" : status === "NOT_MET" ? "미충족" : "판단 보류"; }
