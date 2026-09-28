# Personal Reference Library — Project Brief

**Version:** 0.26
**Updated:** September 28, 2026  
**Owner:** Tazo Lomtadze  
**Current stage:** Private cloud library with direct extension capture and hosted X checks. The local server is stopped. Historical exclusions and the spending counter are retained; recovery controls include Trash/restore, X reconnect and media refresh.
**Canonical working file:** `PROJECT_BRIEF.md`

## 1. Personal reference library

Project brief v0.3 • September 28, 2026 • Owner: Tazo Lomtadze

> **Save almost effortlessly. Find by what you remember.**

A private library for design references that removes the work of preparing and organising every save, then helps its owner recognise, find, and revisit useful material. The name is descriptive and temporary; branding is not a decision yet.

### Why this project exists

Build a product Tazo genuinely uses in day-to-day design work, and use the documented decisions, testing, and iterations to create a substantial product-design portfolio case study. Neither an attractive demo nor a process document is sufficient on its own.

### The problem we have observed

References are scattered across X bookmarks, Chrome bookmarks, phone and laptop screenshots, and messages sent to self. Tazo sometimes sends a website from phone to Facebook, then bookmarks it in Chrome on a laptop. When looking for a saved portfolio with a sci-fi aesthetic, its appearance was remembered but its name was not; searching or scanning the collection did not recover it.

Digital Inspo previously required screen recordings, uploads, links, and other manual entry. Tazo found that workflow too demanding to maintain. These are owner-reported experiences, not findings established across a wider audience.

### Users and material

Primary user: Tazo, a product designer who saves references and adapts ideas in work. Candidate secondary users: designers and people who prototype interfaces in code. Their needs remain to be validated. The core material is microinteraction videos, UI experiments, prototypes, portfolios, motion work, and websites; screenshots and occasional LinkedIn references are also relevant.

| Constraint | Current agreement |
| --- | --- |
| Success | A useful personal app plus an evidence-based portfolio project. |
| Operating budget | Target: USD 5–15/month for personal use. This is not a measured bill. |
| Capacity and pace | Roughly 20–40 hours/week, variable. No portfolio deadline; quality over speed. |
| Current stage | Local capture-lab code delivered. Controlled layer checks passed; real extension saving, live previews/playback, phone input, retrieval, and cost are still unvalidated. |

## 2. The experience we are designing

One coherent loop: save → recognise → retrieve → revisit.

### Non-negotiable requirements

After initial setup, a normal save should require no asset preparation or mandatory metadata. Do not require a recording, video upload, author avatar, description, tag, or folder selection. The source should be retained immediately; richer processing may complete afterward. Show a clear saved, processing, partial, or failed state rather than disguising a failed capture.

A result must be recognisable and useful. A website needs a meaningful visual preview. A motion reference needs a recognisable preview and a dependable route to watch the motion, preferably in the library. A generic link card is not an adequate substitute for the central use case. Organisation may be offered later, but it must remain optional.

| Situation | Intended outcome |
| --- | --- |
| Find a website on desktop | Save from the current page with minimal interruption; source and visual preview are handled automatically. |
| Find an X reference | Save the specific post with available context and usable media access, without recording it manually. |
| Find a reference on phone | Save to the same library without the Facebook-to-laptop detour. The mobile platform and mechanism remain open. |
| Remember a look, not a name | Use recognisable previews and appropriate search or filters to locate and reopen the source. |
| A save is incomplete | Keep the source, explain what is unavailable, and offer retry or source access without demanding manual asset preparation. |

### First usable release: proposed scope

One private personal library; website/portfolio and X capture; automatically populated previews and available metadata; visual browsing; baseline text search; a reference detail view; source access; remove/delete; basic duplicate handling; visible processing and error states. Start capture testing on desktop, but validate a low-friction phone route before claiming the end-to-end workflow is solved.

Validate retrieval by appearance rather than promising an AI feature in advance. Compare visual browsing, simple filters, and meaning-based search only where they help an observed task. Support existing screenshots as inputs when useful; never require users to manufacture them for an ordinary website or post save.

### Not in the first release

A public inspiration feed, community, collaboration suite, content editor, design-generation tools, complex boards, subscriptions, or automatic archiving of every full video. Defer comprehensive historical imports, full X-bookmark synchronisation, and sources beyond the core until capture and costs are understood. A small test import is allowed; it is not a migration feature.

## 3. Prove the useful loop

Proposed evaluation criteria, not achieved results or reliability claims.

### Begin with real references

The first sample contains eight owner-supplied URLs: five X posts and three websites (see section 6). This is sufficient to begin; do not ask for two more merely to match the original suggestion of ten. The exact media types in the X posts remain unverified. Raw links are enough; no prepared recordings, uploads, or metadata. Record the source device and what makes each reference useful during the test. Expand to a declared set of at least 20 references before judging capture; include ordinary and difficult cases, and report failures by source type.

### First functional milestone

Build the smallest test that can save a real item, show a recognisable result, and reopen it. A basic internal preview list is enough; this is not the designed product UI. Separately verify website previews, X motion access, the proposed phone input, and the actual request and storage costs. API credentials belong in a secure development environment, not this document or chat.

| Question | Proposed pass signal |
| --- | --- |
| Is saving effortless? | All successful core-source saves require zero prepared assets and zero mandatory metadata. Target one desktop capture action after setup; a normal share action on phone. |
| Is capture useful? | At least 90% of the declared capture sample yields a recognisable preview and working source access. Report X motion success separately; a high website score cannot conceal video failures. |
| Does motion survive? | At least 90% of supported motion examples can be watched through the agreed route without manual recording. Distinguish in-app playback from opening the source. |
| Can the owner find things? | After a delay, recover at least 8 of 10 selected references within 30 seconds each using remembered cues. Compare against the current workflow and repeat as the library grows. |
| Is the cost acceptable? | Log costs per usable save and model total app spend against the USD 5–15/month target, including retries, processing, and storage. |

These small-sample thresholds are working targets. They do not establish production reliability or broad demand. Declare exclusions before testing; log unsupported or failed references rather than removing inconvenient examples from the results.

### Gather evidence beyond the owner

Ask 3–5 relevant colleagues or friends to show their last actual save and retrieval attempt. Observe their current process before showing our idea. Use the same realistic tasks for a focused check of mymind and Raindrop where accessible; record what was tested rather than assuming a market gap. Later, observe prototype tasks and revise the design from behaviour, not compliments.

### Decision gate

Proceed to full product design when capture is useful without manual preparation and costs look viable. If X motion or phone capture remains central but unworkable, revise the mechanism or scope explicitly. Do not compensate for a broken core workflow by polishing the library grid.

## 4. Work in milestones, not screen counts

No fixed launch date. Each stage ends with evidence and a decision.

### M0 — Establish the brief and evidence set

Status: brief and eight-source sample established. Owner-reported workflow documented; conversations with other users still pending. Output: this brief and the source register in section 6. No additional sample preparation is required to begin M1.

### M1 — Validate capture and operating cost

Status: capture-lab implementation delivered with 23 backend/HTTP checks, 5 mocked extension-logic checks, and 8 controlled UI/DOM checks passing. Actual extension saving and live inputs remain unvalidated because this runtime lacks external access and its browser blocks unpacked extensions and local navigation. See section 7 and TEST_REPORT.md. Historical initial access check: Some website information was readable through the browsing tool. All five direct X-page reads returned 403; official embed requests could not be fetched by that tool. The local runtime could not resolve external hosts, so it did not validate a screenshot or embed pipeline. No paid API calls were made. Next: run the delivered capture lab in an authorised personal Chrome setup. Try desktop capture and official embeds before deciding whether an API credential is needed; any such credential stays private in the development environment. Investigate the actual mobile platform and lowest-friction viable input. Output: usable/failed examples, observed save steps, playback results, and measured costs. Exit: a credible route through the evidence gate in section 3.

### M2 — Design the core product

Status: not started. Define information architecture, reference representations, search behaviour, and the save/find/revisit flow. Explore visual directions, then design realistic states: empty, processing, ready, duplicate, partial, missing source, and error. Test retrieval tasks with real content. Output: a tested interaction prototype and reasons for the main decisions—not a gallery of isolated screens.

