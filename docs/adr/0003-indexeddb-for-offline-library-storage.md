# Use IndexedDB for the offline reading library

**Status:** accepted

The local library will use IndexedDB as its primary offline persistence boundary, including Source content metadata, Reading state, session metrics, and retained Original source files. This avoids the small quota and base64 overhead of `localStorage` while preserving offline operation; existing `localStorage` data does not need migration because the app has no users yet.

Original PDF files remain available locally by default, but a failed save may offer three explicit choices: retry after cleanup, save the Derived reading source while marking the Original source unavailable, or cancel without changing the existing library. The application will use a 100 MB per-source limit, expose Storage management with approximate usage and explicit cleanup, and never delete existing sources automatically.

Portable library export remains a versioned ZIP for interoperability. New exports will store metadata in `manifest.json` and Original source files as separate binary entries; imports will continue accepting the current base64-in-manifest format for compatibility.
