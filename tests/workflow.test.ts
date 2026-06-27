import { describe, expect, it } from "vitest";

import { DEFAULT_WEIGHT_SET, DocumentInput } from "../lib/matching";
import {
  canRunAnalysis,
  getStepState,
  isDocumentVerified,
  markDocumentTextChanged,
  markDocumentVerified
} from "../lib/workflow";

function document(text: string, verified = false): DocumentInput {
  return {
    text,
    parseStatus: "idle",
    extraction: text
      ? {
          method: "manual",
          warnings: [],
          requiresReview: false,
          verified
        }
      : undefined
  };
}

describe("workflow validation", () => {
  it("blocks analysis when a required document is missing", () => {
    const result = canRunAnalysis({
      requiredDocuments: [
        { label: "직무기술서", document: document("", false) },
        { label: "지원자 CV/이력서", document: document("지원자 경력", true) }
      ],
      optionalDocuments: [],
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("직무기술서를 등록하세요.");
  });

  it("blocks analysis when a required document has not been verified", () => {
    const result = canRunAnalysis({
      requiredDocuments: [
        { label: "직무기술서", document: document("직무 요건", false) },
        { label: "지원자 CV/이력서", document: document("지원자 경력", true) }
      ],
      optionalDocuments: [],
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("직무기술서 내용을 확인 완료해 주세요.");
  });

  it("does not block analysis for empty optional documents", () => {
    const result = canRunAnalysis({
      requiredDocuments: [
        { label: "직무기술서", document: document("직무 요건", true) },
        { label: "지원자 CV/이력서", document: document("지원자 경력", true) }
      ],
      optionalDocuments: [{ label: "기존 입사자 CV/이력서", document: document("", false) }],
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it("blocks analysis when an optional document has text but is not verified", () => {
    const result = canRunAnalysis({
      requiredDocuments: [
        { label: "직무기술서", document: document("직무 요건", true) },
        { label: "지원자 CV/이력서", document: document("지원자 경력", true) }
      ],
      optionalDocuments: [{ label: "기존 입사자 CV/이력서", document: document("비교 대상 경력", false) }],
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("기존 입사자 CV/이력서 내용을 확인 완료하거나 비워 주세요.");
  });

  it("blocks analysis when enabled weights do not total 100", () => {
    const result = canRunAnalysis({
      requiredDocuments: [
        { label: "직무기술서", document: document("직무 요건", true) },
        { label: "지원자 CV/이력서", document: document("지원자 경력", true) }
      ],
      optionalDocuments: [],
      weights: {
        ...DEFAULT_WEIGHT_SET,
        items: DEFAULT_WEIGHT_SET.items.map((item) =>
          item.code === "custom" ? { ...item, weight: 10 } : item
        )
      }
    });

    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toContain("100%");
  });

  it("allows analysis when required documents are verified and weights are valid", () => {
    const result = canRunAnalysis({
      requiredDocuments: [
        { label: "직무기술서", document: document("직무 요건", true) },
        { label: "지원자 CV/이력서", document: document("지원자 경력", true) }
      ],
      optionalDocuments: [],
      weights: DEFAULT_WEIGHT_SET
    });

    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it("marks document verification complete and resets it after text changes", () => {
    const verified = markDocumentVerified(document("수동 입력 문서", false));
    expect(isDocumentVerified(verified)).toBe(true);

    const changed = markDocumentTextChanged(verified, "수정된 수동 입력 문서");
    expect(isDocumentVerified(changed)).toBe(false);
    expect(changed.extraction?.method).toBe("manual");
  });

  it("preserves quality metadata on verification and clears it after manual edits", () => {
    const parsedDocument: DocumentInput = {
      text: "파일에서 추출된 문서",
      parseStatus: "parsed",
      extraction: {
        method: "local",
        warnings: [],
        requiresReview: false,
        verified: false,
        provider: "local",
        quality: {
          level: "high",
          signals: [],
          metrics: { textLength: 10 }
        }
      }
    };

    const verified = markDocumentVerified(parsedDocument);
    expect(verified.extraction?.verified).toBe(true);
    expect(verified.extraction?.provider).toBe("local");
    expect(verified.extraction?.quality?.level).toBe("high");

    const changed = markDocumentTextChanged(verified, "사용자가 직접 수정한 문서");
    expect(changed.extraction?.verified).toBe(false);
    expect(changed.extraction?.method).toBe("manual");
    expect(changed.extraction?.provider).toBeUndefined();
    expect(changed.extraction?.quality).toBeUndefined();
  });

  it("marks previous steps as complete and the selected step as active", () => {
    expect(getStepState(0, 2)).toBe("complete");
    expect(getStepState(2, 2)).toBe("active");
    expect(getStepState(3, 2)).toBe("upcoming");
  });
});
