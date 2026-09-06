"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  READER_PREFERENCES_KEY,
  updateSource,
  updateSourcePosition
} from "../lib/source-content";
import type {
  Bookmark,
  ReaderPreferences,
  ReadingSessionMetric,
  SourceContent
} from "../lib/source-content";

type ReaderProps = {
  source: SourceContent;
  onBack: () => void;
};

type Mode = "conventional" | "focus";
type TimingProfile = "uniform" | "boundary-aware";

function splitAnchorWord(word: string) {
  const characters = Array.from(word);
  const letterIndexes = characters
    .map((character, index) => (/\p{L}|\p{N}/u.test(character) ? index : -1))
    .filter((index) => index >= 0);
  const target = letterIndexes[Math.round((letterIndexes.length - 1) * 0.33)] ?? 0;

  return {
    before: characters.slice(0, target).join(""),
    anchor: characters[target] ?? "",
    after: characters.slice(target + 1).join("")
  };
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function Reader({ source, onBack }: ReaderProps) {
  const savedPreferences = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(
        window.localStorage.getItem(READER_PREFERENCES_KEY) ?? "null"
      ) as Partial<ReaderPreferences> | null;
    } catch {
      return null;
    }
  }, []);
  const [mode, setMode] = useState<Mode>("focus");
  const [wordIndex, setWordIndex] = useState(source.lastPosition);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordsPerMinute, setWordsPerMinute] = useState(savedPreferences?.wordsPerMinute ?? 300);
  const [rewindWords, setRewindWords] = useState(savedPreferences?.rewindWords ?? 3);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(source.bookmarks ?? []);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif">(savedPreferences?.fontFamily ?? "sans");
  const [textScale, setTextScale] = useState(savedPreferences?.textScale ?? 100);
  const [anchorPosition, setAnchorPosition] = useState(savedPreferences?.anchorPosition ?? 50);
  const [timingProfile, setTimingProfile] = useState<TimingProfile>(savedPreferences?.timingProfile ?? "uniform");
  const [sessionPrompts, setSessionPrompts] = useState(savedPreferences?.sessionPrompts ?? true);
  const [promptMilestone, setPromptMilestone] = useState(savedPreferences?.promptMilestone ?? 50);
  const [assessment, setAssessment] = useState<number | null>(null);
  const [lastSession, setLastSession] = useState<ReadingSessionMetric | null>(null);
  const [milestonePromptVisible, setMilestonePromptVisible] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionStartedAt = React.useRef(Date.now());
  const activeStartedAt = React.useRef<number | null>(null);
  const accumulatedMilliseconds = React.useRef(0);
  const sessionStartWord = React.useRef(wordIndex);
  const pauses = React.useRef(0);
  const promptedMilestone = React.useRef(false);
  const words = useMemo(() => source.text.trim().split(/\s+/).filter(Boolean), [source.text]);
  const activeWord = useMemo(() => splitAnchorWord(words[wordIndex] ?? ""), [words, wordIndex]);
  const progress = words.length ? Math.round(((wordIndex + 1) / words.length) * 100) : 0;
  const remainingWords = Math.max(0, words.length - wordIndex - 1);
  const remainingSeconds = Math.round((remainingWords / wordsPerMinute) * 60);

  useEffect(() => {
    if (isPlaying && activeStartedAt.current === null) {
      activeStartedAt.current = Date.now();
    } else if (!isPlaying && activeStartedAt.current !== null) {
      accumulatedMilliseconds.current += Date.now() - activeStartedAt.current;
      activeStartedAt.current = null;
    }
  }, [isPlaying]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const activeMilliseconds =
        activeStartedAt.current === null
          ? 0
          : Date.now() - activeStartedAt.current;
      setElapsedSeconds(
        Math.floor((accumulatedMilliseconds.current + activeMilliseconds) / 1000)
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        READER_PREFERENCES_KEY,
        JSON.stringify({
          fontFamily,
          textScale,
          anchorPosition,
          timingProfile,
          sessionPrompts,
          promptMilestone,
          wordsPerMinute,
          rewindWords
        } satisfies ReaderPreferences)
      );
    } catch {
      setStorageError("Reader preferences could not be saved locally.");
    }
  }, [
    anchorPosition,
    fontFamily,
    promptMilestone,
    rewindWords,
    sessionPrompts,
    textScale,
    timingProfile,
    wordsPerMinute
  ]);

  useEffect(() => {
    void updateSourcePosition(source.id, wordIndex).catch((reason: unknown) => {
      setStorageError(
        reason instanceof Error
          ? reason.message
          : "Reading progress could not be saved locally. Export your library when storage is available."
      );
    });
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
          setCompleted(true);
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

  async function finishSession() {
    const endedAt = Date.now();
    const activeMilliseconds =
      activeStartedAt.current === null
        ? 0
        : endedAt - activeStartedAt.current;
    const durationSeconds = Math.max(
      1,
      Math.round((accumulatedMilliseconds.current + activeMilliseconds) / 1000)
    );
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
    try {
      await updateSource(source.id, (item) => ({
        ...item,
        sessionMetrics: [...(item.sessionMetrics ?? []), metric]
      }));
      setLastSession(metric);
      setIsPlaying(false);
      accumulatedMilliseconds.current = durationSeconds * 1000;
      activeStartedAt.current = null;
      setElapsedSeconds(durationSeconds);
    } catch (reason: unknown) {
      setStorageError(
        reason instanceof Error ? reason.message : "The session could not be saved locally."
      );
    }
  }

  function jumpTo(index: number) {
    setIsPlaying(false);
    setCompleted(false);
    setWordIndex(Math.max(0, Math.min(index, words.length - 1)));
    setControlsVisible(true);
  }

  async function addBookmark() {
    const label = bookmarkLabel.trim();
    if (!label) return;
    const nextBookmarks = [
      ...bookmarks,
      { id: crypto.randomUUID(), label, wordIndex }
    ];
    setBookmarks(nextBookmarks);
    try {
      await updateSource(source.id, (item) => ({
        ...item,
        bookmarks: nextBookmarks
      }));
      setBookmarkLabel("");
    } catch (reason: unknown) {
      setStorageError(
        reason instanceof Error ? reason.message : "The bookmark could not be saved locally."
      );
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    setControlsVisible(true);
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      isPlaying ? pause() : setIsPlaying(true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      jumpTo(wordIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      jumpTo(wordIndex + 1);
    } else if (event.key === "Escape") {
      setSettingsOpen(false);
    }
  }

  return (
    <section
      className="reader"
      aria-labelledby="reader-title"
      style={{
        ["--reader-scale" as string]: `${textScale / 100}`,
        ["--reader-anchor" as string]: `${anchorPosition}%`,
        fontFamily: fontFamily === "serif" ? "Georgia, serif" : "Arial, sans-serif"
      }}
      onKeyDown={handleKeyDown}
      onPointerMove={() => setControlsVisible(true)}
      onTouchStart={() => setControlsVisible(true)}
    >
      <nav className="reader-toolbar" aria-label="Reader navigation">
        <button
          className="reader-nav-link"
          onClick={() => {
            finishSession();
            onBack();
          }}
          type="button"
        >
          <span aria-hidden="true">←</span> Library
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
      </nav>
      <p className="reader-kicker">{mode === "focus" ? "Focus Reader" : "Conventional Reader"}</p>
      <h2 id="reader-title">{source.title}</h2>
      {storageError && <p className="error-message" role="alert">{storageError}</p>}
      {mode === "focus" ? (
        <div className="focus-stage" aria-live="polite" aria-label="Current word">
          <span className="context-word context-word-previous" aria-hidden="true">
            {words[wordIndex - 1] ?? ""}
          </span>
          <span className="focus-word" aria-label={words[wordIndex] ?? ""}>
            <span>{activeWord.before}</span>
            <strong className="anchor-letter">{activeWord.anchor}</strong>
            <span>{activeWord.after}</span>
          </span>
          <span className="context-word context-word-next" aria-hidden="true">
            {words[wordIndex + 1] ?? ""}
          </span>
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
      <div className="reading-status" aria-label="Reading status">
        <span><strong>{formatDuration(elapsedSeconds)}</strong> elapsed</span>
        <span><strong>{wordsPerMinute}</strong> WPM</span>
        <span><strong>{progress}%</strong> progress</span>
        <span><strong>{remainingWords}</strong> words left</span>
        <span><strong>{formatDuration(remainingSeconds)}</strong> remaining</span>
      </div>
      {completed && (
        <div className="completion-state" role="status">
          <strong>Source complete</strong>
          <span>You reached the final word. Your position is saved.</span>
          <button className="secondary-action" onClick={finishSession} type="button">
            Finish session
          </button>
        </div>
      )}
      <div
        className={`navigation-panel secondary-reader-controls ${
          controlsVisible ? "" : "controls-hidden"
        }`}
        aria-label="Reading navigation"
      >
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
        <button
          className="secondary-action settings-toggle"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((current) => !current)}
          type="button"
        >
          Settings
        </button>
        {settingsOpen && <div className="reader-settings" aria-label="Reader settings">
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
          <div className="shortcut-help">
            <strong>Shortcuts</strong>
            <span>Space play/pause</span>
            <span>← → move one word</span>
            <span>Esc close settings</span>
            <small>Focus Reader keeps the active word anchored while the surrounding words stay quiet.</small>
          </div>
        </div>}
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
