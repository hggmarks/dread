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
const DATABASE_NAME = "focus-reader";
const DATABASE_VERSION = 1;
const SOURCES_STORE = "sources";
export const READER_PREFERENCES_KEY = "focus-reader:preferences";
let sourceMutationQueue = Promise.resolve();

export class StorageFailure extends Error {
  constructor(message = "Unable to save the local library. Export your library or remove unused sources and try again.") {
    super(message);
    this.name = "StorageFailure";
  }
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window && Boolean(window.indexedDB);
}

function loadLegacySources(): SourceContent[] {
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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SOURCES_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new StorageFailure());
  });
}

async function readSources(): Promise<SourceContent[]> {
  if (!canUseIndexedDb()) return loadLegacySources();

  try {
    const database = await openDatabase();
    const sources = await new Promise<SourceContent[]>((resolve, reject) => {
      const request = database
        .transaction(SOURCES_STORE, "readonly")
        .objectStore(SOURCES_STORE)
        .getAll();
      request.onsuccess = () => resolve(request.result as SourceContent[]);
      request.onerror = () => reject(request.error ?? new StorageFailure());
    });
    database.close();
    return sources;
  } catch {
    return loadLegacySources();
  }
}

async function writeSources(sources: SourceContent[]) {
  if (!canUseIndexedDb()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
      return;
    } catch {
      throw new StorageFailure();
    }
  }

  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SOURCES_STORE, "readwrite");
      transaction.objectStore(SOURCES_STORE).clear();
      for (const source of sources) transaction.objectStore(SOURCES_STORE).put(source);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new StorageFailure());
      transaction.onabort = () => reject(transaction.error ?? new StorageFailure());
    });
    database.close();
  } catch {
    throw new StorageFailure();
  }
}

export function loadSources(): Promise<SourceContent[]> {
  return sourceMutationQueue.then(readSources);
}

export function saveSources(sources: SourceContent[]): Promise<void> {
  sourceMutationQueue = sourceMutationQueue
    .catch(() => undefined)
    .then(() => writeSources(sources));
  return sourceMutationQueue;
}

export function updateSource(
  id: string,
  update: (source: SourceContent) => SourceContent
): Promise<void> {
  sourceMutationQueue = sourceMutationQueue
    .catch(() => undefined)
    .then(async () => {
      const sources = await readSources();
      await writeSources(
        sources.map((source) => (source.id === id ? update(source) : source))
      );
    });
  return sourceMutationQueue;
}

export async function updateSourcePosition(id: string, lastPosition: number) {
  await updateSource(id, (source) => ({ ...source, lastPosition }));
}

export function deleteSource(id: string): Promise<void> {
  sourceMutationQueue = sourceMutationQueue
    .catch(() => undefined)
    .then(async () => {
      const sources = await readSources();
      await writeSources(sources.filter((source) => source.id !== id));
    });
  return sourceMutationQueue;
}

export function clearSources(): Promise<void> {
  sourceMutationQueue = sourceMutationQueue
    .catch(() => undefined)
    .then(async () => {
      if (canUseIndexedDb()) {
        try {
          const database = await openDatabase();
          await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(SOURCES_STORE, "readwrite");
            transaction.objectStore(SOURCES_STORE).clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new StorageFailure());
            transaction.onabort = () => reject(transaction.error ?? new StorageFailure());
          });
          database.close();
          return;
        } catch {
          throw new StorageFailure(
            "Unable to clear the local library. Review browser storage permissions and try again."
          );
        }
      }

      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        throw new StorageFailure(
          "Unable to clear the local library. Review browser storage permissions and try again."
        );
      }
    });
  return sourceMutationQueue;
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
