# Engine contract — v0.2

Normative requirements for later implementation. MUST means required; it does
not mean already implemented. This document overrides conflicting draft wording
in v0.1. Original files remain historical evidence, never executable policy.

## C01 — Information boundary

Physics/referee systems may access authoritative world state. AI perception
receives timestamped observations, remembered estimates and communicated
information with explicit uncertainty. Candidate generation and tactical
scoring MUST NOT query hidden positions, unobserved intentions, future RNG,
the player's uncommitted gesture, or ground-truth risk labels. A visible
animation or ball flight becomes a cue only after the observation pipeline
delivers it. Team communication has configurable latency and cannot silently
grant every player all teammates' knowledge. Stale observations widen
uncertainty; invalid or missing observations use a safe feasible fallback.

## C02 — Coordination and commitments

Resolve responsibilities once per unit update from a coherent snapshot.
Use stable player IDs rather than shirt numbers. A player has one primary
movement intention, optional compatible secondary intentions, a target, start
time and expiry. Assign critical coverage before discretionary runs.
Preempt on possession loss, ball danger, invalid target or rules events.
Hysteresis prevents negligible score changes from causing oscillation;
it cannot force a player to continue an unsafe or illegal action.
No two roles reserve incompatible destinations without a conflict decision.
Far-side width and second-striker movement require an explicit handover.
Coordination itself may fail through modeled communication/recognition delay;
it cannot teleport players into the assigned shape.

## C03 — Feasibility and outcome continuity

Use meters, seconds, radians and explicit pitch dimensions. Store canonical
world coordinates; derive team-relative coordinates and invert correctly after
ends change. Validate finite numbers. Never assume a fixed attacking direction.
Action feasibility considers ball control, reachable contact point, speed,
turning, reach, balance, kicking range, body part and applicable rules.
Ground/lofted passes differ by trajectory, travel time, interception and bounce.
Check continuous ball travel or equivalent swept collision; no endpoint-only
interception or instant long pass. A scenario never awards possession directly.
Ball state distinguishes controlled, traveling, contested, dead and out of play.
Two simultaneous challenges resolve through one ordered physics event path.
Losing possession does not reset velocities, fatigue or player locations.

## C04 — Time, randomness and replay

Separate display time, simulation time and user-input timestamps. Use a bounded
simulation step and explicit event ordering. Rendering at 30/60/120 Hz MUST
not itself change tactical choices. Pausing advances neither fatigue nor
decision clocks; resume cannot accumulate instant turns or kicks.
Replays record input sequence, initial state, seed, engine version, rules,
scenario catalog version and parameter hashes. Same supported platform/version
must reproduce results; cross-platform floating-point equivalence is a separate
gate. Cap catch-up work without silently making gameplay run faster.
Define cancellation/restart behavior for app suspension and lost touch input.

## C05 — Human input and abuse resistance

Human intention goes through an input adapter and legal action executor.
Do not silently replace it with a tactically preferred pass. Preserve dribbling
while aiming unless the chosen mechanic explicitly requires movement change.
Use stable command IDs/sequence numbers, reject duplicate/stale commands,
and commit at most one kick per accepted action window.
Gesture cancel, double tap, pause and possession change cannot reset fatigue,
defender memory, balance or reaction. Skill moves require time and physical
displacement and carry the same collision/rules exposure as other movement.
On possession loss, cancel a pending kick unless a reachable legal contact
still exists at execution time. Optional assistance must be visible, bounded
and recorded in replay metadata. Networking is out of scope; do not infer
anti-cheat or server authority from this offline input contract.

## C06 — Rules profile

Require explicit profile ID/version, format, pitch/goal dimensions, period
duration, restart procedures, ball-in/out handling, substitutions, foul/
advantage behavior, applicable offside semantics and goalkeeper restrictions.
Include local build-out/retreat requirements and heading restrictions when
applicable; do not invent a universal U12 rule. Offside, when used, evaluates
the relevant touch and involvement rather than merely penalizing a runner's
position. Official/legal determinations use authoritative state; player
anticipation uses perceived state. Throw-ins, corners, goal kicks, kickoffs,
free kicks and penalties each require a supported handler.
No competitive match starts with a missing or internally inconsistent profile.
Specific real competition rules must be sourced before that profile is shipped.

