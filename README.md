# Bookmark App

Private reference library: https://bookmark-app-nu-seven.vercel.app/

The website runs on Vercel; references and private JPEG previews live in Supabase. The Chrome extension saves directly to the cloud. Scheduled X checks run in Supabase, so the local Python server is no longer required for normal use. GitHub contains source code, not the collection or credentials.

## Use it

1. Sign in to the hosted library with the owner email.
2. Load the `extension` folder in Chrome, subject to your browser's policies. On upgrades, reload the existing extension rather than removing it, to preserve queued saves.
3. Reload the library and choose **Connections & Trash → Connect extension**.
4. Open a website or an individual X post and click **Reference Library**, or press Command+Shift+Y (Mac) / Ctrl+Shift+Y (other platforms). Capture occurs only when invoked. Failed deliveries stay in Chrome's queue and retry every minute while Chrome runs. Right-click the extension for manual retry.
5. New native X bookmarks are checked every 15 minutes while enabled. Old baseline IDs remain excluded, even if rebookmarked. **Connections & Trash** provides status, pause/resume, check now and reconnect.

Website saving does not need a local server or an X API call. An extension save of an X URL captures its visible preview; native X bookmark sync supplies official media automatically. Saved X details include **Refresh preview from X** for explicit media recovery within the shared allowance. Videos stream from X media URLs; full videos are not archived.

X cards preserve media proportions and muted autoplay, with sound controls only in the expanded view. Websites show a linked image and title, without a separate domain line. Hovering a website reveals a small circular Central Icons chevron beside its title, matching Interfaces’ 300ms fade/scale/2px-slide hint. Thumbnail and title positions stay fixed; keyboard focus reveals the hint instantly, and reduced motion uses a brief fade. Search matches saved text, author names, handles and links without displaying author information on cards. Combine words such as `jakub sidebar`; all words must match. Search respects the current collection and selected folders. Search starts as a circular header button with the same tooltip and surface as the theme switcher. Click to expand, or press `/` or `Cmd/Ctrl+K` to open and focus it instantly. Shortcut keycaps appear only in the tooltip. Escape clears the query, then collapses an empty field; clicking outside or tabbing away also collapses an empty field. Pointer expansion resizes only the isolated field, with its icon and content on the same timeline; the header stays fixed and reduced motion uses a brief fade. Searching does not request X data or consume X credits. There are no extra favorites, category controls, card playback buttons or card sound controls. **Move to Trash** removes a card from the library without changing X bookmarks. Restore it through **Connections & Trash → Open Trash**. Recaptures and background sync cannot restore trashed cards automatically.

## Cloud architecture

- `cloud/client.js`: owner-authenticated email sign-in, RLS reads, private previews, connection and Trash controls.
- `extension/`: active-tab capture, durable queue, exact-origin pairing bridge. The device token can capture references only; it cannot read the collection, delete cards or retrieve X credentials. Tokens are hashed in the database and revocable. Extension storage is restricted to trusted extension contexts.
- `supabase/functions/library-service/`: hosted capture, media recovery, PKCE reconnection and bounded X polling. Credentials live in Supabase Vault. Function-level JWT verification is intentionally replaced by explicit authentication: verified Supabase user for owner actions, scoped device token for capture, Vault secret for scheduler calls, and single-use PKCE state for OAuth callbacks. Missing authentication returns 401.
- `supabase/migrations/`: private storage/RLS schema, fenced worker lease, durable spending reservation, scheduler and explicit backend grants. The internal worker RPC is executable only by `service_role`; no browser or anonymous caller can use it.

The existing **$3 conservative test allowance** is retained across migration and reconnects. Requests reserve spending before contacting X; failures do not refund it. Exhaustion pauses checks. This is not an actual bill or a replacement for the separately configured provider spending cap. Limits are not automatically reset or raised. Checks are bounded to five pages and twenty new posts; missing/reordered anchors or partial responses pause without advancing the checkpoint. An interrupted token refresh requires reconnection rather than risking concurrent refreshes.

## Deployment

Install pinned packages with `npm ci`. Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel, then deploy `main`. `npm run build` publishes only `dist`; it rejects missing settings and secret-key formats. Keep Supabase Auth's Site URL set to the production library.

