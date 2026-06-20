import ExcelJS from "exceljs";

export type ExtractTextInput = {
  fileName: string;
  fileType: string;
  buffer: Buffer<ArrayBuffer>;
};

export type ExtractTextSuccess = {
  ok: true;
  fileName: string;
  fileType: string;
  text: string;
};

export type ExtractTextFailure = {
  ok: false;
  fileName: string;
  fileType: string;
  error: string;
};

export type ExtractTextResult = ExtractTextSuccess | ExtractTextFailure;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function extractTextFromFile(input: ExtractTextInput): Promise<ExtractTextResult> {
  const extension = getExtension(input.fileName);

  if (input.buffer.length > MAX_FILE_SIZE) {
    return fail(input, "파일 크기는 10MB 이하만 지원합니다.");
  }

  try {
    if (isTextExtension(extension)) {
      return success(input, input.buffer.toString("utf8"));
    }

    if (extension === "pdf") {
      return success(input, await extractPdf(input.buffer));
    }

    if (extension === "docx") {
      return success(input, await extractDocx(input.buffer));
    }

    if (extension === "doc") {
      return success(input, await extractLegacyDoc(input.buffer));
    }

    if (isExcelExtension(extension)) {
      return success(input, await extractWorkbook(input.buffer, extension));
    }

    return fail(input, "지원하지 않는 파일 형식입니다. PDF, Word, Excel, TXT 파일을 첨부하세요.");
  } catch (error) {
    const prefix = extension === "doc" ? "DOC 문서 파싱 실패" : "문서 파싱 실패";
    return fail(input, `${prefix}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function success(input: ExtractTextInput, text: string): ExtractTextSuccess {
  return {
    ok: true,
    fileName: input.fileName,
    fileType: input.fileType,
    text: normalizeText(text)
  };
}

function fail(input: ExtractTextInput, error: string): ExtractTextFailure {
  return {
    ok: false,
    fileName: input.fileName,
    fileType: input.fileType,
    error
  };
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isTextExtension(extension: string) {
  return ["txt", "md"].includes(extension);
}

function isExcelExtension(extension: string) {
  return ["xlsx", "xls", "csv"].includes(extension);
}

async function extractPdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();
    return parsed.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const parsed = await mammoth.extractRawText({ buffer });
  return parsed.value;
}

async function extractLegacyDoc(buffer: Buffer) {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);
  return document.getBody();
}

async function extractWorkbook(buffer: Buffer<ArrayBuffer>, extension: string) {
  if (extension === "xls") {
    throw new Error("XLS 레거시 형식은 보안상 취약한 파서를 사용하지 않습니다. CSV 또는 XLSX로 저장 후 다시 첨부하세요.");
  }

  const workbook = new ExcelJS.Workbook();

  if (extension === "csv") {
    const worksheet = await workbook.csv.read(bufferToStream(buffer));
    return worksheetToText(worksheet);
  }

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook.worksheets.map(worksheetToText).filter(Boolean).join("\n\n");
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function worksheetToText(worksheet: ExcelJS.Worksheet) {
  const rows: string[] = [];
  worksheet.eachRow((row) => {
    const cells = row.values;
    const text = Array.isArray(cells)
      ? cells
          .slice(1)
          .map((cell) => {
            if (cell === null || cell === undefined) {
              return "";
            }

            return typeof cell === "object" ? JSON.stringify(cell) : String(cell);
          })
          .filter(Boolean)
          .join(" ")
      : "";

    if (text) {
      rows.push(text);
    }
  });

  return rows.join("\n");
}

function bufferToStream(buffer: Buffer<ArrayBuffer>) {
  const { Readable } = require("stream") as typeof import("stream");
  return Readable.from(buffer);
}