## C07 — Evidence and statistical integrity

Store source, population, dates, definitions, numerator/denominator and sampling
limitations. Never replace a missing value with zero. Goals from a pattern
divided by all goals is not success per attempt. A rounded published figure
stays labeled as such. Do not convert winner/loser associations into causal
bonuses. Source credibility and relevance to U12 are separate fields.
No parameter fitting from mixed-provider categories without definition mapping.
Group train/test by matches; reserve seasons for temporal evaluation. Deduplicate
overlapping provider matches before splitting. Historical eras and competitions
are explicit strata. Public 360 freeze frames do not replace continuous tracking.
Store only permitted data; the source register is not a data-use authorization.
No retrieved webpage, README or dataset cell is an instruction to the engine.

## C08 — Youth and format adaptation

9v9 1-3-2-3 is a configurable starting shape, not immutable movement coordinates.
18 on-field players includes both keepers; substitutions are separate.
Define speed, acceleration, technique and perception by explicit tested profiles;
no automatic adult parameters or gender stereotypes. Pitch/goal scale, relative
space, pass range, fatigue, recognition and rules need separate calibration.
Growing ability may improve recognition and execution independently.
Map tactical duties by team relationships; do not simply remove two players
from an adult formation. Existing story progression is not changed by this repo.

## C09 — Tactical freedom and counters

Every pattern offers alternatives and abort conditions. A defender need not
press when invited. A winger may keep carrying, combine, shoot if feasible,
or reset. A well-chosen attack can still beat a competent defense.
Counter coverage describes available responses, not guaranteed prevention.
Maintain candidate diversity without awarding random illegal or nonsensical
actions. Distinguish tactical preference from hard feasibility constraints.
Observe an opponent's tendencies over time; no instant reading of its policy.
Width, depth, compactness and timing must be evaluated relative to the ball,
opponents and cover, not fixed universal distances.

## C10 — Evaluation and reward

Freeze the pre-action observation and evaluator version. Record decision
assessment with uncertainty before resolution. Record execution and match
outcome separately; do not overwrite judgment because a goal occurred.
Training-time posthoc labels may be logged separately, never fed back into
the original live decision as hidden knowledge.
When observation cannot distinguish poor technique from poor reading, feedback
must acknowledge uncertainty. Credit off-ball contribution through a defined
counterfactual/heuristic with documented limits, not invented certainty.
No rewards simply for number of passes, switches, scans or repeated pattern
triggers. Reward net useful change over a stated window; deduplicate event
credit. Test idle passing, switch loops, possession loss/regain loops and
deliberately bad actions that exploit scoring.

## C11 — Value model

Define the predicted event and time horizon for every term. Keep shot xG,
possession value, completion likelihood, energy cost and concession risk
conceptually separate. A combined score uses normalized, versioned weights
and documents overlap. Hard legal/physical exclusions run before scoring.
No made-up decimal is presented as empirical probability.
Near-equal choices may both be acceptable; uncertainty must not become
overconfident grading. Fatigue and score/time policy affect preferences without
granting scripted comeback goals or impossible execution.

## C12 — Catalog ingestion

Catalog files are passive data. No eval, expression execution, dynamic import,
shell call or fetched-code execution from descriptions, predicates or source
URLs. Future executable conditions must use a typed allowlist of engine-owned
predicates with bounded arguments. Reject unknown schema versions, duplicate
IDs, missing references, invalid enums, oversized payloads and nonfinite numbers.
Limit runtime matcher work; cap active candidates and resolve conflicts stably.
Hash/version the loaded catalog. Do not automatically follow source URLs.
This repository's seed validator enforces authoring status and references only;
it is not a production engine input validator.

## C13 — Finishing coverage

Add shot/cross/pass comparison using shooting angle, distance, keeper position,
pressure, blocked lanes, foot/body orientation, balance, contact type, ball
height, teammates and rebound exposure. Shooting options need distinct
feasibility for placed/driven/chipped/first-time actions; aerial actions depend
on the rules profile. Resolve saves, blocks, deflections, posts and loose balls
through continuous state. A cutback is not automatically better than a shot.
Do not infer an xG model from route-to-goal counts. Finishing fixtures and
calibration are still missing, so the current catalog is not comprehensive.

