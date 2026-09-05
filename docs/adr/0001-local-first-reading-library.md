# Keep the reading library local-first

**Status:** accepted

Source content, derived reading text, reading state, bookmarks, and session metrics are stored on the user's device by default, without accounts or cloud synchronization. This protects the privacy of imported books and keeps the PWA useful offline; portable library export provides recovery and migration without requiring a server. Source content must not leave the device for telemetry.

## Considered Options

- Cloud-backed accounts and synchronization from the first release
- Local-first storage with optional anonymous operational telemetry
- Local-only storage with no telemetry or diagnostics

## Consequences

The application must process supported files locally, surface browser/device storage failures clearly, support explicit deletion, and provide a versioned portable library export. Any future sync feature must be an explicit product decision rather than an implicit migration of local data.
