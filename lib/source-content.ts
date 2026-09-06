export type SourceContent = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  lastPosition: number;
  processingStatus: "ready";
  originalFileName?: string;
  pageReferences?: PageReference[];
  bookmarks?: Bookmark[];
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

export function loadSources(): SourceContent[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const sources = JSON.parse(stored) as unknown;
    return Array.isArray(sources) ? (sources as SourceContent[]) : [];
  } catch {
    return [];
  }
}

export function saveSources(sources: SourceContent[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
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

export function createSource(
  text: string,
  title = "Untitled source",
  metadata: Pick<SourceContent, "originalFileName" | "pageReferences" | "bookmarks"> = {}
): SourceContent {
  return {
    id: crypto.randomUUID(),
    title,
    text,
    createdAt: new Date().toISOString(),
    lastPosition: 0,
    processingStatus: "ready",
    ...metadata
  };
}
