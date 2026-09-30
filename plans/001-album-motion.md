# 001 — Separate the album cover transition from neighboring images

- Commit: 6f6d82f
- Severity: HIGH
- Category: Cohesion, hierarchy & spatial consistency
- Scope: web/detail-motion.js, web/app.js, web/style.css
- Status: DONE (local implementation and browser validation complete)

## Evidence and diagnosis

Reviewed all 427 frames (60fps, 7.11 seconds) of the user's September 30 16:31:07 recording. First open starts at frame 18; the second image appears abruptly around frame 22. Subsequent cached opens (around 123, 204) already have that image. On closing (75–91, 157–173, 255–271), the whole strip shrinks toward a single grid cover, then the second image disappears at cleanup. This contradicts object permanence: only one cover exists in the grid.

Verified source: web/detail-motion.js:35–43 animates `.detail-media`, the entire strip; 46–65 closes the same parent. web/app.js:54 gives non-cover album images lazy loading with no readiness fade. The code and cached-vs-first-open evidence explain two separate defects: entire-strip transforms and a loading pop.

## Recon and scoped audit

Plain JavaScript, CSS and WAAPI. Existing single-media motion is the exemplar: 320ms open, 260ms close, cubic-bezier(.22,1,.36,1); reduced fades 120/100ms. Separate static shadow layers fade opacity on that same clock. Purpose: maintain visual continuity while browsing references, occasional viewer opening. Calm, no bounce.

Eight categories applied to viewer motion: purpose is valid (retain explicitly requested animated Escape; arrow browsing stays instant); easing/duration clean and deliberately accepted; origin is correct for the cover but wrong for the entire strip (HIGH); interruption samples current styles, retain this; performance uses transform/opacity, retain; reduced-motion path exists, extend; cohesion fails for neighbors/loading (HIGH); no additive motion outside this fix is justified.

## Exact target

1. Album cover alone morphs from/to its grid bounds. Keep single-item motion unchanged. The media container and scroll track stay stationary. Animate the first `.album-slide` (including its shadow) independently using the existing cover-derived transform origin.
2. During a cover morph at scrollLeft=0, temporarily allow track overflow visible, so a cover can move outside its resting scrollport. Dialog/layout still clip the viewport. Remove this temporary state on finish/resize/close. Do not change scroll overflow while later slides are selected. Check actual geometry before and after the handoff.
3. Neighbors reveal independently, opacity 0→1 and translateX(8px)→none over 240ms with cubic-bezier(.22,1,.36,1), 40ms delay. This ends before the cover's 320ms. No parent transform or scale. Close neighbors from their sampled opacity/transform to opacity0/translateX(8px) over 120ms, before the cover's 260ms landing; hold until dialog is closed. Reduced motion: opacity only, no delayed reveal, 120ms opening/100ms closing.
4. All album images eagerly load when this one viewer opens (maximum source album, no collection-wide prefetch). Non-cover images that are not decoded start transparent; reveal after decode via opacity only over 160ms ease. Reserve width/height, and use 100ms for reduced motion. Keep the cached cover visible on first frame. Error fallbacks must remain readable and late promises must ignore detached nodes.
5. Closing during opening samples the actual current cover and neighbor styles before cancelling. It must not restart from rest or reset origins. If viewing a later slide, retain existing whole-viewer opacity exit rather than morphing the wrong image into the cover.
6. Any album wheel/pointer/arrow navigation during opening settles the opening first, then navigates. Do not let a decorative animation block browsing. Do not settle closing in a way that flashes neighbors.
7. Close dialog before cancelling end-filled effects so opacity0 neighbors never flash on the final handoff. Resize, preference changes and Escape must remove temporary overflow and transforms and restore focus/source.

## Implementation steps

1. Add independent target/neighbor handling to detail-motion.js; remove obsolete album-controls handling. Preserve separate shadow layers.
2. Add scoped transitioning track state CSS; no animation of layout or box-shadow.
3. Add readiness fade in albumPreview and settle-before-navigation. Preserve image order, all four attachments, video reuse, and source link.
4. Validate cold and cached four-image albums at normal and reduced motion; sample first/mid/final frames, including interrupted and later-slide close. Test existing single-image/video behavior.

## Out of scope

No new animation library, redesign, source/media mutation, paid X requests, sync changes, settings or API changes. No new buttons. Existing single-item timing remains.

## Verification

Browser checks must prove: stationary gallery; cover starts at grid rect; neighbor opacity zero at first frame then intermediate; neighbor opacity zero before cover landing; no flash on cleanup; four attachments still navigate; interrupted close continuity; late image fade; same live video node/time; animated Escape/focus; reduced opacity-only; resize cleanup. Inspect full-speed as well as paused frames. Test fixtures are explicitly mocked and must not be represented as real-source checks. Production viewer should also be inspected after deployment using saved content only, without API refresh. Run build and relevant existing tests; update brief with actual results and any untested physical-device limitations.
