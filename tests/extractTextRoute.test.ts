import { describe, expect, it } from "vitest";

import { POST } from "../app/api/extract-text/route";

function request(role?: string) {
  const formData = new FormData();
  formData.append("file", new File(["합성 이력서 본문"], "synthetic.txt", { type: "text/plain" }));
  const headers = new Headers();
  if (role) {
    headers.set("x-rolefit-mock-user", `user-${role}`);
    headers.set("x-rolefit-mock-role", role);
  }
  return new Request("http://localhost/api/extract-text", { method: "POST", headers, body: formData });
}

describe("POST /api/extract-text", () => {
  it("requires authentication", async () => {
    expect((await POST(request())).status).toBe(401);
  });

  it("rejects department reviewers", async () => {
    expect((await POST(request("DepartmentReviewer"))).status).toBe(403);
  });

  it("allows recruiters to extract synthetic text", async () => {
    const response = await POST(request("Recruiter"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });
});
