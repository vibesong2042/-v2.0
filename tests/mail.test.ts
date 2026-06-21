import { describe, expect, it } from "vitest";

import { MockMailAdapter } from "../lib/mail";

describe("mock mail adapter", () => {
  it("returns a preview-only success without calling external APIs", async () => {
    const adapter = new MockMailAdapter();

    const result = await adapter.sendReviewPreview({
      to: "department@example.com",
      subject: "Review report",
      body: "Candidate report"
    });

    expect(result).toEqual({
      ok: true,
      mode: "mock",
      message: "Mock mail preview generated. No external API was called."
    });
  });

  it("returns a mock department review request result", async () => {
    const adapter = new MockMailAdapter();

    const result = await adapter.sendDepartmentReviewRequest({
      to: "department@example.com",
      subject: "RoleFit review request",
      body: "실제 메일은 발송되지 않습니다"
    });

    expect(result).toEqual({
      ok: true,
      mode: "mock",
      message: "Mock department review request generated. No external API was called."
    });
  });

  it("returns a mock interview result notification result", async () => {
    const adapter = new MockMailAdapter();

    const result = await adapter.sendInterviewResultNotification({
      to: "hr@example.com",
      subject: "전화인터뷰 결과",
      body: "결과 회신 완료"
    });

    expect(result).toEqual({
      ok: true,
      mode: "mock",
      message: "Mock interview result notification generated. No external API was called."
    });
  });
});
