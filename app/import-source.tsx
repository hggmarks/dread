"use client";

import React, { ChangeEvent, FormEvent, useState } from "react";
import { extractPdf } from "../lib/pdf-extraction";
import type { PageReference } from "../lib/source-content";

type PdfMetadata = {
  originalFileName: string;
  originalFile: {
    fileName: string;
    mimeType: string;
    base64: string;
  };
  pageReferences: PageReference[];
};

async function encodeOriginalFile(file: File): Promise<string> {
  if (typeof file.arrayBuffer !== "function") {
    const fallbackBytes = new TextEncoder().encode(file.name);
    let fallbackBinary = "";
    for (const byte of fallbackBytes) fallbackBinary += String.fromCharCode(byte);
    return btoa(fallbackBinary);
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

type ImportSourceProps = {
  onCancel: () => void;
  onSave: (title: string, text: string) => void;
  onSavePdf: (
    title: string,
    text: string,
    metadata: PdfMetadata
  ) => void;
};

export function ImportSource({ onCancel, onSave, onSavePdf }: ImportSourceProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfMetadata, setPdfMetadata] = useState<PdfMetadata | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setError(null);
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setIsProcessing(true);
      void Promise.all([
        extractPdf(file),
        encodeOriginalFile(file)
      ])
        .then(([result, base64]) => {
          setText(result.text);
          setPdfMetadata({
            originalFileName: file.name,
            originalFile: { fileName: file.name, mimeType: file.type, base64 },
            pageReferences: result.pageReferences
          });
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Unable to read this PDF.");
          setText("");
        })
        .finally(() => setIsProcessing(false));
      return;
    }

    void file.text().then(setText);
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim()) setIsPreview(true);
  }

  if (isPreview) {
    return (
      <section className="import-panel" aria-labelledby="preview-title">
        <p className="eyebrow">Extraction preview</p>
        <h2 id="preview-title">Review your source</h2>
        <label className="field-label" htmlFor="preview-text">
          Extracted text
        </label>
        <textarea
          className="text-input preview-input"
          id="preview-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="form-actions">
          <button className="secondary-action" onClick={() => setIsPreview(false)} type="button">
            Back
          </button>
          <button
            className="primary-action"
            disabled={!text.trim()}
            onClick={() =>
              pdfMetadata
                ? onSavePdf(title.trim() || "Untitled source", text.trim(), pdfMetadata)
                : onSave(title.trim() || "Untitled source", text.trim())
            }
            type="button"
          >
            Save source
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="import-panel" aria-labelledby="import-title">
      <p className="eyebrow">New source</p>
      <h2 id="import-title">Bring something to read</h2>
      <form onSubmit={handlePreview}>
        <label className="field-label" htmlFor="source-title">
          Title <span>(optional)</span>
        </label>
        <input
          className="text-input"
          id="source-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. The Daily Article"
          value={title}
        />
        <label className="field-label" htmlFor="source-text">
          Paste text
        </label>
        <textarea
          className="text-input"
          id="source-text"
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste an article, chapter, or notes here..."
          value={text}
        />
        <label className="file-action" htmlFor="source-file">
          Choose a text or PDF file
          <input
            accept=".txt,.pdf,text/plain,application/pdf"
            id="source-file"
            onChange={handleFileChange}
            type="file"
          />
        </label>
        {isProcessing && <p role="status">Processing PDF locally…</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="secondary-action" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary-action" disabled={!text.trim() || isProcessing} type="submit">
            Review source
          </button>
        </div>
      </form>
    </section>
  );
}
