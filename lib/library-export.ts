import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { SourceContent } from "./source-content";

const EXPORT_VERSION = 2;

export type LibraryExport = {
  format: "focus-reader-library";
  version: number;
  exportedAt: string;
  sources: SourceContent[];
};

type ExportSource = Omit<SourceContent, "originalFile"> & {
  originalFile?: {
    fileName: string;
    mimeType: string;
    entry: string;
  };
};

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function createLibraryExport(sources: SourceContent[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const exportSources: ExportSource[] = sources.map((source) => {
    const original = source.originalFile;
    if (!original) {
      const { originalFile: _originalFile, ...metadata } = source;
      return metadata;
    }
    const entry = `original/${source.id}-${original.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    entries[entry] = original.bytes ?? base64ToBytes(original.base64 ?? "");
    const { bytes: _bytes, base64: _base64, ...metadata } = original;
    return { ...source, originalFile: { ...metadata, entry } };
  });
  const manifest: LibraryExport = {
    format: "focus-reader-library",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sources: exportSources as SourceContent[]
  };

  return zipSync({
    "README.txt": strToU8(
      "Focus Reader library export v2\n\nmanifest.json contains the Derived reading sources, Reading state, bookmarks, and metadata. Original source files are stored as separate binary ZIP entries.\n"
    ),
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    ...entries
  });
}

export function parseLibraryExport(bytes: Uint8Array): SourceContent[] {
  const files = unzipSync(bytes);
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) throw new Error("This file is not a Focus Reader library export.");

  const manifest = JSON.parse(strFromU8(manifestBytes)) as LibraryExport;
  if (
    manifest.format !== "focus-reader-library" ||
    ![1, EXPORT_VERSION].includes(manifest.version)
  ) {
    throw new Error("This library export version is not supported.");
  }
  if (!Array.isArray(manifest.sources)) throw new Error("The library export is missing sources.");

  if (manifest.version === 1) return manifest.sources;
  return (manifest.sources as ExportSource[]).map((source) => {
    if (!source.originalFile) return source;
    const bytes = files[source.originalFile.entry];
    if (!bytes) throw new Error(`The original source file for "${source.title}" is missing.`);
    return {
      ...source,
      originalFile: {
        fileName: source.originalFile.fileName,
        mimeType: source.originalFile.mimeType,
        bytes
      }
    };
  }) as SourceContent[];
}
