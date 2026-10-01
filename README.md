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

X cards preserve media proportions and muted autoplay, with sound controls only in the expanded view. Websites have image/title/domain cards. There are no extra favorites, category controls, card playback buttons or card sound controls. **Move to Trash** removes a card from the library without changing X bookmarks. Restore it through **Connections & Trash → Open Trash**. Recaptures and background sync cannot restore trashed cards automatically.

## Cloud architecture

- `cloud/client.js`: owner-authenticated email sign-in, RLS reads, private previews, connection and Trash controls.
- `extension/`: active-tab capture, durable queue, exact-origin pairing bridge. The device token can capture references only; it cannot read the collection, delete cards or retrieve X credentials. Tokens are hashed in the database and revocable. Extension storage is restricted to trusted extension contexts.
- `supabase/functions/library-service/`: hosted capture, media recovery, PKCE reconnection and bounded X polling. Credentials live in Supabase Vault. Function-level JWT verification is intentionally replaced by explicit authentication: verified Supabase user for owner actions, scoped device token for capture, Vault secret for scheduler calls, and single-use PKCE state for OAuth callbacks. Missing authentication returns 401.
- `supabase/migrations/`: private storage/RLS schema, fenced worker lease, durable spending reservation, scheduler and explicit backend grants. The internal worker RPC is executable only by `service_role`; no browser or anonymous caller can use it.

The existing **$3 conservative test allowance** is retained across migration and reconnects. Requests reserve spending before contacting X; failures do not refund it. Exhaustion pauses checks. This is not an actual bill or a replacement for the separately configured provider spending cap. Limits are not automatically reset or raised. Checks are bounded to five pages and twenty new posts; missing/reordered anchors or partial responses pause without advancing the checkpoint. An interrupted token refresh requires reconnection rather than risking concurrent refreshes.

## Deployment

Install pinned packages with `npm ci`. Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel, then deploy `main`. `npm run build` publishes only `dist`; it rejects missing settings and secret-key formats. Keep Supabase Auth's Site URL set to the production library.

Deploy the versioned migrations and `library-service` Edge Function separately through Supabase. The existing project has these applied. Its environment supplies the service-role key; never put that key in Vercel's public variables, the browser or the extension. The function, scheduler and extension currently use this private installation's exact project/domain; update all three when deploying a different installation.

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

Controlled tests do not prove extension installation, live OAuth or playback. Real-source evidence and limitations are recorded in `PROJECT_BRIEF.md`, section 27. Earlier reports are historical checkpoints. Icons in `web/icons` are vendored Phosphor assets with their included license.

Category filtering updates immediately without fading the result grid. Unchanged cards stay connected, filtered videos pause with their playback position retained, and up to 40 hidden cards are cached for quick returns. Deleted or changed references release their old media. Masonry spans are measured together before the next paint, with ResizeObserver handling later image loads and viewport changes.
