import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  LocalDocumentParserAdapter,
  extractTextFromFile,
  validateDocumentFileSize
} from "../lib/documentExtraction";

describe("document extraction", () => {
  it("returns additive local extraction metadata without changing text compatibility", async () => {
    const result = await extractTextFromFile({
      fileName: "resume.txt",
      fileType: "text/plain",
      buffer: Buffer.from("RoleFit verified extraction text ".repeat(4), "utf8")
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.text).toBe(result.plainText);
      expect(result.extractionMethod).toBe("local");
      expect(result.provider).toBe("local");
      expect(result.quality?.level).toBe("high");
      expect(result.quality?.signals).toEqual([]);
      expect(result.quality?.metrics?.textLength).toBe(result.plainText.length);
      expect(result.warnings).toEqual([]);
      expect(result.requiresReview).toBe(false);
      expect("pages" in result).toBe(false);
      expect("elements" in result).toBe(false);
      expect("tables" in result).toBe(false);
      expect("markdown" in result).toBe(false);
    }
  });

  it("uses the local document parser adapter without changing the extraction contract", async () => {
    const adapter = new LocalDocumentParserAdapter();
    const result = await adapter.parse({
      fileName: "resume.txt",
      fileType: "text/plain",
      buffer: Buffer.from("RoleFit local adapter extraction text ".repeat(3), "utf8")
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.text).toBe(result.plainText);
      expect(result.extractionMethod).toBe("local");
      expect(result.provider).toBe("local");
      expect(result.quality?.level).toBe("high");
    }
  });

  it("warns when local extraction returns a very short text", async () => {
    const result = await extractTextFromFile({
      fileName: "short.txt",
      fileType: "text/plain",
      buffer: Buffer.from("짧음", "utf8")
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.requiresReview).toBe(true);
      expect(result.warnings.join(" ")).toContain("짧");
    }
  });

  it("warns when extracted text contains replacement characters", async () => {
    const result = await extractTextFromFile({
      fileName: "broken.txt",
      fileType: "text/plain",
      buffer: Buffer.from("정상 텍스트 ".repeat(8) + "����", "utf8")
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.requiresReview).toBe(true);
      expect(result.warnings.join(" ")).toContain("깨진");
      expect(result.quality?.level).toBe("low");
      expect(result.quality?.signals).toContain("BROKEN_CHARACTERS");
      expect(JSON.stringify(result.quality)).not.toContain("정상 텍스트");
    }
  });

  it("warns when a PDF looks like it may need OCR", async () => {
    const result = await extractTextFromFile({
      fileName: "scan.pdf",
      fileType: "application/pdf",
      buffer: createMinimalPdf("tiny")
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.requiresReview).toBe(true);
      expect(result.warnings.join(" ")).toContain("OCR");
      expect(result.quality?.level).toBe("low");
      expect(result.quality?.signals).toContain("OCR_MAY_BE_REQUIRED");
    }
  });

  it("validates file size before a caller reads the file body", () => {
    expect(validateDocumentFileSize(10 * 1024 * 1024)).toBe("");
    expect(validateDocumentFileSize(10 * 1024 * 1024 + 1)).toContain("10MB");
  });

  it("extracts UTF-8 text files", async () => {
    const result = await extractTextFromFile({
      fileName: "resume.txt",
      fileType: "text/plain",
      buffer: Buffer.from("지원자 이력서 TXT 본문", "utf8")
    });

    expect(result).toMatchObject({
      ok: true,
      fileName: "resume.txt",
      fileType: "text/plain"
    });
    expect(result.ok && result.text).toContain("지원자 이력서");
  });

  it("extracts markdown files as text", async () => {
    const result = await extractTextFromFile({
      fileName: "criteria.md",
      fileType: "text/markdown",
      buffer: Buffer.from("# 핵심지표\n- React 경험", "utf8")
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.text).toContain("React 경험");
  });

  it("extracts Excel worksheet text", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["구분", "내용"]);
    sheet.addRow(["팀 전략", "채용 검토 자동화"]);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await extractTextFromFile({
      fileName: "strategy.xlsx",
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.text).toContain("채용 검토 자동화");
  });

  it("extracts CSV text as worksheet rows", async () => {
    const result = await extractTextFromFile({
      fileName: "strategy.csv",
      fileType: "text/csv",
      buffer: Buffer.from("구분,내용\n팀 전략,채용 검토 자동화", "utf8")
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.text).toContain("채용 검토 자동화");
  });

  it("extracts DOCX document text", async () => {
    const result = await extractTextFromFile({
      fileName: "resume.docx",
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: createMinimalDocx("DOCX 지원자 경력 본문")
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.text).toContain("DOCX 지원자 경력");
  });

  it("extracts text PDF files", async () => {
    const result = await extractTextFromFile({
      fileName: "job-description.pdf",
      fileType: "application/pdf",
      buffer: createMinimalPdf("PDF job description text")
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.text.toLowerCase()).toContain("pdf job description");
  });

  it("returns a clear failure for malformed legacy DOC files", async () => {
    const result = await extractTextFromFile({
      fileName: "legacy.doc",
      fileType: "application/msword",
      buffer: Buffer.from("not a real compound word document", "utf8")
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("DOC");
  });

  it("returns a clear failure for legacy XLS files without using vulnerable parsers", async () => {
    const result = await extractTextFromFile({
      fileName: "legacy.xls",
      fileType: "application/vnd.ms-excel",
      buffer: Buffer.from("not a real legacy excel document", "utf8")
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("XLS");
  });

  it("rejects files larger than 10MB", async () => {
    const result = await extractTextFromFile({
      fileName: "large.txt",
      fileType: "text/plain",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1)
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("10MB");
  });

  it("rejects unsupported extensions", async () => {
    const result = await extractTextFromFile({
      fileName: "image.png",
      fileType: "image/png",
      buffer: Buffer.from("png")
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("지원하지 않는 파일");
  });
});

function createMinimalPdf(text: string) {
  const escaped = text.replace(/[()\\]/g, "\\$&");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];
  const stream = `BT /F1 18 Tf 72 720 Td (${escaped}) Tj ET`;
  objects.push(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function createMinimalDocx(text: string) {
  const files = new Map<string, string>([
    [
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    ],
    [
      "_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    ],
    [
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:body></w:document>`
    ]
  ]);
  return createStoreZip(files);
}

function createStoreZip(files: Map<string, string>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  let index = 0;

  for (const [name, content] of files.entries()) {
    const nameBuffer = Buffer.from(name);
    const contentBuffer = Buffer.from(content);
    const crc = crc32(contentBuffer);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, contentBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + contentBuffer.length;
    index += 1;
  }

  const centralStart = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(index, 8);
  end.writeUInt16LE(index, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(buffer: Buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CRC_TABLE = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});
