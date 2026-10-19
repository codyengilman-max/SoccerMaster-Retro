# SoccerMaster — Training and Schoolyard red-team audit

19 October 2026 · Audit of internal revision 1.1

**Verdict: the archive passed the static checks described below. The handoff still needs clearer save-state and gameplay contracts before Devin treats the implementation as complete.** No live-game exploit was demonstrated: this package contains design documents, source excerpts and artwork, not the current application source.

There are **six findings: two high-priority implementation gaps, two medium-priority handoff gaps and two low-priority documentation defects.** Severity describes potential impact on this project, not a CVSS rating or proof of an exploitable service. The existing brief already prohibits many of the bad outcomes; this audit makes the missing mechanisms and acceptance cases explicit.

## Exact file reviewed

- File: `SoccerMaster_Training_Schoolyard_Revision_v1.zip`
- Internal revision: `1.1`
- Size: 4,979,574 bytes; 18 enclosed files; 5,161,297 uncompressed bytes.
- SHA-256: `7bcb02983190883875ba62dd9d92d8c8d987e4ac1e996070b6d4bce6f9ff839a`
- Target project named in the package: `codyengilman-max/SoccerMaster-Retro`.

Reviewed all enclosed text/data files, the HTML/SVG structure, the PNG containers, archive paths and checksums. Compared all 17 selected seeds against the original v0.5 catalog. The ZIP and its implementation documents were not modified during this audit.

## Findings and required corrections

### RT-01 · High · Interrupted crossbar attempts need a precise commit boundary

**Status: unresolved implementation contract; not a reproduced live exploit.**

Evidence: `01_DEVIN_IMPLEMENTATION_BRIEF.md`, “State and scoring,” “Screen layout,” and checks C04/C05 require one score per shot, committed-state restoration and no extra results. They do not specify when an attempt is consumed, what persists before the shot becomes visible, or what happens if saving fails between launch and result.

**Failure case:** launch a shot, see that it will miss, then reload or leave before the result is saved. An implementation that restores only the last completed attempt can provide another shot or a new execution seed. A crash after recording a point but before advancing the turn can replay that same point. These violate existing requirements even without two identical “reward” events.

**Required correction:**

- Define a challenge instance tied to the existing career and story event. Give each turn/attempt a stable identity independent of the screen instance.
- Distinguish ready, launch-committed, resolved and outcome-committed states. Charge/held-pointer state is temporary; a released launch is a durable game action.
- Commit the immutable launch request, actor/turn, attempt consumption, rules/content version and any execution seed before revealing its flight. Reuse the current save system; do not introduce a new backend merely for this task.
- Resume that committed shot deterministically, or use the existing documented recovery policy. Never silently create a fresh ready attempt after a committed launch. A technical interruption must not invent a win or loss.
- Commit score, attempt/turn advancement and completion status together. If story consequences use a separate store, give their delivery a stable outcome ID and an idempotent replay path so a crash cannot duplicate or lose them.
- Leaving before release cancels temporary input. Leaving after release preserves the committed attempt. “Leave (no result)” must not erase already committed history or create a new instance of the same story challenge.
- Handle storage rejection explicitly: do not present unsaved permanent progress as saved. Offer a recoverable state without forcing a fabricated result.

**Acceptance:** inject interruption immediately before launch commit, after launch commit, after first contact, after score calculation, and before/after story delivery. Resume twice at each boundary. The same attempt resolves at most once; remaining attempts, opponent turns and story effects agree. Verify that changed content versions never resimulate an old shot under new rules without an explicit recovery path.

### RT-02 · High · Weekly completion needs a shared identity and atomic finalization

**Status: implementation detail missing from the main brief; not a reproduced live exploit.**

Evidence: the brief’s “Session loop,” “Feedback and progression,” T06 and T07 prohibit duplicate weekly entitlements and match-stat pollution. `02_REVIEW_AND_TEST_STATUS.md` additionally says “stable session/attempt/event identities” and “transactional completion.” That stronger wording is not accompanied by a concrete binding to the career, scheduled week, focus or existing entitlement policy.

**Failure case:** two tabs finish the same weekly session; each reads “not complete,” then both write completion. Alternatively, Retry changes a session ID, or an old week’s scene finishes after switching careers/weeks. Deduplicating only by scene/session ID does not prevent extra credit or credit on the wrong character/week.

**Required correction:**

- Inspect and reuse the existing entitlement key and progression service. Document its exact mapping to career, scheduled week and session slot/type. Do not invent an additional reward stream or assume that this task authorizes attribute gains.
- Keep practice-run IDs and attempt IDs separate from the weekly entitlement identity. Retrying a different seed or drill must not mint a new entitlement for the same permitted slot.
- Bind the run to its original career, scheduled week, focus revision, eligible role and drill/content version. Validate that context when finalizing; never silently substitute whichever career/week is currently on screen.
- Make completion a single atomic, idempotent operation that includes any permitted progression effect. Use the existing transactional store or another tested equivalent. A UI boolean, disabled button or read-then-write local-storage flag alone is insufficient for two-tab races.
- Reject stale scene callbacks and commands after reset/exit. A resumed view reads the committed record instead of re-awarding it.
- If there is no eligible role/focus drill, use an explicit unavailable or approved fallback state. Do not mark training complete merely because the primary button was pressed.

