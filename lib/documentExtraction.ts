import ExcelJS from "exceljs";

export type ExtractTextInput = {
  fileName: string;
  fileType: string;
  buffer: Buffer<ArrayBuffer>;
};

export type DocumentExtractionProvider = "local";

export type ExtractionQuality = {
  level: "high" | "medium" | "low";
  signals: string[];
  metrics: Record<string, number>;
};

export type ExtractTextSuccess = {
  ok: true;
  fileName: string;
  fileType: string;
  text: string;
  plainText: string;
  extractionMethod: "local";
  provider: DocumentExtractionProvider;
  warnings: string[];
  requiresReview: boolean;
  confidence?: number;
  quality: ExtractionQuality;
};

export type ExtractTextFailure = {
  ok: false;
  fileName: string;
  fileType: string;
  error: string;
};

export type ExtractTextResult = ExtractTextSuccess | ExtractTextFailure;

export type DocumentParserAdapter = {
  provider: DocumentExtractionProvider;
  parse(input: ExtractTextInput): Promise<ExtractTextResult>;
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "md"];

export class LocalDocumentParserAdapter implements DocumentParserAdapter {
  readonly provider = "local";

  parse(input: ExtractTextInput): Promise<ExtractTextResult> {
    return extractTextWithLocalParser(input);
  }
}

const localDocumentParserAdapter = new LocalDocumentParserAdapter();

export async function extractTextFromFile(input: ExtractTextInput): Promise<ExtractTextResult> {
  return localDocumentParserAdapter.parse(input);
}

async function extractTextWithLocalParser(input: ExtractTextInput): Promise<ExtractTextResult> {
  const extension = getExtension(input.fileName);
  const fileNameError = validateDocumentFileName(input.fileName);
  const fileSizeError = validateDocumentFileSize(input.buffer.length);

  if (fileNameError) {
    return fail(input, fileNameError);
  }

  if (fileSizeError) {
    return fail(input, fileSizeError);
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
  const plainText = normalizeText(text);
  const quality = diagnoseLocalExtraction(plainText, getExtension(input.fileName));

  return {
    ok: true,
    fileName: input.fileName,
    fileType: input.fileType,
    text: plainText,
    plainText,
    extractionMethod: "local",
    provider: "local",
    warnings: quality.warnings,
    requiresReview: quality.requiresReview,
    confidence: quality.confidence,
    quality: quality.quality
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

export function validateDocumentFileName(fileName: string) {
  const extension = getExtension(fileName);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return "지원하지 않는 파일 형식입니다. PDF, Word, Excel, TXT 파일을 첨부하세요.";
  }

  return "";
}

export function validateDocumentFileSize(size: number) {
  if (size > MAX_FILE_SIZE) {
    return "파일 크기는 10MB 이하만 지원합니다.";
  }

  return "";
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

function diagnoseLocalExtraction(plainText: string, extension: string) {
  const warnings: string[] = [];
  const signals: string[] = [];
  const trimmed = plainText.trim();
  const characters = Array.from(trimmed);
  const replacementCount = characters.filter((character) => character === "�").length;
  const replacementRatio = characters.length > 0 ? replacementCount / characters.length : 0;
  const lineCount = trimmed ? trimmed.split(/\n+/).filter(Boolean).length : 0;

  if (trimmed.length < 50) {
    warnings.push("추출된 텍스트가 매우 짧아 원문 확인이 필요합니다.");
    signals.push("SHORT_TEXT");
  }

  if (replacementCount > 0 || replacementRatio >= 0.01) {
    warnings.push("추출 텍스트에 깨진 문자가 포함되어 원문 확인이 필요합니다.");
    signals.push("BROKEN_CHARACTERS");
  }

  if (extension === "pdf" && trimmed.length < 50) {
    warnings.push("PDF 텍스트가 거의 추출되지 않았습니다. 스캔 PDF이거나 OCR이 필요할 수 있습니다.");
    signals.push("OCR_MAY_BE_REQUIRED");
  }

  if (extension === "doc") {
    warnings.push("DOC는 레거시 Word 형식이므로 추출 결과 확인이 필요합니다.");
    signals.push("LEGACY_DOC");
  }

  const level =
    signals.includes("BROKEN_CHARACTERS") ||
    signals.includes("OCR_MAY_BE_REQUIRED") ||
    trimmed.length < 50
      ? "low"
      : signals.length > 0
        ? "medium"
        : "high";

  return {
    warnings,
    requiresReview: warnings.length > 0,
    confidence: warnings.length > 0 ? 0.65 : 0.95,
    quality: {
      level,
      signals,
      metrics: {
        textLength: trimmed.length,
        lineCount,
        replacementCharacterRatio: Number(replacementRatio.toFixed(4)),
        warningCount: warnings.length
      }
    } satisfies ExtractionQuality
  };
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
