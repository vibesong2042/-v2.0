import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = () => readFileSync("app/page.tsx", "utf8");
const reportSource = () => readFileSync("app/components/ReportView.tsx", "utf8");

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
    expect(source).toContain("reportDataTable");
    expect(source).toContain("questionCard");
    expect(source).not.toContain("<pre>{text}</pre>");
  });

  it("renders report confidence for evidence sufficiency", () => {
    const source = reportSource();

    expect(source).toContain("근거 충분성");
    expect(source).toContain("report.confidence.level");
    expect(source).toContain("report.confidence.rationale");
  });
});