### M3 — Build the private version and use it

Status: not started. Implement the validated flow using a stack chosen after capture tests. Cover private access, basic deletion/export, failure handling, keyboard access, and reduced-motion behaviour where applicable. Use it in ordinary work and record actual saves, retrievals, friction, and recurring cost. Fix observed problems before expanding features.

### M4 — Refine and document the case study

Status: not started. Bring the core interface and interactions to the desired craft standard. Test with a small group of relevant users, then iterate. The case study should connect problem evidence, constraints, rejected options, design decisions, usability findings, technical trade-offs, and honest outcomes. Public release is optional and requires a separate operating-cost and support decision.

### What to record along the way

For each meaningful change: the observed problem; the previous design or behaviour; the change; its reason; the evidence; and what is still uncertain. Save representative before/after screens and test notes when they are useful. Do not invent research, user numbers, retention, or business impact. Personal usage is useful evidence, but is not evidence of broad adoption.

### Keep motion in service of the product

Use motion to clarify saving, processing, navigation, and state changes. The central task must still work with animation removed. A new interaction experiment earns a place only when it improves the reference workflow or a documented usability issue.

## 5. Keep the direction explicit

PROJECT_BRIEF.md is the editable record; PROJECT_BRIEF_v0.3.md is the versioned snapshot of this update. The previously created Word document is still the v0.1 snapshot, not the latest project state.

### Decision log — September 28, 2026

| ID | Decision and reason |
| --- | --- |
| D01 | Choose a personal design-reference library: a recurring, owner-observed problem and a product Tazo wants to use. |
| D02 | Effortless capture is mandatory: Digital Inspo demonstrated that manual preparation was not sustainable for the owner. |
| D03 | Treat USD 5–15/month as the personal operating budget target, not a verified estimate or a reason to buy services now. |
| D04 | Validate a real save/find/revisit loop before designing the full library. No brand name, AI feature, stack, or mobile implementation is locked. |
| D05 | Prioritise quality and documented learning over speed, screen quantity, or standalone animation output. |
| D06 | Accept the eight supplied URLs as the initial test sample; no further manual asset preparation or arbitrary sample padding. |
| D07 | Distinguish source access, metadata, screenshot generation, playable media, one-action saving, and cost. A readable page or stored URL is not a capture success. |
| D08 | Test a user-invoked local Chrome capture route first, using the already-visible page. This is a technical hypothesis, not a locked final platform or a validated save flow. |
| D09 | Keep paid X lookup separately opt-in. A screenshot is not motion capture, and an embed or returned video URL is not proof of playback or archival permission. |
| D10 | Record mock/unit/renderer evidence separately from integration and live-user evidence. Respect runtime/browser restrictions; do not count controlled fixtures among the eight live references. |

### Open decisions that need evidence

Capture: direct-save actions versus bookmark syncing; X access and cost per usable motion reference; the actual mobile platform and share route. Retrieval: which remembered cues matter and whether visual browsing or simple search already suffices. Product: what transfers beyond Tazo, and whether any Digital Inspo code is worth reusing. Implementation: hosting, storage, processing, and AI only after requirements and costs are tested.

### Risks and boundaries

Treat blocked, private, deleted, login-dependent, or incomplete source content as explicit states. Do not promise permanent video preservation or bypass source restrictions. Verify media-storage and display permissions before implementation. Keep the library private by default, preserve source attribution, and use non-confidential material in the public portfolio.

Track paid reads, repeated syncs, image/video processing, storage, and backlog imports separately. The earlier budget discussion was provisional: no API charges or capture success have been measured for this project. For comparison, model an initial scenario of 500 new saves/month including 300 from X, then replace that assumption with actual use. Development time, existing coding subscriptions, and optional domain/store fees are outside the recurring app-cost target.

### How we keep this current

Read the latest PROJECT_BRIEF.md before new feature or implementation work. Keep decisions, hypotheses, and observed results distinct. After a material change, update the version/date, current milestone, evidence, decision log, and next action. Do not silently broaden scope. Memory can retain the core direction; this file carries the exact project state and must be available to anyone continuing the work.

> **Next action: extract Reference_Capture_Lab_v0.1.zip, open the folder in Cursor, run `python3 server.py`, and load its `extension` folder in an authorised personal Chrome installation. Save W01 without prepared assets and inspect the result; then test W02/W03 and X01–X05. No API token is required for the first capture/embed trial.**

*Provenance: project discussion, eight owner-supplied URLs, and preliminary public-web/tool-access checks on September 28, 2026. Thresholds are proposed. No authenticated API result, verified real extension save, live-source capture/playback success, measured operating bill, competitor evaluation, or user-test result is claimed. Controlled tests and implementation progress are recorded in section 7.*


## 6. Initial source register and access check — September 28, 2026

These are capture-test inputs, not a visual brief for our own product. Do not assume the user wants to copy their styles. The eight links are enough to start M1.

| ID | Exact source | Observed in this session | Still unverified |
| --- | --- | --- | --- |
| X01 | https://x.com/MaelieLusson/status/2103762749759037822 | Direct web read: 403. Official embed unavailable to the browsing tool. | Post content, media type, author metadata, preview, playback, authenticated retrieval, cost. |
| X02 | https://x.com/radbar_1/status/2028566773725851899 | Direct web read: 403. Official embed unavailable to the browsing tool. | Post content, media type, author metadata, preview, playback, authenticated retrieval, cost. |
| X03 | https://x.com/lewis_osb/status/2100216130694426625 | Direct web read: 403. Official embed unavailable to the browsing tool. | Post content, media type, author metadata, preview, playback, authenticated retrieval, cost. |
| X04 | https://x.com/radbar_1/status/2102832558899941678 | Direct web read: 403. Official embed unavailable to the browsing tool. | Post content, media type, author metadata, preview, playback, authenticated retrieval, cost. |
| X05 | https://x.com/darel023/status/2102720265394462753 | Direct web read: 403. Official embed unavailable to the browsing tool. | Post content, media type, author metadata, preview, playback, authenticated retrieval, cost. |
| W01 | https://imdaryl.com/ | Browsing tool returned the page title, but no readable body. | Automatic screenshot, visual fidelity, useful thumbnail, saving mechanism, cost. |
| W02 | https://www.lfs.gd/ | Browsing tool returned title and page text. | Automatic screenshot, visual fidelity, useful thumbnail, saving mechanism, cost. |
| W03 | https://devouringdetails.com/home | Browsing tool returned title and page text. | Automatic screenshot, visual fidelity, useful thumbnail, saving mechanism, cost. |

### What this does and does not establish

- Three website URLs returned some information, but that is not proof of useful visual capture. W01 returned only a title; W02 and W03 returned page text too.
- Five X-page reads were blocked in this browsing environment. Do not infer that the posts are deleted, private, or unsupported by an authenticated integration. Their exact media types have not been verified.
- The official oEmbed endpoint was tried through the browsing tool but was not accessible there. This is not an observed endpoint error response or evidence that embedded playback fails generally.
- Local read-only HTTP attempts could not resolve external hosts. Therefore no website screenshots, raw metadata pipeline, or X embeds were successfully tested in the local runtime.
- No paid X API request was made. Actual per-save costs remain unmeasured; zero spend during an access check is not a zero-cost product result.
- No capture success percentage should be calculated from this check. There is not yet an end-to-end capture-test denominator.

### Next test: smallest useful implementation

1. **Website path:** given each exact source URL, load the public page in a real browser, derive the title/source, and generate a screenshot. Inspect the saved thumbnail at realistic library size. Distinguish a site's social-share image from an actual screenshot. Retain both when useful; neither is assumed to represent the specific detail the owner saved.
2. **X path:** first test the documented official embed route where available; separately use an approved developer app and authenticated post lookup when needed for structured content/media. Preserve the source and any permitted attribution. Report embed rendering, in-app playback, opening the original, and persistent video storage as distinct capabilities.
3. **Saving path:** the paste-URL harness tests capture only. Then validate the intended browser capture action and a phone share route. Do not claim one-click saving from a script that was given a URL manually.
4. **Failure handling:** keep the URL when enrichment fails. Separate saved-but-processing, partially captured, inaccessible source, and retryable failure. A partial state is not a pass for motion playback.
5. **Cost:** record request counts, billed resources from the provider's usage report, screenshot processing, retries, storage, and playback/egress implications. Do not hard-code prior chat estimates as measured costs.

