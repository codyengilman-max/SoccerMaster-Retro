# Runtime integrity and crossbar control contract

Revision 1.2 · 19 October 2026 · Required implementation contract

This document resolves RT-01, RT-02 and RT-03 from the revision 1.1 audit. It defines behavior Devin must implement or verify in the current Retro code. It is not executable game code and does not establish that the runtime tests already pass.

Read alongside the main brief. These requirements take precedence over its earlier general wording on persistence and the challenge-only height adapter. Existing match controls, attribute limits, story rules and progression policy remain authoritative. Use one existing simulation clock and action pipeline; do not create a second match engine or an online backend for this work.

## A. Shared save and action rules

1. Inspect the actual save schema, storage implementation, scene lifecycle and progression writer before editing. Record their paths, versions and current behavior in the implementation report.
2. Persist authoritative actions/results in a transactional store or a tested equivalent with atomic compare-and-commit semantics. A disabled button, in-memory flag or local-storage read-then-write sequence is not a concurrency guarantee. Use the existing service where it provides these guarantees. If a narrow persistence change is necessary, preserve the source save, use an explicit versioned migration and prove reload/failure recovery; do not silently reset a career.
3. Every durable record has a stable logical identity and monotonically advancing revision. A mutation supplies the expected identity, revision and allowed prior state. A duplicate returns the already committed result; an incompatible stale mutation is rejected and the caller rereads state. Screen instances, timestamps, new random seeds and render frames are not entitlement identities.
4. Cross-tab ownership coordination may improve the UI, but the durable transaction is the final guard. If ownership uses a lease, stale owners must be fenced out by the authoritative revision/token. A tab reopening or regaining focus cannot override a newer committed state.
5. Validate finite numbers, known IDs, supported schema/content versions, turn/attempt bounds and enum values at the save boundary. Take outcome evidence from the simulation/evaluator, never from a screen saying “success.” Render names and journal/content strings through the existing safe plain-text renderer.
6. Temporary pointer/charge state is never saved as a pending release. Pause, blur, resize and scene destruction cancel uncommitted gestures and stale input callbacks. Durable released actions are different: cancellation of input cannot erase their history.
7. While an irreversible action is being committed, freeze that challenge/session action boundary and accept no second submission. A completed async write after scene exit updates the durable journal only; it must not fire an action or navigate a different scene through a stale callback. On return, read the journal.
8. If persistence fails, show a concise recoverable save error and preserve the last valid record. Retry uses the same logical operation, not a new entitlement. Do not display unsaved permanent progress as saved, grant a synthetic result, or continue consuming durable turns in an unsavable state.
9. Keep test failure injection and state inspection in existing development/test tooling; do not expose a production menu that grants points or edits career state.

## B. Crossbar challenge identity

Map the following conceptual fields to the inspected schema; these names do not authorize a second save system:

| Identity / value | Required meaning |
|---|---|
| Career ID | The saved character owning this challenge |
| Story event instance ID | The existing scheduled occurrence of this schoolyard challenge, not merely the scene name |
| Challenge instance ID | Stable for that career/event occurrence across navigation, tabs and reloads |
| Attempt ID / turn ordinal | Stable within that instance; includes which actual actor takes the turn |
| Revision | Used to reject stale or competing mutations |
| Rules/content version | The scoring rules, configured goal, launch mapping and deterministic simulation version needed to reproduce the attempt |
| Immutable launch | Initial physical state, requested aim/strength, validated achievable launch, actor identity and any execution seed/snapshot needed for replay |
| Result / outcome ID | Stable contact/result identity and eventual challenge outcome used by story/progression consumers |

Preserve the inspected attempt count, rival, tie handling, turn order and story consequences. Derive the current player name and selected boy/girl identity from the save. Do not replace Blake or any actual current rival with sample names.

Reentering an unfinished story event retrieves its existing challenge instance. Reentering a completed event retrieves its result. If the existing game offers a practice replay, that already-supported mode must be distinguished from the canonical story occurrence and cannot redeliver its story effects; this task does not require adding a replay feature.

## C. Crossbar durable state machine

| Durable state | Permitted transition | Atomic write / rule |
|---|---|---|
| `ready` | Commit one validated launch | Check expected revision and turn. Record immutable launch, attempt consumption and `launch_committed` together. Only then reveal flight. |
| `launch_committed` | Resolve that exact attempt | Resume/replay the same launch using its pinned rules/seed. Score at most once. Commit result, score, turn advancement and whether the challenge is complete together. |
| `resolved` | Next turn or finish | If more turns remain, expose the already committed next ordinal as ready. If complete, create the stable final outcome and any pending story-delivery record atomically. Never reinterpret a resolved shot. |
| `outcome_committed` | Deliver/read final effects | Reuse the same outcome ID. Idempotent consumers apply each permitted consequence at most once. Reading a result cannot grant it again. |

