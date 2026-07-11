import { describe, expect, it } from "vitest";

import { JsonBodyError, readBoundedJson } from "../lib/server/requestBody";

describe("bounded JSON request bodies", () => {
  it("parses a JSON body within the byte limit", async () => {
    const result = await readBoundedJson(
      new Request("http://localhost/test", { method: "POST", body: JSON.stringify({ ok: true }) }),
      1024
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects the actual body size even when content-length is missing", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ value: "가".repeat(100) })
    });
    request.headers.delete("content-length");

    await expect(readBoundedJson(request, 32)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE"
    } satisfies Partial<JsonBodyError>);
  });

  it("rejects malformed JSON without returning parser internals", async () => {
    await expect(
      readBoundedJson(new Request("http://localhost/test", { method: "POST", body: "{" }), 1024)
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" } satisfies Partial<JsonBodyError>);
  });
});