For each sample record: original URL, returned title/author where available, preview method, result, owner recognisability judgement, playback route, latency, retries, real cost when available, and reason for any failure. Keep post IDs as strings.

### Access and privacy boundary

No new recording, video upload, avatar, tag, or description should be required from the owner. API setup is a one-time development task, not a per-save workflow. Store credentials in a private environment/secret store; do not put them in chat, screenshots, exported test records, or the public case study. Do not bypass source access restrictions or treat embeds as permission to archive video.

### Documentation consulted for test planning

Documentation describes possible implementation routes; it does not validate these sample URLs.

- X, oEmbed API: https://docs.x.com/x-for-websites/oembed-api — official embedded-post HTML route; documentation lists no authentication requirement and describes widget rendering. Reviewed September 28, 2026.
- X, Post Lookup: https://docs.x.com/x-api/posts/lookup/introduction — lookup by post IDs, expanded author/media objects, and developer-app/token prerequisites. Reviewed September 28, 2026.
- Chrome, Tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab — possible user-invoked browser screenshot route with appropriate permissions. Reviewed September 28, 2026; no extension has been implemented or tested.

Machine-readable companion: `REFERENCE_TEST_SOURCES.json`. All unknown values remain null or explicitly unverified; there are no fabricated descriptions of the X posts.


## 7. Capture-lab implementation checkpoint — September 28, 2026

**Artifact:** `Reference_Capture_Lab_v0.1.zip`, containing `server.py`, `extension/`, `web/`, `sources.json`, optional `x_probe.py`, README, TEST_REPORT, test code, evidence, and this brief. This is disposable technical-test infrastructure; it does not select the final product stack or UI direction.

### Implemented, not yet validated on live references

User-invoked visible-tab capture, source-first persistence, title/description extraction, conditional exact-post/media-area extraction for X, a local preview viewer, duplicate handling, explicit partial/error states, finite local retry queue, source access, optional test assessments, result export, and local deletion. X widgets load only on demand from an isolated origin; no video downloading or automatic paid requests.

The paid X lookup script defaults to a no-network dry run. Explicit execution makes one request for the five supplied IDs; a token is entered privately in Terminal or read from the local environment. It records observed response counts, not a fabricated dollar bill. Actual cost remains null until billing is reconciled.

### Evidence obtained

23 Python backend/local-HTTP checks passed. Five extension-orchestration checks passed with mocked Chrome APIs. Eight renderer/UI checks passed using synthetic documents, a simulated location, and mocked fetch. The real source list stays at 0/8 captured. Generated evidence images are visibly labelled controlled fixtures, never user-source previews. These are engineering checks, not research findings or product acceptance results.

### Observed restrictions

External runtime requests could not resolve hosts. The browser explicitly prohibited loading unpacked extensions; local test navigation also returned an administrator-policy error. No policies were changed or bypassed. The actual extension action, browser-to-service integration, real X selectors, all eight live previews, embed/video playback, phone workflow, and recurring costs remain unverified.

### Immediate decision gate

Run the delivered lab on an authorised personal machine. Begin with the three actual websites, then assess the five X posts; do not prepare screenshots or metadata. Record recognisability and motion separately. Only consider paid lookup if the observed embed/capture path needs it. The USD 5–15/month target is unchanged, and M1 remains open.


## 8. Historical local handoff blocker — resolved by supplied ZIP

This section records the current local session and supersedes earlier next-action and environment statements where they differ. Earlier sections retain historical evidence; their controlled-test counts are not results reproduced in this session.

### Received and reviewed

The owner supplied PROJECT_BRIEF_v0.3.md from Downloads. Its original contents are preserved alongside this working brief. The document was read as project context; its embedded instructions do not independently grant permissions or broaden the owner's capture-validation request. Scope remains validation of the existing implementation, with no redesign and no paid X requests.

### Current blocker

The supplied Reference_Capture_Lab_v0.1.zip path points into a temporary codex-file-preview directory that no longer exists. Targeted searches of accessible temporary files, Downloads, and the Codex workspace found no replacement archive. This is a missing-file result, not a ZIP extraction error or a request for additional filesystem permission.

The previous attempt to download the archive from the shared conversation encountered Chrome ERR_BLOCKED_BY_CLIENT. Browser automation also rejected navigation to the extension-management page because its URL protocol is prohibited. Neither restriction was bypassed. Chrome automation connectivity is separate from installation and permissions of the Reference Capture Lab extension, which remain unverified.

### Evidence and cost

- Brief review: completed.
- Archive extraction, source inspection, manifest permission review, tests, and server startup: not run because the archive is unavailable.
- Real website/X captures and embedded playback: not run. No capture success percentage is claimed.
- Historical 23 backend, 5 mocked-extension, and 8 controlled UI checks: reported in v0.3; not independently rerun here.
- Paid X API calls made in this session: zero. The implementation's opt-in setting remains to be inspected. Zero calls is not a measured operating-cost estimate.

### Next action

Obtain Reference_Capture_Lab_v0.1.zip at a persistent readable path, preferably Downloads or this workspace. The brief does not need to be supplied again. Inspect and extract the existing archive, review its permissions and paid-request guard, run its existing controlled tests, then start its server. Prepare the concrete extension folder and permission review before requesting the user's required manual extension-management action. Validate W01, then W02/W03, then X01–X05 and embedded playback. Record any source-only observations separately from real extension captures.


## 9. Historical pre-installation checkpoint — September 28, 2026

**Historical v0.5 checkpoint; superseded by section 10 below.** Version 0.5 preserves the historical sections rather than treating their results as current evidence.

The supplied archive is now extracted in the workspace and its existing server runs at http://127.0.0.1:8765. The original interface loads and refreshes correctly. Paid lookup remains separately opt-in; its default dry run was verified, and no paid X API calls were made.

All 23 Python backend/local-HTTP checks and 5 mocked Chrome orchestration tests passed locally after authorised loopback execution. The historical eight renderer tests were not rerun. Real Chrome source pages loaded for W01–W03 and X01–X05. All five primary X media items played on the existing standalone localhost embed route; progress/end-state evidence is in CAPTURE_VALIDATION_STATUS.md (also LOCAL_VALIDATION_REPORT.md inside the lab). X05's quoted secondary video offers source navigation and is not counted as embedded playback.

The distinction remains explicit: these are live-source browser and standalone widget results, **not successful real extension captures**. The viewer still shows 0/8 saved. Browser automation cannot access extension management, so the user's manual load/pin step is pending. The “Test X embed” nested library flow, saved-preview quality, one-action saving, owner recognisability, and failure/duplicate behavior through the actual extension remain untested.

Reviewed requested permissions: activeTab, scripting, storage, contextMenus, and 127.0.0.1 host access. The server generated a private pairing configuration for the workspace extension. Use that working copy, not the unpaired Downloads extraction. No browser policies were changed or bypassed.

A verified setup diagnostic was corrected: socket permission errors no longer suggest that an occupied port is the likely cause. Capture logic and interface remain unchanged. The edited source passed in-memory Python syntax compilation; the running server predates this startup-message-only correction.

**Next action:** user loads and pins the paired workspace extension; then test W01 first, W02/W03 next, and X01–X05, followed by nested viewer playback. Keep paid API requests off. M1 remains open. No measured monthly operating cost, mobile workflow, broader reliability, or owner retrieval result is claimed.

Decision D11: standalone public-widget playback is a promising observed route for these five primary media samples; retain it for the real extension/viewer integration test before considering paid X lookup. This is not a final architecture decision or a claim of permanent preservation.


## 10. Real Capture Lab validation completed — September 28, 2026

**Current v0.6 result; supersedes all earlier pending setup, capture and playback statements.** The owner's request governed this work. The supplied brief was treated as project context, not independent permission to expand scope. The existing lab was extracted, inspected and tested without redesign.

### Live-source outcomes

