# Capture validation — September 28, 2026

## Current result

The existing Capture Lab is running at http://127.0.0.1:8765. **8/8 supplied sources were saved through the real Chrome extension; all eight stored previews were inspected both as saved images and at library-card size. The five primary X media items played inside their saved library cards.** All eight “Open original” actions reopened the correct sources. No redesign or new interface was built.

These are live-source observations in the owner's existing signed-in Chrome session. No mocked record was inserted into the live library. This small sample establishes the tested path, not a general reliability percentage. At the technical-test checkpoint, owner recognition was unassessed. The subsequent owner export marks all eight previews recognisable; delayed retrieval remains untested (see owner review below).

## Real capture results

| ID | Source / captured title | Saved preview | Recorded capture time | Bytes | Primary nested playback |
| --- | --- | --- | ---: | ---: | --- |
| W01 | [Daryl · Founding Designer](https://imdaryl.com/) | [Actual screenshot](../capture-evidence/W01.jpg) | 244 ms | 58,248 | Not applicable |
| W02 | [Matt Sellers — Software Designer](https://www.lfs.gd/) | [Actual screenshot](../capture-evidence/W02.jpg) | 182 ms | 65,246 | Not applicable |
| W03 | [Devouring Details](https://devouringdetails.com/home) | [Actual screenshot](../capture-evidence/W03.jpg) | 176 ms | 50,461 | Not applicable |
| X01 | [part two](https://x.com/MaelieLusson/status/2103762749759037822) | [Actual screenshot](../capture-evidence/X01.jpg) | 3538 ms | 81,871 | Observed |
| X02 | [🌱 @rive_app](https://x.com/radbar_1/status/2028566773725851899) | [Actual screenshot](../capture-evidence/X02.jpg) | 176 ms | 56,649 | Observed |
| X03 | [deep in thought](https://x.com/lewis_osb/status/2100216130694426625) | [Actual screenshot](../capture-evidence/X03.jpg) | 231 ms | 65,998 | Observed |
| X04 | [Evangelion inspired HUD x @rive_app](https://x.com/radbar_1/status/2102832558899941678) | [Actual screenshot](../capture-evidence/X04.jpg) | 548 ms | 66,461 | Observed |
| X05 | [opus 5.5, murmuration editor @LottielabHQ](https://x.com/darel023/status/2102720265394462753) | [Actual screenshot](../capture-evidence/X05.jpg) | 410 ms | 56,322 | Observed |

Timing is extension-reported capture work, not source-load time or end-to-end save latency. W01's row uses its second successful save. Website previews are visible-tab screenshots, not full-page captures or social-share images. X previews are still crops of the visible primary media area, not archived motion.

Agent visual review: the three website previews contain the corresponding page identity/layout, though fine text is small at card size and W03 has substantial viewport whitespace. X01 shows a red/white Ace card, X02 the flower/editor scene, X03 the shower illustration, X04 the orange/green HUD, and X05 the flock/editor. The tall X01 frame remains visible with side space in the library card. These observations do not substitute for the owner's recognition judgement. X02's source DOM exposed a poster image rather than a video element at capture time; real embedded playback independently established motion.

## Real embedded playback evidence

The existing “Test X embed” button was used on each saved card. Each loads the isolated localhost wrapper and the official X widget. Play was invoked, then actual media progress was read. All five assessments were saved through the existing UI and persisted after Refresh.

| ID | First → later media time | Duration | Observed state |
| --- | --- | --- | --- |
| X01 | 0.069 → 2.580 s | 2.600 s | Playing, no media error |
| X02 | 0.059 → 9.807 s | 12.033 s | Playing, no media error |
| X03 | 0.059 → 4.000 s | 4.000 s | Ended, no media error |
| X04 | 0.071 → 7.885 s | about 14.948 s | Playing, no media error; later screenshot showed 0:15/0:15 |
| X05 | 0.081 → 9.046 s | 24.441 s | Playing, no media error |

Earlier standalone-wrapper tests also observed all five primary items playing; their separate evidence remains in CAPTURE_VALIDATION_RESULTS.json. Standalone and nested results are not conflated. Full-duration completion is not asserted for every nested player. X05's quoted secondary clip offers “View video on X”; it is not counted as successful embedded playback. No media files were downloaded. X widgets contact X on demand and depend on continued source availability.

Capture records retain their original capture-time warning that motion was not yet verified. The later `playback` assessment records the subsequent test; that historical warning is not a current playback failure.

## Actual extension, retry and duplicate evidence

The user identified the installed folder as `/Users/tazo/Downloads/reference-capture-lab/extension`. Its pairing configuration was initially empty. The first real W01 toolbar action retained a queued save but delivered nothing to the healthy server. This is a genuine initial failure, not omitted from the record.

The installed background script and private local configuration were corrected with authorised filesystem access and checked against the working copy. The user manually reloaded the extension because automation policy prohibits extension management. The real “Retry pending saves” action then delivered the retained W01 capture. A subsequent normal toolbar save of W01 updated the same record to two attempts, leaving one W01 card. W02, W03 and X01–X05 then saved through individual toolbar actions. There were nine real capture invocations across eight distinct sources, plus the queue retry action. The browser-tool shortcut attempt did not yield a capture; keyboard-shortcut saving is not validated.

## Verified fixes

1. **Startup diagnostics:** a real socket-permission failure previously suggested the port might be occupied. The server now distinguishes permission denial, port-in-use and other networking errors. The edited source passed in-memory syntax compilation. The running server predates this startup-only change; it takes effect on the next start.
2. **Queue diagnostics and pairing:** errors were discarded and every queued save incorrectly suggested starting the server. Delivery now retains the actual error and an unpaired copy reports the pairing issue. The installed Downloads copy has the corrected script/configuration. Missing pairing, rejected delivery and offline retention have mocked regression coverage; live queue recovery was verified separately as above.
3. **Players lost on focus:** the first nested-player test showed that returning focus from a widget to the library rebuilt the cards and removed open players. Automatic focus refresh now skips while an embed is open; the explicit Refresh button remains available. Live retest retained the X02 player after returning to its assessment control, then retained four open players through the remaining tests. Explicit Refresh still worked and all five saved playback assessments persisted. New captures require explicit Refresh while a player is open.

## Controlled checks — separate from live evidence

- 23/23 Python backend, URL, store and local-HTTP checks passed after authorised loopback execution.
- 8/8 mocked Chrome orchestration checks passed, including the three added error/queue cases. These are not real-source successes.
- Eight historical controlled renderer tests were not rerun and are not included in this session's count.
- The focus correction was tested in the real library/widget flow above; no synthetic DOM result is being substituted for it.
- The paid X script's default no-network dry run was checked. `--execute` was never used.
- “Export test results” produced a real downloaded JSON file with eight captures and no private pairing token. The browser automation download wait timed out, but the completed file was independently inspected and copied to `capture-evidence/capture-test-results.json`.

## Permissions and operating state

Reviewed manifest permissions: `activeTab`, `scripting`, `storage`, `contextMenus`, and host access to `http://127.0.0.1/*`. Extension connections are limited to `http://127.0.0.1:8765` and data URLs. Capture is user-invoked; the extension has no persistent content scripts, cookie-reading permission, or X API credentials.

The local server binds to 127.0.0.1:8765. Authorised escalation resolved sandbox listening restrictions. Browser automation's extension-management prohibition was respected; the owner performed installation/reload. No policies were changed, no access restrictions bypassed, and no new X login was needed. Chrome automation access and the separately installed Capture Lab extension were checked as distinct capabilities.

The running server and saved data are in `outputs/reference-capture-lab`; the extension loaded by Chrome remains the paired Downloads copy. Start the workspace server when returning to this lab. Its private `.capture-data` and `extension/config.local.js` must not be included in shared archives. The working brief is mirrored inside the lab. No new distribution ZIP was made containing local secrets.

## Remaining scope and decision

**The requested desktop capture-validation pass is complete.** Retain the existing screenshot + on-demand official embed path for further validation; these results give no reason to enable paid X lookup yet. M1 remains open for owner recognition/retrieval, phone capture, broader failure/reliability sampling, browser-restart durability and measured costs. No video archival capability is claimed.

Paid X API requests: **0**. Monthly operating cost: **unknown**, not $0. Public-widget traffic is not a paid X API test. The original USD 5–15/month target has not been validated.

Evidence: `CAPTURE_VALIDATION_RESULTS.json` distinguishes standalone and nested playback; `capture-evidence/captures.json` and `capture-evidence/capture-test-results.json` contain real persisted records; W01–W03 and X01–X05 JPGs are actual extension screenshots. Earlier controlled fixture evidence remains labelled as such inside the lab and must not be presented as user-source captures.


## Subsequent owner review

The owner supplied an export at 2026-09-28 11:21:14 UTC. **All eight previews are marked recognisable: Yes; zero No; zero unassessed.** The export contains the original eight captures only. Five playback assessments remain `works_in_embed`, matching prior agent-set values; independent owner playback testing cannot be inferred. This resolves immediate owner recognisability for the sample, while new-reference saving by the owner and delayed retrieval remain untested. The original export is preserved as `capture-evidence/owner-review-2026-09-28.json`; the brief is now v0.7.


## Subsequent owner hands-on feedback

The owner reports that saving worked and felt fast, and that personally tested embedded X videos played successfully. The exact new source, number of owner playback tests and measured timings are unspecified. Website saving is positively assessed; the X-video saving workflow remains uncertain despite working playback. This supersedes the earlier pending owner-operated save check. Delayed retrieval and other outstanding scope remain untested. Brief version: v0.8.


### Prepayment checkpoint — September 28, 2026

Payment is deferred. Controlled local player checks passed for autoplay, three aspect ratios, looping, scrolling pause/resume, manual controls, simulated reduced motion and simulated autoplay rejection recovery. Missing media is now distinguished from autoplay restrictions. These use generated local clips, not real X API results. Paid X calls remain zero; real captures are unchanged. See brief v0.11 section 15 and `LOCAL_MOTION_TEST_RESULTS.json` for evidence and limitations.


### Real native playback checkpoint — September 28, 2026

Supersedes the earlier pending real-API test: one official lookup returned all five primary video links; all five played natively in Chrome without pressing Play. Console: $0.03 displayed spend, $4.97 balance, $5 cap, auto-recharge off. Rounded cost only. Real and controlled evidence remain separate; see brief v0.13 section 17 and `REAL_X_MOTION_RESULTS.json`. No automatic enrichment of new saves or video archival enabled.


Quality correction: the owner confirmed real autoplay and reported softness. The selector now uses sharper variants from the saved response; all five real posts retested successfully, four upgraded to 1080p variants and the square GIF unchanged. No additional paid lookup. See brief v0.14 section 18 and the quality follow-up in `REAL_X_MOTION_RESULTS.json`.


Real bookmark sync checkpoint: one owner-added X bookmark imported once, 2560×1440 muted native autoplay verified, and all eight baseline IDs excluded. Library count 10→11. The enabled background worker completed its first check without a duplicate. See brief v0.18 section 22 and BOOKMARK_SYNC_STATUS.json. Broader/sustained reliability is not yet established.
