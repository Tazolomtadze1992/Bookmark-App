# 002 — Unify album wheel navigation, backdrop dismissal and control choreography

- **Commit:** 584ad3b
- **Severity:** HIGH (input mismatch), MEDIUM (controls)
- **Categories:** Interruptibility, cohesion, accessibility
- **Scope:** web/app.js, web/detail-motion.js, minimal web/style.css
- **Repository:** /Users/tazo/Documents/Codex/2026-09-28/https-chatgpt-com-share-6aba1cda-cd84-2/outputs/reference-capture-lab

## Recon and scoped audit
Plain JS, CSS and WAAPI, no React or motion library. albumPreview/go in web/app.js is the approved exemplar: 300ms cubic-bezier(.22,1,.36,1), 1/.75 image scale, visual-position sampling before cancellation. createDetailMotion uses 320ms cover opening and 260ms closing. This is a restrained reference browser: pointer gallery navigation is occasional; arrow keys remain instant. Escape must remain animated by explicit owner instruction.

| # | Severity | Category | Location at base commit | Evidence | Fix |
|---|---|---|---|---|---|
| 1 | HIGH | Cohesion/interruptibility | web/app.js:106–108 | wheel calls cancelNavigation then native scrolling drives pose, unlike go(index,true) at 63–77 | One gesture routes through go; no native wheel scrolling |
| 2 | HIGH | Interaction continuity | web/app.js:82,167 | empty frame clicks can navigate, and dismissal only recognizes stage/detail-media | Distinguish actual media from all empty wrappers; protect drags |
| 3 | MEDIUM | Hierarchy/timing | web/detail-motion.js:18,75,122 | footer wrapper and Close fade over 280ms in and full 260ms ease out | Animate actual controls with small directional hint, shorter coordinated fade |

Reproduced in hosted Chrome: clicking between album images leaves dialog open; vertical wheel does not navigate; a rightward scroll jumps from image 1 to image 4. Controls' exact perceived feel requires paused-frame and full-speed verification.

Eight-category coverage for scoped album and viewer controls: purpose/frequency accepted (explicit Escape exception); easing/duration accepted for existing media but controls flagged; physicality/origin accepted, current sampling retained; interruptibility wheel cancellation flagged; performance transforms/opacity retained and no per-frame layout animation added; accessibility reduced variant and 44px hit areas retained; cohesion/input parity flagged; missed opportunities none. Do not expand scope to nav or other animations.

## Targets / ordered implementation

1. In albumPreview retain approved go(index,true) unchanged as shared pointer navigation. Replace `track.addEventListener('wheel',beforeNavigate,{passive:false})` with scoped nonpassive handler for wheel. Normalize DOM_DELTA_LINE by 16 and DOM_DELTA_PAGE by track.clientWidth. Use dominant absolute deltaX/deltaY (vertical wheel also advances horizontal album). Ignore ctrlKey zoom. Prevent native wheel scroll for gallery navigation. Accumulate signed travel, threshold 24px; accept at most one step per gesture with 160ms quiet reset. Direction reversal clears latch/accumulator so reversal can retarget promptly. Momentum tail must not skip multiple images. Reset timers on cleanup. At first/last edges consume without creating no-op animations. Wheel navigation uses exactly go's 300ms curve, never cancels it on every wheel event. Leave touch swipe/native scrolling and instant arrows functional. No global wheel handler.
2. Frame clicks only navigate on actual `.media-image,.motion-video,.text-preview` descendants, not empty frame/letterbox. Replace dialog click identity whitelist with a shared media/control exclusion (`button,a,input,select,textarea,summary,.media-image,.motion-video,.text-preview`). Every remaining background area inside dialog—including gallery, track, slide/frame padding, footer and top whitespace—closes through closeDetail. Protect drag/swipe: pointerdown records position and whether it started on background; pointermove/up movement over 6px or pointercancel suppresses dismissal from the resulting click. A gesture beginning on media must not dismiss when released outside. Keep synthetic click compatibility for controlled fixture and keyboard clicks. Do not interfere with clicking neighboring media or View on X. Remove stale pointer state after click/close.
3. In createDetailMotion panels() query actual `#close-detail` and `#detail-footer .source-link`, not footer wrapper. Normal opening: each control opacity 0→1 with transform translateY(-4px)→none for Close and translateY(4px)→none for source, duration180ms, delay40ms, easing cubic-bezier(.25,.46,.45,.94). Use fill both so no initial flash. Normal close: sample current opacity+transform before stop(), animate from those to opacity0 and corresponding +/-4px in100ms, same curve, no delay. Thus controls leave before cover lands. Reduced: opacity-only100ms in/80ms out, no delay or spatial movement. Keyboard-open immediate as existing. Preserve repeated Escape and quick close during entrance. Block source/close pointer events during closing only if needed; do not delay ability to dismiss during opening. Do not animate blur, dimensions, or the footer container. Preserve dark pills' 32px sizing, Inter13/500, supplied X icon, 12/10 padding, expanded hit areas and .96 press feedback. Preserve existing media/shadow/backdrop choreography.

## Out of scope
No backend, X calls, sync/allowance changes (automatic checks remain paused), dependencies, redesign, data changes, or media open/return timing changes. Do not change existing .75 neighbor scale or cover restoration from later images.

## Verification
- Syntax, diff and cloud build; targeted existing tests as appropriate.
- Isolated generated-media browser fixture: normalized vertical/horizontal wheel, line/page modes, burst coalescing, quiet reset, reverse direction, end limits, pinch untouched; compare wheel and click animation timings/keyframes/midpoint; wheel during opening and closing; no jumping on reversal.
- Empty gallery/track/slide/frame/letterbox/top/footer clicks dismiss; media clicks remain open; neighbor click advances; link retains exact URL; drag from media or background does not accidentally close.
- Paused control frames at0/80/180/220ms enter and0/60/100ms exit. No first/final flash; actual controls animate, footer does not; quick-close samples current opacity/transform. Reduced variant stationary; Escape unchanged.
- Real hosted browser wheel + outside click on saved album after deployment, no paid X requests. Touch physical-device testing must be reported unverified if unavailable. Review full-speed and slow snapshots, not just assertions.

## Executor instructions
Implement the source fixes using animate/debug-animation, then report changed files and validation. Do not commit/push; coordinator reviews and publishes. This plan is self-contained. Read-only advisor phase is complete; implementation is delegated to an executor.
