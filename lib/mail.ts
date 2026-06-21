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
  sendDepartmentReviewRequest(input: ReviewMailInput): Promise<ReviewMailResult>;
  sendInterviewResultNotification(input: ReviewMailInput): Promise<ReviewMailResult>;
}

export class MockMailAdapter implements MailAdapter {
  async sendReviewPreview(_input: ReviewMailInput): Promise<ReviewMailResult> {
    return {
      ok: true,
      mode: "mock",
      message: "Mock mail preview generated. No external API was called."
    };
  }

  async sendDepartmentReviewRequest(_input: ReviewMailInput): Promise<ReviewMailResult> {
    return {
      ok: true,
      mode: "mock",
      message: "Mock department review request generated. No external API was called."
    };
  }

  async sendInterviewResultNotification(_input: ReviewMailInput): Promise<ReviewMailResult> {
    return {
      ok: true,
      mode: "mock",
      message: "Mock interview result notification generated. No external API was called."
    };
  }
}