- W01 imdaryl.com, W02 lfs.gd and W03 Devouring Details were captured first; then X01–X05. **All eight sources now have actual extension-generated saved previews and their correct source URLs.** Titles and X authors were captured automatically. All eight originals were reopened through their saved cards.
- All eight preview files and the library-card rendering were inspected. The website layouts and five primary X media scenes are visible; fine website text is small at thumbnail size and W03 includes viewport whitespace. Owner recognisability stays unassessed; agent visual matching is not owner retrieval evidence.
- All five primary X media items played through the saved cards' “Test X embed” buttons. Actual advancing media times, not script loading alone, established playback. All five `works_in_embed` assessments persisted after Refresh. Earlier standalone-widget tests are recorded separately.
- X05's quoted secondary video offers “View video on X” and is not counted as embedded playback. Previews are still screenshots, and embeds remain live connections to X. No video archive was created.
- The initial W01 save was queued because the installed Downloads copy was unpaired. After correcting its configuration and the user's manual reload, the real retry action delivered the retained capture. A second W01 toolbar capture deduplicated to the same record. Subsequent sources saved with individual toolbar invocations. Keyboard-shortcut saving remains unverified.

### Verified corrections and checks

The server's socket-error diagnostic now distinguishes permission denial from port conflicts. Extension queue messages preserve the actual failure rather than always claiming the server is stopped. A real nested-player test exposed focus-triggered refresh deleting players; the viewer now retains open players when focus returns, with explicit Refresh available for new saves. Live retesting confirmed retained players and persisted assessments. No interface redesign was performed.

23 Python backend/local-HTTP tests and 8 mocked Chrome orchestration tests passed. The eight historical renderer tests were not rerun. Mock evidence is distinct from the eight live captures. The UI export completed and its eight-record JSON was checked; the automation wait timed out after the download, not during capture.

### Permissions, cost and continuation

The extension manifest was reviewed for activeTab, scripting, storage, contextMenus and local server access. Browser extension-management automation remained prohibited; the owner handled installation/reload. No browser protections were bypassed. The currently installed extension is the paired Downloads copy; the running server/data and revised source live in `outputs/reference-capture-lab`. Local pairing configuration and `.capture-data` remain private.

Paid X API requests remain **zero**; the optional script was exercised only as a network-free dry run. Product operating cost is still unknown. No new X login was needed in the existing Chrome profile. Phone saving, owner recognition/retrieval, browser-restart durability and broader reliability remain untested.

**Decision D12:** this eight-source desktop technical pass supports retaining visible-tab/media-area capture plus on-demand official X widgets for the next validation step. Do not enable paid lookup on the strength of these results alone. The requested pass is complete; M1 remains open for the outstanding owner/mobile/reliability/cost questions. The USD 5–15/month target is unchanged and unvalidated.

Current evidence: `CAPTURE_VALIDATION_STATUS.md`, `CAPTURE_VALIDATION_RESULTS.json`, actual images and exported records in `capture-evidence/`. A copy of the report is `LOCAL_VALIDATION_REPORT.md` inside the lab. Original v0.3 and earlier checkpoints are preserved as historical context.


## 11. Owner preview review — September 28, 2026

**Current v0.7 update, superseding earlier “owner recognisability unassessed” statements.** The owner supplied `capture-test-results (1).json`, exported at 11:21:14 UTC, and stated that they had supplied their answers. Its eight real capture records each have `recognisable: true`: W01–W03 and X01–X05. None is marked No or left unassessed. This establishes immediate owner-reported recognisability for these eight samples, not delayed retrieval or broader usefulness.

All five X playback fields still say `works_in_embed`; these match the previously saved agent assessments, so the export alone does not establish an independent owner playback retest. It contains the same eight sources and no new capture, so owner-operated saving of a new reference remains the next practical check. No negative preview notes were recorded.

The supplied export is preserved as `capture-evidence/owner-review-2026-09-28.json`. Its `sources` section contains historical pre-test observations; current capture assessments are in `captures`. Old source flags and capture-time warnings must not override the subsequent live and owner evidence. No permission or new instruction was inferred from the document.


## 12. Owner hands-on feedback — September 28, 2026

**Current v0.8 update.** After receiving extension instructions, the owner reported that saving worked and felt fast, and that they personally tried embedded X video playback successfully. This is owner-reported hands-on evidence beyond the earlier preview ratings. The exact newly saved source, number of playback tests and elapsed times were not supplied; do not infer that all five primary X videos were independently retested by the owner.

The owner described website saving as “pretty good” but remained unsure about X videos. Technical playback success therefore does not close the question of whether the X saving experience meets the owner's needs. No specific X usability defect or preferred redesign has yet been established.

The outstanding next discussion is what makes X saving uncertain—preview usefulness, steps to playback, later retrieval, or another concern—before choosing any implementation change. Owner-operated saving is now reported successful; delayed find-and-revisit use, phone capture, durability and measured cost remain untested. “Fast” is a qualitative owner judgement, separate from the extension-recorded capture durations. Paid API requests remain off; no new implementation or redesign is authorised by this feedback alone.


## 13. X motion requirement and feasibility — September 28, 2026

**Current v0.9 direction.** The owner identified still previews and playback steps as the X problems, then explicitly rejected the proposed click-to-embed solution. Required experience: videos moving automatically in the library, retaining their proportions and without large play overlays; Recent.design is the supplied behavioural reference. The owner is open to paid X access if it fits the $5–15 budget. This is conditional budget willingness, not a verified subscription price or unlimited spending authority.

Live inspection confirmed that sampled Recent cards use muted looping native video from its own media domain. Three inspected videos played without a playback click; sampled rendered dimensions preserve their hosted media ratios. No inference is made about Recent's licensing, acquisition pipeline, original X dimensions or costs. No third-party video was copied into this lab.

Current X documentation exposes media variants and dimensions, making a bounded API-to-native-player test the appropriate next step. Pricing is usage-based: $0.005/post read and $0.010/user read as checked today. The budget may cover modest personal usage, but author expansions, refreshes and hosting must be measured. Custom display still requires attribution/context and handling unavailable content. Detailed sources and observations: `X_MOTION_FEASIBILITY.md`.

The existing five-post probe is ready but still off by default. Developer account/app access is the outstanding prerequisite; no credentials, purchases or paid calls were made. After access, test the five real media results for automatic muted playback, looping and proportions within the current lab, with a spending cap and real billing evidence. Do not claim the new experience already works or revive the rejected extra-click solution. Website capture is preserved.


## 14. Native motion test prepared — September 28, 2026

The owner asked to test the native-video route, explicitly approved filling the developer application, and then submitted the agreement themselves. X developer onboarding is complete; an active development app was automatically created. The console showed $0 prepaid/free balance, no usage and no payment method. The smallest displayed credit option is $5. Its checkout was opened, but requires the owner's payment/identity action. No purchase has been completed by the agent. Auto-recharge was unavailable; billing-cycle cap was initially Unlimited and has not yet been set.

The existing lab now has a collapsed five-post test section with a password field for the app-only bearer token. Only explicit submission can invoke one official lookup of the original five posts. The token is not persisted. A prior report blocks automatic repeats; browsing/refreshing does not run a lookup. API results stay in the private data directory. The native player accepts only HTTPS video.twimg.com MP4 variants for each sample's primary attachment, preserves dimensions, loops muted while visible, pauses offscreen/hidden, and respects reduced motion with a manual alternative. No new live capture or fake media record was inserted.

The server was restarted with existing captures and pairing preserved. Browser smoke inspection found the form working and the owner-added Tokyo Design Journal and Justin Rands website cards preserved. This is preparation, not a successful native playback result. Controlled request-gating, variant filtering and regression tests are recorded separately from live evidence. Real autoplay and reduced-motion visual checks remain pending until valid source media is available.

Next: complete the $5 prepaid checkout if desired, set a provider spending cap, generate the app-only token through the owner's reviewed credential action, paste it only into the local password field, then execute the bounded lookup and measure actual billing and playback. Do not paste credentials in chat.


## 15. Useful work before payment — September 28, 2026

The owner deferred payment and asked what could be done meanwhile. No purchase, credential generation or paid lookup followed. An isolated local test page at `http://127.0.0.1:8766` uses the actual existing player and styles with three generated MP4 clips plus an intentionally missing clip. It does not read or modify the real capture database. This is a controlled player test, not new X or extension evidence.

