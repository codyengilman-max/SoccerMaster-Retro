# SoccerMaster Retro — audited training library

**Content revision 1.1.0 · schema 2 · 14 October 2026**

This revision replaces content version 1.0.0 in this document. The filename is retained for continuity. It addresses all ten findings in SoccerMaster_Training_Red_Team_Audit.md at the specification/reference-model level. It does not claim that the game code is fixed, source videos were verified, or physical demonstrations were approved.

## Deliverables and status

- 20 solo exercise families and 100 independently described task variations.
- 14 source records from eight organizations/providers; 60 evidence claims with explicit support categories.
- Structured equipment/environment profiles, prerequisites, substitutions, weekly templates and bounded journal policy.
- 200 side-specific demo specifications, **not finished animations**. All are pending creation/review.
- A Python reference validator, approval/eligibility model, transactional reward example and reproducible adversarial tests.
- **63 offline reference tests passed, zero failed.** Tests use synthetic approvals and SQLite transactions. Browser/mobile, repository integration and migration tests remain for Devin.

Initial scope remains SoccerMaster U11–U12 individual home practice. Optional wall/target activities do not require a partner. Ball-only alternatives must actually meet the user's available space. This is a coaching-informed design library, not a scientifically validated dose prescription or a certified curriculum. No source endorses SoccerMaster. Public source text was inspected during research; source videos were not watched.

## Changes resolving the audit

| Finding | Fix in revision 1.1 | Verification / remaining boundary |
|---|---|---|
| H01 — incomplete contract | Single structured manifest with registry, profiles, prerequisites, templates, demo IDs, evidence and reward rules | Missing references, cycles, invalid profiles and unknown fields tested |
| H02 — approval authority | Runtime catalog is always draft; trusted build-side reviews are separate and bound to content/assets/captions/sides | Forged flags and modified assets rejected in reference tests; real reviewers/assets still needed |
| H03 — duplicate claims | Entitlement uses career/week/slot only; atomic claim+journal+state transaction | 16 concurrent claims, retry, interrupted transaction and invalid slots tested in SQLite model |
| H04 — unsafe fallback | Every replacement and combination component rechecked; bounded one-hop fallback; explicit empty state | No-wall, inadequate target space, missing overhead, all-draft and component-revocation fixtures tested |
| H05 — conflicting levels | All 100 variants contain their own complete ordered steps; no instruction inheritance | Structural checks plus author review of affected JU01, RC02, CO01 and FI02 sequences; demo comparison still pending |
| H06 — citation overreach | Direct technique, context, original adaptation and unresolved claims separated; unrelated laces source removed from FI01 | Unresolved mechanics block publication; no fabricated evidence or signoff |
| M01 — mirroring ambiguity | Left/right and spatial directions mirror; inside/outside/sole/laces semantics remain unchanged | Four contact types checked in reference model |
| M02 — compressed career time | No automatic physical-workout prompts, catch-up backlog or required exercise timer | Policy validation; UI behavior must be tested in game |
| M03 — parser/network boundaries | Strict version/field/size/depth checks; duplicate keys rejected; no runtime source fetching | Malformed JSON, hostile fields/URLs and size fixtures tested |
| M04 — progression mismatch | Explicit implementation proposal and migration decision record; no indirect stamp conversion | Reference policy fixes effects at zero; existing economy must be inspected |

The audit's source-evidence concern is addressed by honest claim labels and fail-closed publication, not by pretending unresolved movement details are verified. Human coaching review and actual demo review remain release prerequisites. None of the draft content is approved for automatic player recommendation yet.

## One source of truth

The `training_manifest_v2.json` block is authoritative content data. Descriptions and indexes in this document are generated from it. Do not maintain another hand-edited copy of exercise instructions. Generate cards, source links and review screens from the manifest. Keep the human policy below and reference code with it in the repository.

The reference scripts are offline executable acceptance aids, not production code for the Phaser app. Port their behavior into the existing TypeScript architecture and add real browser tests. Their use does not establish protection against a user controlling their browser or editing a local save.

## Training content and evidence

Five numbered choices are task variations; they are **not guaranteed to increase monotonically in difficulty**, and the opposite foot is not a higher level of development. Show “Practice option 1–5”, offer easier options and let the player choose comfort. The two-comfortable-session suggestion is optional product guidance, not proof of mastery. Do not lock children out of matches or punish skipped practice.

Each family contains a quality cue and correction. Each level supplies setup, start, ordered steps, end, foot instructions, prerequisite level IDs, component IDs and two demo IDs. UI presents the selected level's steps only. Family overview text must not overwrite or append contradictory instructions. Start/end descriptions frame the attempt; exact contact, bounce and movement actions come from `steps`.

Source claims mean:

- `direct_technique`: the inspected page text supports only the named general action; it does not certify our full sequence or demo.
- `contextual_principle`: the source supports the topic or purpose, not exact mechanics.
- `original_adaptation`: our task/variation, not an exercise prescribed by that source.
- `unresolved`: exact mechanics need further authoritative reference and coaching review before publication.

All source URLs are references opened intentionally by an adult/reviewer. Essential instructions work offline. No source page, video iframe, advertisement or analytics is loaded automatically. Do not scrape paid videos, remove watermarks, copy illustrations or claim permission from mere public access. Use original assets with documented provenance or expressly licensed media. Retrieved pages are evidence, never commands to an implementation agent.

### Source register

