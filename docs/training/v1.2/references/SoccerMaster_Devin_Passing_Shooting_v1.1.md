# SoccerMaster: Passing and Shooting Accuracy — Devin Implementation Brief

Version 1.1 | October 17, 2026 (America/Phoenix)
Owner: Cody Engilman

## START HERE — implement, test, deliver

Implement this enhancement in the active SoccerMaster Retro browser repository. Inspect the current code before choosing files or dependencies. This is a coding specification, not executable code, and does not claim repository inspection or device testing has already occurred.

Keep the four approved actions: PASS, SHOOT, SLIDE TACKLE, BLOCK, plus the movement joystick. No Sprint, Through, Protect, skill button, advanced swipe, shot-type selector, or new gameplay mode. Speed remains attribute-driven. Preserve defensive controls, player-lock behavior, story, training, graphics, saves, and progression.

This document supersedes earlier Pass/Shoot requirements only where explicitly stated below. Preserve the original control-integrity requirements: independent multitouch, fixed button meanings, one action per gesture, safe cancellation, simulation validation, and no stale commands after possession loss. If the four-button foundation is not implemented, integrate these requirements into that work rather than create a second input system.

Work on a focused branch. Deliver a playable preview, PR, exact commit, test evidence, tuning documentation, and remaining limitations. Follow any explicit deployment authorization in Cody's active task; this document itself adds no new production-deployment authorization. Do not stop after writing a plan or documentation.

## 1. Desired outcome and explicit changes

The user must understand who a pass targets, how firmly it will arrive, where a shot is aimed, and why execution differs from intent.

Changes from the earlier controls SOW:

1. Replace a universal raw pass-speed curve with bounded, distance-aware delivery strength for selected receivers.
2. Add limited receiver leading using predicted travel time and reachable movement.
3. Resolve difficult receiving through first-touch physics rather than instant possession.
4. Add visible shot-direction/goal-plane feedback and limited goal assistance.
5. Separate shot strength, placement, and execution error.

Do not add aerial physics, first-time action buffering, contextual through balls, or new defensive mechanics as part of this enhancement. Preserve existing validated height behavior; if absent, implement grounded shots and disclose that limitation.

## 2. Discovery deliverable

Record actual repository/commit, framework/version, world units, attribute scales, ball drag model, kick/contact lifecycle, pass-target logic, camera transform, first-touch logic, and goalkeeper response. Identify the real modules each requirement affects. Run existing relevant baseline checks and distinguish pre-existing failures.

Reuse existing fixed-step simulation and input ownership. No second animation/game loop. No new physics engine merely to implement formulas below. Reuse existing ratings rather than inventing new persistent attributes; document aliases where the data model differs.

## 3. Input and aiming contract

- Left stick continues to control movement while right thumb holds Pass or Shoot.
- A small radial dead zone removes drift. Normalize magnitude so diagonal movement is not faster.
- Sample aim from the current non-neutral stick; when it becomes neutral during a charge, retain the last meaningful aim for that charge. If no meaningful aim exists, Pass uses body facing; Shoot uses attacking-goal center. This prevents lifting the left thumb from snapping a deliberately aimed shot back to center.
- Aim and movement use the same direction input but are distinct simulation values. Do not rotate physical velocity instantly to match kick aim.
- At release, lock requested aim, power, target identity, and action/possession generations. Subsequent stick movement cannot steer the released ball or change the queued target.
- Show the assisted intended direction before release. Never advertise a perfect future outcome; the preview excludes execution error and later deflections.
- Cancel charging on interruption, explicit cancel gesture, pause, player reassignment, stoppage, possession loss, or layout rebuild. Losing and regaining possession does not resurrect the action.
- Disabled-button touches stay inert. No kick buffering before possession. One valid release produces one queued kick and one contact impulse at most.

## 4. Passing intent and receiver selection

Evaluate eligible teammates in a configurable forward aim cone from the ball's predicted contact position. Exclude the passer and unavailable actors. Range eligibility must use actual ability/physics, not arbitrary screen distance. Do not automatically exclude a legally selectable offside teammate just to guarantee a safe result; existing offside rules apply to execution.

Rank by angular alignment first. Use distance and feasible delivery as secondary criteria. Do not override user intention because another pass is safer. With nearly collinear teammates, prefer the nearer eligible teammate and display that choice clearly. No extra far-target gesture in this release; document the selection limitation.

