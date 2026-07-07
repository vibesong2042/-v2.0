"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import type { ExtractTextResult } from "../../lib/documentExtraction";
import { DocumentInput } from "../../lib/matching";
import { markDocumentCleared, markDocumentTextChanged, markDocumentVerified } from "../../lib/workflow";

const GENERIC_PARSE_ERROR = "문서 텍스트 추출에 실패했습니다. 수동 입력으로 보정해 주세요.";

export function DocumentInputCard({
  label,
  required,
  helperText,
  value,
  onChange
}: {
  label: string;
  required?: boolean;
  helperText: string;
  value: DocumentInput;
  onChange: (value: DocumentInput) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const warnings = value.extraction?.warnings ?? [];
  const quality = value.extraction?.quality;
  const qualityLabel = quality
    ? {
        high: "양호",
        medium: "확인 필요",
        low: "주의 필요"
      }[quality.level]
    : "";
  const hasText = value.text.trim().length > 0;
  const isVerified = value.extraction?.verified === true;
  const verifyButtonLabel =
    warnings.length > 0 ? "경고를 확인하고 이 내용으로 진행" : "내용 확인 완료";

  async function handleFile(file: File) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    onChange({
      ...value,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      parseStatus: "parsing",
      parseError: "",
      extraction: undefined
    });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as ExtractTextResult;

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (result.ok) {
        onChange({
          ...value,
          text: result.plainText,
          fileName: result.fileName,
          fileType: result.fileType,
          fileSize: file.size,
          parseStatus: "parsed",
          parseError: "",
          extraction: {
            method: "local",
            warnings: result.warnings,
            requiresReview: result.requiresReview,
            confidence: result.confidence,
            provider: result.provider,
            quality: result.quality,
            verified: false
          }
        });
        return;
      }

      onChange({
        ...value,
        fileName: result.fileName || file.name,
        fileType: result.fileType || file.type,
        fileSize: file.size,
        parseStatus: "failed",
        parseError: result.error,
        extraction: undefined
      });
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      onChange({
        ...value,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        parseStatus: "failed",
        parseError: GENERIC_PARSE_ERROR,
        extraction: undefined
      });
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];

    if (file) {
      void handleFile(file);
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void handleFile(file);
    }
  }

  function onTextChange(text: string) {
    requestIdRef.current += 1;
    onChange(markDocumentTextChanged(value, text));
  }

  function onClearDocument() {
    requestIdRef.current += 1;
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange(markDocumentCleared(value));
  }

  return (
    <section className="docCard">
      <div className="docHeader">
        <div>
          <h3>
            {label}
            {required ? <span className="required">필수</span> : <span className="optional">선택</span>}
          </h3>
          <p>{helperText}</p>
        </div>
        {value.fileName ? (
          <div className="fileActions">
            <span className="fileBadge">{value.fileName}</span>
            <button type="button" onClick={onClearDocument}>
              첨부 삭제
            </button>
          </div>
        ) : null}
      </div>

      <textarea
        value={value.text}
        onChange={(event) => onTextChange(event.target.value)}
      />

      <div
        className={`dropZone ${isDragging ? "dragging" : ""}`}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={onDrop}
      >
        <input
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
          hidden
          onChange={onPick}
          ref={inputRef}
          type="file"
        />
        <strong>파일을 끌어오거나 선택하세요</strong>
        <span>PDF, Word, Excel, TXT 파일을 지원합니다.</span>
        <small>현재 파일은 서버 메모리에서만 텍스트 추출하며 저장하지 않고 외부 API로 전송하지 않습니다.</small>
        <button type="button" onClick={() => inputRef.current?.click()}>
          파일 선택
        </button>
      </div>

      {value.parseStatus === "parsing" ? <p className="parseInfo">문서 텍스트를 추출하고 있습니다.</p> : null}
      {value.parseStatus === "parsed" ? <p className="parseOk">추출된 텍스트를 입력란에 반영했습니다.</p> : null}
      {value.parseStatus === "failed" ? (
        <p className="parseError">{value.parseError || GENERIC_PARSE_ERROR}</p>
      ) : null}

      <div className="reviewBox">
        {quality ? (
          <div className={`qualityBox ${quality.level}`}>
            <div className="qualityHeader">
              <strong>추출 품질</strong>
              <span className="qualityBadge">{qualityLabel}</span>
            </div>
            <small>
              텍스트 {quality.metrics?.textLength ?? 0}자 · 줄 {quality.metrics?.lineCount ?? 0}개
            </small>
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div className="extractionWarnings">
            <strong>추출 결과 확인 필요</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="reviewActions">
          <button
            disabled={!hasText || value.parseStatus === "parsing"}
            onClick={() => onChange(markDocumentVerified(value))}
            type="button"
          >
            {verifyButtonLabel}
          </button>
          {isVerified ? <span className="reviewVerified">확인 완료</span> : null}
        </div>
      </div>
    </section>
  );
}
