"use client";

import React, { ChangeEvent, FormEvent, useState } from "react";

type ImportSourceProps = {
  onCancel: () => void;
  onSave: (title: string, text: string) => void;
};

export function ImportSource({ onCancel, onSave }: ImportSourceProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setTitle(file.name.replace(/\.[^.]+$/, ""));
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
            onClick={() => onSave(title.trim() || "Untitled source", text.trim())}
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
          Choose a plain-text file
          <input
            accept=".txt,text/plain"
            id="source-file"
            onChange={handleFileChange}
            type="file"
          />
        </label>
        <div className="form-actions">
          <button className="secondary-action" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary-action" disabled={!text.trim()} type="submit">
            Review source
          </button>
        </div>
      </form>
    </section>
  );
}