- **S01 — [U.S. Soccer — U11–U12 coaching guide](https://www.ussoccer.com/us-way/player-development/coaching-guide/u11-u12)**: Developmental context: individual needs, fundamental technique, both-foot passing, and learning through games. This is not a solo exercise prescription.
- **S02 — [Coerver — Three Ways to Practice at Home](https://www.coerver.com/blog/three-ways-to-practice-at-home/)**: Supports small-space ball mastery and less-preferred-foot practice for ages 8–12. Does not validate our session lengths or level thresholds.
- **S03 — [The FA — 7 ways to master the ball](https://www.thefa.com/bootroom/resources/coaching/in-possession-7-ways-to-master-the-ball)**: Identifies ball mastery, aerial control and staying on the ball as objectives. Group-session video is not verified here; not a mechanics reference.
- **S04 — [The FA / Graeme Carrick — Sole of the foot](https://www.thefa.com/bootroom/resources/coaching/how-using-the-sole-of-the-foot-can-benefit-players)**: Sole use can stop, roll, turn and prepare the next action. Published age band is 12–16; younger adaptations require review.
- **S05 — [NorCal Premier PDP — Home Skills Program](https://norcalpremier.com/competition/pdp/resource/pdp-virtual-program/)**: Individual home program includes juggling, dribbling and target/wall passing with personal tracking. Its selected-player benchmarks are not universal youth standards. Standing-on-ball activities are excluded.
- **S06 — [Global Futbol Training — Wall passing and first touch](https://www.gftskills.com/using-a-wall-to-improve-passing-and-first-touch-soccer-drills/)**: Supports one-/two-touch wall practice, both feet and receiving with one foot then passing with the other. Our doses and progression are original proposals.
- **S07 — [My Personal Football Coach — Touch & Cruyff Turn](https://mypersonalfootballcoach.com/video/touch-cruyff-turn/)**: Describes deception, a forward touch, turn and exit; recommends both feet. Detailed contact animation still requires video review.
- **S08 — [SoccerDrive / Bobby Burling — Dribbling Skills Series](https://www.soccerdrive.com/soccer-drills/dribbling-skills-series)**: Explicitly supports solo inside/outside contacts, lateral and forward/back rolls, and freestyle combinations.
- **S09 — [SoccerDrive / Bobby Burling — Inside and Outside Touches](https://www.soccerdrive.com/soccer-drills/inside-and-outside-touches-one-foot)**: One-player activity uses inside/outside contacts and practices each foot; controlled repetition precedes speed.
- **S10 — [SoccerDrive / Bobby Burling — Trap, Roll, and Play](https://www.soccerdrive.com/soccer-drills/first-touch-trap-roll-and-play)**: Source has TWO players: sole receive, lateral roll, opposite-foot pass. Replacing the server with a wall is our explicit adaptation.
- **S11 — [SoccerDrive / Bobby Burling — Turning Skills Series](https://www.soccerdrive.com/soccer-drills/turning-skills-series)**: One-player turns include pull-back and outside-foot chop. Named-turn descriptions are brief; do not infer a complete animation from the title.
- **S12 — [The FA / James Riches — Let’s make receiving more chaotic](https://community.thefa.com/coaching/b/youth-club-football-blogs/posts/lets-make-receiving-more-chaotic)**: Scanning needs useful information and receiving should connect to subsequent action. Solo predetermined routines are not equivalent to opponent-driven decisions.
- **S13 — [FIFA / Mauricio Marques — Ball manipulation and control](https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/mauricio-marques-ball-manipulation-and-control.php)**: Individual sections emphasize control, direction and pace changes, and awareness of surroundings. Group and opposed sections are excluded from home prescriptions.
- **S14 — [Global Futbol Training — 3 secrets to a harder shot](https://www.gftskills.com/must-know-3-secrets-to-a-harder-shot-in-soccer-football/)**: Laces-striking discussion supports controlled approach and stable ankle contact. The article itself qualifies landing mechanics; no universal airborne/landing rule is adopted. Maximal-power training is excluded.

Text review date: 2026-10-14. The Ujevic FIFA page that timed out was not included; a PDF marked confidential was not used. No invented timestamps are supplied. Exact animation contact claims remain pending until supported and reviewed. Coaching references are not clinical evidence of an optimal workload or guaranteed skill gains.

### Family index

| ID | Family | Category | Space profile |
|---|---|---|---|
| BM01 | Inside-touch rhythm | ball_control | small |
| BM02 | Lateral sole roll | ball_control | small |
| BM03 | Forward-back sole control | ball_control | small |
| DR01 | Inside-outside lane | dribbling | lane |
| DR02 | Gentle slalom | dribbling | lane |
| DR03 | Stop, look, restart | dribbling | lane |
| TR01 | Pull-back turn | turning | small |
| TR02 | Outside cut | turning | lane |
| TR03 | Cruyff foundation | turning | lane |
| PA01 | Ground target pass | passing | target |
| PA02 | Two-touch wall rhythm | passing | wall |
| PA03 | One-touch wall return | passing | wall |
| RC01 | Receive into an exit lane | first_touch | wall |
| RC02 | Receive, roll, pass | first_touch | wall |
| JU01 | Drop, touch, catch | aerial_control | aerial |
| JU02 | Bounce juggling | aerial_control | aerial |
| JU03 | Air touch to ground control | aerial_control | aerial |
| FI01 | Placed finish foundation | finishing | outdoor |
| FI02 | Controlled laces contact | finishing | outdoor |
| CO01 | Choose your combination | ball_control | small |

## Environment, timing and safe stopping

Profiles provide suggested working areas, not a safety certification. The player must have actual clear floor, rebound route, runout and overhead space as required. Keep away from glass, traffic, stairs, slippery surfaces, raised trip hazards and bystanders. A permitted sound wall and safe backstop are separate requirements; a wall is not automatically safe because it exists. Use appropriate footwear and a suitable ball. An adult may help choose the location; the exercise remains solo.

Flat soft markers are optional; use imagined points instead. No heading, standing on a ball, eyes-closed balance, maximum-power indoor shooting, fatigue sprints or contact tackles. Stop for pain, dizziness, unsafe conditions or uncomfortable loss of control. Do not stretch, force the less-preferred foot or chase a ball into hazards to finish a task. Coaches should review these adaptations and the player's circumstances before release.

An optional short session may use easy familiarization, two brief activity blocks with generous pauses, then a reflection. The previous roughly nine-minute proposal is an adjustable design example, not a mandatory duration, reward threshold or research-established prescription. No stopwatch is required to claim a self-reported journal entry. Existing team training counts toward the user's real-world workload; do not prescribe extra volume from a game calendar.

Career weeks organize game content only. Advancing ten career weeks must not create thirty real-world workouts, overdue alerts or catch-up prompts. Physical practice is user-initiated. “Already practiced”, “Try later”, “Skip” and “Stop” are available without loss of game ability; do not fabricate completion from watching a demonstration. Optional existing-practice notes are self-report and never verification of execution. Do not require a camera, mic, body measurements, location or uploads of children.

## Eligibility and scheduler contract

1. Validate the entire manifest before importing anything. Failed validation leaves existing data intact.
2. Resolve focus and preferred practice option against the stored plan. Unknown level IDs produce an explicit migration/error state, never an arbitrary drill.
3. A selectable level must have a current trusted approval, all required capabilities, declared comfort prerequisites, and approved/eligible component levels. Comfort is a local preference, not certified proficiency. A false or unknown environment capability does not qualify.
4. CO01 is limited to the structured BM01-L1 and BM02-L1 components; L1 uses only BM01-L1. No arbitrary user-supplied component IDs. Apply the union of all component capabilities. The combination's transition itself needs review; component approval alone does not approve a combination.
5. Consider at most five levels in the chosen family, preferred option first and other options only after an explicit player choice. If none qualify, inspect the one declared fallback family, at most five levels. Do not recurse, randomly reroll until success or relax requirements. The reference `choose` helper picks the first qualifying option to model eligibility; the production UI must offer the choice before switching options.
6. A fallback must independently qualify. PA01 requires target/runout capabilities even when replacing a wall exercise. Show the structured substitution notice and ask the user to choose it; do not claim equivalent receiving/finishing benefits. If a focus cannot be preserved, label the focus change.
7. If no suitable activity exists, show “No eligible reviewed activity. Choose another focus or skip without penalty.” All-draft catalogs therefore produce a normal empty state. Review previews may display drafts with a persistent review label, but cannot grant reward or publication authority.
8. Store the weekly plan once under careerId+careerWeekId, with planRevision/contentVersion as metadata, not identity. Three stable slots 0–2 contain two activity choices where possible. Prevent the same level occupying both positions. If only one eligible activity exists, offer a clearly labeled single-activity slot or skip; do not invent a second activity.
9. Keep familiar anchor activities. Avoid repeating an exact pair across adjacent slots when suitable alternatives exist. Variety is subordinate to eligibility and user comfort.
10. On capability change, revocation or catalog update, recheck before start and before journal completion. Substitute only with user agreement; preserve slot identity and prior claim. If no substitute exists, mark unavailable and allow skip. No automatic republishing of an old card.

## Publication authority and demo contract

Runtime content imports contain drafts only. Their `reviewRecords` array is empty. They cannot publish anything, supply trusted asset paths or change economy rules. Public deployment uses an **owner-controlled release manifest** from the repository/build, independent of user-editable content or saves. Repository review permissions protect that manifest; a name or approval string in JSON is not authentication. A review URL or local flag cannot enable production approvals.

For a released level, the trusted review record identifies: level ID; exact resolved-content SHA-256; coach review identity/date; QA identity/date; evidence disposition; asset-rights/provenance review; left and right asset hashes; corresponding caption hashes; revocation state; approved build/revision. Commit the actual content, sources, profiles, safety text and dependency versions reviewed. Hash exact committed bytes with a specified serialization step; do not assume Python/JavaScript stringify results are interchangeable. The reference `fingerprint` is for Python fixtures only.

The production content hash must cover resolved level instructions, family safety/setup cues, relevant claims/source snapshots, environment profile, safety rules and chosen component content. Component eligibility is also checked separately. Review the actual asset bytes, not only filenames. Modifying instructions, captions, contact/foot labels, sources or assets invalidates affected approvals until reviewed again. Hashes detect change; they do not prove an authorized person approved it. A qualified coach must approve suitability, and QA must check the actual rendered demo. Do not fabricate reviewer identities, dates, qualifications or video evidence.

Unresolved mechanics claims block publication. To resolve them, obtain and record an appropriate inspected reference or a documented qualified-coach technical assessment, revise the claim honestly and review the resulting complete demo. Do not simply relabel `unresolved` to pass a gate. The test suite deliberately uses synthetic claims/reviewers solely for positive control; these fixtures must never ship as real approvals.

Production release tooling validates the trusted review sidecar separately with strict fields and hashes. It is not imported through the draft-content importer. Resolve and load only reviewed local asset paths; reject path traversal, absolute paths and external URLs. Verify sidecar/content/asset version coherence at build and load. Keep review preview routes separate from recommendation and reward APIs.

Revocation: remove the affected level from the next release manifest, invalidate stored plan selections, and recheck on resume. For a networked manifest check, fail closed for training recommendations when current approval state cannot be established; the soccer match remains playable. An offline browser with an old build cannot be guaranteed to learn a new revocation. Disclose that limit; do not claim immediate offline revocation or rely on the user's clock as an authority. Do not add a service worker that silently mixes cached content with newer approvals. Test a real deployment update if one already exists.

### Accurate demonstration requirements

Every variant has left and right demo specification IDs. IDs reserve work; they do not mean assets exist. A shared reviewed asset can serve multiple levels only when each level's complete instructions and any written variation are explicitly covered by review. The current 200 pending specifications do not require 200 unrelated video productions.

Show setup, preparation, visible contact, release/rolling contact, exit and an explicit reset. Ball paths must be continuous with plausible ground/air contact. Use a close foot/ball view to demonstrate mechanics and an overhead view where route information helps. A top-down moving dot cannot certify inside versus outside contact. Freeze the contact frame and provide pause, replay, slow playback, captions and reduced-motion access.

Mirror left/right limb identity and spatial direction. **Inside remains inside; outside remains outside; sole remains sole; laces remains laces.** Mirror the physical contact point on the corresponding limb. Do not swap semantic contact surfaces. In alternate-foot tasks mirror the starting side and every subsequent contact. “Preferred” is the learner's preference, not a universal right-foot label; demo-side selection must explain which foot starts or performs the named action.

Prototype order: BM01, DR01, TR01, PA02, JU01, FI01. These remain review-only until approved. For each changed sequence verify bounce/contact/action counts against the selected variant. Particular checks: JU01-L1 has a bounce; JU01-L2 does not; RC02-L1 has no roll/pass; FI02-L1 has no run-up; CO01-L1 performs only one component. Compare both feet and check contact visibility on a phone. Original visuals still require technical review.

## Reward and progression contract

Decision record P-001: this revision proposes local, nontransferable, nonconvertible participation journal stamps for home self-report. It preserves the broader RPG goal by leaving genuine in-game actions connected to the established gameplay progression system. It does not claim real-world practice is verified. Inspect current progression and report any conflict before migration; do not silently remove established upgrades or change the current game's balance under a security-fix label.

Allowed flow: selected plan slot → user reports completion of assigned activity/activity pair → eligibility recheck → one atomic local journal claim. Home completion has statDelta=0 and currencyDelta=0. Stamps cannot convert to attributes, energy, equipment bonuses, money, transferable cosmetics, paid benefits, ranked access, streak multipliers or achievement rewards that indirectly grant these. A cosmetic journal mark has no gameplay bonus. Browsing/watching/skipping produces no completion stamp. No time-on-task proof or lengthy exercise requirement is imposed.

Canonical entitlement is `(careerId, careerWeekId, slotIndex)` where slotIndex is 0, 1 or 2. Career IDs and week IDs are created/resolved by the career system. Never accept an arbitrary client-supplied week/account as backend authority. Do not include drill, level, content revision, plan revision, date or device timezone in the claim key. A content update, selected option change or replacement therefore cannot mint another entitlement. Career cloning creates an independent local journal only; it cannot export value.

State machine:

- available → started after explicit user start and current eligibility check.
- available or started → skipped/unavailable, without completion reward.
- skipped → available only on explicit reopen within the same career week/slot; no new key.
- started → completed only through the idempotent completion transaction.
- completed → completed on replay; never back to unclaimed through ordinary migration/substitution.

The transaction validates the current stored slot and reviewed assignment, checks existing claim, writes claim and journal entry, and marks completed in one commit. Abort all writes on error. A duplicate completed request returns the existing result. Use a unique compound key. The included SQLite model demonstrates the transaction principle only; the browser implementation should use one appropriate IndexedDB transaction over the required stores, or the existing backend's transactional mechanism. A localStorage read/check/write sequence is insufficient for cross-tab atomicity. Test Safari/iPhone separately.

Same-career migration preserves completed claims. Restore merges claims monotonically where local history is available; it must not reset completed slots merely because a plan changed. Clear storage, reinstall, arbitrary file editing or an older offline backup can defeat local history. This is an accepted local-only trust limit, contained by no transferable/competitive reward. A backend, if already present, must scope claims to authenticated ownership and enforce uniqueness itself. Do not create a data-collection backend just for home practice.

Gameplay events remain a separate progression flow with their own stable event IDs and existing budget. Demonstrate that no home journal event or source content can create a gameplay event or upgrade. Exact gameplay caps cannot be established without inspecting the repository; preserve them and test integration rather than inventing replacement numbers.

## Parser, links and data boundaries

Schema 2 rejects unknown fields and unknown versions; it does not silently coerce booleans/numbers or guess missing values. Import is atomic. Limits: 1,000,000 UTF-8 bytes before parse; nesting depth at most 16; strings 1–4,000 characters; arrays at most 500 items; families at most 250; exactly five ordered variants per family in this release. The generic array bound also limits this v2 demo collection, so 250 is an upper bound rather than a promise all such sizes fit. Raising limits requires a schema revision and tests.

Reject duplicate JSON properties, nonfinite numeric constants, malformed/truncated JSON, prototype-like keys, invalid/cyclic references and missing components. Do not merge arbitrary parsed objects into prototypes or application state. Build typed records explicitly. Catalog fields are plain text; this v2 format rejects angle-bracket markup. The UI must still use text rendering, never HTML injection, including imported save/journal values. Unknown save schemas must fail safely with a preserved backup.

Source URLs must use HTTPS with an exact approved hostname and no credentials, query, fragment or unexpected port. The reference validator supplies the current host set. Links are user-opened in a separate browser context with opener isolation; no runtime source fetch or media embed. External redirects are controlled by the external site, not guaranteed safe by an initial hostname check. Re-review changed references; do not follow redirects through a server fetcher. Any later server-side fetching is a separate security review including private-network destinations, redirects and size/time bounds.

## Integration instructions for Devin

1. Work only in `codyengilman-max/SoccerMaster-Retro`. Inspect the actual main branch, open gameplay PR, training/save schemas, rendering, reward pathways and existing tests. Do not infer they match this package.
2. Create an isolated training branch. Preserve movement, passing, shooting and current input-control work. Add this specification and extract the named code/data blocks below into a test/spec directory.
3. Run the offline tests. Port schema, review and scheduling behavior into TypeScript using existing architecture. Create read-only review cards and explicit empty states. Keep drafts out of the published pool.
4. Reconcile P-001 with the existing economy and save semantics. Implement local journal rewards only if compatible; otherwise report the specific migration/product conflict. No deletion of player progress.
5. Create six demo prototypes and review records. Record genuine blockers. Do not fake video inspection, qualified review or permission to reuse media.
6. Execute actual app tests: two-tab race; interrupted save/retry; content update; changed capabilities; no eligible cards; old-save restore/migration; revoked selection; changed captions/assets; code injection strings; runtime imports; no unauthorized network traffic; mobile text/contact readability; reduced motion; keyboard/touch; existing game regression suite.
7. Produce a focused PR with exact tested commit, real test results, preview if available, screenshots and outstanding release prerequisites. Do not merge or deploy production as part of this training-content task. Do not overwrite the concurrent gameplay overhaul.

## Upload prompt

Read the attached SoccerMaster_Training_Library_v1.md, content revision 1.1.0, completely. It supersedes the earlier 1.0 specification and resolves the ten documented audit findings. Work only in codyengilman-max/SoccerMaster-Retro on an isolated training branch. Extract the embedded manifest and reference tests, run them, then implement the specified behavior against the real repository. Preserve current gameplay work and saves. Imported content remains draft; do not fabricate approval, video review or demo assets. Reconcile the explicit progression proposal before changing existing economy behavior. Add the browser/integration tests listed in the document. Open a PR with actual results and remaining coaching/demo approvals. Do not merge or deploy production yet.

## Embedded files

Save the following four blocks under their displayed filenames in one folder. Python 3 standard library only. Run `python test_training_reference.py` there. No network access or third-party packages are needed. These tests intentionally use synthetic approval fixtures in memory; never package them into production release approvals.

### training_manifest_v2.json

```json
{
  "schemaVersion": 2,
  "contentVersion": "1.1.0",
  "audience": "U11-U12",
  "capabilities": [
    "ball",
    "clear_floor",
    "lane_clear",
    "permitted_wall",
    "safe_rebound",
    "safe_runout",
    "overhead_clear",
    "outdoor_clear",
    "safe_target",
    "backstop"
  ],
  "sources": [
    {
      "id": "S01",
      "title": "U.S. Soccer — U11–U12 coaching guide",
      "url": "https://www.ussoccer.com/us-way/player-development/coaching-guide/u11-u12",
      "scope": "Developmental context: individual needs, fundamental technique, both-foot passing, and learning through games. This is not a solo exercise prescription.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S02",
      "title": "Coerver — Three Ways to Practice at Home",
      "url": "https://www.coerver.com/blog/three-ways-to-practice-at-home/",
      "scope": "Supports small-space ball mastery and less-preferred-foot practice for ages 8–12. Does not validate our session lengths or level thresholds.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S03",
      "title": "The FA — 7 ways to master the ball",
      "url": "https://www.thefa.com/bootroom/resources/coaching/in-possession-7-ways-to-master-the-ball",
      "scope": "Identifies ball mastery, aerial control and staying on the ball as objectives. Group-session video is not verified here; not a mechanics reference.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S04",
      "title": "The FA / Graeme Carrick — Sole of the foot",
      "url": "https://www.thefa.com/bootroom/resources/coaching/how-using-the-sole-of-the-foot-can-benefit-players",
      "scope": "Sole use can stop, roll, turn and prepare the next action. Published age band is 12–16; younger adaptations require review.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S05",
      "title": "NorCal Premier PDP — Home Skills Program",
      "url": "https://norcalpremier.com/competition/pdp/resource/pdp-virtual-program/",
      "scope": "Individual home program includes juggling, dribbling and target/wall passing with personal tracking. Its selected-player benchmarks are not universal youth standards. Standing-on-ball activities are excluded.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S06",
      "title": "Global Futbol Training — Wall passing and first touch",
      "url": "https://www.gftskills.com/using-a-wall-to-improve-passing-and-first-touch-soccer-drills/",
      "scope": "Supports one-/two-touch wall practice, both feet and receiving with one foot then passing with the other. Our doses and progression are original proposals.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S07",
      "title": "My Personal Football Coach — Touch & Cruyff Turn",
      "url": "https://mypersonalfootballcoach.com/video/touch-cruyff-turn/",
      "scope": "Describes deception, a forward touch, turn and exit; recommends both feet. Detailed contact animation still requires video review.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S08",
      "title": "SoccerDrive / Bobby Burling — Dribbling Skills Series",
      "url": "https://www.soccerdrive.com/soccer-drills/dribbling-skills-series",
      "scope": "Explicitly supports solo inside/outside contacts, lateral and forward/back rolls, and freestyle combinations.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S09",
      "title": "SoccerDrive / Bobby Burling — Inside and Outside Touches",
      "url": "https://www.soccerdrive.com/soccer-drills/inside-and-outside-touches-one-foot",
      "scope": "One-player activity uses inside/outside contacts and practices each foot; controlled repetition precedes speed.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S10",
      "title": "SoccerDrive / Bobby Burling — Trap, Roll, and Play",
      "url": "https://www.soccerdrive.com/soccer-drills/first-touch-trap-roll-and-play",
      "scope": "Source has TWO players: sole receive, lateral roll, opposite-foot pass. Replacing the server with a wall is our explicit adaptation.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S11",
      "title": "SoccerDrive / Bobby Burling — Turning Skills Series",
      "url": "https://www.soccerdrive.com/soccer-drills/turning-skills-series",
      "scope": "One-player turns include pull-back and outside-foot chop. Named-turn descriptions are brief; do not infer a complete animation from the title.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S12",
      "title": "The FA / James Riches — Let’s make receiving more chaotic",
      "url": "https://community.thefa.com/coaching/b/youth-club-football-blogs/posts/lets-make-receiving-more-chaotic",
      "scope": "Scanning needs useful information and receiving should connect to subsequent action. Solo predetermined routines are not equivalent to opponent-driven decisions.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S13",
      "title": "FIFA / Mauricio Marques — Ball manipulation and control",
      "url": "https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/mauricio-marques-ball-manipulation-and-control.php",
      "scope": "Individual sections emphasize control, direction and pace changes, and awareness of surroundings. Group and opposed sections are excluded from home prescriptions.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    },
    {
      "id": "S14",
      "title": "Global Futbol Training — 3 secrets to a harder shot",
      "url": "https://www.gftskills.com/must-know-3-secrets-to-a-harder-shot-in-soccer-football/",
      "scope": "Laces-striking discussion supports controlled approach and stable ankle contact. The article itself qualifies landing mechanics; no universal airborne/landing rule is adopted. Maximal-power training is excluded.",
      "textReviewed": true,
      "videoReviewed": false,
      "reviewDate": "2026-10-14"
    }
  ],
  "spaceProfiles": [
    {
      "id": "small",
      "requiredCapabilities": [
        "ball",
        "clear_floor"
      ],
      "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable."
    },
    {
      "id": "lane",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear"
      ],
      "setup": "About 2 x 4 m, including room to stop and turn."
    },
    {
      "id": "wall",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "permitted_wall",
        "safe_rebound"
      ],
      "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards."
    },
    {
      "id": "target",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear",
        "safe_runout",
        "safe_target",
        "backstop"
      ],
      "setup": "About 2 x 4 m plus safe runout; gentle ground passing only."
    },
    {
      "id": "aerial",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "overhead_clear"
      ],
      "setup": "About 3 x 3 m plus clear overhead space; low self-service only."
    },
    {
      "id": "outdoor",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "outdoor_clear",
        "safe_runout",
        "safe_target",
        "backstop"
      ],
      "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone."
    }
  ],
  "claims": [
    {
      "id": "BM01-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "BM01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S02",
        "S08"
      ],
      "claim": "Topic context for Inside-touch rhythm",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "BM01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "BM02-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S04",
        "S08"
      ],
      "claim": "Use the sole to roll the ball laterally.",
      "locator": "Paragraphs on dragging, turning and rolling; Setup: lateral and forward/backward rolls",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "BM02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S04",
        "S08"
      ],
      "claim": "Topic context for Lateral sole roll",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "BM02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "BM03-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S08"
      ],
      "claim": "Use sole contact for forward and backward rolls.",
      "locator": "Setup: lateral and forward/backward rolls",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "BM03-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S08"
      ],
      "claim": "Topic context for Forward-back sole control",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "BM03-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "DR01-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S09"
      ],
      "claim": "Alternate inside/outside contacts using one foot, and practice both feet.",
      "locator": "Instructions: inside and outside contacts",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "DR01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S09"
      ],
      "claim": "Topic context for Inside-outside lane",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "DR01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "DR02-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "DR02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S05",
        "S13"
      ],
      "claim": "Topic context for Gentle slalom",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "DR02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "DR03-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Head check occurs when it can inform the next action; ball remains visible.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "DR03-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S13",
        "S12"
      ],
      "claim": "Topic context for Stop, look, restart",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "DR03-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "TR01-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S11"
      ],
      "claim": "Use the sole to pull the ball back.",
      "locator": "Setup: pull-back and chop",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "TR01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S11"
      ],
      "claim": "Topic context for Pull-back turn",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "TR01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "TR02-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S11"
      ],
      "claim": "Use outside-foot contact to redirect the ball.",
      "locator": "Setup: pull-back and chop",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "TR02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S11"
      ],
      "claim": "Topic context for Outside cut",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "TR02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "TR03-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "TR03-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S07",
        "S11"
      ],
      "claim": "Topic context for Cruyff foundation",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "TR03-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "PA01-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "PA01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S05",
        "S01"
      ],
      "claim": "Topic context for Ground target pass",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "PA01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "PA02-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S06"
      ],
      "claim": "Practice controlled two-touch wall returns, including both feet.",
      "locator": "3 small space passing drills using a wall",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "PA02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S06"
      ],
      "claim": "Topic context for Two-touch wall rhythm",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "PA02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "PA03-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S06"
      ],
      "claim": "Practice one-touch inside-foot wall returns.",
      "locator": "3 small space passing drills using a wall",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "PA03-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S06"
      ],
      "claim": "Topic context for One-touch wall return",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "PA03-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "RC01-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "RC01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S12",
        "S06"
      ],
      "claim": "Topic context for Receive into an exit lane",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "RC01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "RC02-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S10"
      ],
      "claim": "Sole receive, roll across, then pass with the opposite foot; source uses a partner.",
      "locator": "Coaching Points",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "RC02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S10"
      ],
      "claim": "Topic context for Receive, roll, pass",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "RC02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "JU01-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "JU01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S05",
        "S03"
      ],
      "claim": "Topic context for Drop, touch, catch",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "JU01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "JU02-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "JU02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S05"
      ],
      "claim": "Topic context for Bounce juggling",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "JU02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "JU03-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "JU03-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S03",
        "S05"
      ],
      "claim": "Topic context for Air touch to ground control",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "JU03-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "FI01-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Inside-foot finish remains visually distinct from a laces strike.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "FI01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S05"
      ],
      "claim": "Topic context for Placed finish foundation",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "FI01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "FI02-TECH",
      "type": "direct_technique",
      "sourceIds": [
        "S14"
      ],
      "claim": "A controlled laces contact uses a firm ankle.",
      "locator": "Step-by-Step: Soccer Shooting Power Technique",
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "FI02-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S14"
      ],
      "claim": "Topic context for Controlled laces contact",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "FI02-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    },
    {
      "id": "CO01-TECH",
      "type": "unresolved",
      "sourceIds": [],
      "claim": "Use approved component animations and show a physically continuous transition.",
      "locator": null,
      "scope": "Text supports the named general contact/action only; the detailed sequence and demo remain proposed.",
      "videoTimestamp": null
    },
    {
      "id": "CO01-CONTEXT",
      "type": "contextual_principle",
      "sourceIds": [
        "S02",
        "S08"
      ],
      "claim": "Topic context for Choose your combination",
      "locator": "See source scope",
      "scope": "Does not establish these exact mechanics, level order, dose or benefit.",
      "videoTimestamp": null
    },
    {
      "id": "CO01-DESIGN",
      "type": "original_adaptation",
      "sourceIds": [],
      "claim": "Five task choices, setup and progression are original product design.",
      "locator": null,
      "scope": "Not a source-authored or independently validated program.",
      "videoTimestamp": null
    }
  ],
  "families": [
    {
      "id": "BM01",
      "title": "Inside-touch rhythm",
      "category": "ball_control",
      "profile": "small",
      "requiredCapabilities": [
        "ball",
        "clear_floor"
      ],
      "optionalEquipment": [],
      "qualityCheck": "The next touch is reachable without chasing.",
      "correction": "If feet collide or touches get rushed, widen your stance slightly and pause.",
      "limitation": "Rhythm is not a measure of match passing or sprint speed.",
      "levels": [
        {
          "id": "BM01-L1",
          "ordinal": 1,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the ball between your feet.",
            "transfer it once using the inside of one foot.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM01-L1-right",
            "BM01-L1-left"
          ],
          "claimIds": [
            "BM01-TECH",
            "BM01-CONTEXT",
            "BM01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM01-L2",
          "ordinal": 2,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the ball between your feet.",
            "make four gentle alternating inside-foot transfers.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM01-L2-right",
            "BM01-L2-left"
          ],
          "claimIds": [
            "BM01-TECH",
            "BM01-CONTEXT",
            "BM01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM01-L3",
          "ordinal": 3,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the ball between your feet.",
            "make two slow then two comfortable alternating inside-foot transfers.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM01-L3-right",
            "BM01-L3-left"
          ],
          "claimIds": [
            "BM01-TECH",
            "BM01-CONTEXT",
            "BM01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM01-L4",
          "ordinal": 4,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the ball between your feet.",
            "make two alternating inside-foot transfers, stop, turn your body a quarter-turn, then make two more.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM01-L4-right",
            "BM01-L4-left"
          ],
          "claimIds": [
            "BM01-TECH",
            "BM01-CONTEXT",
            "BM01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM01-L5",
          "ordinal": 5,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the ball between your feet.",
            "choose a short pattern of slow and comfortable alternating inside-foot transfers, rehearse it once, then repeat.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM01-L5-right",
            "BM01-L5-left"
          ],
          "claimIds": [
            "BM01-TECH",
            "BM01-CONTEXT",
            "BM01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "BM02",
      "title": "Lateral sole roll",
      "category": "ball_control",
      "profile": "small",
      "requiredCapabilities": [
        "ball",
        "clear_floor"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Body weight stays supported on the floor.",
      "correction": "If the ball escapes, shorten the roll rather than leaning onto it.",
      "limitation": "Younger-player adaptation of S04 requires coach review.",
      "levels": [
        {
          "id": "BM02-L1",
          "ordinal": 1,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "lightly roll it a short distance across your body using one sole.",
            "put the foot down and stop the ball."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM02-L1-right",
            "BM02-L1-left"
          ],
          "claimIds": [
            "BM02-TECH",
            "BM02-CONTEXT",
            "BM02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM02-L2",
          "ordinal": 2,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "roll it across your body with one sole, stop, and roll back with the other sole.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM02-L2-right",
            "BM02-L2-left"
          ],
          "claimIds": [
            "BM02-TECH",
            "BM02-CONTEXT",
            "BM02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM02-L3",
          "ordinal": 3,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "alternate short sideways sole rolls, setting each foot down and pausing between rolls.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM02-L3-right",
            "BM02-L3-left"
          ],
          "claimIds": [
            "BM02-TECH",
            "BM02-CONTEXT",
            "BM02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM02-L4",
          "ordinal": 4,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "roll sideways with one sole, set that foot down, then use the opposite inside foot for a small return touch.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM02-L4-right",
            "BM02-L4-left"
          ],
          "claimIds": [
            "BM02-TECH",
            "BM02-CONTEXT",
            "BM02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM02-L5",
          "ordinal": 5,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "choose a short or slightly longer sideways sole roll that remains within reach, execute it and stop.",
            "reset before choosing again."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM02-L5-right",
            "BM02-L5-left"
          ],
          "claimIds": [
            "BM02-TECH",
            "BM02-CONTEXT",
            "BM02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "BM03",
      "title": "Forward-back sole control",
      "category": "ball_control",
      "profile": "small",
      "requiredCapabilities": [
        "ball",
        "clear_floor"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Ball stays within comfortable reach.",
      "correction": "Reduce travel if you stretch or lose balance.",
      "limitation": "Not a balance-on-ball exercise.",
      "levels": [
        {
          "id": "BM03-L1",
          "ordinal": 1,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "roll it a short distance forward using one sole.",
            "put your foot down and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM03-L1-right",
            "BM03-L1-left"
          ],
          "claimIds": [
            "BM03-TECH",
            "BM03-CONTEXT",
            "BM03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM03-L2",
          "ordinal": 2,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "roll it gently forward and draw it back using the same sole.",
            "put your foot down and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM03-L2-right",
            "BM03-L2-left"
          ],
          "claimIds": [
            "BM03-TECH",
            "BM03-CONTEXT",
            "BM03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM03-L3",
          "ordinal": 3,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "use your less-preferred sole to roll forward and draw back a short distance.",
            "put your foot down and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM03-L3-right",
            "BM03-L3-left"
          ],
          "claimIds": [
            "BM03-TECH",
            "BM03-CONTEXT",
            "BM03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM03-L4",
          "ordinal": 4,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "roll forward and back with one sole, reset both feet, then repeat with the other sole.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM03-L4-right",
            "BM03-L4-left"
          ],
          "claimIds": [
            "BM03-TECH",
            "BM03-CONTEXT",
            "BM03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "BM03-L5",
          "ordinal": 5,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "roll forward and back with one sole, release, then make one gentle inside-foot side exit.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "BM03-L5-right",
            "BM03-L5-left"
          ],
          "claimIds": [
            "BM03-TECH",
            "BM03-CONTEXT",
            "BM03-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "DR01",
      "title": "Inside-outside lane",
      "category": "dribbling",
      "profile": "lane",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Ball stays in the lane and is reachable.",
      "correction": "Walk and shorten touches if it runs away.",
      "limitation": "A lane is not a defender; no automatic 1v1 mastery credit.",
      "levels": [
        {
          "id": "DR01-L1",
          "ordinal": 1,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball.",
            "redirect it gently with the inside then outside of the same foot without travelling.",
            "stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR01-L1-right",
            "DR01-L1-left"
          ],
          "claimIds": [
            "DR01-TECH",
            "DR01-CONTEXT",
            "DR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR01-L2",
          "ordinal": 2,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start at one end of a clear short lane.",
            "walk forward using inside then outside contacts of the same foot.",
            "stop before the end."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR01-L2-right",
            "DR01-L2-left"
          ],
          "claimIds": [
            "DR01-TECH",
            "DR01-CONTEXT",
            "DR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR01-L3",
          "ordinal": 3,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start at one end of a clear short lane.",
            "walk using inside/outside contacts of the preferred foot, stop and turn, then return using the other foot.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR01-L3-right",
            "DR01-L3-left"
          ],
          "claimIds": [
            "DR01-TECH",
            "DR01-CONTEXT",
            "DR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR01-L4",
          "ordinal": 4,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start at a clear gently curved lane.",
            "walk along it with inside/outside contacts of one foot.",
            "stop, reset and repeat using the other foot."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR01-L4-right",
            "DR01-L4-left"
          ],
          "claimIds": [
            "DR01-TECH",
            "DR01-CONTEXT",
            "DR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR01-L5",
          "ordinal": 5,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "dribble with inside/outside contacts of one foot at a walking pace, briefly increase to a comfortable pace, then slow.",
            "stop before the end."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR01-L5-right",
            "DR01-L5-left"
          ],
          "claimIds": [
            "DR01-TECH",
            "DR01-CONTEXT",
            "DR01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "DR02",
      "title": "Gentle slalom",
      "category": "dribbling",
      "profile": "lane",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear"
      ],
      "optionalEquipment": [
        "flat_soft_markers"
      ],
      "qualityCheck": "You can stop the ball at any point.",
      "correction": "Increase gaps if turns become lunges.",
      "limitation": "Our layout; not NorCal’s timed test or scoring benchmark.",
      "levels": [
        {
          "id": "DR02-L1",
          "ordinal": 1,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside one flat marker or imagined point.",
            "walk the ball around it using small touches.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR02-L1-right",
            "DR02-L1-left"
          ],
          "claimIds": [
            "DR02-TECH",
            "DR02-CONTEXT",
            "DR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR02-L2",
          "ordinal": 2,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start before two widely spaced flat markers or imagined points.",
            "weave around both with small touches.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR02-L2-right",
            "DR02-L2-left"
          ],
          "claimIds": [
            "DR02-TECH",
            "DR02-CONTEXT",
            "DR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR02-L3",
          "ordinal": 3,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start before three widely spaced flat markers or imagined points.",
            "weave around all three with small touches.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR02-L3-right",
            "DR02-L3-left"
          ],
          "claimIds": [
            "DR02-TECH",
            "DR02-CONTEXT",
            "DR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR02-L4",
          "ordinal": 4,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start before three widely spaced flat markers or imagined points.",
            "weave around them, choose a clear left or right exit at the last point, and take one exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR02-L4-right",
            "DR02-L4-left"
          ],
          "claimIds": [
            "DR02-TECH",
            "DR02-CONTEXT",
            "DR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR02-L5",
          "ordinal": 5,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start before three widely spaced flat markers or imagined points.",
            "weave slowly through them, reset, and repeat aiming for fewer rescue touches rather than greater speed.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR02-L5-right",
            "DR02-L5-left"
          ],
          "claimIds": [
            "DR02-TECH",
            "DR02-CONTEXT",
            "DR02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "DR03",
      "title": "Stop, look, restart",
      "category": "dribbling",
      "profile": "lane",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Look at usable space before moving.",
      "correction": "If looking causes loss of control, stop fully first.",
      "limitation": "Awareness habit only. A fixed route cannot validate tactical scanning.",
      "levels": [
        {
          "id": "DR03-L1",
          "ordinal": 1,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "dribble slowly forward, stop the ball, look at the clear forward route and restart straight.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR03-L1-right",
            "DR03-L1-left"
          ],
          "claimIds": [
            "DR03-TECH",
            "DR03-CONTEXT",
            "DR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR03-L2",
          "ordinal": 2,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "dribble slowly, stop the ball, look for a clear left or right route and restart toward that route.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR03-L2-right",
            "DR03-L2-left"
          ],
          "claimIds": [
            "DR03-TECH",
            "DR03-CONTEXT",
            "DR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR03-L3",
          "ordinal": 3,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "dribble slowly, briefly inspect the intended exit before your final approach touch, stop if needed, then exit into that checked space.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR03-L3-right",
            "DR03-L3-left"
          ],
          "claimIds": [
            "DR03-TECH",
            "DR03-CONTEXT",
            "DR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR03-L4",
          "ordinal": 4,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start where two exits are clear.",
            "dribble slowly, stop and check the first exit, move toward it and stop, then check and use the second exit.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR03-L4-right",
            "DR03-L4-left"
          ],
          "claimIds": [
            "DR03-TECH",
            "DR03-CONTEXT",
            "DR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "DR03-L5",
          "ordinal": 5,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in clear space.",
            "dribble slowly, stop and inspect a safe route, then follow it.",
            "reset and choose a different inspected route on the next attempt."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "DR03-L5-right",
            "DR03-L5-left"
          ],
          "claimIds": [
            "DR03-TECH",
            "DR03-CONTEXT",
            "DR03-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "TR01",
      "title": "Pull-back turn",
      "category": "turning",
      "profile": "small",
      "requiredCapabilities": [
        "ball",
        "clear_floor"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Turn ends balanced with the ball accessible.",
      "correction": "Reduce the pull and turn angle if the ball gets trapped under you.",
      "limitation": "No blind backward sprint; check the exit first.",
      "levels": [
        {
          "id": "TR01-L1",
          "ordinal": 1,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball in front.",
            "draw it back a short distance using the sole.",
            "set your foot down and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR01-L1-right",
            "TR01-L1-left"
          ],
          "claimIds": [
            "TR01-TECH",
            "TR01-CONTEXT",
            "TR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR01-L2",
          "ordinal": 2,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball and a checked side exit.",
            "draw it back with the sole, release, turn your body a quarter-turn and take a small exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR01-L2-right",
            "TR01-L2-left"
          ],
          "claimIds": [
            "TR01-TECH",
            "TR01-CONTEXT",
            "TR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR01-L3",
          "ordinal": 3,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball and a checked route behind you.",
            "draw it back with the sole, release and turn to face the return route.",
            "take a short exit touch and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR01-L3-right",
            "TR01-L3-left"
          ],
          "claimIds": [
            "TR01-TECH",
            "TR01-CONTEXT",
            "TR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR01-L4",
          "ordinal": 4,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a clear return route.",
            "dribble slowly forward, draw the ball back with the sole, release and turn toward the checked return route.",
            "take a short exit touch and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR01-L4-right",
            "TR01-L4-left"
          ],
          "claimIds": [
            "TR01-TECH",
            "TR01-CONTEXT",
            "TR01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR01-L5",
          "ordinal": 5,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Check both possible exits before starting.",
            "choose a turning direction, approach with a slow dribble, draw the ball back with the sole, release, turn and exit in the chosen direction.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR01-L5-right",
            "TR01-L5-left"
          ],
          "claimIds": [
            "TR01-TECH",
            "TR01-CONTEXT",
            "TR01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "TR02",
      "title": "Outside cut",
      "category": "turning",
      "profile": "lane",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Exit touch does not require a chase.",
      "correction": "Use a smaller angle and slower approach if you overrun the ball.",
      "limitation": "Task design uses an outside cut, not every possible version of a chop.",
      "levels": [
        {
          "id": "TR02-L1",
          "ordinal": 1,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball and a clear side lane.",
            "redirect the ball gently with the outside of one foot.",
            "follow it and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR02-L1-right",
            "TR02-L1-left"
          ],
          "claimIds": [
            "TR02-TECH",
            "TR02-CONTEXT",
            "TR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR02-L2",
          "ordinal": 2,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "walk the ball forward, redirect it to the side with the outside of one foot and follow it.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR02-L2-right",
            "TR02-L2-left"
          ],
          "claimIds": [
            "TR02-TECH",
            "TR02-CONTEXT",
            "TR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR02-L3",
          "ordinal": 3,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "walk forward and use the outside of your less-preferred foot to redirect the ball into a checked side lane.",
            "follow and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR02-L3-right",
            "TR02-L3-left"
          ],
          "claimIds": [
            "TR02-TECH",
            "TR02-CONTEXT",
            "TR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR02-L4",
          "ordinal": 4,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "walk forward, cut sideways with the outside of one foot and take two controlled exit touches.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR02-L4-right",
            "TR02-L4-left"
          ],
          "claimIds": [
            "TR02-TECH",
            "TR02-CONTEXT",
            "TR02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR02-L5",
          "ordinal": 5,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start in a clear lane.",
            "walk forward and perform a shallow outside-foot cut, stop and reset.",
            "on the next attempt use a sharper comfortable angle, follow and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "TR02-L5-right",
            "TR02-L5-left"
          ],
          "claimIds": [
            "TR02-TECH",
            "TR02-CONTEXT",
            "TR02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "TR03",
      "title": "Cruyff foundation",
      "category": "turning",
      "profile": "lane",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "No crossed-leg stumble; the exit remains reachable.",
      "correction": "Separate the fake, redirection and turn before joining them.",
      "limitation": "Detailed mechanics are a proposed storyboard pending video and coach review; no guaranteed deception outcome.",
      "levels": [
        {
          "id": "TR03-L1",
          "ordinal": 1,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball.",
            "slowly redirect it behind the support leg using the inside of the other foot, then stop and reset your stance."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "TR01-L3",
            "DR01-L1"
          ],
          "components": [],
          "demoIds": [
            "TR03-L1-right",
            "TR03-L1-left"
          ],
          "claimIds": [
            "TR03-TECH",
            "TR03-CONTEXT",
            "TR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR03-L2",
          "ordinal": 2,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball.",
            "rehearse a fake kick, redirect the ball behind the support leg with the inside of the kicking foot, then stop and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "TR01-L3",
            "DR01-L1"
          ],
          "components": [],
          "demoIds": [
            "TR03-L2-right",
            "TR03-L2-left"
          ],
          "claimIds": [
            "TR03-TECH",
            "TR03-CONTEXT",
            "TR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR03-L3",
          "ordinal": 3,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball with the exit checked.",
            "fake a kick, redirect behind the support leg with the inside of the kicking foot, turn and take one controlled exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "TR01-L3",
            "DR01-L1"
          ],
          "components": [],
          "demoIds": [
            "TR03-L3-right",
            "TR03-L3-left"
          ],
          "claimIds": [
            "TR03-TECH",
            "TR03-CONTEXT",
            "TR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR03-L4",
          "ordinal": 4,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the exit checked.",
            "approach at walking pace, fake a kick, redirect behind the support leg with the inside of the kicking foot, turn and take one controlled exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "TR01-L3",
            "DR01-L1"
          ],
          "components": [],
          "demoIds": [
            "TR03-L4-right",
            "TR03-L4-left"
          ],
          "claimIds": [
            "TR03-TECH",
            "TR03-CONTEXT",
            "TR03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "TR03-L5",
          "ordinal": 5,
          "setup": "About 2 x 4 m, including room to stop and turn.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with the exit checked.",
            "perform a walking fake-kick, inside-foot redirection behind the support leg, turn and controlled exit.",
            "stop and reset, then repeat with the other kicking foot."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "TR01-L3",
            "DR01-L1"
          ],
          "components": [],
          "demoIds": [
            "TR03-L5-right",
            "TR03-L5-left"
          ],
          "claimIds": [
            "TR03-TECH",
            "TR03-CONTEXT",
            "TR03-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "PA01",
      "title": "Ground target pass",
      "category": "passing",
      "profile": "target",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "lane_clear",
        "safe_runout",
        "safe_target",
        "backstop"
      ],
      "optionalEquipment": [
        "flat_soft_markers"
      ],
      "qualityCheck": "Ball travels toward the selected gate on the ground.",
      "correction": "Move closer and widen the gate if contact is inconsistent.",
      "limitation": "Distance and gate width are personal settings, not age standards.",
      "levels": [
        {
          "id": "PA01-L1",
          "ordinal": 1,
          "setup": "About 2 x 4 m plus safe runout; gentle ground passing only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball facing a wide nearby ground gate and safe runout.",
            "pass gently through it with the inside of one foot.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA01-L1-right",
            "PA01-L1-left"
          ],
          "claimIds": [
            "PA01-TECH",
            "PA01-CONTEXT",
            "PA01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA01-L2",
          "ordinal": 2,
          "setup": "About 2 x 4 m plus safe runout; gentle ground passing only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball facing a wide nearby ground gate and safe runout.",
            "pass gently through it with the inside of your less-preferred foot.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA01-L2-right",
            "PA01-L2-left"
          ],
          "claimIds": [
            "PA01-TECH",
            "PA01-CONTEXT",
            "PA01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA01-L3",
          "ordinal": 3,
          "setup": "About 2 x 4 m plus safe runout; gentle ground passing only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball facing a slightly narrower comfortable ground gate and safe runout.",
            "pass gently with the inside of one foot.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA01-L3-right",
            "PA01-L3-left"
          ],
          "claimIds": [
            "PA01-TECH",
            "PA01-CONTEXT",
            "PA01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA01-L4",
          "ordinal": 4,
          "setup": "About 2 x 4 m plus safe runout; gentle ground passing only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball facing two safe ground gates.",
            "choose one before moving, then pass gently toward it with the inside of one foot.",
            "retrieve and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA01-L4-right",
            "PA01-L4-left"
          ],
          "claimIds": [
            "PA01-TECH",
            "PA01-CONTEXT",
            "PA01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA01-L5",
          "ordinal": 5,
          "setup": "About 2 x 4 m plus safe runout; gentle ground passing only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start facing a safe ground gate.",
            "take one gentle preparation touch, pass the rolling ball through the gate with the inside of one foot, then retrieve and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA01-L5-right",
            "PA01-L5-left"
          ],
          "claimIds": [
            "PA01-TECH",
            "PA01-CONTEXT",
            "PA01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "PA02",
      "title": "Two-touch wall rhythm",
      "category": "passing",
      "profile": "wall",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "permitted_wall",
        "safe_rebound"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Receiving touch leaves a comfortable next pass.",
      "correction": "Reduce force or move to a distance with a manageable rebound.",
      "limitation": "No wall: use PA01; this changes the receiving stimulus and must be disclosed.",
      "levels": [
        {
          "id": "PA02-L1",
          "ordinal": 1,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently to it, stop the return with your foot and reset without another immediate pass."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA02-L1-right",
            "PA02-L1-left"
          ],
          "claimIds": [
            "PA02-TECH",
            "PA02-CONTEXT",
            "PA02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA02-L2",
          "ordinal": 2,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, settle the return with your preferred foot, then pass with that foot.",
            "stop the next return."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA02-L2-right",
            "PA02-L2-left"
          ],
          "claimIds": [
            "PA02-TECH",
            "PA02-CONTEXT",
            "PA02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA02-L3",
          "ordinal": 3,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, settle the return with your less-preferred foot, then pass with that foot.",
            "stop the next return."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA02-L3-right",
            "PA02-L3-left"
          ],
          "claimIds": [
            "PA02-TECH",
            "PA02-CONTEXT",
            "PA02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA02-L4",
          "ordinal": 4,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, settle the return with one foot, then pass with the other foot.",
            "stop the next return."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA02-L4-right",
            "PA02-L4-left"
          ],
          "claimIds": [
            "PA02-TECH",
            "PA02-CONTEXT",
            "PA02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA02-L5",
          "ordinal": 5,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass, settle and pass again with a foot of your choice, then stop.",
            "move your starting position slightly, check the new rebound route and repeat."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "PA02-L5-right",
            "PA02-L5-left"
          ],
          "claimIds": [
            "PA02-TECH",
            "PA02-CONTEXT",
            "PA02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "PA03",
      "title": "One-touch wall return",
      "category": "passing",
      "profile": "wall",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "permitted_wall",
        "safe_rebound"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Clean contact matters more than uninterrupted count.",
      "correction": "Return to PA02 if timing forces rushed swings.",
      "limitation": "Only after comfortable two-touch work; no mandatory long streak.",
      "levels": [
        {
          "id": "PA03-L1",
          "ordinal": 1,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "send a gentle pass, return the rebound with one inside-foot touch, then stop the next rebound."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "PA02-L2"
          ],
          "components": [],
          "demoIds": [
            "PA03-L1-right",
            "PA03-L1-left"
          ],
          "claimIds": [
            "PA03-TECH",
            "PA03-CONTEXT",
            "PA03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA03-L2",
          "ordinal": 2,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "send a gentle pass, make two successive one-touch inside-foot returns, then stop the ball."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "PA02-L2"
          ],
          "components": [],
          "demoIds": [
            "PA03-L2-right",
            "PA03-L2-left"
          ],
          "claimIds": [
            "PA03-TECH",
            "PA03-CONTEXT",
            "PA03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA03-L3",
          "ordinal": 3,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "send a gentle pass, make a short comfortable sequence of one-touch inside-foot returns using the preferred foot, then stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "PA02-L2"
          ],
          "components": [],
          "demoIds": [
            "PA03-L3-right",
            "PA03-L3-left"
          ],
          "claimIds": [
            "PA03-TECH",
            "PA03-CONTEXT",
            "PA03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA03-L4",
          "ordinal": 4,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "send a gentle pass, make a short comfortable sequence of one-touch inside-foot returns using the less-preferred foot, then stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "PA02-L2"
          ],
          "components": [],
          "demoIds": [
            "PA03-L4-right",
            "PA03-L4-left"
          ],
          "claimIds": [
            "PA03-TECH",
            "PA03-CONTEXT",
            "PA03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "PA03-L5",
          "ordinal": 5,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "send a gentle pass, alternate feet for a short sequence of one-touch inside-foot returns, then stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "PA02-L2"
          ],
          "components": [],
          "demoIds": [
            "PA03-L5-right",
            "PA03-L5-left"
          ],
          "claimIds": [
            "PA03-TECH",
            "PA03-CONTEXT",
            "PA03-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "RC01",
      "title": "Receive into an exit lane",
      "category": "first_touch",
      "profile": "wall",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "permitted_wall",
        "safe_rebound"
      ],
      "optionalEquipment": [],
      "qualityCheck": "First touch prepares a reachable next action.",
      "correction": "Widen the lane and slow the service if the ball crosses your feet awkwardly.",
      "limitation": "Predetermined lane choice rehearses technique, not reading opponent pressure.",
      "levels": [
        {
          "id": "RC01-L1",
          "ordinal": 1,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently to it, receive the return with your foot and stop it close enough for a comfortable next touch."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC01-L1-right",
            "RC01-L1-left"
          ],
          "claimIds": [
            "RC01-TECH",
            "RC01-CONTEXT",
            "RC01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC01-L2",
          "ordinal": 2,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start by checking one clear side lane beside a permitted rebound wall.",
            "pass gently to the wall, guide the return with your first touch into that lane and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC01-L2-right",
            "RC01-L2-left"
          ],
          "claimIds": [
            "RC01-TECH",
            "RC01-CONTEXT",
            "RC01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC01-L3",
          "ordinal": 3,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start by checking the opposite side lane beside a permitted rebound wall.",
            "pass gently to the wall, guide the return with your first touch into that lane and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC01-L3-right",
            "RC01-L3-left"
          ],
          "claimIds": [
            "RC01-TECH",
            "RC01-CONTEXT",
            "RC01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC01-L4",
          "ordinal": 4,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with two clear side lanes beside a permitted rebound wall.",
            "choose one before serving, pass gently, guide the return with your first touch into the chosen lane and stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC01-L4-right",
            "RC01-L4-left"
          ],
          "claimIds": [
            "RC01-TECH",
            "RC01-CONTEXT",
            "RC01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC01-L5",
          "ordinal": 5,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a permitted rebound wall with a checked side lane.",
            "pass gently, guide the return with your first touch into the lane, then pass gently back to the wall.",
            "stop the return."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC01-L5-right",
            "RC01-L5-left"
          ],
          "claimIds": [
            "RC01-TECH",
            "RC01-CONTEXT",
            "RC01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "RC02",
      "title": "Receive, roll, pass",
      "category": "first_touch",
      "profile": "wall",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "permitted_wall",
        "safe_rebound"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Each of the three actions stays distinct and balanced.",
      "correction": "Pause between actions instead of speeding through a tangled stance.",
      "limitation": "Wall adaptation of a two-player source; not a source-authored solo routine.",
      "levels": [
        {
          "id": "RC02-L1",
          "ordinal": 1,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently to it and stop its ground return lightly under one sole.",
            "put your foot down and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC02-L1-right",
            "RC02-L1-left"
          ],
          "claimIds": [
            "RC02-TECH",
            "RC02-CONTEXT",
            "RC02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC02-L2",
          "ordinal": 2,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, receive under one sole, roll across into a comfortable position and stop.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC02-L2-right",
            "RC02-L2-left"
          ],
          "claimIds": [
            "RC02-TECH",
            "RC02-CONTEXT",
            "RC02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC02-L3",
          "ordinal": 3,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, receive under one sole, roll across and pass with the opposite inside foot.",
            "stop the next return."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC02-L3-right",
            "RC02-L3-left"
          ],
          "claimIds": [
            "RC02-TECH",
            "RC02-CONTEXT",
            "RC02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC02-L4",
          "ordinal": 4,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, receive using the less-preferred sole, roll across and pass with the opposite inside foot.",
            "stop the next return."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC02-L4-right",
            "RC02-L4-left"
          ],
          "claimIds": [
            "RC02-TECH",
            "RC02-CONTEXT",
            "RC02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "RC02-L5",
          "ordinal": 5,
          "setup": "About 3 x 4 m; comfortable rebound distance, clear of glass, people and hazards.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start a comfortable distance from a permitted rebound wall.",
            "pass gently, receive under one sole, roll across and pass with the opposite inside foot.",
            "stop and reset, then repeat the full sequence."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "RC02-L5-right",
            "RC02-L5-left"
          ],
          "claimIds": [
            "RC02-TECH",
            "RC02-CONTEXT",
            "RC02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "JU01",
      "title": "Drop, touch, catch",
      "category": "aerial_control",
      "profile": "aerial",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "overhead_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Ball stays near the body.",
      "correction": "Lower the release and allow a bounce if control is difficult.",
      "limitation": "Beginner regression is our design. No heading, high kicks or required count.",
      "levels": [
        {
          "id": "JU01-L1",
          "ordinal": 1,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop it, allow one bounce, make one gentle upward foot touch and catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU01-L1-right",
            "JU01-L1-left"
          ],
          "claimIds": [
            "JU01-TECH",
            "JU01-CONTEXT",
            "JU01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU01-L2",
          "ordinal": 2,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop it, make one gentle upward foot touch before it bounces and catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU01-L2-right",
            "JU01-L2-left"
          ],
          "claimIds": [
            "JU01-TECH",
            "JU01-CONTEXT",
            "JU01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU01-L3",
          "ordinal": 3,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop it, make one gentle upward touch with the less-preferred foot before it bounces and catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU01-L3-right",
            "JU01-L3-left"
          ],
          "claimIds": [
            "JU01-TECH",
            "JU01-CONTEXT",
            "JU01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU01-L4",
          "ordinal": 4,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop it, make two gentle upward foot touches without a bounce, then catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU01-L4-right",
            "JU01-L4-left"
          ],
          "claimIds": [
            "JU01-TECH",
            "JU01-CONTEXT",
            "JU01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU01-L5",
          "ordinal": 5,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop, make one gentle upward foot touch without a bounce and catch.",
            "reset and repeat with the opposite starting foot."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU01-L5-right",
            "JU01-L5-left"
          ],
          "claimIds": [
            "JU01-TECH",
            "JU01-CONTEXT",
            "JU01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "JU02",
      "title": "Bounce juggling",
      "category": "aerial_control",
      "profile": "aerial",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "overhead_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Bounce and touch remain controlled inside the available space.",
      "correction": "Catch after each touch when repeated attempts become a chase.",
      "limitation": "Juggling count is personal feedback, not evidence of overall soccer ability.",
      "levels": [
        {
          "id": "JU02-L1",
          "ordinal": 1,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop, allow one bounce, make one gentle upward foot touch, then catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU02-L1-right",
            "JU02-L1-left"
          ],
          "claimIds": [
            "JU02-TECH",
            "JU02-CONTEXT",
            "JU02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU02-L2",
          "ordinal": 2,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop, bounce and touch upward, allow another bounce and touch upward again, then catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU02-L2-right",
            "JU02-L2-left"
          ],
          "claimIds": [
            "JU02-TECH",
            "JU02-CONTEXT",
            "JU02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU02-L3",
          "ordinal": 3,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop, bounce and touch upward with the less-preferred foot, allow another bounce and touch with the same foot, then catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU02-L3-right",
            "JU02-L3-left"
          ],
          "claimIds": [
            "JU02-TECH",
            "JU02-CONTEXT",
            "JU02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU02-L4",
          "ordinal": 4,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop and allow a bounce before every gentle upward touch, alternating feet for a short comfortable sequence.",
            "catch and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU02-L4-right",
            "JU02-L4-left"
          ],
          "claimIds": [
            "JU02-TECH",
            "JU02-CONTEXT",
            "JU02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU02-L5",
          "ordinal": 5,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop, bounce and touch upward, make one further upward foot touch before a bounce, then catch.",
            "reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU02-L5-right",
            "JU02-L5-left"
          ],
          "claimIds": [
            "JU02-TECH",
            "JU02-CONTEXT",
            "JU02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "JU03",
      "title": "Air touch to ground control",
      "category": "aerial_control",
      "profile": "aerial",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "overhead_clear"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Ground control prepares the exit without a chase.",
      "correction": "Use a lower drop and a full stop before exiting.",
      "limitation": "Self-service is more predictable than receiving a match pass.",
      "levels": [
        {
          "id": "JU03-L1",
          "ordinal": 1,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space.",
            "drop, allow one bounce, then use a gentle foot touch to settle the ball onto the floor.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU03-L1-right",
            "JU03-L1-left"
          ],
          "claimIds": [
            "JU03-TECH",
            "JU03-CONTEXT",
            "JU03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU03-L2",
          "ordinal": 2,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space and a checked exit.",
            "drop, bounce, settle with a gentle foot touch, then take one short dribbling exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU03-L2-right",
            "JU03-L2-left"
          ],
          "claimIds": [
            "JU03-TECH",
            "JU03-CONTEXT",
            "JU03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU03-L3",
          "ordinal": 3,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space and a checked exit.",
            "drop, bounce, settle using the less-preferred foot, then take one short exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU03-L3-right",
            "JU03-L3-left"
          ],
          "claimIds": [
            "JU03-TECH",
            "JU03-CONTEXT",
            "JU03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU03-L4",
          "ordinal": 4,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space and two checked exits.",
            "choose one, drop, bounce, settle with a gentle foot touch and dribble one touch into that exit.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU03-L4-right",
            "JU03-L4-left"
          ],
          "claimIds": [
            "JU03-TECH",
            "JU03-CONTEXT",
            "JU03-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "JU03-L5",
          "ordinal": 5,
          "setup": "About 3 x 3 m plus clear overhead space; low self-service only.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start holding the ball low with clear overhead space and a checked exit.",
            "drop, make one gentle upward foot touch, allow a bounce, settle with a gentle foot touch and take one short exit touch.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "JU03-L5-right",
            "JU03-L5-left"
          ],
          "claimIds": [
            "JU03-TECH",
            "JU03-CONTEXT",
            "JU03-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "FI01",
      "title": "Placed finish foundation",
      "category": "finishing",
      "profile": "outdoor",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "outdoor_clear",
        "safe_runout",
        "safe_target",
        "backstop"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Placement and balance remain consistent.",
      "correction": "Move closer or enlarge target instead of demanding more power.",
      "limitation": "Original task, not a copy of the source’s power exercise. No keeper-reading claim.",
      "levels": [
        {
          "id": "FI01-L1",
          "ordinal": 1,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball facing a wide safe outdoor ground target.",
            "strike gently toward it with the inside of one foot.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI01-L1-right",
            "FI01-L1-left"
          ],
          "claimIds": [
            "FI01-TECH",
            "FI01-CONTEXT",
            "FI01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI01-L2",
          "ordinal": 2,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball facing a wide safe outdoor ground target.",
            "strike gently toward it with the inside of the less-preferred foot.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI01-L2-right",
            "FI01-L2-left"
          ],
          "claimIds": [
            "FI01-TECH",
            "FI01-CONTEXT",
            "FI01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI01-L3",
          "ordinal": 3,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball facing a smaller comfortable safe outdoor ground target.",
            "strike gently toward it with the inside of one foot.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI01-L3-right",
            "FI01-L3-left"
          ],
          "claimIds": [
            "FI01-TECH",
            "FI01-CONTEXT",
            "FI01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI01-L4",
          "ordinal": 4,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start facing a safe outdoor ground target.",
            "take one preparation touch and make a gentle inside-foot finish toward the target.",
            "retrieve calmly and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI01-L4-right",
            "FI01-L4-left"
          ],
          "claimIds": [
            "FI01-TECH",
            "FI01-CONTEXT",
            "FI01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI01-L5",
          "ordinal": 5,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball facing two safe outdoor ground target zones.",
            "choose one, finish gently with the inside of one foot and reset.",
            "choose the other zone for the next attempt."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI01-L5-right",
            "FI01-L5-left"
          ],
          "claimIds": [
            "FI01-TECH",
            "FI01-CONTEXT",
            "FI01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "FI02",
      "title": "Controlled laces contact",
      "category": "finishing",
      "profile": "outdoor",
      "requiredCapabilities": [
        "ball",
        "clear_floor",
        "outdoor_clear",
        "safe_runout",
        "safe_target",
        "backstop"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Clean contact without pain or loss of balance.",
      "correction": "Reduce approach and effort; ask a coach if contact stays uncomfortable.",
      "limitation": "Coach-review priority. Not a strength, shot-speed or maximum-distance test.",
      "levels": [
        {
          "id": "FI02-L1",
          "ordinal": 1,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball facing a safe outdoor target.",
            "without a run-up, make a low-effort laces contact with a firm ankle, let the leg follow through comfortably and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI02-L1-right",
            "FI02-L1-left"
          ],
          "claimIds": [
            "FI02-TECH",
            "FI02-CONTEXT",
            "FI02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI02-L2",
          "ordinal": 2,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start one comfortable step from a still ball facing a safe outdoor target.",
            "take that step and make a low-effort laces contact with a firm ankle, follow through comfortably and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI02-L2-right",
            "FI02-L2-left"
          ],
          "claimIds": [
            "FI02-TECH",
            "FI02-CONTEXT",
            "FI02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI02-L3",
          "ordinal": 3,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start beside a still ball facing a safe outdoor target.",
            "without a run-up, make a gentle laces contact using the less-preferred foot and a firm ankle, follow through comfortably and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI02-L3-right",
            "FI02-L3-left"
          ],
          "claimIds": [
            "FI02-TECH",
            "FI02-CONTEXT",
            "FI02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI02-L4",
          "ordinal": 4,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start facing a safe outdoor target.",
            "roll the ball slowly into a comfortable striking position, make a gentle laces contact with a firm ankle, follow through and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI02-L4-right",
            "FI02-L4-left"
          ],
          "claimIds": [
            "FI02-TECH",
            "FI02-CONTEXT",
            "FI02-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "FI02-L5",
          "ordinal": 5,
          "setup": "Clear outdoor target lane and safe runout; never infer safety from dimensions alone.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start one comfortable step from a still ball facing two safe outdoor target zones.",
            "choose a zone before stepping, then make a gentle laces contact with a firm ankle toward it.",
            "follow through and reset."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [],
          "components": [],
          "demoIds": [
            "FI02-L5-right",
            "FI02-L5-left"
          ],
          "claimIds": [
            "FI02-TECH",
            "FI02-CONTEXT",
            "FI02-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    },
    {
      "id": "CO01",
      "title": "Choose your combination",
      "category": "ball_control",
      "profile": "small",
      "requiredCapabilities": [
        "ball",
        "clear_floor"
      ],
      "optionalEquipment": [],
      "qualityCheck": "Both component skills remain recognizable.",
      "correction": "Split the sequence again if the transition loses control.",
      "limitation": "Creative variation is not a new independent skill family or tactical mastery.",
      "levels": [
        {
          "id": "CO01-L1",
          "ordinal": 1,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "transfer the ball once using the inside of one foot.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "BM01-L1"
          ],
          "components": [
            "BM01-L1"
          ],
          "demoIds": [
            "CO01-L1-right",
            "CO01-L1-left"
          ],
          "claimIds": [
            "CO01-TECH",
            "CO01-CONTEXT",
            "CO01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "CO01-L2",
          "ordinal": 2,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "transfer the ball once with an inside-foot touch, stop and reset your stance, then lightly roll it sideways with one sole and put that foot down.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "BM01-L1",
            "BM02-L1"
          ],
          "components": [
            "BM01-L1",
            "BM02-L1"
          ],
          "demoIds": [
            "CO01-L2-right",
            "CO01-L2-left"
          ],
          "claimIds": [
            "CO01-TECH",
            "CO01-CONTEXT",
            "CO01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "CO01-L3",
          "ordinal": 3,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "transfer the ball once with an inside-foot touch, then lightly roll it sideways with one sole and put that foot down.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "BM01-L1",
            "BM02-L1"
          ],
          "components": [
            "BM01-L1",
            "BM02-L1"
          ],
          "demoIds": [
            "CO01-L3-right",
            "CO01-L3-left"
          ],
          "claimIds": [
            "CO01-TECH",
            "CO01-CONTEXT",
            "CO01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "CO01-L4",
          "ordinal": 4,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "lightly roll the ball sideways with one sole, put that foot down, then transfer the ball once using the inside of the other foot.",
            "stop."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "BM01-L1",
            "BM02-L1"
          ],
          "components": [
            "BM01-L1",
            "BM02-L1"
          ],
          "demoIds": [
            "CO01-L4-right",
            "CO01-L4-left"
          ],
          "claimIds": [
            "CO01-TECH",
            "CO01-CONTEXT",
            "CO01-DESIGN"
          ],
          "releaseStatus": "draft"
        },
        {
          "id": "CO01-L5",
          "ordinal": 5,
          "setup": "About 2 x 2 m; simplify or stop if reach/balance is uncomfortable.",
          "startingState": "Ball at rest or held low as explicitly specified in steps; check the route before starting.",
          "steps": [
            "Start with a still ball.",
            "choose either one inside-foot transfer followed by one light sideways sole roll, or the reverse order.",
            "perform both slowly with your weight supported on the floor, put the rolling foot down, stop and name the order you chose."
          ],
          "endingState": "Stop the ball or catch it as specified, then reset comfortably.",
          "footMode": "Repeat the specified sequence with the other starting foot only when comfortable; preferred and less-preferred labels follow the learner.",
          "prerequisites": [
            "BM01-L1",
            "BM02-L1"
          ],
          "components": [
            "BM01-L1",
            "BM02-L1"
          ],
          "demoIds": [
            "CO01-L5-right",
            "CO01-L5-left"
          ],
          "claimIds": [
            "CO01-TECH",
            "CO01-CONTEXT",
            "CO01-DESIGN"
          ],
          "releaseStatus": "draft"
        }
      ]
    }
  ],
  "demos": [
    {
      "id": "BM01-L1-right",
      "levelId": "BM01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L1-left",
      "levelId": "BM01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L2-right",
      "levelId": "BM01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L2-left",
      "levelId": "BM01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L3-right",
      "levelId": "BM01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L3-left",
      "levelId": "BM01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L4-right",
      "levelId": "BM01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L4-left",
      "levelId": "BM01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L5-right",
      "levelId": "BM01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM01-L5-left",
      "levelId": "BM01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show alternate inside-foot contacts, grounded support foot and a visible pause; never teleport the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L1-right",
      "levelId": "BM02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L1-left",
      "levelId": "BM02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L2-right",
      "levelId": "BM02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L2-left",
      "levelId": "BM02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L3-right",
      "levelId": "BM02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L3-left",
      "levelId": "BM02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L4-right",
      "levelId": "BM02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L4-left",
      "levelId": "BM02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L5-right",
      "levelId": "BM02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM02-L5-left",
      "levelId": "BM02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show sole contact during the roll and release before the next contact. No standing on the ball.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L1-right",
      "levelId": "BM03-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L1-left",
      "levelId": "BM03-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L2-right",
      "levelId": "BM03-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L2-left",
      "levelId": "BM03-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L3-right",
      "levelId": "BM03-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L3-left",
      "levelId": "BM03-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L4-right",
      "levelId": "BM03-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L4-left",
      "levelId": "BM03-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L5-right",
      "levelId": "BM03-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "BM03-L5-left",
      "levelId": "BM03-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Foot remains in plausible rolling contact; support leg stays balanced.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L1-right",
      "levelId": "DR01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L1-left",
      "levelId": "DR01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L2-right",
      "levelId": "DR01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L2-left",
      "levelId": "DR01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L3-right",
      "levelId": "DR01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L3-left",
      "levelId": "DR01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L4-right",
      "levelId": "DR01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L4-left",
      "levelId": "DR01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L5-right",
      "levelId": "DR01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR01-L5-left",
      "levelId": "DR01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Contact alternates on the SAME foot within a run; return leg uses the other foot.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L1-right",
      "levelId": "DR02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L1-left",
      "levelId": "DR02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L2-right",
      "levelId": "DR02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L2-left",
      "levelId": "DR02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L3-right",
      "levelId": "DR02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L3-left",
      "levelId": "DR02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L4-right",
      "levelId": "DR02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L4-left",
      "levelId": "DR02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L5-right",
      "levelId": "DR02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR02-L5-left",
      "levelId": "DR02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Ball and feet pass around each marker; avoid clipping through obstacles.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L1-right",
      "levelId": "DR03-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L1-left",
      "levelId": "DR03-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L2-right",
      "levelId": "DR03-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L2-left",
      "levelId": "DR03-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L3-right",
      "levelId": "DR03-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L3-left",
      "levelId": "DR03-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L4-right",
      "levelId": "DR03-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L4-left",
      "levelId": "DR03-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L5-right",
      "levelId": "DR03-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "DR03-L5-left",
      "levelId": "DR03-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Head check occurs when it can inform the next action; ball remains visible.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L1-right",
      "levelId": "TR01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L1-left",
      "levelId": "TR01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L2-right",
      "levelId": "TR01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L2-left",
      "levelId": "TR01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L3-right",
      "levelId": "TR01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L3-left",
      "levelId": "TR01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L4-right",
      "levelId": "TR01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L4-left",
      "levelId": "TR01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L5-right",
      "levelId": "TR01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR01-L5-left",
      "levelId": "TR01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show pull contact, foot release, body turn and exit separately.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L1-right",
      "levelId": "TR02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L1-left",
      "levelId": "TR02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L2-right",
      "levelId": "TR02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L2-left",
      "levelId": "TR02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L3-right",
      "levelId": "TR02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L3-left",
      "levelId": "TR02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L4-right",
      "levelId": "TR02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L4-left",
      "levelId": "TR02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L5-right",
      "levelId": "TR02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR02-L5-left",
      "levelId": "TR02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Outside contact must be visible; no inside-foot animation under this label.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L1-right",
      "levelId": "TR03-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L1-left",
      "levelId": "TR03-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L2-right",
      "levelId": "TR03-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L2-left",
      "levelId": "TR03-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L3-right",
      "levelId": "TR03-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L3-left",
      "levelId": "TR03-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L4-right",
      "levelId": "TR03-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L4-left",
      "levelId": "TR03-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L5-right",
      "levelId": "TR03-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "TR03-L5-left",
      "levelId": "TR03-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Close view must prove inside contact and path behind support leg; compare source video before approval.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L1-right",
      "levelId": "PA01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L1-left",
      "levelId": "PA01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L2-right",
      "levelId": "PA01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L2-left",
      "levelId": "PA01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L3-right",
      "levelId": "PA01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L3-left",
      "levelId": "PA01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L4-right",
      "levelId": "PA01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L4-left",
      "levelId": "PA01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L5-right",
      "levelId": "PA01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA01-L5-left",
      "levelId": "PA01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show support foot beside the ball and inside contact; gate stays fixed during flight.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L1-right",
      "levelId": "PA02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L1-left",
      "levelId": "PA02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L2-right",
      "levelId": "PA02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L2-left",
      "levelId": "PA02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L3-right",
      "levelId": "PA02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L3-left",
      "levelId": "PA02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L4-right",
      "levelId": "PA02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L4-left",
      "levelId": "PA02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L5-right",
      "levelId": "PA02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA02-L5-left",
      "levelId": "PA02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Separate receive and pass contacts; wall rebound must follow collision, not reverse early.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L1-right",
      "levelId": "PA03-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L1-left",
      "levelId": "PA03-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L2-right",
      "levelId": "PA03-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L2-left",
      "levelId": "PA03-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L3-right",
      "levelId": "PA03-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L3-left",
      "levelId": "PA03-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L4-right",
      "levelId": "PA03-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L4-left",
      "levelId": "PA03-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L5-right",
      "levelId": "PA03-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "PA03-L5-left",
      "levelId": "PA03-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Exactly one contact per return, with realistic repositioning between contacts.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L1-right",
      "levelId": "RC01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L1-left",
      "levelId": "RC01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L2-right",
      "levelId": "RC01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L2-left",
      "levelId": "RC01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L3-right",
      "levelId": "RC01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L3-left",
      "levelId": "RC01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L4-right",
      "levelId": "RC01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L4-left",
      "levelId": "RC01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L5-right",
      "levelId": "RC01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC01-L5-left",
      "levelId": "RC01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show arrival, receiving contact, redirection and next step without a hidden extra touch.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L1-right",
      "levelId": "RC02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L1-left",
      "levelId": "RC02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L2-right",
      "levelId": "RC02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L2-left",
      "levelId": "RC02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L3-right",
      "levelId": "RC02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L3-left",
      "levelId": "RC02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L4-right",
      "levelId": "RC02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L4-left",
      "levelId": "RC02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L5-right",
      "levelId": "RC02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "RC02-L5-left",
      "levelId": "RC02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Three visible contacts/actions: sole receive, sole roll, opposite inside-foot pass.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L1-right",
      "levelId": "JU01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L1-left",
      "levelId": "JU01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L2-right",
      "levelId": "JU01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L2-left",
      "levelId": "JU01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L3-right",
      "levelId": "JU01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L3-left",
      "levelId": "JU01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L4-right",
      "levelId": "JU01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L4-left",
      "levelId": "JU01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L5-right",
      "levelId": "JU01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU01-L5-left",
      "levelId": "JU01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show gravity, actual foot contact and catch; no levitation or snap-to-foot.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L1-right",
      "levelId": "JU02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L1-left",
      "levelId": "JU02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L2-right",
      "levelId": "JU02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L2-left",
      "levelId": "JU02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L3-right",
      "levelId": "JU02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L3-left",
      "levelId": "JU02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L4-right",
      "levelId": "JU02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L4-left",
      "levelId": "JU02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L5-right",
      "levelId": "JU02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU02-L5-left",
      "levelId": "JU02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Every declared bounce reaches the floor; each foot touch causes a plausible trajectory change.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L1-right",
      "levelId": "JU03-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L1-left",
      "levelId": "JU03-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L2-right",
      "levelId": "JU03-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L2-left",
      "levelId": "JU03-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L3-right",
      "levelId": "JU03-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L3-left",
      "levelId": "JU03-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L4-right",
      "levelId": "JU03-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L4-left",
      "levelId": "JU03-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L5-right",
      "levelId": "JU03-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "JU03-L5-left",
      "levelId": "JU03-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Air-to-ground transition cannot teleport; show bounce and controlled exit.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L1-right",
      "levelId": "FI01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L1-left",
      "levelId": "FI01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L2-right",
      "levelId": "FI01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L2-left",
      "levelId": "FI01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L3-right",
      "levelId": "FI01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L3-left",
      "levelId": "FI01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L4-right",
      "levelId": "FI01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L4-left",
      "levelId": "FI01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L5-right",
      "levelId": "FI01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI01-L5-left",
      "levelId": "FI01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Inside-foot finish remains visually distinct from a laces strike.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L1-right",
      "levelId": "FI02-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L1-left",
      "levelId": "FI02-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L2-right",
      "levelId": "FI02-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L2-left",
      "levelId": "FI02-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L3-right",
      "levelId": "FI02-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L3-left",
      "levelId": "FI02-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L4-right",
      "levelId": "FI02-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L4-left",
      "levelId": "FI02-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L5-right",
      "levelId": "FI02-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "FI02-L5-left",
      "levelId": "FI02-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Show laces rather than inside contact, support leg and follow-through; no required airborne phase.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L1-right",
      "levelId": "CO01-L1",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L1-left",
      "levelId": "CO01-L1",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L2-right",
      "levelId": "CO01-L2",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L2-left",
      "levelId": "CO01-L2",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L3-right",
      "levelId": "CO01-L3",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L3-left",
      "levelId": "CO01-L3",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L4-right",
      "levelId": "CO01-L4",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L4-left",
      "levelId": "CO01-L4",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L5-right",
      "levelId": "CO01-L5",
      "side": "right",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    },
    {
      "id": "CO01-L5-left",
      "levelId": "CO01-L5",
      "side": "left",
      "assetPath": null,
      "assetSha256": null,
      "captionSha256": null,
      "status": "not_created",
      "checkpoint": "Use approved component animations and show a physically continuous transition.",
      "videoReviewed": false
    }
  ],
  "sessionTemplates": [
    {
      "focus": "ball_control",
      "slots": [
        {
          "index": 0,
          "families": [
            "BM01",
            "BM02"
          ]
        },
        {
          "index": 1,
          "families": [
            "BM01",
            "BM03"
          ]
        },
        {
          "index": 2,
          "families": [
            "BM02",
            "CO01"
          ]
        }
      ]
    },
    {
      "focus": "dribbling",
      "slots": [
        {
          "index": 0,
          "families": [
            "DR01",
            "BM01"
          ]
        },
        {
          "index": 1,
          "families": [
            "DR02",
            "DR03"
          ]
        },
        {
          "index": 2,
          "families": [
            "DR01",
            "CO01"
          ]
        }
      ]
    },
    {
      "focus": "turning",
      "slots": [
        {
          "index": 0,
          "families": [
            "TR01",
            "BM02"
          ]
        },
        {
          "index": 1,
          "families": [
            "TR02",
            "DR01"
          ]
        },
        {
          "index": 2,
          "families": [
            "TR01",
            "TR03"
          ]
        }
      ]
    },
    {
      "focus": "passing",
      "slots": [
        {
          "index": 0,
          "families": [
            "PA01",
            "BM01"
          ]
        },
        {
          "index": 1,
          "families": [
            "PA02",
            "PA01"
          ]
        },
        {
          "index": 2,
          "families": [
            "PA02",
            "PA03"
          ]
        }
      ]
    },
    {
      "focus": "first_touch",
      "slots": [
        {
          "index": 0,
          "families": [
            "PA02",
            "RC01"
          ]
        },
        {
          "index": 1,
          "families": [
            "RC02",
            "BM02"
          ]
        },
        {
          "index": 2,
          "families": [
            "RC01",
            "PA02"
          ]
        }
      ]
    },
    {
      "focus": "aerial_control",
      "slots": [
        {
          "index": 0,
          "families": [
            "JU01",
            "BM01"
          ]
        },
        {
          "index": 1,
          "families": [
            "JU02",
            "JU01"
          ]
        },
        {
          "index": 2,
          "families": [
            "JU03",
            "JU02"
          ]
        }
      ]
    },
    {
      "focus": "finishing",
      "slots": [
        {
          "index": 0,
          "families": [
            "PA01",
            "FI01"
          ]
        },
        {
          "index": 1,
          "families": [
            "FI01",
            "DR03"
          ]
        },
        {
          "index": 2,
          "families": [
            "FI02",
            "FI01"
          ]
        }
      ]
    }
  ],
  "substitutions": [
    {
      "fromFamily": "PA02",
      "toFamily": "PA01",
      "sameOutcome": false,
      "notice": "Ground target passing replaces wall/finishing work; receiving or finishing outcomes are not equivalent."
    },
    {
      "fromFamily": "PA03",
      "toFamily": "PA01",
      "sameOutcome": false,
      "notice": "Ground target passing replaces wall/finishing work; receiving or finishing outcomes are not equivalent."
    },
    {
      "fromFamily": "FI01",
      "toFamily": "PA01",
      "sameOutcome": false,
      "notice": "Ground target passing replaces wall/finishing work; receiving or finishing outcomes are not equivalent."
    },
    {
      "fromFamily": "FI02",
      "toFamily": "PA01",
      "sameOutcome": false,
      "notice": "Ground target passing replaces wall/finishing work; receiving or finishing outcomes are not equivalent."
    },
    {
      "fromFamily": "JU01",
      "toFamily": "BM01",
      "sameOutcome": false,
      "notice": "Ground ball control replaces aerial work; aerial-control outcomes are not equivalent."
    },
    {
      "fromFamily": "JU02",
      "toFamily": "BM01",
      "sameOutcome": false,
      "notice": "Ground ball control replaces aerial work; aerial-control outcomes are not equivalent."
    },
    {
      "fromFamily": "JU03",
      "toFamily": "BM01",
      "sameOutcome": false,
      "notice": "Ground ball control replaces aerial work; aerial-control outcomes are not equivalent."
    }
  ],
  "reviewRecords": [],
  "rewardPolicy": {
    "entitlementFields": [
      "careerId",
      "careerWeekId",
      "slotIndex"
    ],
    "slotsPerWeek": 3,
    "reward": "local_journal_stamp",
    "amount": 1,
    "transferable": false,
    "convertible": false,
    "statDelta": 0,
    "currencyDelta": 0,
    "clockDriven": false
  },
  "progressionDecision": {
    "status": "implementation_proposal",
    "home": "Nonconvertible participation journal only.",
    "gameplay": "Preserve existing gameplay-based progression pending repository reconciliation.",
    "conflictAction": "Report any incompatible existing design before migration; do not silently change it."
  },
  "physicalSchedule": {
    "automaticExercisePrompts": false,
    "careerAdvanceCreatesPhysicalBacklog": false,
    "mandatorySessions": 0,
    "completionTimerRequired": false
  },
  "safety": {
    "prohibited": [
      "heading",
      "standing_on_ball",
      "eyes_closed_balance",
      "max_power_indoor_shooting",
      "fatigue_sprints",
      "contact_tackles"
    ],
    "stopRule": "Stop for pain, dizziness, unsafe space or uncomfortable loss of control; do not force repetition.",
    "skipPenalty": false
  }
}
```

### training_reference.py

```python
"""Offline specification checks. Not the game's production importer or security boundary."""
import hashlib,json,re,sqlite3
from urllib.parse import urlsplit

MAX_BYTES=1_000_000
HOSTS={'www.ussoccer.com','www.coerver.com','www.thefa.com','norcalpremier.com','www.gftskills.com','mypersonalfootballcoach.com','www.soccerdrive.com','community.thefa.com','www.fifatrainingcentre.com'}
def require(ok,msg):
    if not ok: raise ValueError(msg)
def keys(o,names):
    require(type(o) is dict and set(o)==set(names.split()),'unknown/missing fields: '+names)
    array_fields={'capabilities','sources','spaceProfiles','claims','families','demos','sessionTemplates','substitutions','reviewRecords','requiredCapabilities','optionalEquipment','levels','sourceIds','steps','prerequisites','components','demoIds','claimIds','slots','prohibited'}
    object_fields={'rewardPolicy','progressionDecision','physicalSchedule','safety'}
    bool_fields={'textReviewed','videoReviewed','sameOutcome','skipPenalty'}
    integer_fields={'schemaVersion','ordinal','index'}
    nullable={'locator','videoTimestamp','assetPath','assetSha256','captionSha256'}
    for k,v in o.items():
        expected=list if k in array_fields else dict if k in object_fields else bool if k in bool_fields else int if k in integer_fields else str
        require((k in nullable and v is None) or type(v) is expected,'field type '+k)
def strings(a):
    require(type(a) is list and all(type(x) is str and x for x in a),'string array')
    require(len(a)==len(set(a)),'duplicate entries')
def unique(a):
    ids=[x['id'] for x in a];require(len(ids)==len(set(ids)),'duplicate IDs');return {x['id']:x for x in a}
def load(raw):
    require(type(raw) is bytes and len(raw)<=MAX_BYTES,'byte limit')
    def pairs(items):
        d={}
        for k,v in items:
            require(k not in d and k not in {'__proto__','constructor','prototype'},'duplicate/dangerous key');d[k]=v
        return d
    def constant(x):raise ValueError('nonfinite number')
    # Structural depth is checked BEFORE JSON parsing, ignoring quoted strings.
    depth=0;quoted=False;escaped=False
    for c in raw.decode('utf-8'):
        if quoted:
            if escaped:escaped=False
            elif c=='\\':escaped=True
            elif c=='"':quoted=False
        elif c=='"':quoted=True
        elif c in '[{':
            depth+=1;require(depth<=16,'depth limit')
        elif c in ']}':depth-=1
    obj=json.loads(raw,object_pairs_hook=pairs,parse_constant=constant)
    validate(obj);return obj
def validate(m):
    def walk(o,depth=0):
        require(depth<=16,'depth')
        if type(o) is str:
            require(0<len(o)<=4000 and not any(ord(c)<32 and c not in '\n\t' for c in o),'text length/control')
            require('<' not in o and '>' not in o,'markup not permitted in catalog')
        elif type(o) is dict:
            for k,v in o.items():
                require(k not in {'__proto__','constructor','prototype'},'dangerous key');walk(v,depth+1)
        elif type(o) is list:
            require(len(o)<=500,'array bound')
            for v in o:walk(v,depth+1)
        else:require(o is None or type(o) in (bool,int),'unexpected type')
    walk(m)
    keys(m,'schemaVersion contentVersion audience capabilities sources spaceProfiles claims families demos sessionTemplates substitutions reviewRecords rewardPolicy progressionDecision physicalSchedule safety')
    require(type(m['schemaVersion']) is int and m['schemaVersion']==2,'schema version')
    require(re.fullmatch(r'\d+\.\d+\.\d+',m['contentVersion']) is not None,'content version')
    require(m['audience']=='U11-U12','audience');strings(m['capabilities']);caps=set(m['capabilities'])
    require(caps=={'ball','clear_floor','lane_clear','permitted_wall','safe_rebound','safe_runout','overhead_clear','outdoor_clear','safe_target','backstop'},'capability vocabulary')
    require(0<len(m['families'])<=250,'family count')
    src=unique(m['sources']);profiles=unique(m['spaceProfiles']);claims=unique(m['claims']);families=unique(m['families']);demos=unique(m['demos'])
    for x in src.values():
        keys(x,'id title url scope textReviewed videoReviewed reviewDate')
        u=urlsplit(x['url']);require(u.scheme=='https' and u.hostname in HOSTS and u.port in (None,443) and u.username is None and u.password is None and not u.query and not u.fragment,'source URL')
        require(type(x['textReviewed']) is bool and type(x['videoReviewed']) is bool,'review bool')
        require(re.fullmatch(r'\d{4}-\d{2}-\d{2}',x['reviewDate']) is not None,'date')
    for x in profiles.values():
        keys(x,'id requiredCapabilities setup');strings(x['requiredCapabilities']);require(set(x['requiredCapabilities'])<=caps,'profile capabilities')
    for x in claims.values():
        keys(x,'id type sourceIds claim locator scope videoTimestamp');strings(x['sourceIds'])
        require(x['type'] in ['direct_technique','contextual_principle','original_adaptation','unresolved'],'claim type')
        require(set(x['sourceIds'])<=set(src),'claim sources')
        if x['type'] in ['direct_technique','contextual_principle']:require(bool(x['sourceIds']) and bool(x['locator']),'evidence locator')
        require(x['videoTimestamp'] is None,'v2 text-only evidence; no video timestamps approved')
    levels={};owner={}
    for f in families.values():
        keys(f,'id title category profile requiredCapabilities optionalEquipment qualityCheck correction limitation levels')
        require(re.fullmatch(r'[A-Z]{2}\d{2}',f['id']) is not None,'family id')
        require(f['category'] in ['ball_control','dribbling','turning','passing','first_touch','aerial_control','finishing'],'category')
        require(f['profile'] in profiles,'profile');strings(f['requiredCapabilities']);strings(f['optionalEquipment'])
        require(set(f['requiredCapabilities'])==set(profiles[f['profile']]['requiredCapabilities']),'profile mismatch')
        require(set(f['optionalEquipment'])<={'flat_soft_markers'},'optional equipment')
        require(len(f['levels'])==5,'level count')
        for i,l in enumerate(f['levels'],1):
            keys(l,'id ordinal setup startingState steps endingState footMode prerequisites components demoIds claimIds releaseStatus')
            require(type(l['ordinal']) is int and l['ordinal']==i and l['id']==f['id']+'-L'+str(i),'level identity')
            require(l['id'] not in levels,'duplicate level');levels[l['id']]=l;owner[l['id']]=f
            for name in ['steps','prerequisites','components','demoIds','claimIds']:strings(l[name])
            require(2<=len(l['steps'])<=12,'steps');require(l['releaseStatus']=='draft','content import cannot publish')
            require(set(l['claimIds'])<=set(claims) and l['claimIds'],'claims')
            require(set(l['demoIds'])=={l['id']+'-right',l['id']+'-left'},'demo sides')
    require(set(demos)=={did for l in levels.values() for did in l['demoIds']},'demo coverage')
    for l in levels.values():
        require(set(l['prerequisites']+l['components'])<=set(levels),'prerequisite reference')
        require(set(l['components'])<=set(l['prerequisites']),'components require familiarity')
        if owner[l['id']]['id']=='CO01':require(set(l['components'])==({'BM01-L1'} if l['ordinal']==1 else {'BM01-L1','BM02-L1'}),'combination allowlist')
        else:require(l['components']==[],'unexpected component')
    def visit(id,path):
        require(id not in path,'prerequisite cycle')
        for x in levels[id]['prerequisites']:visit(x,path|{id})
    for id in levels:visit(id,set())
    for d in demos.values():
        keys(d,'id levelId side assetPath assetSha256 captionSha256 status checkpoint videoReviewed')
        require(d['levelId'] in levels and d['side'] in ['left','right'] and d['id']==d['levelId']+'-'+d['side'],'demo identity')
        require(d['status']=='not_created' and d['assetPath'] is None and d['assetSha256'] is None and d['captionSha256'] is None and d['videoReviewed'] is False,'draft asset authority')
    require(m['reviewRecords']==[],'runtime catalog may not carry approvals')
    focus=[]
    for t in m['sessionTemplates']:
        keys(t,'focus slots');focus.append(t['focus']);require(len(t['slots'])==3,'slot count')
        for i,s in enumerate(t['slots']):
            keys(s,'index families');strings(s['families']);require(type(s['index']) is int and s['index']==i and len(s['families'])==2 and set(s['families'])<=set(families),'slot')
    require(len(focus)==len(set(focus)),'duplicate focus')
    edges={}
    for s in m['substitutions']:
        keys(s,'fromFamily toFamily sameOutcome notice');require(s['fromFamily'] in families and s['toFamily'] in families and s['fromFamily']!=s['toFamily'],'substitution reference')
        require(s['fromFamily'] not in edges and s['sameOutcome'] is False and s['notice'],'substitution metadata');edges[s['fromFamily']]=s['toFamily']
    for id in edges:
        seen=set();p=id
        while p in edges:require(p not in seen,'substitution cycle');seen.add(p);p=edges[p]
    require(json.dumps(m['rewardPolicy'],sort_keys=True)==json.dumps(dict(entitlementFields=['careerId','careerWeekId','slotIndex'],slotsPerWeek=3,reward='local_journal_stamp',amount=1,transferable=False,convertible=False,statDelta=0,currencyDelta=0,clockDriven=False),sort_keys=True),'reward policy')
    require(json.dumps(m['physicalSchedule'],sort_keys=True)==json.dumps(dict(automaticExercisePrompts=False,careerAdvanceCreatesPhysicalBacklog=False,mandatorySessions=0,completionTimerRequired=False),sort_keys=True),'physical schedule')
    keys(m['progressionDecision'],'status home gameplay conflictAction');require(m['progressionDecision']['status']=='implementation_proposal','decision status')
    keys(m['safety'],'prohibited stopRule skipPenalty');require(m['safety']['skipPenalty'] is False,'skip penalty');strings(m['safety']['prohibited'])
    require(set(m['safety']['prohibited'])=={'heading','standing_on_ball','eyes_closed_balance','max_power_indoor_shooting','fatigue_sprints','contact_tackles'},'safety exclusions')
    return True

def fingerprint(m,lid):
    # Python canonical bytes for this reference only. Production uses hashes of committed files.
    f=next(f for f in m['families'] if any(l['id']==lid for l in f['levels']))
    l=next(l for l in f['levels'] if l['id']==lid)
    claim=[x for x in m['claims'] if x['id'] in l['claimIds']]
    sourceIds={s for c in claim for s in c['sourceIds']}
    payload={'family':{k:v for k,v in f.items() if k!='levels'},'level':l,'claims':claim,'sources':[s for s in m['sources'] if s['id'] in sourceIds],'profile':next(p for p in m['spaceProfiles'] if p['id']==f['profile']),'safety':m['safety']}
    return hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

def approved(m,lid,trusted,assets):
    # `trusted` supplied by a trusted release build, NEVER read from user content/save.
    r=trusted.get(lid)
    if not r or r['revoked'] or r['contentHash']!=fingerprint(m,lid):return False
    if not all(r.get(x) for x in ['coachReviewer','qaReviewer','evidenceReviewed','rightsReviewed']):return False
    if set(r['sides'])!={'left','right'}:return False
    l=next(l for f in m['families'] for l in f['levels'] if l['id']==lid)
    if any(x['type']=='unresolved' for x in m['claims'] if x['id'] in l['claimIds']):return False
    for side in ['left','right']:
        a=assets.get(lid+'-'+side);s=r['sides'][side]
        if not a or a['side']!=side:return False
        if hashlib.sha256(a['bytes']).hexdigest()!=s['assetHash'] or hashlib.sha256(a['caption']).hexdigest()!=s['captionHash']:return False
    return True

def eligible(m,lid,capabilities,comfortable,trusted,assets):
    f=next(f for f in m['families'] if any(l['id']==lid for l in f['levels']))
    l=next(l for l in f['levels'] if l['id']==lid)
    if not approved(m,lid,trusted,assets) or not set(f['requiredCapabilities'])<=set(capabilities) or not set(l['prerequisites'])<=set(comfortable):return False
    return all(eligible(m,c,capabilities,comfortable,trusted,assets) for c in l['components'])

def choose(m,family,capabilities,comfortable,trusted,assets):
    # Finite one-hop fallback. No inference from prose, no recursive retries.
    families={f['id']:f for f in m['families']}
    for l in families[family]['levels']:
        if eligible(m,l['id'],capabilities,comfortable,trusted,assets):return {'levelId':l['id'],'substituted':False,'notice':None}
    for s in m['substitutions']:
        if s['fromFamily']==family:
            for l in families[s['toFamily']]['levels']:
                if eligible(m,l['id'],capabilities,comfortable,trusted,assets):return {'levelId':l['id'],'substituted':True,'notice':s['notice']}
    return {'levelId':None,'substituted':False,'notice':'No eligible reviewed activity. Choose another focus or skip without penalty.'}

def mirror(side,surface):
    require(side in ['left','right'] and surface in ['inside','outside','sole','laces'],'mirror inputs')
    return ('left' if side=='right' else 'right',surface)

def init_ledger(path):
    with sqlite3.connect(path) as db:
        db.executescript('CREATE TABLE IF NOT EXISTS slot(career TEXT, week TEXT, idx INTEGER CHECK(idx BETWEEN 0 AND 2), state TEXT, PRIMARY KEY(career,week,idx)); CREATE TABLE IF NOT EXISTS claim(career TEXT, week TEXT, idx INTEGER, PRIMARY KEY(career,week,idx)); CREATE TABLE IF NOT EXISTS journal(career TEXT, week TEXT, idx INTEGER, PRIMARY KEY(career,week,idx));')
def seed_slot(path,career,week,idx,state='available'):
    require(type(idx) is int and idx in range(3),'slot index')
    require(state in ['available','started','skipped','completed'],'state')
    with sqlite3.connect(path) as db:db.execute('INSERT OR IGNORE INTO slot VALUES(?,?,?,?)',(career,week,idx,state))
def complete(path,career,week,idx,*,fault=False):
    # Transaction reference only. Caller must check current authorized plan/eligibility.
    require(type(idx) is int and idx in range(3),'slot index')
    db=sqlite3.connect(path,timeout=10)
    try:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT state FROM slot WHERE career=? AND week=? AND idx=?',(career,week,idx)).fetchone()
        require(row is not None,'unknown slot')
        if row[0]=='completed':db.commit();return 'already_completed'
        require(row[0]=='started','not started')
        db.execute('INSERT INTO claim VALUES(?,?,?)',(career,week,idx))
        if fault:raise RuntimeError('simulated crash before journal')
        db.execute('INSERT INTO journal VALUES(?,?,?)',(career,week,idx))
        db.execute('UPDATE slot SET state=? WHERE career=? AND week=? AND idx=?',('completed',career,week,idx))
        db.commit();return 'completed'
    except:db.rollback();raise
    finally:db.close()

```

### test_training_reference.py

```python
import copy,json,hashlib,sqlite3,tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import training_reference as r
ROOT=Path(__file__).parent
base=r.load((ROOT/'training_manifest_v2.json').read_bytes())
results=[]
def check(name,fn):
    fn();results.append({'test':name,'result':'PASS'})
def ok(x):
    if not x:raise AssertionError('expectation failed')
def reject(name,change):
    def run():
        m=copy.deepcopy(base);change(m)
        try:r.load(json.dumps(m).encode())
        except (ValueError,TypeError):return
        raise AssertionError('accepted invalid fixture')
    check(name,run)
def badraw(name,raw):
    def run():
        try:r.load(raw)
        except (ValueError,TypeError):return
        raise AssertionError('accepted invalid raw data')
    check(name,run)
check('valid catalog parses',lambda:ok(len(base['families'])==20))
check('100 standalone variants / 200 demo references',lambda:ok(sum(len(f['levels']) for f in base['families'])==100 and len(base['demos'])==200))
reject('unknown top-level field',lambda m:m.update(untrusted=True))
reject('unknown schema version',lambda m:m.update(schemaVersion=999))
reject('boolean schema version',lambda m:m.update(schemaVersion=True))
reject('duplicate family ID',lambda m:m['families'].append(copy.deepcopy(m['families'][0])))
reject('unknown profile',lambda m:m['families'][0].update(profile='unsafe'))
reject('missing profile capability',lambda m:m['families'][0].update(requiredCapabilities=['ball']))
reject('nonexistent prerequisite',lambda m:m['families'][0]['levels'][0].update(prerequisites=['missing']))
reject('cyclic prerequisite',lambda m:m['families'][0]['levels'][0].update(prerequisites=['BM01-L1']))
reject('missing source reference',lambda m:m['claims'][1].update(sourceIds=['missing']))
reject('missing locator',lambda m:m['claims'][1].update(locator=None))
reject('missing demo',lambda m:m['demos'].pop())
reject('wrong-side demo identity',lambda m:m['demos'][0].update(side='left'))
reject('forged release flag',lambda m:m['families'][0]['levels'][0].update(releaseStatus='published'))
reject('forged catalog approval record',lambda m:m['reviewRecords'].append({'approved':True}))
reject('untrusted demo asset authority',lambda m:m['demos'][0].update(assetPath='https://evil.example/movie'))
reject('combination contains lane drill',lambda m:m['families'][-1]['levels'][0].update(components=['DR01-L1'],prerequisites=['DR01-L1']))
reject('unknown fallback target',lambda m:m['substitutions'][0].update(toFamily='missing'))
reject('fallback cycle',lambda m:m['substitutions'].append(dict(fromFamily='PA01',toFamily='PA02',sameOutcome=False,notice='test')))
reject('duplicate slot index',lambda m:m['sessionTemplates'][0]['slots'][1].update(index=0))
reject('stat reward injection',lambda m:m['rewardPolicy'].update(statDelta=1))
reject('integer disguised as policy boolean',lambda m:m['rewardPolicy'].update(convertible=0))
reject('physical catch-up enabled',lambda m:m['physicalSchedule'].update(careerAdvanceCreatesPhysicalBacklog=True))
reject('null setup',lambda m:m['families'][0]['levels'][0].update(setup=None))
reject('HTML in text',lambda m:m['families'][0].update(title='<img src=x onerror=alert(1)>'))
reject('oversize field',lambda m:m['families'][0].update(title='x'*4001))
reject('non-HTTPS URL',lambda m:m['sources'][0].update(url='javascript:alert(1)'))
reject('hostname suffix spoof',lambda m:m['sources'][0].update(url='https://www.ussoccer.com.evil.example/x'))
reject('URL credentials',lambda m:m['sources'][0].update(url='https://user@www.ussoccer.com/x'))
reject('query-driven redirect URL',lambda m:m['sources'][0].update(url='https://www.ussoccer.com/?next=https://evil.example'))
badraw('duplicate JSON properties',b'{"schemaVersion":2,"schemaVersion":2}')
badraw('prototype-like property',b'{"__proto__":{}}')
badraw('NaN constant',b'{"x":NaN}')
badraw('infinite constant',b'{"x":Infinity}')
badraw('truncated JSON',b'{"schemaVersion":')
badraw('oversized bytes',b' '*1_000_001)
badraw('deep nesting before parse',b'['*17+b'0'+b']'*17)

# Fabricated fixture approvals are strictly test-only and are never saved into the catalog.
fixture=copy.deepcopy(base)
for c in fixture['claims']:
    if c['type']=='unresolved':c['type']='original_adaptation'
trusted={};assets={}
for f in fixture['families']:
    for l in f['levels']:
        sides={}
        for side in ['left','right']:
            assets[l['id']+'-'+side]={'bytes':b'test asset '+side.encode(),'caption':b'test caption','side':side}
            sides[side]={'assetHash':hashlib.sha256(assets[l['id']+'-'+side]['bytes']).hexdigest(),'captionHash':hashlib.sha256(b'test caption').hexdigest()}
        trusted[l['id']]={'revoked':False,'contentHash':r.fingerprint(fixture,l['id']),'coachReviewer':'TEST_ONLY','qaReviewer':'TEST_ONLY','evidenceReviewed':True,'rightsReviewed':True,'sides':sides}
lid='BM02-L1'
check('synthetic approval positive control',lambda:ok(r.approved(fixture,lid,trusted,assets)))
def approval_mutation(name,mut):
    def run():
        m=copy.deepcopy(fixture);t=copy.deepcopy(trusted);a=copy.deepcopy(assets);mut(m,t,a)
        ok(not r.approved(m,lid,t,a))
    check(name,run)
approval_mutation('revoked approval rejected',lambda m,t,a:t[lid].update(revoked=True))
approval_mutation('changed instruction hash rejected',lambda m,t,a:m['families'][1]['levels'][0]['steps'].append('Changed step.'))
approval_mutation('changed safety hash rejected',lambda m,t,a:m['safety'].update(stopRule='Different rule'))
approval_mutation('changed asset rejected',lambda m,t,a:a[lid+'-right'].update(bytes=b'changed'))
approval_mutation('changed caption rejected',lambda m,t,a:a[lid+'-right'].update(caption=b'changed'))
approval_mutation('wrong-foot asset rejected',lambda m,t,a:a[lid+'-right'].update(side='left'))
approval_mutation('missing reviewer rejected',lambda m,t,a:t[lid].update(coachReviewer=''))
approval_mutation('missing rights review rejected',lambda m,t,a:t[lid].update(rightsReviewed=False))
check('unresolved evidence blocks synthetic approval',lambda:ok(not r.approved(base,'BM01-L1',trusted,assets)))
allcaps=base['capabilities'];comfortable=[l['id'] for f in base['families'] for l in f['levels']]
check('all-draft catalog returns no content',lambda:ok(r.choose(base,'PA02',allcaps,comfortable,{},assets)['levelId'] is None))
check('no wall and small space cannot fallback to target',lambda:ok(r.choose(fixture,'PA02',['ball','clear_floor'],comfortable,trusted,assets)['levelId'] is None))
check('no target/no outdoor cannot fallback to finishing',lambda:ok(r.choose(fixture,'FI01',['ball','clear_floor'],comfortable,trusted,assets)['levelId'] is None))
check('wall fallback requires target capabilities',lambda:ok(r.choose(fixture,'PA02',['ball','clear_floor','lane_clear','safe_runout','safe_target','backstop'],comfortable,trusted,assets)['substituted']))
check('no overhead uses disclosed ground alternative',lambda:ok(r.choose(fixture,'JU01',['ball','clear_floor'],comfortable,trusted,assets)['levelId']=='BM01-L1'))
check('unfamiliar prerequisite blocks one-touch',lambda:ok(not r.eligible(fixture,'PA03-L1',allcaps,[],trusted,assets)))
check('combination rechecks component approval',lambda:ok(not r.eligible(fixture,'CO01-L2',allcaps,comfortable,{k:v for k,v in trusted.items() if k!='BM02-L1'},assets)))
check('mirroring preserves all four surfaces',lambda:ok(all(r.mirror('right',s)==('left',s) for s in ['inside','outside','sole','laces'])))

with tempfile.TemporaryDirectory() as td:
    db=str(Path(td)/'ledger.db');r.init_ledger(db)
    r.seed_slot(db,'career','week',0,'started')
    def race():
        with ThreadPoolExecutor(max_workers=8) as pool:out=list(pool.map(lambda _:r.complete(db,'career','week',0),range(16)))
        ok(out.count('completed')==1 and out.count('already_completed')==15)
        with sqlite3.connect(db) as con:ok(con.execute('select count(*) from claim').fetchone()[0]==1 and con.execute('select count(*) from journal').fetchone()[0]==1)
    check('16 concurrent claims create one stamp',race)
    check('replay remains idempotent',lambda:ok(r.complete(db,'career','week',0)=='already_completed'))
    r.seed_slot(db,'career','week',1,'started')
    def crash():
        try:r.complete(db,'career','week',1,fault=True)
        except RuntimeError:pass
        with sqlite3.connect(db) as con:ok(con.execute('select count(*) from claim where idx=1').fetchone()[0]==0 and con.execute('select state from slot where idx=1').fetchone()[0]=='started')
        ok(r.complete(db,'career','week',1)=='completed')
    check('crash rolls back claim and retry succeeds',crash)
    r.seed_slot(db,'career','week',2,'skipped')
    def skip():
        try:r.complete(db,'career','week',2)
        except ValueError:return
        raise AssertionError('skip rewarded')
    check('skipped slot not rewarded',skip)
    def unknown():
        try:r.complete(db,'career','unknown',0)
        except ValueError:return
        raise AssertionError('unknown slot rewarded')
    check('unknown week slot rejected',unknown)
    check('stable entitlement excludes content and drill versions',lambda:ok(base['rewardPolicy']['entitlementFields']==['careerId','careerWeekId','slotIndex']))
    def invalidslot():
        try:r.complete(db,'career','week',3)
        except ValueError:return
        raise AssertionError('fourth slot permitted')
    check('fourth weekly slot rejected',invalidslot)

ROOT.joinpath('training_recheck_results.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'passed':len(results),'failed':0,'scope':'offline reference contract; synthetic approvals; SQLite transaction model, not browser/game tests'}))

```

### training_recheck_results.json

```json
[
  {
    "test": "valid catalog parses",
    "result": "PASS"
  },
  {
    "test": "100 standalone variants / 200 demo references",
    "result": "PASS"
  },
  {
    "test": "unknown top-level field",
    "result": "PASS"
  },
  {
    "test": "unknown schema version",
    "result": "PASS"
  },
  {
    "test": "boolean schema version",
    "result": "PASS"
  },
  {
    "test": "duplicate family ID",
    "result": "PASS"
  },
  {
    "test": "unknown profile",
    "result": "PASS"
  },
  {
    "test": "missing profile capability",
    "result": "PASS"
  },
  {
    "test": "nonexistent prerequisite",
    "result": "PASS"
  },
  {
    "test": "cyclic prerequisite",
    "result": "PASS"
  },
  {
    "test": "missing source reference",
    "result": "PASS"
  },
  {
    "test": "missing locator",
    "result": "PASS"
  },
  {
    "test": "missing demo",
    "result": "PASS"
  },
  {
    "test": "wrong-side demo identity",
    "result": "PASS"
  },
  {
    "test": "forged release flag",
    "result": "PASS"
  },
  {
    "test": "forged catalog approval record",
    "result": "PASS"
  },
  {
    "test": "untrusted demo asset authority",
    "result": "PASS"
  },
  {
    "test": "combination contains lane drill",
    "result": "PASS"
  },
  {
    "test": "unknown fallback target",
    "result": "PASS"
  },
  {
    "test": "fallback cycle",
    "result": "PASS"
  },
  {
    "test": "duplicate slot index",
    "result": "PASS"
  },
  {
    "test": "stat reward injection",
    "result": "PASS"
  },
  {
    "test": "integer disguised as policy boolean",
    "result": "PASS"
  },
  {
    "test": "physical catch-up enabled",
    "result": "PASS"
  },
  {
    "test": "null setup",
    "result": "PASS"
  },
  {
    "test": "HTML in text",
    "result": "PASS"
  },
  {
    "test": "oversize field",
    "result": "PASS"
  },
  {
    "test": "non-HTTPS URL",
    "result": "PASS"
  },
  {
    "test": "hostname suffix spoof",
    "result": "PASS"
  },
  {
    "test": "URL credentials",
    "result": "PASS"
  },
  {
    "test": "query-driven redirect URL",
    "result": "PASS"
  },
  {
    "test": "duplicate JSON properties",
    "result": "PASS"
  },
  {
    "test": "prototype-like property",
    "result": "PASS"
  },
  {
    "test": "NaN constant",
    "result": "PASS"
  },
  {
    "test": "infinite constant",
    "result": "PASS"
  },
  {
    "test": "truncated JSON",
    "result": "PASS"
  },
  {
    "test": "oversized bytes",
    "result": "PASS"
  },
  {
    "test": "deep nesting before parse",
    "result": "PASS"
  },
  {
    "test": "synthetic approval positive control",
    "result": "PASS"
  },
  {
    "test": "revoked approval rejected",
    "result": "PASS"
  },
  {
    "test": "changed instruction hash rejected",
    "result": "PASS"
  },
  {
    "test": "changed safety hash rejected",
    "result": "PASS"
  },
  {
    "test": "changed asset rejected",
    "result": "PASS"
  },
  {
    "test": "changed caption rejected",
    "result": "PASS"
  },
  {
    "test": "wrong-foot asset rejected",
    "result": "PASS"
  },
  {
    "test": "missing reviewer rejected",
    "result": "PASS"
  },
  {
    "test": "missing rights review rejected",
    "result": "PASS"
  },
  {
    "test": "unresolved evidence blocks synthetic approval",
    "result": "PASS"
  },
  {
    "test": "all-draft catalog returns no content",
    "result": "PASS"
  },
  {
    "test": "no wall and small space cannot fallback to target",
    "result": "PASS"
  },
  {
    "test": "no target/no outdoor cannot fallback to finishing",
    "result": "PASS"
  },
  {
    "test": "wall fallback requires target capabilities",
    "result": "PASS"
  },
  {
    "test": "no overhead uses disclosed ground alternative",
    "result": "PASS"
  },
  {
    "test": "unfamiliar prerequisite blocks one-touch",
    "result": "PASS"
  },
  {
    "test": "combination rechecks component approval",
    "result": "PASS"
  },
  {
    "test": "mirroring preserves all four surfaces",
    "result": "PASS"
  },
  {
    "test": "16 concurrent claims create one stamp",
    "result": "PASS"
  },
  {
    "test": "replay remains idempotent",
    "result": "PASS"
  },
  {
    "test": "crash rolls back claim and retry succeeds",
    "result": "PASS"
  },
  {
    "test": "skipped slot not rewarded",
    "result": "PASS"
  },
  {
    "test": "unknown week slot rejected",
    "result": "PASS"
  },
  {
    "test": "stable entitlement excludes content and drill versions",
    "result": "PASS"
  },
  {
    "test": "fourth weekly slot rejected",
    "result": "PASS"
  }
]
```

## Final recheck and residual limits

All ten audit findings have corresponding specification changes above. The embedded catalog validates and all 63 included offline tests pass. Source claims, physical suitability and demo correctness are not established by passing those tests. Tests for the actual game, Safari/IndexedDB, deployment caching, live reviewer permissions, existing economy, real asset loading and save migration remain outstanding because the repository and running game were not exercised in this task.

No real approvals were added: reviewRecords remains empty, every variant is draft and every demo asset remains null. This is intentional containment, not an assertion that unresolved source claims have been verified. Player release is blocked until the required evidence and reviews are real. A claim that all possible vulnerabilities are eliminated would be false.