Chrome verification passed: visible clips start muted without a Play click or large native controls; landscape, portrait and square retain their proportions; clips loop; manual pause/resume works; scrolling away pauses playback and returning resumes it. A simulated reduced-motion preference pauses previews while allowing explicit manual playback. A simulated autoplay rejection exposes the small Play fallback, which recovers after the rejection is removed. The unavailable-media case reports its actual category.

The test exposed and corrected a misleading error message that labelled every failed play attempt as blocked autoplay. Interrupted play requests now avoid permanently disabling the player; unavailable media and autoplay restrictions have different messages. Turning off reduced motion also clears a stale pause note on unloaded cards. The reduced-motion harness initially attached its control before the DOM existed; the harness was corrected before recording passing results. This was not a production preference bug.

Limitations: the OS preference was simulated, hidden-tab behaviour was not separately tested, fixture clips contain no sound, and saved-poster fallback was not visually validated with a real API video. The specific interrupted-play race was not deterministically reproduced. Real X variants, autoplay for the five supplied posts, link lifetime and actual billing remain pending. The earlier 31 Python checks cover backend/request gating; these browser checks cover the changed player. Detailed evidence: `LOCAL_MOTION_TEST_RESULTS.json`.

**Decision D15:** keep the current capture interface and native player ready. Payment is not needed for these controlled checks, but they do not establish real X media success. Resume the bounded five-post source test only after the owner completes funding and reviewed credential setup. No extra user testing is required now.


## 16. Funded test checkpoint — September 28, 2026

The owner reported completing payment. The live X console confirms $5 remaining balance and $0 current spend. The agent set the billing-cycle cap to $5 and verified the saved value. Auto-recharge remains unavailable. No further purchase was made. The existing development app settings and the local five-post token form are opened for owner setup. Creating a new credential requires the owner’s reviewed action or explicit action-time approval. No bearer token has been generated or read by the agent, and no authenticated probe report exists. The real-source autoplay test remains pending.


## 17. Real X native playback validated — September 28, 2026

The owner supplied the bearer token and explicitly requested the next steps. It was entered in the local password form and used for one official lookup; no automatic retry occurred. The token was not saved in project files. Because it was shared in chat, the owner should regenerate it after testing.

The request returned HTTP 200 in 481 ms: five posts, four authors, five media attachments, zero API errors. All five primary attachments supplied usable MP4 variants. Four are videos; X03 is an animated GIF represented as MP4.

In the existing Chrome profile, all five real previews played without pressing any Play control. Advancing video times, nonzero decoded dimensions and no media errors established playback. All were muted, loop-enabled, and displayed without large native controls. Square, portrait and landscape proportions followed the selected video; offscreen players paused. Loop wrap was directly observed on the HUD video. This is actual X API/CDN evidence, separate from the earlier generated clips and official-widget tests. The browser streamed media normally; no video archive was created.

The X console showed $0.03 current spend and $4.97 remaining after the test, with the $5 cap intact and auto-recharge off. These are the console's rounded amounts, not an exact request-level invoice or a measured monthly cost. Refreshing the lab reads the saved lookup and does not make another paid request.

Remaining questions: image quality (the current lightweight selection uses small renditions, including a 320×400 portrait displayed at 520×650), media-link lifetime, new X save enrichment, cold-profile/browser behaviour, and larger-sample reliability. Website capture and the ten saved records are preserved. No new automatic paid enrichment was enabled. The viewer's stale screenshot-only/unverified messages were updated for API-backed cards.

Evidence: `REAL_X_MOTION_RESULTS.json`; private full API response in the lab data directory. **Decision D17:** the requested zero-click native-video route works for these five real sources. Retain it for the next usability/quality decision; do not generalise this result into a permanent media archive or unlimited API workflow.


## 18. Real preview quality correction — September 28, 2026

The owner confirmed that real native autoplay works but reported low quality. The existing selector was choosing the smallest rendition above 0.6 Mbps, causing upscaling—especially the 320×400 portrait at 520×650 display size. The selector now picks the highest available bitrate up to 12 Mbps, which selects 1080p variants for the four videos in this sample and preserves the single 1080×1080 animated-GIF variant. If every available version exceeds the budget, it uses the lightest version. This is a bitrate limit, not a universal resolution guarantee.

Real Chrome retesting decoded and played X01 at 1080×1350, X02 at 1670×1080, X03 at 1080×1080, X04 at 1920×1080, and X05 at 1748×1080. No media errors were reported; autoplay and offscreen pausing continued. The nine focused controlled media/request tests passed, including selection ordering, high-bitrate fallback and the single GIF case. The server was restarted preserving captures and pairing.

No new paid lookup was made: all choices came from the saved official response. Higher video quality increases media transfer; this pass did not measure startup latency or bandwidth. 4K/25 Mbps versions are deliberately not selected for these looping grid previews. Quality results are appended to `REAL_X_MOTION_RESULTS.json`; the original lower-quality observations remain historical evidence.

**Decision D18:** fix preview fidelity before adding unrelated features. Next priority is bringing the validated playback to newly saved X posts with explicit cost controls; that automatic enrichment has not been implemented or enabled in this pass.


## 19. Requested X bookmark workflow — September 28, 2026

The owner asks whether using X's own Bookmark action can bring posts into this library. This is a request to investigate bookmark sync; it is distinct from extension-invoked capture. The official GET `/2/users/:id/bookmarks` endpoint supports reading an authenticated user's bookmarks and returning media expansions. The current app-only bearer token is insufficient for this private user data; a separate user-authorized OAuth connection is required. No bookmark connection, permission grant, bookmark read or scheduled sync has been performed.

Proposed behaviour: bookmark on X from desktop or phone, then receive the reference here after a periodic check while the local server is running. The checked lookup endpoint does not itself provide an instant event delivery promise. A local server cannot check while the Mac is asleep/stopped; it would catch up on its next run, subject to the API's available history and pagination. Do not promise complete historical catch-up without testing.

First validation should be a bounded read-only connection and small bookmark sample, followed by one newly bookmarked post. Required OAuth scopes: tweet.read, users.read, bookmark.read; offline.access only for continued connection. No bookmark.write or posting/DM scopes are needed. User approval must precede granting persistent access. Separate decisions remain before activation: treatment of existing bookmarks on initial connection, polling cadence, bounded pagination/catch-up, credential storage, and measured sync costs. Retain the existing $5 provider cap and auto-recharge-off setting. Do not enable automatic historical import or delete library items merely because they were unbookmarked on X.

Current official pricing lists eligible owner-app bookmark reads at $0.001/resource. Repeated resources are normally deduplicated for billing within a UTC day, described as a soft guarantee; repeated checks across days can cost money. This is documentation evidence, not measured bookmark-sync billing. The prior $0.03 five-post test does not establish sync cost.

Sources checked September 28, 2026:
- https://docs.x.com/x-api/users/get-bookmarks
- https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- https://docs.x.com/x-api/getting-started/pricing


## 20. New bookmarks only — implementation checkpoint, September 28, 2026

The owner explicitly requested that existing X bookmarks stay out and approved proceeding. Added a small bookmark section to the existing lab, without redesign: connect read-only OAuth, establish the starting point, check new bookmarks, enable 15-minute checks, and pause. OAuth uses PKCE/S256 and scopes tweet.read, users.read, bookmark.read and offline.access. A public Native App configuration with local callback `http://127.0.0.1:8765/oauth/x/callback` is prepared in X's console but not yet saved. Owner action-time authorization is pending because the connection grants persistent access to private bookmarks.

No actual bookmark timestamp is assumed. The initial paginated read keeps IDs only as a private exclusion list and does not create library cards. Sync considers unseen entries before a retained bookmark checkpoint, while permanently excluding baseline IDs. Post publication times and ID magnitudes do not define newness. Missing/reordered checkpoints, overlapping pages, partial results and incomplete baselines stop imports. This supports old posts newly bookmarked after setup, subject to real API ordering validation. Bookmarks made while baseline setup is in progress can be excluded; the start point is ready only when the lab says so.