**Acceptance:** finish simultaneously in two tabs; double-submit Continue; reload around finalization; retry with another seed; resume a run after week/career changes. Each allowed entitlement has at most one completion effect, linked to the correct original context. No training action produces a match event. A rejected save remains visibly recoverable.

### RT-03 · Medium · The crossbar arc must be controllable and reachable

**Status: gameplay specification gap.**

Evidence: the brief authorizes a scoped height/arc adapter if the match has ground-only shots, but does not specify how the challenge input controls launch elevation. The enclosed pass/shoot reference, section 5, says higher charge principally changes speed, not automatically height; its scope also excludes adding aerial physics to ordinary matches.

Those instructions can coexist, but “add an arc” is not enough. A physically aligned bar can still be impossible to hit with the available input, or every charged shot can follow an effectively fixed success trajectory. That would repeat the user’s central complaint about feel despite passing visual checks.

**Required correction:**

- Preserve existing working challenge elevation controls if present. Otherwise document the smallest minigame-only launch mapping before implementation: horizontal aim, elevation policy, strength range, player capability limits and resulting trajectory.
- State precedence explicitly: this revision may add the challenge adapter; the match pass/shoot contract remains unchanged. Do not silently couple match power to height or add a fifth match action.
- Derive the aim/power preview from the same launch mapping and world projection used by physics. Clearly distinguish a preview of intent from any existing bounded execution variation.
- Establish reachable genuine hits and genuine under/over/side/post misses using ordinary permitted controls. Test near the success boundary; do not “prove” reachability only with a debug teleport or fabricated collision.
- Give launched shots bounded resolution conditions for rest, out-of-bounds and maximum simulation duration. Handle invalid/non-finite state without an automatic score or endless locked screen.

**Acceptance:** ordinary-input sequences produce both a real bar contact and nearby misses. The same committed input/seed has the same outcome at 30/60/120 Hz rendering. A normal match before and after the challenge retains its original power/height behavior.

### RT-04 · Medium · Training coverage and fallback behavior are not yet reviewable

**Status: delivery/role-coverage gap, not a vulnerability in the seed JSON.**

Evidence: eight drill families are proposed, but delivery says implement “selected mapped tactical drill families.” Per-drill role/focus mappings are required without a release inventory of which combinations must be available. The package correctly preserves all 17 seeds as disabled drafts.

**Failure case:** a build looks complete because the hub and one generic drill work, while a keeper career, another formation/role, or a later focus is routed to the wrong exercise, receives invented feedback or becomes stuck. The player may repeatedly encounter the same drill despite an apparently varied library.

**Required correction:**

- Produce a release coverage table for TT01–TT08: implemented, deferred or unavailable; supported career roles; focus IDs; participant assignments; evidence predicates; content version; and fallback behavior.
- Test selection for every currently supported career role and every focus the release can assign. Do not silently change the controlled player’s role or substitute an unrelated drill.
- Keep research seed records immutable. Runtime adaptations need their own versioned definitions and explicit prototype/review status. Technical test success must not be represented as qualified coaching approval.
- Make missing coverage visible to the implementation report and sensible in the UI. Do not clear the weekly focus lock or award completion to hide an unavailable mapping.
- Add an isolation check: exit every enabled drill, including failure/abort paths, then start a normal match in each supported formation and attacking direction. No half-field boundary, roster override, stale AI command or training camera setting may leak into the match.

**Acceptance:** report the actual shipped coverage, exercise every enabled drill and role mapping, and verify unavailable cases without changing the character or progression policy. This does not require enabling all 40 research seeds or pretending the 500-plus catalog exists.

### RT-05 · Low · The reference README contains commands for files absent from this ZIP

**Status: confirmed packaging ambiguity.**

Evidence: `references/engine_v0.5_README.md` contains run/import instructions for `engine/decision-engine.mjs`, `engine/decision-engine.test.mjs` and `engine/example.mjs`. None of those files is enclosed. The start file says references are read-only context, which helps, but does not explicitly label those commands as belonging to a separate archive.

**Correction:** add a short source/dependency manifest stating that this README is an excerpt and its commands are not runnable from this handoff. Prefer the game’s inspected existing AI. If the original prototype is actually needed, identify and supply its exact version/checksum as a separate dependency; do not fabricate the missing implementation or overwrite newer game code with it. Label which current instructions take precedence over historical references.

**Acceptance:** a clean extraction gives Devin a clear list of included files versus external reference dependencies. No delivery report claims the absent engine tests ran from this ZIP.

### RT-06 · Low · Validation metadata drifted during the venue update

**Status: confirmed document defect.**

