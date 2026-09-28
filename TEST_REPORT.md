# Capture Lab — Evidence Report

Date: September 28, 2026. Project brief: v0.3.

## Delivered

A local Python service, a Manifest V3 Chrome extension, an internal viewer, the eight exact owner-supplied URLs, and an optional separately invoked authenticated X lookup script. The library starts empty; no screenshot, post content, author, or playback result was fabricated for a supplied URL.

## What passed

| Layer | Result | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| Python backend and local HTTP | 23 checks passed | URL validation, post-ID string handling, duplicate identity, preview storage, explicit assessment, deletion, request authentication, host/origin isolation, and API probe URL construction | A working Chrome save action or a recognisable live reference |
| Extension orchestration with MOCKED Chrome APIs | 5 checks passed | Source-first persistence, offline queue logic, tab-switch protection, partial-preview status, and rejecting an X timeline | Actual browser permissions, toolbar behavior, screenshot capture or production reliability |
| Controlled renderer/UI with MOCKED fetch and simulated location | 8 checks passed | DOM extraction on synthetic website/X-shaped pages, rendering genuine fixture JPEGs, keeping real sources untested, optional assessment controls, export, escaped source markup, and delete control | Real website metadata, real X selectors/content, browser-to-server integration, genuine playback or user usability |
| Authenticated X probe | Dry run only | CLI does not call the network or read a token by default | Access, account billing, media availability, cost per save |

Logs: `evidence/unit-tests.txt`, `evidence/extension-logic-tests.txt`, `evidence/viewer-smoke.json`, `evidence/viewer-smoke-log.txt`, and `evidence/api-dry-run.txt`.

The `controlled-*` images are synthetic test fixtures, never screenshots of the user's eight references. They are labelled as controlled fixtures in the viewer. The apparent X video in a fixture is a blank test element; no motion success is implied.

## Environmental boundaries actually observed

Read-only HTTP attempts from the runtime could not resolve external hosts. Chrome displayed **“Loading of unpacked extensions is disabled by the administrator.”** A separate attempt to navigate a local test URL returned `ERR_BLOCKED_BY_ADMINISTRATOR`. No organisational policy was changed or bypassed. Extension-loading attempts stopped once the policy restriction was identified. Subsequent UI checks used locally constructed documents and mocked fetch, not browser network navigation.

## Live acceptance status

All eight owner-supplied inputs are still **not captured by this implementation**: X01–X05 and W01–W03. Their historical v0.2 access observations remain in the brief and source manifest. No paid API call was made. Actual operating cost remains unmeasured, not “zero dollars.”

Still to test on an authorised personal machine:

- Extension installation and one-action capture on an actual website; automatic preview usefulness.
- All five real X post pages: exact post identification, still preview, source access, embed rendering, and video playback, separately.
- Queue/retry and partial-failure behavior in actual Chrome, beyond mocked tests.
- Whether a native X API lookup is necessary; if used, reconcile actual charges and supported media results.
- Phone saving, cross-device use, retrieval performance, and observations from other users.

## Decision

The code is ready for a **local technical trial**, not a claim that M1 has passed. Do not proceed to the full product UI or describe saving as solved until live capture is tested. First trial: start the service, load the extension, save W01, inspect its preview, then continue with W02/W03 and X01–X05. No prepared recordings or metadata are required.
