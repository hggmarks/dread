# Treat RSVP as a foreground reader over derived text

**Status:** accepted

The Focus Reader is a visual foreground session over a user-reviewable Derived reading source. It pauses when the app is no longer visible, shares a canonical Word index with the Conventional Reader, applies Adaptive rewind once when pausing, and uses a user Rewind override when configured. PDF imports preserve the Original source and Page references while allowing cleanup corrections in a separate derived source.

## Considered Options

- Advance visual playback in the background or continue as audio
- Make RSVP the only reading mode
- Read raw PDF extraction without review or correction
- Use separate positions for RSVP and conventional reading

## Consequences

The MVP needs explicit processing and extraction-preview states, coherent-text checks, synchronized mode switching, contextual resume, and a conventional reading path for accessibility and review. Scanned or otherwise unusable PDFs may be inspected but are not promised as Focus Reader inputs.
