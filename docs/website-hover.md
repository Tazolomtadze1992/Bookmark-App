# Website hover hint — 2026-11-03

Reference: the owner's recording and the live issue cards at
https://interfaces.dev/magazine, inspected in light and dark mode.

Comparing the reference's settled rest and hover styles showed that only the
trailing circular chevron changes. Its opacity goes from 0 to 1, scale from
0.75 to 1, and horizontal offset from -2px to 0 over 300ms with
`cubic-bezier(0,0,0.2,1)`. The thumbnail frame is static. The implementation
matches that hint rather than inventing a thumbnail zoom or lift.

- The hint uses the shared chevron SVG supplied by the owner. The circle
  reuses the category surface token for both themes.
- The title reserves the hint's width, keeping the thumbnail, title row and
  neighboring cards stationary. Long titles truncate inside their text span.
- The hint is decorative and lives inside the existing title link. Preview and
  title retain their original URL, target and link safety attributes.
- Pointer hover is gated to fine pointers with hover support. Keyboard focus
  reveals the hint immediately. Reduced motion removes translation/scale and
  keeps a 100ms opacity transition.
- Bookmark rendering, media previews and viewer behavior are unchanged.

Verification: all 59 existing tests and the production build passed. The sample
preview was checked with real pointer hover, keyboard focus, both themes and a
320px iframe. Thumbnail and title bounds were identical before/after hover;
the title row remained 20.297px high and the title text stayed 14px. At 320px,
document width remained 320px and long titles retained ellipsis. Reduced-motion
rules were inspected in source; an OS preference toggle was not performed.
