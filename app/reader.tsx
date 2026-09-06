"use client";

import React, { useEffect, useMemo, useState } from "react";
import { updateSourcePosition } from "../lib/source-content";
import type { Bookmark, SourceContent } from "../lib/source-content";

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
  const [rewindWords, setRewindWords] = useState(3);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(source.bookmarks ?? []);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const words = useMemo(() => source.text.trim().split(/\s+/).filter(Boolean), [source.text]);

  useEffect(() => {
    updateSourcePosition(source.id, wordIndex);
  }, [source.id, wordIndex]);

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

  useEffect(() => {
    function pauseWhenHidden() {
      if (document.visibilityState === "hidden" && isPlaying) {
        setIsPlaying(false);
        setWordIndex((current) => Math.max(0, current - rewindWords));
      }
    }

    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, [isPlaying, rewindWords]);

  useEffect(() => {
    if (!isPlaying || mode !== "focus") return;
    const timeout = window.setTimeout(() => setControlsVisible(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [isPlaying, mode, wordIndex]);

  function pause() {
    setIsPlaying(false);
    setWordIndex((current) => Math.max(0, current - rewindWords));
    setControlsVisible(true);
  }

  function jumpTo(index: number) {
    setIsPlaying(false);
    setWordIndex(Math.max(0, Math.min(index, words.length - 1)));
    setControlsVisible(true);
  }

  function addBookmark() {
    const label = bookmarkLabel.trim();
    if (!label) return;
    const nextBookmarks = [
      ...bookmarks,
      { id: crypto.randomUUID(), label, wordIndex }
    ];
    setBookmarks(nextBookmarks);
    window.localStorage.setItem(
      "focus-reader:sources",
      JSON.stringify(
        JSON.parse(window.localStorage.getItem("focus-reader:sources") ?? "[]").map(
          (item: SourceContent) =>
            item.id === source.id ? { ...item, bookmarks: nextBookmarks } : item
        )
      )
    );
    setBookmarkLabel("");
  }

  return (
    <section
      className="reader"
      aria-labelledby="reader-title"
      onKeyDown={() => setControlsVisible(true)}
      onPointerMove={() => setControlsVisible(true)}
      onTouchStart={() => setControlsVisible(true)}
    >
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
        <p className="conventional-text">
          {words.map((word, index) => (
            <React.Fragment key={`${word}-${index}`}>
              <button
                className={index === wordIndex ? "current-word" : "word-button"}
                onClick={() => jumpTo(index)}
                type="button"
              >
                {word}
              </button>{" "}
            </React.Fragment>
          ))}
        </p>
      )}
      <div className="navigation-panel" aria-label="Reading navigation">
        <label htmlFor="progress">
          Progress
          <input
            aria-label="Progress"
            id="progress"
            max={Math.max(0, words.length - 1)}
            min="0"
            onChange={(event) => jumpTo(Number(event.target.value))}
            type="range"
            value={wordIndex}
          />
          <span>{words.length ? Math.round((wordIndex / (words.length - 1)) * 100) : 0}%</span>
        </label>
        {source.pageReferences && source.pageReferences.length > 0 && (
          <label htmlFor="page-reference">
            Page
            <select
              id="page-reference"
              onChange={(event) => {
                const reference = source.pageReferences?.find(
                  (item) => item.page === Number(event.target.value)
                );
                if (reference) jumpTo(reference.startWord);
              }}
              value={source.pageReferences.find(
                (reference) => wordIndex >= reference.startWord && wordIndex <= reference.endWord
              )?.page ?? ""}
            >
              {source.pageReferences.map((reference) => (
                <option key={reference.page} value={reference.page}>
                  {reference.page}
                </option>
              ))}
            </select>
          </label>
        )}
        <form
          className="bookmark-form"
          onSubmit={(event) => {
            event.preventDefault();
            addBookmark();
          }}
        >
          <label htmlFor="bookmark-label">Bookmark</label>
          <input
            id="bookmark-label"
            onChange={(event) => setBookmarkLabel(event.target.value)}
            placeholder="Name this position"
            value={bookmarkLabel}
          />
          <button className="secondary-action" type="submit">Save bookmark</button>
        </form>
        {bookmarks.length > 0 && (
          <div className="bookmark-list" aria-label="Named bookmarks" role="region">
            {bookmarks.map((bookmark) => (
              <button key={bookmark.id} onClick={() => jumpTo(bookmark.wordIndex)} type="button">
                {bookmark.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={`reader-controls ${controlsVisible ? "" : "controls-hidden"}`}>
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
        {mode === "focus" && (
          <label htmlFor="rewind-words">
            Pause rewind
            <input
              id="rewind-words"
              max="10"
              min="0"
              onChange={(event) => setRewindWords(Number(event.target.value))}
              type="number"
              value={rewindWords}
            />
            <span>words</span>
          </label>
        )}
        <button
          className="primary-action"
          onClick={() => (isPlaying ? pause() : setIsPlaying(true))}
          type="button"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
    </section>
  );
}