The labels are conceptual; an existing equivalent state model is acceptable if it passes the same tests. Do not duplicate a store merely to match these names. Keep resolved attempt identities/results in the authoritative history when advancing to the next turn; do not overwrite the only deduplication record with a fresh ready state.

Important boundaries:

- Charge begins and ends as temporary input. Releasing starts the commit process; simulation flight begins only after successful launch commit. If saving rejects before commit, the last durable state remains ready and no flight/result has been revealed.
- Pause or Leave during an in-flight attempt preserves `launch_committed`; returning does not produce a new charge, new seed or another free ready attempt. Leaving before release cancels the gesture without consuming an attempt.
- A rival's committed turn uses the same rules. Reloading cannot reroll the rival outcome while preserving the player's good result.
- Resuming a committed flight may reconstruct it from its immutable initial state, provided the exact simulation/content version is available and the replay is deterministic. A saved compatible checkpoint is also valid. Never replay old input under changed tuning and call it the same attempt.
- Before shipping new tuning, define compatibility for pending older attempts. Keep the compatible resolver or an explicit tested migration/checkpoint path. If no safe path exists, preserve the record and present a recoverable blocked state; do not silently erase it, issue a fresh attempt, or manufacture a loss/win. Resolve this compatibility before declaring the update complete.
- A normal physical miss, rest, out-of-bounds or configured maximum flight duration resolves once under the existing challenge rules. An invalid/non-finite engine state is a technical failure: preserve the committed record for recovery and award nothing automatically.
- If story and challenge effects share storage, commit them transactionally. Otherwise record a durable pending-delivery entry with the outcome; each consumer atomically records the outcome ID with its effect before acknowledging delivery. A crash between delivery and acknowledgment therefore replays safely.
- Recovery/error UI always exposes a safe return to the menu. Leaving that UI cannot automatically complete the challenge, advance the calendar or apply a story result.
- “Leave (no result)” means no new fabricated result. It cannot delete already committed scores/turns or detach the pending outcome from its story event.

## D. Weekly Team Training completion

### Preserve the existing credit policy

Discover and document the real entitlement key and scheduling policy. This task does not switch from “one credit per scheduled session” to a different week-slot policy, create extra XP, remove existing authorized gains, or count Team Training as a match. If the current policy awards no attribute gain, the durable effect is completion/status only.

Keep three separate identities:

1. **Entitlement identity:** existing career + scheduled week/session slot/type as defined by the real progression service. It persists across retries and variations. Do not add drill ID, scene ID, seed, content version or a wall-clock timestamp to make a new credit slot.
2. **Practice run identity:** one visit/run, with any number of permitted practice retries under the existing pacing rules.
3. **Attempt identity:** an observed attempt within that run. Used to deduplicate evidence, not to mint weekly rewards.

Bind each run to the original career, authoritative scheduled week ID, session entitlement, weekly-focus revision, role, drill ID/version and content/rules version. Use the game's calendar; do not derive the week from device time or assume that the screenshot's Week 20 should be reset to Season One.

### Finalization operation

The one authorized progression writer must perform these steps in a single atomic finalization (or a documented equivalent with durable idempotent effects):

1. Validate the run and evaluator evidence against its original identity, content version and permitted state. Reject stale scene/actor generations and malformed/foreign event IDs.
2. Verify the original entitlement and focus context remain eligible under the existing policy. A stale screen cannot silently substitute the currently displayed week, focus or character.
3. If that entitlement is already complete, return the stored completion; add no effect. Retried practice can still show local feedback without claiming a new weekly gain.
4. Otherwise record completion and exactly the effects permitted by the existing policy, together. Deduplicate each evidence/event reference. Do not synthesize a 9v9 match event or match achievement.
5. Return committed state to the UI. The screen labels Complete only after a successful commit.

If the player changes week/career while a run is open, stop that scene's stale submission path. Reopen the original run only in its proper context if the existing policy permits late completion; otherwise retain it as non-credit practice/history without rebinding it. No new penalty is introduced.

Two tabs may both request completion; one atomic transition wins and the other reads it. Switching seed, drilling the other flank, reloading a result, pressing Continue twice or migrating content does not create another entitlement.

Missing focus/drill coverage must use the explicit mapping in 06_DRILL_RELEASE_COVERAGE.md. A fallback is eligible only if its authored objective really matches the locked focus and the controlled role. Otherwise show a concise unavailable state with Back/Home Practice available. Never unlock the week or mark complete to escape an empty state.

## E. Crossbar input-to-flight contract

### Preferred path

Inspect the challenge's current input and ball-height model. If it already has controllable, coherent elevation and passes ordinary-input reachability tests, retain it and document its actual launch mapping. Reuse its supported input lifecycle; the field joystick and four-button contract in Team Training and matches stays unchanged.

### Defined fallback when the challenge lacks usable height

Use a challenge-only fixed-loft shot with horizontal aim and variable strength. It requires no fifth match action and does not change ordinary match power/height coupling.