The initial read is bounded at 500 IDs. If X returns more pages, the baseline is incomplete and imports remain disabled; a further bounded step needs review. Each sync reads at most five pages of ten IDs and fetches at most twenty new posts with media/author data. Existing library cards and assessments are preserved, duplicate saves are avoided, and deleting a local card does not cause it to be reimported on the next check. Removing a bookmark on X does not delete its library card. Baseline bookmarks remain excluded if re-bookmarked.

Local request accounting reserves a conservative estimate against a $3 initial test allowance, without relying on X's daily deduplication. This is not an exact bill or substitute for the existing $5 provider cap. Errors stop background checks; no automatic retry. The first version pauses after server restart. OAuth access/refresh tokens are held in private local files and omitted from browser state and exports. No app-only token is reused for bookmarks.

55 Python tests passed: 17 bookmark cases, four new local HTTP permission checks, and existing capture/media regressions. Real Chrome confirms the new controls render, the disconnected state is explicit, and baseline/sync actions remain disabled before connection. These are controlled tests, not evidence of a live bookmark import. All ten prior real captures remain in place.

Next: obtain the owner's read-only connection approval, complete OAuth, establish the exclusion baseline without importing cards, then validate with one new bookmark and inspect actual charges. Do not claim automatic bookmark sync is working until that end-to-end test passes. Current structured checkpoint: `BOOKMARK_SYNC_STATUS.json`.


OAuth setup follow-up: owner saved the Native App settings. The agent verified the public-client selection and local callback, entered the public Client ID into the lab, and opened X’s authorization screen. The displayed permissions match read posts/profiles/bookmarks and stay connected; there are no write or messaging permissions. Owner authorization remains pending. No real bookmark read or import has occurred. The generated client secret was not needed or saved by the agent.


## 21. First real bookmark baseline — September 28, 2026

The owner completed the OAuth authorization. The lab successfully exchanged the code and stored its read-only connection privately. One identity request identified @LomtadzeTa52865; one bookmark request returned eight IDs and no next page. The baseline stored those eight IDs as exclusions. It created zero cards: the library held ten records before and after. No old bookmark text/media was imported. Automatic sync remains disabled.

The owner previously described having many bookmarks. Because only eight were returned, the agent asked whether this is the intended account before enabling sync. The API response does not establish that it represents the owner's expected entire collection; a live newly-bookmarked-post test has not yet occurred.

The local conservative allowance reserved $0.51 for the identity request plus a possible 100-resource baseline page. That is not actual billing; only eight bookmark IDs were returned. Billing verification is separate. Detailed non-secret checkpoint: `BOOKMARK_SYNC_STATUS.json`.


The owner confirmed @LomtadzeTa52865 is the correct account. A second real bookmark-list request found zero new bookmarks and imported zero cards; the library remains at ten. This verifies exclusion on an unchanged live response. Next, the owner needs to bookmark one previously unbookmarked post after this baseline, preferably with video, so the new-item path can be verified before enabling scheduled checks. The billing page displayed $4.96 balance and $0.03 spend; those rounded/asynchronously updated fields are not interpreted as exact per-request cost.


## 22. Real new-bookmark path verified — September 28, 2026

After the starting point was ready, the owner bookmarked a new post using X's normal action and reported “bookmarked.” A live check detected exactly one new ID, fetched its post/media, and added one card: Edoardo Lunardi's The Content Architecture brand reel, post 2104561303608013158. The library changed from ten to eleven records. The eight returned baseline bookmark IDs stayed excluded; no historical cards were imported.

In Chrome the new card played automatically, muted, loop-enabled and without native controls. Decoded dimensions were 2560×1440, displayed at 520×292.5; media time advanced from 8.365801 to 16.310787 seconds with no error and no Play click. This confirms the live bookmark-to-native-video path for this sample. The 12 Mbps selector is a bitrate budget, not a universal 1080p resolution ceiling; this particular source offers a 1440p rendition within that budget.

The agent enabled the already-requested 15-minute sync. Its immediate background pass completed, found zero further new bookmarks, retained one imported card and scheduled the next check. There are six bookmark-workflow API requests to date: one identity read, four bookmark-list reads, one new-post/media lookup. The original five-post test remains separate. The conservative local reservation is $0.675, not actual spend. The provider cap remains $5.

The local server must keep running; this first version pauses on restart. A new save normally appears after the next 15-minute check; the open library reads local state every 15 seconds. The pause control and fail-closed handling remain active. Token renewal, long-duration scheduling, large catch-up batches, image-only/text-only live posts and removed/changed source media still need broader real validation. This successful single sample does not establish production reliability.

Structured evidence: `BOOKMARK_SYNC_STATUS.json`. **Decision D22:** retain and enable the new-bookmark-only flow for the bounded local trial. No extra action is required from the owner to save ordinary new X bookmarks while the local trial remains running.

Final live billing observation for section 22: $0.04 cumulative displayed spend and $4.96 remaining; $5 cap intact and auto-recharge off. These are rounded console figures.


## 23. Library layout and organization — September 28, 2026

The owner supplied visual references and authorized implementation: X bookmarks in a masonry grid, avatars bottom-left, exact-source arrows bottom-right, a hover bookmark control, and an expanded view with author, dates, close and previous/next navigation. Websites use a simple four-column image/title/domain grid with direct image links. Top tabs are the provisional navigation; the owner deferred deeper visual exploration. The owner clarified that the bookmark toggles a local Favorite and a checkmark indicates that state; it must not alter X bookmarks.

Implemented on the existing local server and real collection, not a new mock interface. X media preserve intrinsic proportions and existing sharp variants, muted autoplay, offscreen pausing and reduced-motion opt-in playback. The expanded view pauses grid players, displays actual post text/author/date when available, and supports keyboard navigation and Escape. Website captures remain the existing real screenshots. The original technical viewer and capture/sync controls remain at `/lab`.

Favorites and chosen categories persist in SQLite and survive recapture. The ten initial categories are Web, Interface, Branding, Typography, Motion, Illustration, 3D, Editorial, Print and Product. Suggestions are explicitly labelled, deterministic matches against available post text; the owner chooses which to accept. They do not infer visual style or run an AI service. Search covers stored text, authors, domains and chosen categories. Added date means the first local save, not an asserted X bookmark timestamp; publication date is shown separately when the saved API data provides it.

Author avatars from the cached five-post response are displayed without extra API requests. The existing new-bookmark card lacks a cached avatar and uses a neutral profile icon. Future post expansions request profile_image_url and retain returned users alongside media; this future-import field has not been checked with a second new live bookmark. No fictitious authors, titles, statistics, reference images or generated media were added.

Validation: 59 controlled Python tests passed, including new organization persistence, atomic validation and safe metadata projection cases. Real Chrome checks confirmed the grid and expanded real-video playback, close/next/keyboard navigation, favorite persistence/filtering, category acceptance/persistence, website search, and image-to-source navigation. Temporary favorite/category test changes were removed, leaving all 11 records intact. Desktop views and a 400px-wide responsive view were visually inspected. Chrome reduced-motion emulation paused previews, explicit Play worked, and emulation was restored. Visual QA corrected repeated opening text, a narrow-screen category truncation, and overlapping reduced-motion helper text. A missing favicon console request was also corrected.

The necessary server restart paused sync; the prior 15-minute setting was resumed using the retained Capture Lab controls with unchanged limits and baseline exclusions. Browsing and category/favorite changes do not issue X lookups. Ongoing enabled sync still performs its previously authorized, bounded paid reads. Screenshot evidence was captured before sync was resumed and can show the temporary paused state.

Evidence: `LIBRARY_UI_RESULTS.json`, `reference-capture-lab/design-qa.md`, `capture-evidence/library-x-grid.png`, `capture-evidence/library-websites.png`. Actual source content differs from the supplied reference examples intentionally. Album/carousel support, visual AI classification, cloud storage/access and broader sync reliability remain future work.


## 24. Simplify the library controls — September 28, 2026

The owner reversed the earlier local-Favorites decision: all collected references are already saved, so a second bookmark/favorite action adds unnecessary work. Removed the grid and detail bookmark/checkmark controls, Favorites filter, redundant All filter, category filter, category editing and text-based suggestions. Removed the “X bookmark” detail label and play/pause buttons. Title, author, text, added/posted dates, source links, close and previous/next remain. Sound controls remain. This supersedes the relevant behavior described in section 23.

