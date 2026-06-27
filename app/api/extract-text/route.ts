import { NextResponse } from "next/server";
import {
  extractTextFromFile,
  validateDocumentFileName,
  validateDocumentFileSize
} from "../../../lib/documentExtraction";

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

  const fileType = file.type || "application/octet-stream";
  const fileNameError = validateDocumentFileName(file.name);
  const fileSizeError = validateDocumentFileSize(file.size);

  if (fileNameError || fileSizeError) {
    return NextResponse.json(
      {
        ok: false,
        fileName: file.name,
        fileType,
        error: fileNameError || fileSizeError
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await extractTextFromFile({
    fileName: file.name,
    fileType,
    buffer
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