| Check | Recorded | Actual in audited ZIP |
|---|---:|---:|
| `PACKAGE_CHECKS.json` brief characters | 22,939 | 23,468 Unicode characters |
| HTML references stated in `02_REVIEW_AND_TEST_STATUS.md` | 6 | 7 |

The JSON’s HTML reference count is already 7; the prose is stale. The brief still fits under the previously observed 50,000-character input limit. All file checksums are valid—this is stale audit metadata, not evidence of file corruption.

**Correction:** generate both the JSON counts and prose summary from the same validation run after final content edits, then regenerate the manifest and ZIP. Advance the internal revision so the corrected package is distinguishable.

**Acceptance:** computed counts and written claims agree on the exact final package. Checksums cover all enclosed files except the checksum manifest itself.

## Static checks actually executed

| Check | Result and boundary |
|---|---|
| ZIP CRC | PASS for all 18 entries |
| Unsafe archive paths, absolute/traversal paths, backslash paths | None found |
| Duplicate names / Unicode-normalized case collisions | None found |
| Symlinks, encrypted entries, unexpected file extensions | None found |
| Archive size behavior | 5.16 MB uncompressed; maximum entry compression ratio 8.72:1; no expansion anomaly in this file |
| SHA-256 manifest | All 17 records match; no missing/extra entries |
| JSON parsing | All 3 files pass duplicate-key, non-finite-number, nesting and prototype-like-key checks |
| Tactical seed identity | 17 unique selected IDs; every record exactly matches the corresponding original v0.5 record |
| Tactical draft status | All 17 remain draft/disabled; catalog `runtime_ready` is false |
| Drill source references | All mapped seed IDs and interaction IDs exist in the enclosed references |
| HTML links/assets/IDs | 7 references resolve; no duplicate IDs |
| HTML active content and asset loading | No scripts, event-handler attributes, forms, frames, embedded objects, redirects or nonlocal asset references found; no CSS URL/import dependency |
| Standalone goal SVG | XML parses; checked active/embedded constructs absent |
| PNG decoding | Both images verify as 1672 × 941 RGB; no metadata keys reported by the decoder |
| Common secret patterns | No matches for private-key blocks or the checked GitHub/AWS/OpenAI-style token formats in text files; this is not exhaustive secret detection |

These checks do not establish malware-free certification, game security or source authenticity. An in-archive checksum detects accidental change only relative to that manifest; it is not a publisher signature.

## Requirements already handled correctly

- Bell94 is the primary Team Training visual reference, with Scottsdale Sports Complex allowed. The venue PNG is explicitly an art-direction reference, not a collision map or a complete playable field.
- The venue rules require the live half-field, camera/projection, markings, goals and actors to stay coherent. Decorative scenery cannot intercept input or hide the only usable passing outlet.
- Schoolyard Crossbar/Jungle Soccer remain school scenes. The training venue does not replace them.
- The crossbar background contains no target goal; the foreground goal provides a single shared rendering/collision model. The sample SVG/JSON are explicitly not runtime physics.
- The approved joystick and four actions are retained. Training magnification does not enlarge world hitboxes, reach, speed or ball strength.
- Small-sided training is explicitly forbidden from masquerading as nine-player prototype input or using phantom actors.
- Saved boy/girl identity, player name and current rival are preserved; the Blake sample cannot silently become a new character. Relationship dialogue remains in cutscenes.
- Home practice remains optional and separate from match evidence; simplification cannot bypass content approval or manufacture mastery.
- The brief does not claim the 17 selected seeds, 40-seed source or home library constitutes a verified 500-plus tactical catalog.
- Release instructions preserve branch protections, exclude unrelated/unready PRs and require verification of the deployed commit.

## What still requires the real game

Not run: current repository/source audit, dependency audit, HTML browser rendering, input automation, collision/physics tests, save migration, concurrency/failure-injection tests, actual drill evaluation, coaching review, Cloudflare deployment validation, physical iPhone playtesting or owner acceptance. No live build was changed.

For implementation sign-off, Devin should return the existing T/U/C/R acceptance matrix plus the RT-01–RT-04 cases above with **PASS / FAIL / NOT RUN**, exact tested commit and any evidence files. Cosmetic and archive checks must not be substituted for gameplay or device results.

Client-side duplicate prevention can protect normal use, retries and concurrent tabs; it does not make local saves resistant to an owner deliberately editing storage or restoring backups. Do not introduce server authority unless a future competitive/online requirement actually needs it.

## Short instruction to accompany this audit

> Review this audit alongside revision 1.1 of the Training/Schoolyard handoff. Treat RT-01 and RT-02 as explicit persistence contracts to verify in the current implementation, not claims of proven live exploits. Resolve the challenge launch mapping and shipped drill/role coverage before declaring the feature complete. Clarify the reference-only engine README and regenerate stale validation counts. Reuse existing controls, persistence, progression, identity and release rules. Run the failure-boundary tests against the actual final build and report the results honestly. Do not merge unrelated work or claim physical iPhone testing from browser emulation.
