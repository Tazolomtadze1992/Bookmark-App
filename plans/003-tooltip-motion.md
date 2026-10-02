# 003 — Make tooltip motion quiet and interruptible

- **Commit:** d03a896
- **Severity:** MEDIUM
- **Categories:** Physicality, interruptibility, cohesion
- **Repository:** /Users/tazo/Documents/Codex/2026-09-28/https-chatgpt-com-share-6aba1cda-cd84-2/outputs/reference-capture-lab
- **Scope:** ui/tooltip.jsx, minimal web/style.css; tests only if they exercise meaningful behavior

## Recon and scoped audit
React 19, Radix Tooltip 1.2.16 using shadcn composition, CSS motion; no Motion dependency. The reference library is restrained and fast. Tooltip browsing is frequent; keyboard actions are immediate. The approved behavior is a 350ms first-hover delay, followed by immediate unanimated swaps between triggers, with a 700ms warm window. All three header tooltips share one provider. These decisions must remain intact.

| # | Severity | Location at base commit | Finding | Target |
|---|---|---|---|---|
| 1 | MEDIUM | web/style.css:285–287 | First reveal uses a 150ms keyframe with 2px translation and scale(.96), visibly changing label geometry | Stable position and scale; opacity-only 125ms entrance |
| 2 | MEDIUM | web/style.css:286; ui/tooltip.jsx:11–14 | All closing states unmount instantly, cutting off the first animation and final dismissal | Final pointer exit fades for 90ms from its current opacity; handoffs and keyboard dismissal remain immediate |

Eight-category audit for the scoped tooltip only: frequency keeps first reveal only; easing is already asymmetric, use audit's ease-out-quint; physicality flags small-label scale; interruptibility flags abrupt cancellation; performance retains opacity-only compositor motion; accessibility retains immediate focus/keyboard dismissal and stationary reduced motion; cohesion adds shorter final exit while preserving instant handoff; no additive opportunities.

## Current code
ui/tooltip.jsx directly aliases Root and Provider and lets Radix own content presence. web/style.css contains:
```css
.nav-tooltip[data-state="delayed-open"]{animation:nav-tooltip-in 150ms cubic-bezier(.19,1,.22,1) both}
.nav-tooltip[data-state="instant-open"],.nav-tooltip[data-state="closed"]{animation:none}
@keyframes nav-tooltip-in{from{opacity:0;transform:translateY(var(--tooltip-offset)) scale(.96)}to{opacity:1;transform:none}}
```

## Exact targets
1. First delayed pointer entry: opacity 0→1 over **125ms**, `cubic-bezier(.23,1,.32,1)` (audit ease-out-quint). No translation, scale or blur. Anchored position and sharp text stay fixed.
2. Final pointer dismissal: opacity current→0 over **90ms** using the same curve. Retain the node long enough for the fade. Pointer events off while exiting. A quick departure during entry must continue from measured/current CSS opacity, never jump to 1.
3. Warm handoff: previous label removes immediately and next opens immediately, with **0ms** entrance and exit; never overlap two labels. Share this coordination across the React theme portal and collection controls.
4. Keyboard focus, Escape, blur and trigger activation: immediate; do not animate keyboard navigation or dismissal. Existing letter shortcuts remain intact.
5. Reduced motion: same stationary opacity-only entrance **100ms** and final exit **70ms**; handoffs/keyboard still immediate.
6. Do not restart from zero on re-entry. Prefer CSS transitions plus controlled presence using the existing Radix primitives. Keep a closing node connected until transitionend, with a bounded fallback if no event occurs (e.g. 130ms for 90ms fade). Cancel stale cleanup on reopening or handoff; an old timer must never remove a newly opened tooltip.

## Implementation guidance
Keep Radix responsible for accessibility, positioning, focus, Escape and hoverable-content grace area. Introduce the minimum shared Root/Provider presence coordination needed to distinguish final dismissal from handoff and keyboard dismissal. Use forceMount only while actively displaying/exiting, not permanently for every closed tooltip. A CSS `@starting-style` opacity transition can handle initial mount; retained nodes transition opacity on close from their current presentation. If placement readiness needs handling, verify against Radix's initial hidden/unpositioned state. Keep all public exports and current call sites compatible. Use Radix `instant-open` versus `delayed-open` to respect its warm behavior; do not replace the approved delay model with an independent timer.

The existing web/theme.js uses immediate keyboard changes and guarded cleanup; match that attention to stale cleanup. Existing tooltip surface tokens and shadcn composition are in ui/tooltip.jsx and web/style.css:283,290.

## Out of scope
No viewer, grid, navigation, theme orbit, colors, radius, padding, shortcut or spacing changes. The visible tooltip gap stays **2px** (`sideOffset=-2`). No dependencies, backend, X requests, or data changes. No bounce, stagger, shared-layout or tooltip travel animation.

## Verification
- Build and relevant existing tests pass; syntax/diff clean.
- Controlled UI-only browser preview measures initial delay around350ms and entry125ms/final90ms (reduced100/70). Inspect start/mid/end opacity frames and ensure transform stays none.
- Quick hover out during entry: no opacity jump. Re-enter during exit: no flash, no stale timer disappearance. Rapid X/W/theme handoffs: exactly one visible label, immediate transitions; empty hover <350ms shows nothing.
- Keyboard Tab/Shift+Tab and Escape: immediate visibility changes, no active tooltip animation; letter shortcuts work, typing unaffected.
- Browser screenshots/full-speed feel-check in light and dark. Scrub controlled enter/exit frames. Do not claim physical mobile gestures or a next-day fresh-eye review was performed if unavailable.

## Executor instructions
Read animate/css-techniques.md. Implement in the isolated worktree supplied by the coordinator; do not touch the primary checkout or publish. Do not use the browser concurrently with the coordinator. Run build/targeted tests and report changed files and unresolved concerns. Coordinator performs browser validation and publication. Advisor phase ends here; execution is delegated.

## Validation — complete
Implemented in 2e7e8dd. Production build and 53 existing tests passed. Controlled browser lifecycle checks passed 18/18 with normal motion and 18/18 with the reduced CSS branch emulated. Initial delay measured395ms; entry stayed stationary with125ms fade, exit90ms. Reduced entry100ms and exit70ms. Rapid handoff, keyboard focus/Escape, brief hover, interrupted entrance, and reentry cleanup verified. Vercel production bundle matches local build. No real-device or next-day review claimed.