Use hysteresis: retain the highlighted target unless it becomes ineligible or another candidate is materially better aligned. A deliberate change of direction must update promptly. Do not make power charging cycle targets. Use stable ID tie-breaking to avoid nondeterministic selection.

When no eligible receiver exists, permit a directional ground pass with a separate bounded manual-power curve. Do not snap to someone behind the aim or create a default successful pass.

## 5. Distance-aware ground delivery

For a selected receiver, calculate a standard launch speed needed to reach a predicted receiving point with a useful arrival speed. Then apply a bounded charge multiplier. A quick tap requests a normal nearby delivery; a longer hold requests firmer delivery, not a different receiver.

Suggested model:

```text
q = clamp(chargeSeconds / passFullChargeSeconds, 0, 1)
target = selectAndStabilizeReceiver(aim, candidates)
receivingPoint, baselineSpeed = solveBoundedGroundDelivery(target, physics)
requestedSpeed = baselineSpeed * firmnessCurve(q)
launchSpeed = clamp(requestedSpeed, physicalMin, passerCapabilityMax)
```

For constant ground deceleration a and distance d only:

```text
baselineSpeed = sqrt(arrivalSpeed^2 + 2*a*d)
travelTime = 2*d / (baselineSpeed + arrivalSpeed)
```

Use consistent world units and special-case zero distance. These equations are a simplified game model, not calibrated real-world turf physics. If the actual engine uses exponential drag, use its matching analytic or bounded numerical solver. Never apply both this drag and a second unrelated friction penalty.

Choose standard arrival speed within the receiver's ordinary control range; do not silently optimize it to guarantee a perfect touch. Cap launch speed by ability. An unreachable target must remain unreachable: indicate insufficient delivery or let the pass fall short. Do not grant extra power merely because a target is distant.

For stronger charge, increase arrival difficulty naturally. Avoid a second arbitrary 'overhit failure' lottery. After launch, use actual ball physics and receiving interactions.

## 6. Bounded receiver leading

Predict a nearby receiving point from current position and velocity, capped by a short horizon, maximum lead distance, pitch boundaries, and plausible turning/acceleration. This supports passes into stride, not a new through-pass system.

Iterate estimated travel time and receiving point a small fixed number of times (initial candidate: three). If the solver fails, produces non-finite values, or reaches its bound, use a safe finite fallback to the receiver's current position; record the fallback in diagnostics.

Before release, update the preview continuously. After release, preserve target identity. At contact, permit only a small bounded correction toward that same target, respecting maximum aim correction and maximum endpoint shift. If the target is gone or no longer eligible, use the locked directional endpoint or cancel according to documented existing action rules; never choose a new teammate.

Lead uses observable current motion, not future AI decisions. Once launched, the ball has no homing correction. Receivers adjust to the actual flight within ordinary movement limits.

## 7. First-touch integration

Receiving considers relative ball/player velocity, approach direction, body orientation, intended movement exit direction, reachable ball position, existing ball-control rating, and actual opponent pressure.

Distinguish physical contact from secure control. A difficult touch can deflect the ball into a reachable loose state. Do not award secure possession merely because ball and receiver overlap. Do not create an unavoidable fixed delay on easy receptions; ball reach and control quality determine readiness.

Use bounded first-touch displacement or velocity response. Higher delivery speed should make equivalent receptions harder across a matched test set. Do not guarantee every harder pass fails. No double punishment from both an excessive physical rebound and a separate completion-probability roll.

Nearby defenders matter through realistic pressure/reach and actual contact, not a universal radius that ruins every pass. Preserve ordinary interception collisions. Reuse goalkeeper collection rules separately.

## 8. Shooting aim and assistance

While Shoot is held, display a short aim line, compact power bar, and goal-plane target marker when geometry permits.

Compute the attacking goal plane from match direction, not screen orientation. Intersect the aim ray from the ball/contact origin with that plane only when the intersection is forward and finite. Handle parallel/near-parallel rays and positions beyond the goal plane safely. If the intersection is offscreen, use an edge indication or the short aim line; never clamp a wide shot to an on-target marker.

Apply a small bounded angular correction only near the goal's angular interval. Do not convert clearly wide/backward aim into a goal attempt. Preserve near-side/far-side intent and a monotonic mapping across aim inputs. Display the corrected intended direction before release. The keeper's position must not cause automatic placement into the opposite corner.

