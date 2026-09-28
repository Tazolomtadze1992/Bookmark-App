# Bookmark App

A private reference library for saved websites and X posts. Capture runs locally on your Mac; an optional Vercel build provides email sign-in and persistent private browsing through Supabase. GitHub stores source code, not your saved collection or credentials.

## Current features

- Separate X bookmarks and Websites collections, with search.
- X masonry cards with author avatars, original-post links and muted video autoplay when a playable variant is available.
- Expanded X view with author, post text, added/posted dates, previous/next navigation and sound control. Grid cards have no playback, sound or favorite controls.
- Simple website cards with captured preview, title and domain; images link to the original site.
- User-invoked Chrome extension capture with a local retry queue.
- Optional read-only X bookmark sync that excludes the initial bookmark baseline and imports new bookmarks only.
- A separate Capture Lab at `/lab` for capture assessment, API experiments and sync settings.

Favorites and category controls were removed after user testing. The cloud library supports imported collections; automatic cloud ingestion, mobile capture and visual classification remain future work. The Python server remains loopback-only.

## Run locally

Requires Python 3.9+; no Python packages or Node dependencies are needed to run the app.

```sh
git clone https://github.com/Tazolomtadze1992/Bookmark-App.git
cd Bookmark-App
python3 server.py
```

Open http://127.0.0.1:8765/ if it does not open automatically. Keep the process running. The server binds to loopback only and generates its local data and pairing configuration on first launch. A fresh clone starts with an empty collection; your personal saves are intentionally not in Git.

To start without opening a browser:

```sh
python3 server.py --no-open
```

### Chrome extension

1. Start the server first so `extension/config.local.js` is generated.
2. In `chrome://extensions`, enable Developer mode and load this project's `extension` folder, if your browser permits unpacked extensions.
3. Pin **Reference Capture Lab**. Open a website or individual X post and click its extension action to save it. The shortcut is Command+Shift+Y on Mac or Ctrl+Shift+Y elsewhere.
4. If the server is unavailable, the extension queues the save. Once it is running, right-click the extension and choose **Retry pending saves**.

The extension captures the visible page. It does not record animation or automatically grant access to X's API. Its badge indicates capture status, not preview quality or successful video playback. Follow browser restrictions; do not bypass managed-browser policies.

### Optional X API features

Website capture and basic X source/preview capture do not need API credentials. Paid X media lookup and bookmark syncing require your own developer access and provider-side spending limit.

`python3 x_probe.py` is a dry run. `python3 x_probe.py --execute` makes a bounded, potentially billable lookup and asks for the bearer token with hidden input (or uses `X_BEARER_TOKEN`). Never put API tokens in source code or the extension.

For new-bookmark sync, open `/lab` and configure an X OAuth public Native App using the exact callback:

```text
http://127.0.0.1:8765/oauth/x/callback
```

Enter the OAuth Client ID and authorize the read-only connection on X. The app uses PKCE and `tweet.read`, `users.read`, `bookmark.read`, and `offline.access`; no client secret is needed. **Establish starting point** performs bounded paid reads to store existing IDs as exclusions without importing their posts. Wait until ready before bookmarking new references.

After validating a new save, you can enable checks every 15 minutes while the server is running. Sync pauses after a server restart or an API/checkpoint/allowance failure. The initial baseline limit is 500 IDs, and the local conservative test allowance is $3. Those estimates are not actual bills or a replacement for a provider-side cap. Do not increase limits without reviewing usage. Removing a bookmark on X does not delete its local card; baseline IDs remain excluded.

## Private local files

`.gitignore` excludes:

- `.capture-data/`: SQLite captures, previews, pairing token, X API responses, OAuth tokens and bookmark exclusion IDs.
- `extension/config.local.js`: generated extension pairing credentials.
- Environment files, local databases, logs and runtime caches.

Do not force-add these files. The source repository is not a backup of the collection. Local exports may contain private URLs and text; review them before sharing. The loopback server has pairing and origin checks, but has not received a full security review.

## Validation

Real-source testing has covered website captures, X media autoplay, and one new-bookmark import after an eight-ID exclusion baseline. These observations are separate from controlled automated tests and do not establish long-term sync reliability. The evolving decisions and limitations are in [PROJECT_BRIEF.md](PROJECT_BRIEF.md), especially sections 22–24. Earlier reports in this repository are historical checkpoints, not claims about the latest UI.

Run the offline regression checks:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
node --test tests/extension_logic.test.cjs
node --check web/app.js
```

Node is needed only for those JavaScript checks. They use mocked extension APIs and do not make paid X requests. Optional Playwright smoke scripts require additional browser tooling and are historical Capture Lab checks; they are not necessary to run the app. Extension installation and real playback must be checked in an authorized browser rather than inferred from mocked tests.

Icons in `web/icons` are vendored Phosphor assets; their license is included alongside them.

## Vercel and private cloud library

Vercel runs the static frontend build; it does not run `server.py` or store SQLite. The first import of this local-only repository produced a 404 because it had no root web entry point or configured build output.

1. Create a Supabase project. Run the versioned schema in `supabase/migrations` on a new project. It creates an owner-scoped references table and a private JPEG-preview bucket. Row Level Security must stay enabled; anonymous reads are not granted.
2. Set the Supabase Auth Site URL to the exact production Vercel URL. The current sign-in flow uses emailed magic links; default SMTP delivery is limited by Supabase, so use an allowed team email during this private trial.
3. Set Vercel **Production** configuration variables `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use a `sb_publishable_` key, never a secret or service-role key.
4. Deploy `main`. `vercel.json` runs `npm run build` and publishes only `dist`. Missing cloud configuration fails the build explicitly. Python/local credentials and saved data are never deployed.
5. Sign in. To transfer existing saves, run `python3 scripts/export_for_cloud.py` locally, then choose **Import local collection** in the signed-in cloud library and select `.capture-data/cloud-transfer.json`. The export includes reference text, source links, media URLs and JPEG previews, but no credentials, bookmark baseline IDs or assessments. It remains ignored by Git. Imports can be retried without duplicate cards.

**Current boundary:** the online collection is private and persistent, but new website captures and automatic X bookmark checks still run through the existing local extension/server. Their later saves require another import to appear online. Moving capture delivery and scheduled X sync to the cloud is a separate follow-up; the cloud frontend must not claim those are running there. No X OAuth token or API spending control has been moved to Vercel.
