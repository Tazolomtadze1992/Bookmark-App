# Removal and Undo — 2026-10-30

Bookmarks expose a Central Icons trash button only in their opened viewer.
Websites expose the same icon on card hover or keyboard focus; coarse pointers
keep the button visible. Both buttons have accessible names and no tooltip.

The existing owner-scoped `deleted_at` Trash system persists removal. Sonner
2.0.8 presents a six-second Undo action. Failed saves retain the card; failed
restores retain a retryable Undo action. A timestamp comparison prevents an old
Undo from restoring a more recent removal in another tab. No schema, worker,
native X bookmark, or spending changes are involved.

Verification:

- All 67 Node tests and the production cloud build passed.
- Production assets were exercised with isolated sample records and the same
  strict Content Security Policy. Sonner's official CSS is emitted externally
  rather than injected at runtime; browser errors were empty.
- Bookmark removal closes the viewer, focuses a surviving control, removes the
  card, and offers working Undo. Websites use the same persistence and Undo.
- Failed removal keeps the card and re-enables its button. Failed Undo can be
  retried successfully. Multiple removals preserve original relative order.
- Existing Undo actions remain reachable inside another open bookmark.
- Empty collection and restored states work; sample removals survive reload.
- Light/dark styling and keyboard reveal were visually inspected. The 320px
  preview had no horizontal overflow and its toast measured 288px wide.
- Existing live RLS was checked: SELECT and UPDATE restrict rows to auth.uid(),
  and UPDATE also retains its owner WITH CHECK. No policy changes were needed.

Real touch hardware and cross-tab timing were not exercised. Coarse-pointer
visibility is the default CSS state, and concurrency/timestamp behavior has
focused regression coverage.
