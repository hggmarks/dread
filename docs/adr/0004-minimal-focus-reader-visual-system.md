# Use a minimal Catppuccin-inspired Focus Reader visual system

**Status:** accepted

Focus Reader will use a single dark Catppuccin Mocha-inspired visual system with a spacious, low-contrast full-screen reading surface. The active word remains the dominant element, its Anchor letter is highlighted near the calculated optimal recognition point, and one previous and one upcoming word occupy fixed-width, subdued context slots. A faint vertical anchor guide reinforces alignment without competing with the word.

The Conventional Reader will share the same shell, palette, typography controls, Reading status, and settings surface, while Focus Reader remains the default mode. Desktop uses a compact top bar and bottom status/control layout; mobile uses a compact bottom strip with pause/play and progress, with settings in a bottom sheet. Secondary controls hide during active reading and reappear on pointer, touch, keyboard, or focus interaction. Reduced-motion users retain this visibility behavior but receive instant state changes without transitions.

The interface will expose only functional navigation, preserve accessible focus and live-region behavior, and keep essential text and controls at accessible contrast while allowing context words to remain visually subdued.