- Horizontal aim comes from the supported challenge aiming input. If none exists, reuse the existing movement/aim joystick's horizontal component for challenge yaw only, with a visible default toward goal center. Keep yaw inside the authored challenge range. This mapping applies only while the challenge scene owns input.
- Hold the existing Shoot action to charge; release to request one launch. Use the current normalized charge curve and attribute cap to obtain total launch speed. No auto-fire at maximum charge. No extra range/accuracy boost.
- Initial authored loft candidate: 35 degrees. This is a game-tuning starting point, not a claim about a real-world training prescription. Keep loft fixed throughout an attempt; changing strength changes speed and the resulting arc, not a hidden success roll.
- Choose and record the final loft, allowed yaw, starting ball position/distance, speed/charge mapping, physical gravity/height units, ball radius and goal geometry in the versioned challenge configuration. Use configured game units consistently. Keep the ball's shadow on the ground plane.
- Establish a feasible setup during authoring/calibration. Do not secretly move the bar, change loft, enlarge collision, steer the ball, or adjust gravity after release to make a shot succeed.
- Decompose the validated total speed into horizontal and vertical components; apply the minigame arc through the shared fixed simulation timing/action boundary. Do not treat the horizontal component alone as the capped total speed.
- If the current engine has drag or a different retained height model, use its own deterministic integrator for calibration. Do not bolt on a second conflicting flight simulation.

For a simple gravity-only fallback, the reference trajectory at the goal plane is:

`height(d) = launchHeight + d * tan(loft) - gravity * d^2 / (2 * speed^2 * cos(loft)^2)`

Here `d` is horizontal travel distance along the chosen shot direction to the goal plane, in the same world-unit system. The denominator must be finite and positive; height contact still requires a swept ball-versus-bar collision within the legal span. This equation is an authoring/calibration aid, never a replacement for contact detection or a post-release speed correction.

### Required reachability and resolution

- For every eligible difficulty/player-capability range, demonstrate at least one real crossbar hit from the ordinary starting setup using legal controls, plus adjacent under/over/side/post misses. Test minimum supported capability bounds as well as a typical player. If the setup is unreachable, revise its authored calibration or eligibility explicitly before release; do not raise a player's attributes to conceal it.
- The preview reads the same immutable launch mapping as execution. If execution includes bounded variation, show intent/uncertainty honestly and use a recorded deterministic seed for testing. No guaranteed-hit marker.
- Define the maximum simulation duration and terminal physical conditions for a shot in the calibrated config. Reject invalid inputs before committing launch. Detect invalid runtime physics after commit without awarding a point or starting an endless flight.
- Actual scoring remains the main brief's shared geometry rule: real horizontal-bar contact, legal approach/span/height, radius/thickness, one point at most per attempt, deterministic post/bar joint classification. Net, post-only, below/above/behind-goal contacts do not count.
- Keep ordinary matches grounded if that is their current design. Before/after regression tests must show that challenge exit restored input ownership, camera, world bounds and match physics configuration.

## F. Failure-injection and control tests required in the game

| ID | Test | Required result |
|---|---|---|
| X01 | Interrupt before and after launch commit | No revealed unsaved shot; a committed shot returns with identical identity/input/seed |
| X02 | Interrupt after first contact and after score calculation | One result; score and turn advancement agree on repeated resume |
| X03 | Crash before/after story delivery and acknowledgment | One permitted effect per stable outcome; no lost pending delivery |
| X04 | Two tabs release different inputs for the same turn | One launch wins atomically; loser reads that launch, not a new turn |
| X05 | Leave/reload a player's apparent miss and a rival's apparent hit | Neither attempt gets a fresh seed or free retry |
| X06 | Save rejected at launch and at final result | Clear recoverable state; no fake saved result or extra attempt |
| X07 | Old pending challenge resumed after content update | Compatible resolution or tested migration; no silent reroll/reset |
| W01 | Two tabs finalize one weekly entitlement | Exactly one allowed completion effect |
| W02 | Retry seed/drill; double-submit Continue; reload result | Same entitlement; no extra progression or match events |
| W03 | Week, career, role or focus context changes mid-run | No wrong-context credit, forced role change or focus unlock |
| W04 | Save/migration failure at completion | Original valid save recoverable; retry is idempotent |
| A01 | Ordinary input reaches bar and nearby misses | Actual contact determines result; no debug-only success |
| A02 | Identical launch/seed at 30/60/120 Hz rendering | Identical simulation result |
| A03 | Invalid input, rest/out-of-bounds, maximum flight time | Finite controlled recovery/termination; no automatic score |
| A04 | Pause/rotate/blur/destroy during charge and commit | No stale release; committed history preserved |
| A05 | Normal match before/after each challenge exit path | Original movement, power/height, formation, camera and bounds intact |

Run tests at the actual commit proposed for release. Record PASS / FAIL / NOT RUN, test method and evidence. These cases supplement, not replace, the main brief's T/U/C/R checks. Browser emulation remains distinct from a physical iPhone test. Local integrity protects ordinary retries/concurrency; it is not a promise that a device owner cannot edit or restore local storage.
