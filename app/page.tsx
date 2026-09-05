"use client";

import React, { useEffect, useState } from "react";
import { createSource, loadSources, saveSources, SourceContent } from "../lib/source-content";
import { ImportSource } from "./import-source";
import { InstallPrompt } from "./install-prompt";
import { Reader } from "./reader";

export default function HomePage() {
  const [sources, setSources] = useState<SourceContent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceContent | null>(null);

  useEffect(() => setSources(loadSources()), []);

  function handleSave(title: string, text: string) {
    const nextSources = [createSource(text, title), ...sources];
    setSources(nextSources);
    saveSources(nextSources);
    setIsImporting(false);
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

      {activeSource ? (
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
              <button
                className="source-card"
                key={source.id}
                onClick={() => setActiveSource(source)}
                type="button"
              >
                <h3>{source.title}</h3>
                <p>{source.text.slice(0, 120)}{source.text.length > 120 ? "…" : ""}</p>
              </button>
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
