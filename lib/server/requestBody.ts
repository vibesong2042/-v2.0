export type JsonBodyErrorCode = "INVALID_REQUEST" | "PAYLOAD_TOO_LARGE";

export class JsonBodyError extends Error {
  constructor(readonly code: JsonBodyErrorCode) {
    super(code);
  }
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new JsonBodyError("PAYLOAD_TOO_LARGE");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBytes) {
    throw new JsonBodyError("PAYLOAD_TOO_LARGE");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new JsonBodyError("INVALID_REQUEST");
  }
}
