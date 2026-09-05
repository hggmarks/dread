"use client";

import React, { useEffect, useState } from "react";
import {
  createSource,
  deleteSource,
  loadSources,
  saveSources,
  SourceContent
} from "../lib/source-content";
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
          <ImportSource onCancel={() => setIsImporting(false)} onSave={handleSave} />
        ) : sources.length > 0 ? (
          <div className="library" aria-label="Source library">
            <div className="library-heading">
              <h2>Your library</h2>
              <button className="primary-action" onClick={() => setIsImporting(true)} type="button">
                Import source
              </button>
            </div>
            {sources.map((source) => (
              <div className="source-card" key={source.id}>
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
