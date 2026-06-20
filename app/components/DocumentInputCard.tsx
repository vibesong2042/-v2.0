"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { DocumentInput } from "../../lib/matching";

type ExtractResponse =
  | {
      ok: true;
      fileName: string;
      fileType: string;
      text: string;
    }
  | {
      ok: false;
      fileName: string;
      fileType: string;
      error: string;
    };

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

  async function handleFile(file: File) {
    onChange({
      ...value,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      parseStatus: "parsing",
      parseError: ""
    });

    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/extract-text", {
      method: "POST",
      body: formData
    });
    const result = (await response.json()) as ExtractResponse;

    if (result.ok) {
      onChange({
        ...value,
        text: result.text,
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: file.size,
        parseStatus: "parsed",
        parseError: ""
      });
      return;
    }

    onChange({
      ...value,
      fileName: result.fileName || file.name,
      fileType: result.fileType || file.type,
      fileSize: file.size,
      parseStatus: "failed",
      parseError: result.error
    });
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
        {value.fileName ? <span className="fileBadge">{value.fileName}</span> : null}
      </div>

      <textarea
        value={value.text}
        onChange={(event) =>
          onChange({
            ...value,
            text: event.target.value,
            parseStatus: value.parseStatus ?? "idle"
          })
        }
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
        <button type="button" onClick={() => inputRef.current?.click()}>
          파일 선택
        </button>
      </div>

      {value.parseStatus === "parsing" ? <p className="parseInfo">문서 텍스트를 추출하고 있습니다.</p> : null}
      {value.parseStatus === "parsed" ? <p className="parseOk">추출된 텍스트를 입력란에 반영했습니다.</p> : null}
      {value.parseStatus === "failed" ? (
        <p className="parseError">{value.parseError || "문서 파싱에 실패했습니다. 수동 입력으로 보정하세요."}</p>
      ) : null}
    </section>
  );
}
