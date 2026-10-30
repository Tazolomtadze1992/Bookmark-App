# 004 — Make search expand as one capsule

- **Baseline commit:** fe9cc36
- **Status:** DONE
- **Severity:** MEDIUM
- **Category:** Cohesion, hierarchy & spatial consistency; physicality
- **Estimated scope:** web/style.css, web/app.js, README.md; about 35 lines

## Problem

The current implementation reveals the surface and the input through two separate right-to-left rounded masks while moving the icon 100px. Text fades on a third 140ms/ease timeline. This exposes partial glyphs and makes the control read as a wipe rather than one expanding capsule. The mask's right inset also changes from 4px to 0px, so the supposedly anchored right edge creeps outward.

Source and live computed styles were inspected. No frame-rate regression has been established; do not describe this as proven dropped frames.

During slow-frame review, pointer closing exposed a separate controller race: clicking the empty field's Close button produced data-motion=instant and a 0s transition, twice even from a settled open state. web/app.js:194 queues focusout's containment check in a microtask, which can run before the new clear-button focus settles and collapse the field before the pointer click handler. This must be fixed before approval: ignore focusout whose relatedTarget is inside searchControl; otherwise defer the activeElement check to requestAnimationFrame. Keep outside pointer dismissal animated, tab-away instantaneous, and guard against stealing focus or reopening stale state.

## Recon and audit scope

This is a focused audit of the search expansion and its entry, exit, keyboard, hover and reduced-motion variants, not a whole-app motion audit. Stack: vanilla application controller plus React 19/Radix tooltips, plain CSS transitions. Existing personality is quiet and fast. Keyboard use is frequent and already instantaneous; pointer expansion is an occasional, purposeful state morph.

| Category | Result |
| --- | --- |
| Purpose/frequency | Pointer morph communicates button-to-field continuity. Keyboard paths already use data-motion=instant; preserve. |
| Easing/duration | 220ms Vaul easing is within budget but more abrupt than needed for this compact morph. Select the course ease-out-quad curve, then 200ms enter / 150ms exit. |
| Physicality/origin | Right mask inset drifts 4px; hold the right edge and inset fixed. Preserve the 16px icon and radius. |
| Interruptibility | CSS transitions retarget, but the focusout race can cancel pointer closing into a 0s state. Fix the settled-focus check and preserve transitions. |
| Performance | Existing clip-path is not itself a demonstrated performance failure. An absolutely positioned 140×40px field with two children is within the explicit isolated-layout-property exception in review STANDARDS.md. Animate only its width; never resize the header or cards. |
| Accessibility | Preserve immediate focus, inert/aria-hidden, keyboard instant behavior, reduced-motion fade, and coarse-pointer 44px hit area. |
| Cohesion | Remove the input's clipping wipe and coordinate geometry, icon and opacity with the same curve. |
| Missed opportunities | None in scope; do not add more motion. |

## Where

Absolute repository: /Users/tazo/.codex/.chatgpt-projects/g-p-6aba7561054c8191a0c873a7d962d3b2/bookmark-app

- web/style.css:332–355: fixed-size form, separate masks and transition clocks.
- web/style.css:362–366: coarse-pointer masks and reduced-motion handling.
- web/app.js:175–194: pointer/keyboard dispatch and focus management; preserve unless a verified regression requires a minimal change.

### Current excerpts

```css
.library-search{position:absolute;...;right:0;width:var(--search-width);...}
.library-search::before{...;inset:4px 0;...;clip-path:inset(0 4px 0 calc(100% - 36px) round 999px);...}
.search-entry{...;opacity:0;clip-path:inset(0 4px 0 calc(100% - 36px) round 999px);...}
.search-control[data-open="true"] .library-search::before{clip-path:inset(0 round 999px)}
.search-control[data-motion="animated"] .search-entry{transition:clip-path 220ms cubic-bezier(.32,.72,0,1),opacity 140ms ease}
```

## Target

Use the native rounded capsule geometry of a single absolutely positioned form. Its right edge stays at right:0; visible surface stays inset 4px on every side (6px vertically/on the sides for coarse pointers). Animate this isolated form's width from var(--search-hit-size) (40/44px) to var(--search-width) (140px). Keep the parent search-control at 40/44px throughout. Do not animate width of any layout-participating parent.

Remove clip-path from the surface and entry in every state, including coarse-pointer overrides. Clip overflow at the form instead. The entry flexes naturally inside the changing field; the trailing clear button remains anchored at the right. Keep the icon's existing full transform string and displacement synchronized to the width.