Deploy the versioned migrations and `library-service` Edge Function separately through Supabase. The existing project has these applied. Its environment supplies the service-role key; never put that key in Vercel's public variables, the browser or the extension. The function, scheduler and extension currently use this private installation's exact project/domain; update all three when deploying a different installation.

Folder reads request 20 IDs per page and reserve for that batch before contacting X. A reported X API limitation can return exactly 20 IDs without a continuation cursor. Such a response is marked incomplete and cannot replace the last complete assignments or mark unseen posts Unfiled. The partial scan stays separate in sync status for diagnosis; the app reports that folder updates are incomplete. Verified edit-history IDs in saved metadata match edited folder entries to the original saved card without adding duplicates.

Optional automatic folders use the existing Chrome extension while Chrome is open and signed into the linked X account. After updating/reloading the extension, choose **Set up automatic folder sync** in Connections, then enable X access in the extension's settings tab. Folder checks become due every 15 minutes and after bookmark controls are used. They run only while Chrome is in front and the computer has been idle for a minute, using a temporary visible X window. The helper closes after the check and returns to the previous Chrome window; checks pause as soon as input resumes. Optional idle detection is used locally only. Only folder names, post IDs and verified edit families are sent to this library; X cookies and sign-in credentials stay in Chrome. Native bookmark imports keep their existing schedule and allowance. Browser folder scans do not call the paid X API; setup verifies the linked account once through the existing allowance.

Each scan checks the active X account, reads every folder to its end, verifies the folder list again, and uploads one complete snapshot. Interrupted, signed-out and wrong-account scans retain previous assignments and retry. Removing assignments requires a second matching scan. If the owner interacts with the temporary window, the scan stops and leaves that window alone. Automatic folders have a separate revocable token, with no capture, media, collection-listing or X-credential access. Turn off the feature in its settings tab or Connections; **Disconnect extensions** also revokes it.

The reader uses a selected tab in its own visible window because X leaves virtualized cards unrendered in hidden pages. It waits for rendered cards to cover each scrolling step and the end of the timeline before accepting a folder. Hidden or stalled pages fail without changing assignments. The server requires this rendering check, so older readers cannot upload truncated results. Reloading the updated extension preserves its connection. If idle access has not been granted, its settings open for the owner to allow idle checks. After setup, a fresh check starts automatically when Chrome is in front and idle.

X remains a public Native App with PKCE and the read-only scopes `tweet.read users.read bookmark.read offline.access`. Its additional cloud callback is:

```text
https://tquryxcyrvgwchbxyrmk.supabase.co/functions/v1/library-service/oauth/callback
```

`Connect extension` authorizes a browser separately from email sign-in. Signing out of the website signs out that browser session; use **Disconnect extensions** to revoke capture tokens too.

## Legacy local lab and handoff

Run `npm ci` and `npm run build:navigation` before starting local development. `python3 server.py` still runs the historical loopback Capture Lab for development. It does not mirror new cloud records back to SQLite. The original local collection remains intact. After this installation's handoff, local X checks and delivery are disabled to avoid double billing and overwriting cloud changes.

`scripts/migrate_cloud_worker.py` performs the explicitly approved one-time transfer of an established exclusion baseline, spending state and read-only X credentials into the owner's existing private cloud account. Stop the local server first. This is not a general onboarding/import tool. Do not rerun it with stale credentials or reset the baseline.

`.capture-data/`, `extension/config.local.js`, environment files, exports and databases remain ignored. Never force-add them. No service or X credential belongs in source control.

## Validation

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
npm test
node --check web/app.js
```

Controlled tests do not prove extension installation, live OAuth or playback. Real-source evidence and limitations are recorded in `PROJECT_BRIEF.md`, section 27. Earlier reports are historical checkpoints. Icons are shared from `web/icons`. The original Phosphor assets retain their included license; the search, close and command SVGs were supplied by the owner from Central Icons.

Category filtering updates immediately without fading the result grid. Unchanged cards stay connected, filtered videos pause with their playback position retained, and up to 40 hidden cards are cached for quick returns. Deleted or changed references release their old media. Masonry spans are measured together before the next paint, with ResizeObserver handling later image loads and viewport changes.
