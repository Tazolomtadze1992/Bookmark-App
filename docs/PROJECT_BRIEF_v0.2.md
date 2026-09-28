# Personal Reference Library — Project Brief

**Version:** 0.2  
**Updated:** September 28, 2026  
**Owner:** Tazo Lomtadze  
**Current stage:** Eight-source sample received; preliminary access checks completed; functional capture validation pending.  
**Canonical working file:** `PROJECT_BRIEF.md`

## 1. Personal reference library

Project brief v0.2 • September 28, 2026 • Owner: Tazo Lomtadze

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
| Current stage | Eight real URLs accepted. Preliminary access checks recorded; capture, playback, retrieval, and cost are not yet validated. |

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

Status: preliminary access checks completed; functional capture test not yet run. Some website information was readable through the browsing tool. All five direct X-page reads returned 403; official embed requests could not be fetched by that tool. The local runtime could not resolve external hosts, so it did not validate a screenshot or embed pipeline. No paid API calls were made. Next: run the minimal website capture and X-media test in a network-enabled development environment; configure any required API credential privately. Investigate the actual mobile platform and lowest-friction viable input. Output: usable/failed examples, observed save steps, playback results, and measured costs. Exit: a credible route through the evidence gate in section 3.

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

PROJECT_BRIEF.md is the editable record; PROJECT_BRIEF_v0.2.md is the versioned snapshot of this update. The previously created Word document is still the v0.1 snapshot, not the latest project state.

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

### Open decisions that need evidence

Capture: direct-save actions versus bookmark syncing; X access and cost per usable motion reference; the actual mobile platform and share route. Retrieval: which remembered cues matter and whether visual browsing or simple search already suffices. Product: what transfers beyond Tazo, and whether any Digital Inspo code is worth reusing. Implementation: hosting, storage, processing, and AI only after requirements and costs are tested.

### Risks and boundaries

Treat blocked, private, deleted, login-dependent, or incomplete source content as explicit states. Do not promise permanent video preservation or bypass source restrictions. Verify media-storage and display permissions before implementation. Keep the library private by default, preserve source attribution, and use non-confidential material in the public portfolio.

Track paid reads, repeated syncs, image/video processing, storage, and backlog imports separately. The earlier budget discussion was provisional: no API charges or capture success have been measured for this project. For comparison, model an initial scenario of 500 new saves/month including 300 from X, then replace that assumption with actual use. Development time, existing coding subscriptions, and optional domain/store fees are outside the recurring app-cost target.

### How we keep this current

Read the latest PROJECT_BRIEF.md before new feature or implementation work. Keep decisions, hypotheses, and observed results distinct. After a material change, update the version/date, current milestone, evidence, decision log, and next action. Do not silently broaden scope. Memory can retain the core direction; this file carries the exact project state and must be available to anyone continuing the work.

> **Next action: run the network-enabled capture test against the eight URLs below. Test official X embeds and/or authenticated post lookup, website preview generation, playback, and cost. Keep API credentials in the development environment, never in chat or this brief. No more references or manual recordings are needed to start.**

*Provenance: project discussion, eight owner-supplied URLs, and preliminary public-web/tool-access checks on September 28, 2026. Thresholds are proposed. No authenticated API result, working capture pipeline, playback success, measured operating bill, competitor evaluation, or user-test result is claimed.*


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
