import { NextResponse } from "next/server";
import { extractTextFromFile } from "../../../lib/documentExtraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        fileName: "",
        fileType: "",
        error: "file 필드에 문서를 첨부하세요."
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await extractTextFromFile({
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    buffer
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
