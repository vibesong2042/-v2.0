import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = () => readFileSync("app/page.tsx", "utf8");
const reportSource = () => readFileSync("app/components/ReportView.tsx", "utf8");
const nextConfigSource = () => readFileSync("next.config.ts", "utf8");
const extractTextRouteSource = () => readFileSync("app/api/extract-text/route.ts", "utf8");
const documentExtractionSource = () => readFileSync("lib/documentExtraction.ts", "utf8");
const documentInputCardSource = () =>
  readFileSync("app/components/DocumentInputCard.tsx", "utf8");
const departmentReviewPanelSource = () =>
  readFileSync("app/components/DepartmentReviewPanel.tsx", "utf8");

describe("RoleFit Workbench UI content", () => {
  it("uses the product name and removes the old headline", () => {
    const source = pageSource();

    expect(source).toContain("RoleFit Workbench");
    expect(source).toContain("JD/CV Matching Console");
    expect(source).not.toContain("직무 기준과 지원자 경험을 단계별로 비교합니다");
  });

  it("renames 채용Post 설명자료 to 추가 설명자료", () => {
    const source = pageSource();

    expect(source).toContain("추가 설명자료");
    expect(source).not.toContain("채용Post");
    expect(source).not.toContain("postDescription");
  });

  it("places weight and analysis controls before supporting document inputs", () => {
    const source = pageSource();
    const weightIndex = source.indexOf("<WeightPanel");
    const actionIndex = source.indexOf("매칭 분석 실행");
    const firstSupportingInputIndex = source.indexOf('label="팀별 전략자료"');

    expect(weightIndex).toBeGreaterThan(-1);
    expect(actionIndex).toBeGreaterThan(-1);
    expect(firstSupportingInputIndex).toBeGreaterThan(-1);
    expect(weightIndex).toBeLessThan(firstSupportingInputIndex);
    expect(actionIndex).toBeLessThan(firstSupportingInputIndex);
  });

  it("renders a structured report rather than a single pre block", () => {
    const source = reportSource();

    expect(source).toContain("reportSheet");
    expect(source).toContain("questionCard");
    expect(source).not.toContain("<pre>{text}</pre>");
  });

  it("renders core indicators as visual cards instead of the old core table", () => {
    const source = reportSource();

    expect(source).toContain("coreSummaryStrip");
    expect(source).toContain("coreMatchCard");
    expect(source).toContain("coreMatchProgress");
    expect(source).toContain("coreMatchStatusIcon");
    expect(source).toContain("report.criterionAssessments");
    expect(source).not.toContain("report.coreIndicatorMatches.map((item, index)");
  });

  it("renders report confidence for evidence sufficiency", () => {
    const source = reportSource();

    expect(source).toContain("근거 충분성");
    expect(source).toContain("report.confidence.level");
    expect(source).toContain("report.confidence.rationale");
  });

  it("mounts a department review panel below the analysis report", () => {
    const source = pageSource();

    expect(source).toContain("DepartmentReviewPanel");
    expect(source).toContain("<DepartmentReviewPanel");
  });

  it("shows document extraction review controls before analysis", () => {
    const source = documentInputCardSource();

    expect(source).toContain("내용 확인 완료");
    expect(source).toContain("경고를 확인하고 이 내용으로 진행");
    expect(source).toContain("서버 메모리");
    expect(source).toContain("외부 API로 전송하지 않습니다");
    expect(source).toContain("requestIdRef");
  });

  it("shows local extraction quality without exposing external provider controls", () => {
    const source = documentInputCardSource();

    expect(source).toContain("추출 품질");
    expect(source).toContain("qualityLabel");
    expect(source).not.toContain("Document AI");
    expect(source).not.toContain("OCR API");
    expect(source).not.toContain("Azure");
    expect(source).not.toContain("Google");
  });

  it("keeps PDF parsing on the Node server boundary", () => {
    const config = nextConfigSource();
    const route = extractTextRouteSource();
    const inputCard = documentInputCardSource();

    expect(config).toContain("serverExternalPackages");
    expect(config).toContain("pdf-parse");
    expect(route).toContain('runtime = "nodejs"');
    expect(inputCard).not.toContain('from "pdf-parse"');
    expect(inputCard).not.toContain('from "pdfjs-dist"');
    expect(inputCard).not.toContain("GlobalWorkerOptions");
    expect(inputCard).not.toContain("workerSrc");
  });

  it("keeps document extraction local-only without external provider hooks", () => {
    const source = documentExtractionSource();

    expect(source).toContain("LocalDocumentParserAdapter");
    expect(source).toContain('provider: "local"');
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("Azure");
    expect(source).not.toContain("Google");
    expect(source).not.toContain("Document AI");
  });

  it("renders the department review request and phone interview workflow", () => {
    const source = departmentReviewPanelSource();

    expect(source).toContain("현업부서 검토 요청");
    expect(source).toContain("부서장 화면 미리보기");
    expect(source).toContain("전화인터뷰 결과표");
    expect(source).toContain("실제 메일은 발송되지 않습니다");
    expect(source).toContain("결과 회신 완료");
  });
});