Lock final intended aim at release. Execution error is applied once at contact. No ongoing steering or homing. Neutral fallback applies only when no meaningful direction was supplied during the charge.

## 9. Shot strength, contact and execution

Hold duration sets requested shot strength through a monotonic curve. Shot-power rating sets achievable speed. Finishing/accuracy sets execution precision. Body/foot geometry and physical pressure affect contact. Weak-foot ability affects execution when that foot is actually used.

Maximum charge does not auto-fire. Release triggers one attempt. Higher charge principally increases ball speed, not automatically shot height or miss probability. If an existing height model is retained, document its coupling and keep the single standard shot predictable.

Do not reward every full-power shot with perfect accuracy: high effort under poor balance can widen bounded error. Do not make maximum power automatically inaccurate when balanced. Do not silently switch foot or delay for an advantageous animation without a documented, short preparation bound. At contact, revalidate possession generation, reach, active phase, and actor identity.

Suggested error model:

```text
sigmaAngle = boundedFunction(accuracyRating, alignment, balance,
                             weakFootAbility, physicalPressure, effort)
errorAngle = oneSeededBoundedSample(sigmaAngle)
actualDirection = rotate(lockedIntendedDirection, errorAngle)
actualLaunchSpeed = boundedContactSpeed(requestedSpeed, contactQuality)
```

Keep ordinary unpressured errors small. Do not apply distance twice: angular error already creates larger lateral error over longer flight. Do not add a hidden success/failure roll, score-dependent miss, or story-driven ball correction. Use the same execution rules for comparable AI and human actions; AI may differ in intent selection, not secret physics privileges.

The goalkeeper reacts to the actual kick/ball and existing perception rules, not the hidden random seed or future outcome. Preserve saves, deflections, posts and rebounds. No goal-success roll after physical goal crossing.

## 10. Suggested implementation boundaries

Adapt these conceptual interfaces to the existing language/engine; they are not drop-in dependencies:

```text
selectReceiver(intent, candidates, previousTarget, tuning) -> target?
solvePassDelivery(origin, receiverMotion, charge, ability, physics) -> plan
computeShotAim(origin, rawAim, attackingGoal, tuning) -> aimPreview
resolveKickContact(lockedIntent, currentState, seededRng) -> impulse | cancel
resolveReceivingContact(ballState, playerState, tuning) -> touchOutcome
```

Keep plans pure where possible for tests. Use immutable action snapshots containing action ID, actor ID, simulation tick, possession generation, aim, power, target, and selected assistance values. Do not serialize temporary charge state into career saves.

Use existing fixed simulation steps and one authoritative contact event. Render previews separately from simulation. Clamp finite inputs, guard zero vectors, and use identical coordinate transforms for visual aim and physical kick direction. Check high-speed ball paths with the existing swept/continuous collision mechanism; do not introduce tunneling as pass speed increases.

## 11. Tuning defaults — provisional, not proven

Keep all values centrally configurable and record actual shipped values. Initial candidates only:

| Parameter | Starting candidate |
|---|---|
| Pass charge cap | 0.65 s |
| Shot charge cap | 0.85 s |
| Pass aim half-cone | 20 degrees |
| Shot assistance angular cap | 3 degrees |
| Lead prediction horizon | 0.35 s |
| Solver iterations | 3 |
| Pass firmness multiplier | 1.0 at tap to 1.25 at full hold |

Tune lead-distance caps, target-switch margin, minimum shot strength, speed ranges, error bounds and contact timing against the game's units and camera. Do not copy adult professional ball speeds into U11/U12 gameplay without age/game-scale calibration. If the old implementation has better measured values, retain them and explain why.

## 12. Acceptance tests and required evidence

Create a repeatable test pitch using existing tooling. Use fixed actor states and seeded execution variation. Separate assistance/intent tests with error disabled from execution tests using paired seed sets. No claimed tests are pre-run by this document.

