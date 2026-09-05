"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { SourceContent } from "../lib/source-content";

type ReaderProps = {
  source: SourceContent;
  onBack: () => void;
};

type Mode = "conventional" | "focus";

export function Reader({ source, onBack }: ReaderProps) {
  const [mode, setMode] = useState<Mode>("conventional");
  const [wordIndex, setWordIndex] = useState(source.lastPosition);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordsPerMinute, setWordsPerMinute] = useState(300);
  const words = useMemo(() => source.text.trim().split(/\s+/).filter(Boolean), [source.text]);

  useEffect(() => {
    if (!isPlaying || mode !== "focus") return;

    const interval = window.setInterval(() => {
      setWordIndex((current) => {
        if (current >= words.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 60000 / wordsPerMinute);

    return () => window.clearInterval(interval);
  }, [isPlaying, mode, words.length, wordsPerMinute]);

  return (
    <section className="reader" aria-labelledby="reader-title">
      <div className="reader-toolbar">
        <button className="secondary-action" onClick={onBack} type="button">
          Back to library
        </button>
        <div className="mode-switch" role="group" aria-label="Reading mode">
          <button
            aria-pressed={mode === "conventional"}
            className={mode === "conventional" ? "mode-active" : ""}
            onClick={() => setMode("conventional")}
            type="button"
          >
            Conventional
          </button>
          <button
            aria-pressed={mode === "focus"}
            className={mode === "focus" ? "mode-active" : ""}
            onClick={() => setMode("focus")}
            type="button"
          >
            Focus Reader
          </button>
        </div>
      </div>
      <p className="eyebrow">{mode === "focus" ? "Focus Reader" : "Conventional Reader"}</p>
      <h2 id="reader-title">{source.title}</h2>
      {mode === "focus" ? (
        <div className="focus-stage" aria-live="polite" aria-label="Current word">
          <span>{words[wordIndex] ?? ""}</span>
        </div>
      ) : (
        <p className="conventional-text">{source.text}</p>
      )}
      <div className="reader-controls">
        <label htmlFor="reading-speed">
          Speed
          <input
            id="reading-speed"
            max="1000"
            min="60"
            onChange={(event) => setWordsPerMinute(Number(event.target.value))}
            step="10"
            type="range"
            value={wordsPerMinute}
          />
          <span>{wordsPerMinute} WPM</span>
        </label>
        <button
          className="primary-action"
          onClick={() => setIsPlaying((playing) => !playing)}
          type="button"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
    </section>
  );
}
