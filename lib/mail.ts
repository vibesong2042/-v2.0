export type ReviewMailInput = {
  to: string;
  subject: string;
  body: string;
};

export type ReviewMailResult = {
  ok: boolean;
  mode: "mock";
  message: string;
};

export interface MailAdapter {
  sendReviewPreview(input: ReviewMailInput): Promise<ReviewMailResult>;
}

export class MockMailAdapter implements MailAdapter {
  async sendReviewPreview(_input: ReviewMailInput): Promise<ReviewMailResult> {
    return {
      ok: true,
      mode: "mock",
      message: "Mock mail preview generated. No external API was called."
    };
  }
}