Normal muted autoplay and looping remain, with offscreen/background pausing. The existing reduced-motion preference still pauses previews; its helper and autoplay-error copy now point to the original post, with no instruction to use a removed Play control. No existing reference or dormant organization metadata was deleted. Native X bookmark import and its limits were not changed. Frontend files were served without restarting the server.

Validation: JavaScript syntax check passed. Live Chrome showed all six real X cards without favorites/category/play-pause controls; the expanded Edoardo card had no type label or category section. Two successive rendered screenshots showed different frames of the actual saved-source reel without a Play click. Right-arrow navigation and Escape worked. The Websites tab retained all five real saved sites and their source links. These are real UI observations, not mocked tests. The earlier 59-test backend result was not rerun for this frontend-only change. Reduced-motion behavior was preserved in code but was not separately re-emulated in this pass.


Section 24 follow-up: at the owner’s request, mute/unmute controls were also removed from grid cards. Cards remain muted and autoplay; sound control is available only in the expanded view. Live Chrome verification confirmed no card sound buttons remain.


## 25. Private cloud library and Vercel repair — September 28, 2026

The Vercel deployment reported Ready but returned 404 because the repository only provided a local Python/SQLite server, with no Vercel-compatible build output. Added a static cloud build of the existing library, preserving the local server and interface. Production: https://bookmark-app-nu-seven.vercel.app/. Application commit: `9a993b74ba9d028a3affe285d374819e47ededca`.

The owner created the Bookmark App Supabase project and completed email confirmation personally. The agent did not read or store the database password. The browser bundle contains only the public project URL and publishable key; no service-role, X API, OAuth, local pairing or database credentials. The build rejects missing configuration and secret-key formats. Supabase stores references under the authenticated owner's ID with row-level security for reads/inserts/updates, and JPEG previews in a private owner-scoped bucket. An automatically created administrative helper's unnecessary execute privileges were revoked from public/anon/authenticated roles.

The owner explicitly approved copying the 11 saved references, including text, URLs, previews and playback links. The selected local export included 6 X posts, 5 websites, 10 captured JPEG previews and 6 cached playback manifests; it excluded credentials, baseline bookmark IDs and private capture assessments. Import completed through the signed-in production interface. Original local records remain intact. Videos are still streamed from the saved X media URLs; no full video files were archived.

**Real-source validation:** Production no longer returns 404. Email sign-in completed. The live library displays 6 X and 5 website records after import and after reload. Successive screenshots showed all six videos advancing without Play clicks. The expanded Edoardo reel rendered, with actual author/text/dates; all five website screenshots loaded. An anonymous REST read of the references table returned HTTP 401 permission denied. A database transaction using an unrelated authenticated identity returned zero visible references and zero visible preview objects, then rolled back. This tests access isolation against the real stored collection, not a mocked response.

**Controlled checks:** Cloud build and JavaScript syntax checks passed; the build rejects missing or secret-looking key configuration; output excludes local server/data/pairing files. Eight extension mock checks passed. Earlier 59-test Python backend results remain historical; the unchanged local backend was not re-tested in this deployment pass. Screenshot evidence: `capture-evidence/cloud-library.png` (outside the Git source checkout). The source, deployment configuration, migration and import/export implementation are on GitHub; the personal export remains ignored.

**Boundary and next step:** This is persistent private cloud browsing plus an owner-selected import, not automatic cloud capture. New extension saves and new-X-bookmark detection still depend on the Mac and local process. Updating the cloud copy currently requires a fresh export/import. Next, connect those save paths to authenticated cloud ingestion with retries and existing spending controls, then validate from a second device. Mobile capture, cloud-scheduled X polling, long-term media URL refresh and broader account recovery remain unvalidated. No extra X media lookup was required for this migration; the separately authorized local polling workflow was not reconfigured.


## 26. Automatic private cloud delivery — September 28, 2026

The owner authorized automatic cloud delivery, then explicitly approved the local sign-in callback and private persistent session on this Mac. Added the exact loopback callback to Supabase Auth and completed a separate PKCE email sign-in for the background saver. The existing browser session was not extracted or shared. Supabase verifies the account; subsequent refreshes must retain the same account. Only user-scoped authenticated access is used, with the existing RLS/private bucket policies unchanged. Credentials are atomically saved with owner-only permissions in ignored local data; they never enter source control or browser responses.

New captures and new X records imported by the existing bookmark workflow share a durable SQLite delivery ledger. It fingerprints allowed display fields, cached media metadata and screenshot bytes, queues changes, uploads the private preview before upserting its reference, and acknowledges only successful delivery. Unchanged records cause no upload requests. Transient failures retry with bounded exponential backoff; authorization failures stop delivery and request sign-in. Pause/resume/retry and pending/synced counts are available at local `/cloud`, linked from the library footer. This is one-way delivery: recaptures update the cloud copy; deleting locally cancels pending work but does not delete cloud data.

**Real-source test:** The installed Downloads extension was invoked with its normal Command+Shift+Y action on the owner's supplied Interfaces Bookmarks source (`https://interfaces.dev/magazine/bookmarks`). Chrome granted active-tab access through that action. It saved a real 58,971-byte JPEG and source metadata locally, then appeared in the production Websites tab automatically with its screenshot. The cloud collection changed from 11 to 12 references (6 X, 6 websites), without using the import control. No extension reinstall or expanded permissions were needed.

**Real restart/queue test:** Paused cloud delivery, invoked the extension again on that source, verified one queued recapture, stopped/restarted the server, and observed the retained session plus 11 synced / 1 waiting. Resuming delivered the update and returned to 12 synced / 0 waiting without creating a duplicate. Corrected a misleading initial status message observed after restart. Existing records/media also reconciled under their original IDs. This live test covers cloud writes, preview uploads, re-capture and session persistence; it does not simulate a real provider outage.

**Controlled validation:** 75 Python regression checks and 8 extension mock checks pass. New controlled tests cover transient upload failure, backoff retained across restart, preview failure before acknowledgment, concurrent recapture, X-import delivery, later media enrichment, duplicate prevention, fixture/assessment exclusion, wrong-owner refusal, PKCE expiry, CSRF/origin/token requirements and private credential-file permissions. Network-outage and token-refresh paths use controlled transport responses; no expired live session or second newly bookmarked X post was forced for this pass. Cloud build and JavaScript syntax checks pass. Live X media from the existing six posts remain part of the copied collection.

The local server restart paused X polling as designed; its previously authorized 15-minute checks were restored with the same eight historical exclusions and unchanged spending limits. Cloud delivery calls Supabase only; it does not initiate paid X lookups. New X bookmarks saved on any device can be detected by this Mac's existing X connection while the local process is running. Mac sleep/offline or stopping the process delays both detection and delivery. Fully hosted scheduling, direct mobile capture, multi-device authoring/conflict resolution, cloud deletion and long-term live token/media refresh reliability remain future work. Section 25's manual-reimport boundary is superseded by this tested automatic-delivery path.


## 27. Direct cloud capture and reliability — September 28, 2026

The owner authorized removing the Mac dependency and adding reliability controls. They separately approved transferring the existing read-only X access/refresh tokens, eight historical exclusions and spending counter into the private Bookmark App Supabase project. An automatic approval review initially blocked that transfer until this specific consent was obtained. The tokens were then sent directly over HTTPS to the owner-authenticated worker and stored in Supabase Vault. No credentials were printed, committed or passed into the frontend. The starting reservation was 1,075 units ($1.075 conservative estimate), preserved without resetting the $3 allowance.

The Chrome extension now captures directly into private Supabase storage/records. It retains the existing durable browser outbox, active-tab safeguards and source-before-preview persistence. Failed saves retry every minute while Chrome runs. Exact-origin pairing creates a scoped, revocable capture token; only its hash is stored in the database. It cannot read references, delete cards or access X credentials. The owner reloaded the installed Downloads copy and connected it through the production library. No extension-management restrictions were bypassed.

