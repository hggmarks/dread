"use client";

import React, { useEffect, useMemo, useState } from "react";
import { updateSourcePosition } from "../lib/source-content";
import type {
  Bookmark,
  ReadingSessionMetric,
  SourceContent
} from "../lib/source-content";

type ReaderProps = {
  source: SourceContent;
  onBack: () => void;
};

type Mode = "conventional" | "focus";
type TimingProfile = "uniform" | "boundary-aware";

export function Reader({ source, onBack }: ReaderProps) {
  const [mode, setMode] = useState<Mode>("conventional");
  const [wordIndex, setWordIndex] = useState(source.lastPosition);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordsPerMinute, setWordsPerMinute] = useState(300);
  const [rewindWords, setRewindWords] = useState(3);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(source.bookmarks ?? []);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif">("sans");
  const [textScale, setTextScale] = useState(100);
  const [anchorPosition, setAnchorPosition] = useState(50);
  const [timingProfile, setTimingProfile] = useState<TimingProfile>("uniform");
  const [sessionPrompts, setSessionPrompts] = useState(true);
  const [promptMilestone, setPromptMilestone] = useState(50);
  const [assessment, setAssessment] = useState<number | null>(null);
  const [lastSession, setLastSession] = useState<ReadingSessionMetric | null>(null);
  const [milestonePromptVisible, setMilestonePromptVisible] = useState(false);
  const sessionStartedAt = React.useRef(Date.now());
  const sessionStartWord = React.useRef(wordIndex);
  const pauses = React.useRef(0);
  const promptedMilestone = React.useRef(false);
  const words = useMemo(() => source.text.trim().split(/\s+/).filter(Boolean), [source.text]);

  useEffect(() => {
    updateSourcePosition(source.id, wordIndex);
    if (
      sessionPrompts &&
      !promptedMilestone.current &&
      words.length > 0 &&
      wordIndex >= Math.floor((words.length - 1) * (promptMilestone / 100))
    ) {
      promptedMilestone.current = true;
      setMilestonePromptVisible(true);
      setControlsVisible(true);
    }
  }, [source.id, wordIndex, words.length, promptMilestone, sessionPrompts]);

  useEffect(() => {
    if (!isPlaying || mode !== "focus") return;

    const currentWord = words[wordIndex] ?? "";
    const boundaryPause =
      timingProfile === "boundary-aware" && /[.!?,;:]$/.test(currentWord) ? 1.35 : 1;
    const interval = window.setInterval(() => {
      setWordIndex((current) => {
        if (current >= words.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, (60000 / wordsPerMinute) * boundaryPause);

    return () => window.clearInterval(interval);
  }, [isPlaying, mode, wordIndex, words, wordsPerMinute, timingProfile]);

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
    pauses.current += 1;
    setWordIndex((current) => Math.max(0, current - rewindWords));
    setControlsVisible(true);
  }

  function finishSession() {
    const endedAt = Date.now();
    const durationSeconds = Math.max(1, Math.round((endedAt - sessionStartedAt.current) / 1000));
    const wordsRead = Math.max(0, wordIndex - sessionStartWord.current + 1);
    const metric: ReadingSessionMetric = {
      id: crypto.randomUUID(),
      startedAt: new Date(sessionStartedAt.current).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      durationSeconds,
      wordsRead,
      averageWpm: Math.round((wordsRead / durationSeconds) * 60),
      pauses: pauses.current,
      completion: words.length ? Math.round(((wordIndex + 1) / words.length) * 100) : 0,
      ...(assessment === null ? {} : { selfAssessment: assessment })
    };
    const stored = JSON.parse(
      window.localStorage.getItem("focus-reader:sources") ?? "[]"
    ) as SourceContent[];
    const next = stored.map((item) =>
      item.id === source.id
        ? { ...item, sessionMetrics: [...(item.sessionMetrics ?? []), metric] }
        : item
    );
    window.localStorage.setItem("focus-reader:sources", JSON.stringify(next));
    setLastSession(metric);
    setIsPlaying(false);
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
      data-theme={theme}
      style={{
        ["--reader-scale" as string]: `${textScale / 100}`,
        ["--reader-anchor" as string]: `${anchorPosition}%`,
        fontFamily: fontFamily === "serif" ? "Georgia, serif" : "Arial, sans-serif"
      }}
      onKeyDown={() => setControlsVisible(true)}
      onPointerMove={() => setControlsVisible(true)}
      onTouchStart={() => setControlsVisible(true)}
    >
      <div className="reader-toolbar">
        <button
          className="secondary-action"
          onClick={() => {
            finishSession();
            onBack();
          }}
          type="button"
        >
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
        <button
          className="secondary-action"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          type="button"
        >
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </button>
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
        {sessionPrompts && milestonePromptVisible && (
          <div className="session-prompt" role="region" aria-label="Reading milestone">
            <strong>How is your understanding so far?</strong>
            <label htmlFor="self-assessment">Self-assessment</label>
            <select
              id="self-assessment"
              onChange={(event) => setAssessment(Number(event.target.value))}
              value={assessment ?? ""}
            >
              <option value="">Not now</option>
              <option value="1">1 - unclear</option>
              <option value="2">2</option>
              <option value="3">3 - fair</option>
              <option value="4">4</option>
              <option value="5">5 - clear</option>
            </select>
          </div>
        )}
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
        {source.chapters && source.chapters.length > 0 && (
          <label htmlFor="chapter">
            Chapter
            <select
              id="chapter"
              onChange={(event) => {
                const chapter = source.chapters?.find(
                  (item) => item.id === event.target.value
                );
                if (chapter) jumpTo(chapter.wordIndex);
              }}
              value={
                source.chapters
                  .filter((chapter) => chapter.wordIndex <= wordIndex)
                  .at(-1)?.id ?? ""
              }
            >
              {source.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
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
        <div className="reader-settings" aria-label="Reader settings">
          <label htmlFor="font-family">
            Font
            <select id="font-family" onChange={(event) => setFontFamily(event.target.value as "sans" | "serif")} value={fontFamily}>
              <option value="sans">Sans serif</option>
              <option value="serif">Serif</option>
            </select>
          </label>
          <label htmlFor="text-scale">
            Text size
            <input id="text-scale" max="160" min="80" onChange={(event) => setTextScale(Number(event.target.value))} type="range" value={textScale} />
            <span>{textScale}%</span>
          </label>
          {mode === "focus" && (
            <>
              <label htmlFor="anchor-position">
                Anchor
                <input id="anchor-position" max="75" min="25" onChange={(event) => setAnchorPosition(Number(event.target.value))} type="range" value={anchorPosition} />
              </label>
              <label htmlFor="timing-profile">
                Timing
                <select id="timing-profile" onChange={(event) => setTimingProfile(event.target.value as TimingProfile)} value={timingProfile}>
                  <option value="uniform">Uniform</option>
                  <option value="boundary-aware">Boundary-aware</option>
                </select>
              </label>
              <label htmlFor="session-prompts">
                Session prompts
                <input
                  checked={sessionPrompts}
                  id="session-prompts"
                  onChange={(event) => setSessionPrompts(event.target.checked)}
                  type="checkbox"
                />
              </label>
              {sessionPrompts && (
                <label htmlFor="prompt-milestone">
                  Prompt at
                  <select
                    id="prompt-milestone"
                    onChange={(event) => setPromptMilestone(Number(event.target.value))}
                    value={promptMilestone}
                  >
                    <option value="25">25%</option>
                    <option value="50">50%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                  </select>
                </label>
              )}
            </>
          )}
        </div>
        <button
          className="primary-action"
          onClick={() => (isPlaying ? pause() : setIsPlaying(true))}
          type="button"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="secondary-action" onClick={finishSession} type="button">
          Finish session
        </button>
        {lastSession && (
          <div className="session-summary" role="status">
            Last session: {lastSession.wordsRead} words, {lastSession.averageWpm} WPM,
            {lastSession.pauses} pauses, {lastSession.completion}% complete.
          </div>
        )}
      </div>
    </section>
  );
}
