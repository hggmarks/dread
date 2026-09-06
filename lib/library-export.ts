import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { SourceContent } from "./source-content";

const EXPORT_VERSION = 1;

export type LibraryExport = {
  format: "focus-reader-library";
  version: number;
  exportedAt: string;
  sources: SourceContent[];
};

export function createLibraryExport(sources: SourceContent[]): Uint8Array {
  const manifest: LibraryExport = {
    format: "focus-reader-library",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sources
  };

  return zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2))
  });
}

export function parseLibraryExport(bytes: Uint8Array): SourceContent[] {
  const files = unzipSync(bytes);
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) throw new Error("This file is not a Focus Reader library export.");

  const manifest = JSON.parse(strFromU8(manifestBytes)) as LibraryExport;
  if (manifest.format !== "focus-reader-library" || manifest.version !== EXPORT_VERSION) {
    throw new Error("This library export version is not supported.");
  }
  if (!Array.isArray(manifest.sources)) throw new Error("The library export is missing sources.");

  return manifest.sources;
}
