export type SourceContent = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  lastPosition: number;
  processingStatus: "ready";
  originalFileName?: string;
  originalFile?: {
    fileName: string;
    mimeType: string;
    base64: string;
  };
  pageReferences?: PageReference[];
  bookmarks?: Bookmark[];
  chapters?: Chapter[];
  sessionMetrics?: ReadingSessionMetric[];
};

export type ReadingSessionMetric = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  wordsRead: number;
  averageWpm: number;
  pauses: number;
  completion: number;
  selfAssessment?: number;
};

export type ReaderPreferences = {
  fontFamily: "sans" | "serif";
  textScale: number;
  anchorPosition: number;
  timingProfile: "uniform" | "boundary-aware";
  sessionPrompts: boolean;
  promptMilestone: number;
  wordsPerMinute: number;
  rewindWords: number;
};

export type Chapter = {
  id: string;
  title: string;
  wordIndex: number;
};

export type Bookmark = {
  id: string;
  label: string;
  wordIndex: number;
};

export type PageReference = {
  page: number;
  startWord: number;
  endWord: number;
};

const STORAGE_KEY = "focus-reader:sources";
export const READER_PREFERENCES_KEY = "focus-reader:preferences";

export class StorageFailure extends Error {
  constructor(message = "Unable to save the local library. Export your library or remove unused sources and try again.") {
    super(message);
    this.name = "StorageFailure";
  }
}

export function loadSources(): SourceContent[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const sources = JSON.parse(stored) as unknown;
    if (!Array.isArray(sources)) {
      throw new StorageFailure("The local library is malformed. Export any recoverable data or clear the local library.");
    }
    return sources as SourceContent[];
  } catch {
    throw new StorageFailure(
      "The local library could not be read. Clear the local library and import a portable export."
    );
  }
}

export function saveSources(sources: SourceContent[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {
    throw new StorageFailure();
  }
}

export function updateSourcePosition(id: string, lastPosition: number) {
  const sources = loadSources();
  const nextSources = sources.map((source) =>
    source.id === id ? { ...source, lastPosition } : source
  );
  saveSources(nextSources);
}

export function deleteSource(id: string) {
  saveSources(loadSources().filter((source) => source.id !== id));
}

export function clearSources() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new StorageFailure(
      "Unable to clear the local library. Review browser storage permissions and try again."
    );
  }
}

export function detectChapters(text: string): Chapter[] {
  let wordIndex = 0;
  const chapters: Chapter[] = [];

  for (const line of text.split(/\r?\n/)) {
    const title = line.trim();
    const words = title ? title.split(/\s+/) : [];
    if (/^(chapter|part)\s+[\w\d]+(?:\s*[:.-].*)?$/i.test(title)) {
      chapters.push({
        id: `chapter-${chapters.length + 1}`,
        title,
        wordIndex
      });
    }
    wordIndex += words.length;
  }

  return chapters;
}

export function createSource(
  text: string,
  title = "Untitled source",
  metadata: Pick<
    SourceContent,
    "originalFileName" | "originalFile" | "pageReferences" | "bookmarks" | "chapters"
    | "sessionMetrics"
  > = {}
): SourceContent {
  return {
    id: crypto.randomUUID(),
    title,
    text,
    createdAt: new Date().toISOString(),
    lastPosition: 0,
    processingStatus: "ready",
    chapters: metadata.chapters ?? detectChapters(text),
    ...metadata
  };
}