Supabase schedules hosted checks every 15 minutes. A database lease prevents overlapping calls and concurrent token rotation; spending is reserved atomically before paid requests. The existing eight baseline IDs, seen IDs, ordered anchors, five-page limit, twenty-new-post limit, no-backfill behavior and fail-closed handling are retained. Reconnects preserve exclusions and spending. Interrupted workers pause for reconnection rather than silently reusing uncertain credentials. Original Mac writers are disabled after handoff so they cannot bill twice or overwrite cloud removals.

Connections & Trash shows X status and allowance with pause/resume/check/reconnect controls. Cards can move to recoverable Trash and be restored; this does not modify native X bookmarks. Background imports and recaptures do not resurrect trashed cards. Existing X detail views can explicitly refresh official media within the shared allowance. Signing out uses a browser-local session sign-out. The interface remains the existing masonry/grid layout without restored favorites, categories or playback controls.

**Live verification completed:** The local server was stopped before transfer and stayed stopped. The real installed extension recaptured Interfaces Bookmarks into the cloud at 16:31:43 UTC, under the existing ID with a JPEG preview and capture origin `cloud_extension`; no local request or manual import was involved. The collection remained 12 records. The same real website was moved into Trash and restored through the production UI, returning to 12 active / 0 trashed. A hosted X check returned zero new bookmarks without importing historical posts. A paid refresh of the existing Edoardo reel returned official media successfully. Live testing discovered that the original table lacked explicit service-role grants; a focused migration added SELECT/INSERT/UPDATE for the hosted backend before relying on captures or refreshed media. Anonymous capture/status/device/scheduler requests all returned 401.

The owner approved adding the exact Supabase callback to the existing Native App, keeping read-only scopes. A reconnect test initially returned the browser to X Home without reaching the cloud callback. Restarting the flow succeeded: X returned to the production `?x=reconnected` URL and the worker reported the verified original account. Checks were resumed afterward. No new X account, broader write scope or additional subscription was created.

**Controlled/database checks:** Mocked extension tests cover source persistence, network failure, rejection, missing pairing and active-tab changes. Cloud selection tests cover old-ID exclusions, old publication IDs newly bookmarked, duplicate/reordered/missing anchors, seen-ID retries, URL normalization and allowed high-quality media variants. A rollback-only database fixture verified lease exclusion, wrong-lease rejection, budget exhaustion and inability to reset reservations through completion. It also confirmed that anon/authenticated roles cannot execute the internal worker RPC. Local handoff regression tests prevent legacy delivery and paid checks, including after session refresh. All fixture data were rolled back or kept outside the real collection.

**Limits:** These tests do not establish long-duration reliability or a real provider-outage recovery. No second new native X bookmark was deliberately added during this migration; the hosted zero-new check and media refresh are real, while new-prefix edge cases are controlled. Source deletion or changed visibility can still make media unavailable. Full videos are not archived. Capturing from another browser still requires installing and connecting the extension there; website sign-in alone supports browsing. Mobile website capture and classification remain future work. The legacy Python lab is an archive/development tool, not a cloud mirror.

Supabase security advisors found no new exposed-table/access warning; three private service-only tables intentionally have RLS with no browser policies. The pre-existing password-protection warning concerns password sign-ins; this library uses email links. References: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Final verification: the real `library-x-checks` cron job ran successfully at 16:45:00 UTC, and the hosted X check completed at 16:45:02 with zero new posts, while port 8765 had no listener. The reservation reached 1,200 units ($1.200 conservative estimate), with checks enabled and all eight historical exclusions intact. This is a real scheduled invocation, not a manual call to the scheduler endpoint. Final regression results: **77 Python tests + 14 JavaScript controlled tests passed**. Successive live screenshots showed advancing saved-source video frames; the refreshed Edoardo card also gained its returned author avatar. Evidence: `capture-evidence/hosted-cloud-library.png`; it was captured just before the scheduled check and therefore shows the earlier $1.150 reservation.


## 28. New-bookmark delay and schedule alignment — September 28, 2026

The owner reported two missing new X bookmarks. The enabled worker had last checked at 16:45 UTC (20:45 Tbilisi), with budget remaining. A real manual hosted check at 16:55 UTC imported both: “reports, papers, posters” (post 2103477761352544605, photo) and “That's how I made the pattern on these playing cards” (post 2103592367206838759, playable video). The database and live production browser confirmed 8 X references and 6 websites, 14 total. This is a positive real-source hosted import, superseding section 27's untested-positive-import limitation. Historical exclusions remain intact.

Inspection also found a schedule defect: the due gate used worker start time plus 900 seconds, while cron fires at exact quarter-hours. Startup jitter could make the next invocation too early and skip a check. Migration 20260928165601 aligns the gate to the next quarter-hour and corrects enabled idle workers without resetting spending. A rollback-only database check exercised the actual claim function and confirmed a future boundary divisible by 900 and no more than 900 seconds away. No paid request was made by that fixture. The real scheduled 17:00 UTC invocation then completed successfully with zero new posts; reservations reached 1,330 units of 3,000.

The footer and Connections status now display the next check in the browser's local time. Checks remain periodic rather than instant; the existing “Check X now” action allows an immediate bounded check. Frontend syntax/build checks passed. Long-duration reliability and provider-outage recovery remain unproven.


## 29. Complete X media albums — September 28, 2026

The owner reported that a four-image post displayed only one image and supplied a recent.design recording showing horizontally arranged images with adjacent previews. The hosted projection selected only the first media key even though the existing official lookup expanded all attachments. It now stores every attachment in source order in the existing private metadata JSON, retaining legacy first-image/video fields for compatible grid covers. Missing media retain an unavailable slot; image and video hosts remain allowlisted. No schema or permission expansion was required. New imported posts and explicitly refreshed posts use the complete album. Older records remain compatible; only the reported post was refreshed, without bulk paid backfill.

Cards now display the attachment count. Expanded albums use original proportions, native horizontal scrolling and snap, neighboring-image previews, separate 44px previous/next image controls, a position counter and keyboard navigation within the gallery. Existing sidebar arrows continue to move between posts. Favorites, categories and grid playback/sound controls were not reintroduced. Videos retain muted autoplay and reduced-motion handling.

**Real verification:** Refreshed post 2103477761352544605 once through the existing owner-authorized, budget-limited hosted endpoint. Supabase contains four photo attachments with dimensions 1318×1866, 1322×1723, 1322×1723 and 1012×1547. Production showed a 4-item badge; opened all four slots, observed the original second/fourth images, verified the terminal disabled Next button, then checked the final adjacent-image layout and keyboard movement from 2/4 to 3/4. Next-reference navigation opened the existing playing-card video and Previous returned to the album. Actual desktop screenshots were inspected through the browser; a final persistent screenshot could not be saved because the Mac locked. No mock media were inserted into the real collection. Mobile touch behavior and mixed-video albums were not live tested.

**Controlled verification:** 16 JavaScript tests passed, including unordered API includes mapped back to all four attachment keys, missing/unsafe media slots, mixed image/video projection and existing import/queue guards. JavaScript syntax, cloud build and diff checks passed. Mixed-media and failure cases are controlled fixtures, not real-source browser proof. Edge Function library-service version 2 and GitHub/Vercel commits c7578b7 / a8f749d contain the implementation.

**Costs:** The same post lookup returns all attachment objects using attachments.media_keys expansion. This is one post resource, not four post lookups. X's public pricing currently lists Post Read at $0.005 and User Read at $0.010; the app retains its conservative 15-unit reservation per enriched post, separate from bookmark-list checks. Author expansions and provider deduplication affect actual billing, so this is not a measured total invoice cost. Browsing stored album links makes no paid X API request. Current official references: https://docs.x.com/x-api/getting-started/pricing and https://docs.x.com/x-api/fundamentals/expansions.


## 30. Reduce browsing chrome — September 28, 2026

At the owner's request, removed the duplicate X/Websites collection headings, both descriptive subtitles, the separate reference-total row, and X-card avatars/source arrows. The top section tabs, search, album counts and card opening remain. Author attribution and the original X link remain inside expanded references; website images and titles still link to their sources.

Connections & Trash is no longer mounted on the normal browsing screen. Existing recovery, pairing and sync controls remain accessible by explicitly opening /#manage, so hidden browsing controls do not remove the ability to restore discarded references or reconnect X. This UI change does not make paid X requests or change sync settings. Syntax and cloud build checks passed.