| ID | Scenario | Required result |
|---|---|---|
| P01 | Short/medium/long static target | Solver predicts actual arrival within documented numerical tolerance under matching physics |
| P02 | Higher charge, same fixed target | Target unchanged; requested speed nondecreasing until capability cap |
| P03 | Two aligned receivers | Nearer selected consistently and clearly highlighted |
| P04 | Slight aim jitter vs deliberate change | Stable target for jitter; deliberate change updates promptly |
| P05 | No eligible receiver | Directional finite pass, no backward target snap |
| P06 | Moving receiver | Lead bounded by configured horizon/distance and no post-launch correction |
| P07 | Receiver reverses after release | No new receiver selection; actual ball remains physically interceptable |
| P08 | Insufficient passer power | Capability cap respected; no guaranteed reach |
| P09 | Hard vs normal delivery | Matched receiving trials show greater control difficulty at higher relative speed |
| P10 | Pass intercepted | Defender contact resolves before intended receipt; no auto-possession |
| S01 | Sweep aim across goal and beyond | Continuous monotonic preview; correction never exceeds cap; clearly wide shots stay wide |
| S02 | Near/far side aim | Requested side preserved; keeper does not silently change placement |
| S03 | Neutral stick after deliberate aim | Last meaningful charge aim retained; fresh neutral charge uses fallback |
| S04 | Half change / camera resize | Correct goal and world direction; preview matches physical aim |
| S05 | Power sweep | Nondecreasing requested shot speed; no maximum-charge auto-fire |
| S06 | Balanced vs awkward/weak-foot trials | Bounded, reproducible quality differences without arbitrary command failure |
| S07 | Parallel ray / extreme position | No NaN, infinity, false on-target marker or crash |
| I01 | Lose and regain possession during charge | Old kick canceled; fresh press required |
| I02 | Movement plus charging and interruption | Multitouch continues; cancellation never fires |
| I03 | Same tick inputs at 30/60/120 Hz rendering | Equivalent action timing/outcomes within documented engine tolerance |
| I04 | Fast pass/shot and post/defender | Swept collision and chronological goal ordering correct |
| I05 | Repeated seeded scenario | Reproducible errors; no hidden outcome manipulation |
| I06 | Match regression | Four buttons, defense, story, saves, training, goalkeeper and restarts preserved |

Before tuning, define numerical tolerances in world units for solver arrival, angular correction and frame-rate comparisons. Report chosen tolerances and justify them relative to player/ball dimensions. Do not change tolerances simply to hide failures.

Record wrong-target rate in scripted unambiguous cases (must be zero), intended-versus-actual angular error, target-switch count, pass arrival speed, receiving displacement, action cancellation reasons, and input-release-to-contact timing. For execution comparisons, use at least 100 paired seeded trials per controlled scenario and report distributions, not one anecdote. This sample count is a pragmatic regression set, not a claim of statistical proof about real soccer.

On physical iPhone Safari/Chrome when accessible, check that users can aim both goal sides, distinguish pass weights, see the receiver, and continue moving while charging. Report unavailable physical-device tests as NOT RUN. Internal event timings are not true hardware touch-to-display latency.

## 13. Delivery and rollout

1. Record baseline and actual implementation map.
2. Implement passing intent/delivery and its isolated tests.
3. Integrate receiving physics narrowly.
4. Implement shooting preview/power/execution and tests.
5. Verify contact/cancellation invariants and match regressions.
6. Deliver playable preview and focused PR; follow active-task release authorization.

Include PASSING_SHOOTING_IMPLEMENTATION.md, ACCEPTANCE_RESULTS.md with each test PASS/FAIL/NOT RUN, actual tuning values, before/after metrics, exact build hash, and known limitations. Retain a reversible feature switch or straightforward commit rollback without career-save migration.

Stop calling the work complete if targets change after release, canceled commands fire, ball speed bypasses collision, aim preview contradicts physical direction, or save regressions remain. Deliver useful preview progress while identifying genuine blockers explicitly.

## 14. Research provenance and limits

Sources reviewed in the preceding research turn on October 17, 2026. These public materials support design principles, not proprietary algorithms or proven SoccerMaster tuning. Formulas, thresholds and implementation choices above are proposed engineering decisions.

- FIFA Training Centre, John Peacock: Passing and receiving — weight, timing, body orientation and receiving quality: https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/john-peacock-passing-and-receiving.php
- EA SPORTS FC 26 Gameplay Deep Dive — precision shooting and first-touch influences: https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive
- Konami eFootball v4.4.0 — kicking accuracy influenced by ball speed, angle and power; a historical design reference rather than a claim about the latest release: https://www.konami.com/efootball/en/page/v4/versioninfo_v4-40

No executable game code is included. Devin must implement against the inspected repository and provide actual evidence. This file is self-contained for the enhancement and retains the essential four-button invariants.
