# Focus Reader

This context defines the product language for a local-first reading application that presents extracted text through an anchored, sequential word display.

## Product

**Focus Reader**:
The primary reading experience that displays text sequentially with a stable visual anchor, based on RSVP principles.
_Avoid_: Speed reader, word-flash reader

**Reading session**:
A user's active attempt to read a selected source through the Focus Reader, including its current position, pace, and pause/resume behavior.
_Avoid_: Playback, viewing session

**Adaptive rewind**:
The automatic pause behavior that moves the reading position backward by a small amount calculated from the recent reading pace and the pause transition.
_Avoid_: Pause delay, restart

**Rewind override**:
A user-configured rewind amount that replaces adaptive rewind when enabled.
_Avoid_: Rewind preference

**Resume context**:
The amount of nearby text shown or replayed when a reading session is resumed, allowing the reader to recover meaning after an interruption.
_Avoid_: Resume position

**Timing profile**:
The rule used to determine how long each word and text boundary remains visible. Uniform word timing is the default; an optional profile can add modest emphasis to punctuation and structural boundaries.
_Avoid_: Playback timing

## Content

**Source content**:
Text imported or pasted by the user and made available for reading.
_Avoid_: Document, asset

**Reading state**:
The changing information associated with a source content, such as position, progress, pace, and annotations.
_Avoid_: Document status, playback state

## Product boundaries

**Local-first**:
The application stores source content and reading state on the user's device by default, without requiring an account or cloud synchronization.
_Avoid_: Offline-only

**Supported content**:
Plain text, pasted text, and PDFs that can be processed into readable text in the initial product scope.
_Avoid_: All documents

**Readable PDF**:
A text-based PDF whose extracted reading order is sufficiently coherent for a book-like reading experience. Scanned PDFs and PDFs with unusable extraction are outside the initial PDF capability.
_Avoid_: Any PDF

**Extraction preview**:
The user-facing review of text produced from a source before it becomes the text used by a reading session. The user may correct the extracted text; if the source cannot produce a usable result, the app explains that it is unsupported.
_Avoid_: Import preview

**Conventional reader**:
A synchronized, non-RSVP presentation of source content used as an alternative reading mode, for accessibility, review, navigation, or situations where Focus Reader is unsuitable.
_Avoid_: Normal reader, fallback viewer

**Position bookmark**:
A saved point in source content that lets a user return to a reading location.
_Avoid_: Annotation, highlight

**Accessibility baseline**:
The accessibility support required around the reading experience, including adjustable presentation, keyboard and assistive-technology access, and a usable Conventional Reader. RSVP-specific behavior may have constraints where it would conflict with its anchored presentation.
_Avoid_: Separate accessibility mode

**Original source**:
The immutable user-provided file or pasted input from which readable text is derived.
_Avoid_: Master document

**Derived reading source**:
The normalized or user-corrected text used by a reading session, while remaining linked to its Original source.
_Avoid_: Edited document

**Last position**:
The automatically maintained reading location for a source, used for ordinary resume behavior.
_Avoid_: Bookmark

**Named bookmark**:
A user-created saved reading location with an optional name, distinct from the automatically maintained Last position.
_Avoid_: Saved page

**Source version**:
One imported representation of an Original source. Reimporting a changed source may create a new version rather than silently replacing the existing Derived reading source.
_Avoid_: Duplicate document

**Processing status**:
The lifecycle state of an imported source while its Derived reading source is being prepared, including ready and failed outcomes.
_Avoid_: Upload status

**Page reference**:
Navigation metadata linking extracted text back to its originating PDF page without becoming ordinary reading text.
_Avoid_: Page number word

**Foreground session**:
A visual Reading session that is active only while the application is visible and interactive. Leaving the app pauses it rather than advancing unseen content.
_Avoid_: Background playback

**Source replacement**:
An explicit import decision that regenerates a source's Derived reading source while attempting to preserve compatible Reading state.
_Avoid_: Overwrite

**Portable library export**:
A user-generated package containing the Original source, Derived reading source, Reading state, and Named bookmarks so local data can be recovered or moved.
_Avoid_: Backup file, sync export

**Original source unavailable**:
A Source content state in which the Derived reading source remains usable but its retained Original source file is no longer available for recovery or export.
_Avoid_: Failed source, deleted source

**Storage failure**:
An inability to save or process local content due to device or browser storage constraints, surfaced without automatically removing existing sources.
_Avoid_: Cache miss

**Storage management**:
The user-facing controls for viewing approximate local library usage and reclaiming space by removing retained Original sources without deleting their Derived reading sources or Reading state.
_Avoid_: Cache settings, cleanup mode

**Word index**:
The canonical position of a word within a Derived reading source, shared by Focus Reader and Conventional Reader.
_Avoid_: Screen position

**Visual anchor**:
The stable recognition point used by Focus Reader to keep the active word visually aligned while words change.
_Avoid_: Cursor, focus ring

**Anchor letter**:
The alphabetic character near the optimal recognition point of the active word, highlighted to guide the reader's eyes.
_Avoid_: Highlighted word, cursor letter

**Reading status**:
The compact session information shown around Focus Reader, including current WPM, progress, remaining words, and estimated remaining time.
_Avoid_: Dashboard, playback status

**Control reveal state**:
Whether secondary Reading session controls are visible during interaction or hidden during active reading.
_Avoid_: Menu state, toolbar state