```css
.library-search { width:var(--search-hit-size); overflow:clip; }
.library-search::before { inset:4px; /* native rounded surface, no clip-path */ }
.search-entry { /* existing flex layout and padding; no clip-path */ opacity:0; }
.search-control[data-open="true"] .library-search { width:var(--search-width); }
.search-control[data-open="true"] .search-entry { opacity:1; }
.search-control[data-motion="animated"] .library-search {
  transition:width 200ms cubic-bezier(.25,.46,.45,.94);
}
.search-control[data-motion="animated"] .search-toggle img {
  transition:transform 200ms cubic-bezier(.25,.46,.45,.94);
}
.search-control[data-motion="animated"] .search-entry {
  transition:opacity 200ms cubic-bezier(.25,.46,.45,.94);
}
/* Closing geometry, icon and opacity: 150ms, same curve, no delay. */
```

Why: this course curve (review STANDARDS.md Easing) has a gentler start than the sheet-like Vaul curve while still responding promptly. 200ms is in the small-control budget; 150ms exit is shorter. One small native rounded surface avoids both the text wipe and distorted scaled corner radii. No overshoot, stagger, blur or animation dependency.

For reduce, form width and icon transform must change immediately, while entry opacity fades for 100ms on pointer actions; ensure exit selector specificity does not override the reduced duration. For data-motion=instant, all transitions must remain none, including keyboard actions under reduced motion.

## Conventions

- Preserve data-open / data-motion from web/app.js; UI motion uses CSS transitions, exemplified by web/navigation-motion.js's instantaneous high-frequency filtering and the existing search controller.
- Preserve shared category surfaces, Central Icons files, 140px expanded field, 4px search/theme layout gap, 16px icon, no keycaps in the field, shared tooltip composition.
- Keep existing form semantics, clear/close labels and keyboard shortcut behavior.

## Steps

1. Create an isolated managed worktree from fe9cc36 (inspect chat artifacts first). Read this full plan and the animate CSS companion for implementation. The advisor does not edit application sources.
2. Implement only the geometry/timing changes above. Remove superseded masks and transition declarations instead of adding competing overrides.
3. Update README's search motion sentence to describe the isolated field resize; no other prose changes.
4. Build, run existing relevant checks, and provide a fixture-backed local preview with no X calls. Supply its path/URL to the advisor for browser verification.
5. Do not publish until the advisor has reviewed the diff and live preview. After approval, commit and push the exact reviewed state to the existing GitHub main branch to trigger the existing Vercel deployment; no Sites migration.

## Out of scope

- Theme animation, tooltip timing, category filters, cards, search matching, author display, icon designs and colors.
- No installs, new animation library, backend changes, X requests, or credit/budget changes.

## Verification

- Existing npm test and production build pass; no lint setup requested.
- Pointer open/close: consistent shape and fixed right edge; no reverse glyph wipe or text distortion.
- Capture multiple frames as well as settled screenshots and compare to the previous live behavior. Watch once at normal speed after inspecting the frames; don't approve purely from code.
- Rapidly reverse open/close; retarget from the current width/transform rather than restarting. Interruption with Escape remains instantaneous.
- Cmd/Ctrl+K and / open/select immediately; typing X/W/D does not switch collection or theme. First Escape clears, second collapses; focus returns to Search.
- Clear and Close work after pointer opening; blank outside click/tab-away dismisses; a nonempty active query stays visible.
- Reduced-motion: no width or icon movement interpolation, brief opacity fade on pointer actions; keyboard still immediate. If actual OS emulation is unavailable, identify the verification limit and test the forced stylesheet branch in the controlled fixture.
- At 320px, no overflow/overlap; coarse-pointer hit areas remain 44px. Restore temporary preview viewport settings.

## Notes

User asked to improve the animation, so this focused finding is selected for execution without another choice/approval question. An executor handles all source changes and publication. Visual review remains necessary; do not claim an objective next-day feel check or real touch-device test that wasn't performed.

## Execution and review outcome

Implemented the isolated 40/44→140px width transition, fixed surface inset, shared 200ms ease-out-quad timeline and 150ms exit. Removed the separate clip-path wipes. The trailing control stays anchored; reduced motion keeps geometry immediate with a 100ms content fade. Fixed the verified focusout race using the relatedTarget guard and a settled-focus check.

All 59 tests and the production build passed. The focused pointer-Close regression test fails against the previous controller and passes with this fix. Advisor review approved the source diff and controlled browser preview: coordinated geometry, stable right anchor, quick reversal, pointer closing, immediate keyboard behavior, forced reduced-motion CSS, and a 320px coarse-pointer fixture. Reduced motion was checked through the production stylesheet branch in the fixture, not an OS preference change; no real touch-device or next-day feel check was performed. Preview fixtures made no X requests.
