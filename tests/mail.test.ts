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
});
