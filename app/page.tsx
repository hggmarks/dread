"use client";

import React, { useEffect, useState } from "react";
import {
  createSource,
  deleteSource,
  loadSources,
  saveSources,
  SourceContent
} from "../lib/source-content";
import type { PageReference } from "../lib/source-content";
import { createLibraryExport, parseLibraryExport } from "../lib/library-export";
import { ImportSource } from "./import-source";
import { InstallPrompt } from "./install-prompt";
import { Reader } from "./reader";

export default function HomePage() {
  const [sources, setSources] = useState<SourceContent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceContent | null>(null);
  const [duplicate, setDuplicate] = useState<{
    title: string;
    text: string;
    existing: SourceContent;
  } | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  useEffect(() => {
    setSources(
      loadSources().sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
    );
  }, []);

  function handleSave(title: string, text: string) {
    const existing = sources.find((source) => source.title === title && source.text === text);
    if (existing) {
      setDuplicate({ title, text, existing });
      setIsImporting(false);
      return;
    }

    addSource(createSource(text, title));
  }

  function addSource(source: SourceContent) {
    const nextSources = [source, ...sources];
    setSources(nextSources);
    saveSources(nextSources);
    setIsImporting(false);
  }

  function handlePdfSave(
    title: string,
    text: string,
    metadata: {
      originalFileName: string;
      originalFile: SourceContent["originalFile"];
      pageReferences: PageReference[];
    }
  ) {
    const existing = sources.find((source) => source.title === title && source.text === text);
    if (existing) {
      setDuplicate({ title, text, existing });
      setIsImporting(false);
      return;
    }
    addSource(createSource(text, title, metadata));
  }

  function replaceDuplicate() {
    if (!duplicate) return;
    const replacement = {
      ...duplicate.existing,
      title: duplicate.title,
      text: duplicate.text,
      createdAt: new Date().toISOString(),
      processingStatus: "ready" as const
    };
    const nextSources = [
      replacement,
      ...sources.filter((source) => source.id !== duplicate.existing.id)
    ];
    setSources(nextSources);
    saveSources(nextSources);
    setDuplicate(null);
  }

  function copyDuplicate() {
    if (!duplicate) return;
    addSource(createSource(duplicate.text, duplicate.title));
    setDuplicate(null);
  }

  function removeSource(source: SourceContent) {
    if (!window.confirm(`Delete "${source.title}" and all its local reading data?`)) return;
    deleteSource(source.id);
    setSources((current) => current.filter((item) => item.id !== source.id));
  }

  function exportLibrary() {
    const selected = selectedSourceIds.length
      ? sources.filter((source) => selectedSourceIds.includes(source.id))
      : sources;
    const bytes = createLibraryExport(selected);
    const blobBytes = new Uint8Array(bytes);
    const url = URL.createObjectURL(new Blob([blobBytes], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "focus-reader-library.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importLibrary(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseLibraryExport(new Uint8Array(await file.arrayBuffer()));
      const nextSources = [...imported, ...sources];
      setSources(nextSources);
      saveSources(nextSources);
    } catch (reason: unknown) {
      window.alert(reason instanceof Error ? reason.message : "Unable to import this library.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Focus Reader home">
          <span className="wordmark-mark" aria-hidden="true">
            •
          </span>
          Focus Reader
        </a>
        <InstallPrompt />
      </header>

      {duplicate ? (
        <section className="dialog-panel" aria-labelledby="duplicate-title">
          <p className="eyebrow">Source already exists</p>
          <h2 id="duplicate-title">What should happen with this import?</h2>
          <p>
            A source with this title and content is already in your library.
            Replace its Source version or keep a separate copy?
          </p>
          <div className="form-actions">
            <button className="secondary-action" onClick={() => setDuplicate(null)} type="button">
              Cancel
            </button>
            <button className="secondary-action" onClick={copyDuplicate} type="button">
              Create a copy
            </button>
            <button className="primary-action" onClick={replaceDuplicate} type="button">
              Replace source
            </button>
          </div>
        </section>
      ) : activeSource ? (
        <Reader onBack={() => setActiveSource(null)} source={activeSource} />
      ) : (
      <section className="welcome" aria-labelledby="welcome-title">
        <p className="eyebrow">Your local reading space</p>
        <h1 id="welcome-title">Read with your eyes in one place.</h1>
        <p className="lede">
          Import a text or PDF and move through it with a calm, anchored
          reading experience. Your library stays on this device.
        </p>
        {isImporting ? (
          <ImportSource
            onCancel={() => setIsImporting(false)}
            onSave={handleSave}
            onSavePdf={handlePdfSave}
          />
        ) : sources.length > 0 ? (
          <div className="library" aria-label="Source library">
            <div className="library-heading">
              <h2>Your library</h2>
              <div className="library-actions">
                <button className="secondary-action" onClick={exportLibrary} type="button">
                  Export library
                </button>
                <label className="secondary-action file-import-action" htmlFor="library-import">
                  Import library
                  <input accept=".zip,application/zip" id="library-import" onChange={importLibrary} type="file" />
                </label>
                <button className="primary-action" onClick={() => setIsImporting(true)} type="button">
                  Import source
                </button>
              </div>
            </div>
            {sources.map((source) => (
              <div className="source-card" key={source.id}>
                <label className="source-select">
                  <input
                    aria-label={`Select ${source.title} for export`}
                    checked={selectedSourceIds.includes(source.id)}
                    onChange={(event) =>
                      setSelectedSourceIds((current) =>
                        event.target.checked
                          ? [...current, source.id]
                          : current.filter((id) => id !== source.id)
                      )
                    }
                    type="checkbox"
                  />
                  Export
                </label>
                <button
                  aria-label={`Open ${source.title}`}
                  onClick={() => setActiveSource(source)}
                  type="button"
                >
                  <h3>{source.title}</h3>
                  <p>{source.text.slice(0, 120)}{source.text.length > 120 ? "…" : ""}</p>
                  <small>
                    Ready · {Math.min(100, Math.round((source.lastPosition / Math.max(1, source.text.trim().split(/\s+/).length)) * 100))}% read
                  </small>
                </button>
                <button
                  aria-label={`Delete ${source.title}`}
                  className="delete-action"
                  onClick={() => removeSource(source)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-library" aria-label="Empty library">
            <div className="empty-icon" aria-hidden="true">
              +
            </div>
            <h2>Your library is ready</h2>
            <p>Paste text or choose a file to begin your first reading session.</p>
            <button className="primary-action" onClick={() => setIsImporting(true)} type="button">
              Import source
            </button>
          </div>
        )}
      </section>
      )}
    </main>
  );
}
