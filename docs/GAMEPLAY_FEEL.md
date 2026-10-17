# Gameplay feel revision (dribble, pass, receive, shoot)

Branch `devin/1792017697-gameplay-feel`, from `main` `35cbf67`. Not merged or deployed to production until Cody approves the preview.

## Baseline diagnosis (from Cody's two iPhone recordings and the code)

| Seen on the phone | Cause in `35cbf67` |
| --- | --- |
| "You need the ball for that" repeated | `MatchSim.dribble()` rejected every off-ball swipe (`dribble: no ball`) and `MatchScene` toasted every rejection. Off the ball the user controlled nobody. |
| "Slow motion used up" | 2.4 s aim allowance spent while aiming, refilled on any opponent touch, so it was hard to predict. |
| Players a few pixels tall | No camera in landscape: the whole pitch plus margins was fitted to the screen. Portrait showed the full 50-yard width. |
| Long aim line, no idea where the ball stops | The guide drew direction only; a separate scene-side roll estimate was not the sim's physics. |
| Passes to the "wrong" teammate | The AI receiver was the nearest teammate to the target, not someone who could actually reach the ball. |

## Possession and control

Separate pieces of state (`src/game/match/types.ts`):

- `ball.owner` — the only player who has the ball (one at most).
- `controlledId` — the home outfielder the user drives: the carrier when we have it; the defensive presser (`defense.home.presserId`) when they have it; the committed loose-ball chaser otherwise.
- Candidate receiver — `ball.kick.receiver`, shown by the aim guide; highlighting it never grants possession.
- `controlEpoch` — bumps on every control change; the scene cancels any gesture started under an older epoch.
- `possessionSeq` / `establishedTeam` — a team's spell is *established* once one player has held the ball `aimAllowance.establishSeconds` (0.6 s).

Rules: control never switches while our own pass is in flight; off-ball switches need `offBall.minHoldSeconds` (0.6 s) since the last one; reception moves control exactly once. Off-ball swipes steer the controlled player for `offBall.steerSeconds` at the normal chase speed (no boost). Career evidence is still credited to whoever performs the action.

## Aim assistance

- `MatchSim` option `aimAssist`: `'slow'` (default: short slow motion while aiming) or `'normal'` (full speed, nothing spent). Fixed for the life of the sim, so a match locks it at kickoff. URL `?aim=normal`, or the toggle in the Gameplay Lab.
- The allowance is spent in real (wall-clock) seconds, so slowing the sim cannot stretch it. A frame is capped at `maxFrameSeconds`, so returning from the background cannot drain or jump it.
- It refills only when we win the ball back after the opponent had an *established* spell. Cancelling, re-aiming, our own passes, deflections, momentary touches, menus, Coach Moments and reloads do not refill it.

## Kick power and the aim guide

- One ground kick for passes, through balls and shots. No Pass/Shoot buttons, loft or curl.
- Power = `(pull − cancelRadius) / span` (linear, `POWER_CURVE = 1`), capped at 1. The sim turns power into roll distance (`kickRoll`, see the repair pass below). Thresholds scale with the screen's short side, so they behave the same across sizes, zooms and DPRs.
- `src/game/match/predict.ts` is shared by the guide and the kick: `predictGroundKick` uses the sim's own fixed-tick integrator (a unit test checks an untouched kick stops within 0.01 yd of the marker); `planUserPass` picks the teammate who can physically reach the ball's path (0.2 s reaction, normal acceleration and top speed). No snapping and no guaranteed completion: the ball stays interceptable, and a receiver it rolls past is released so the loose-ball chase takes over.

## Camera and projection

- Landscape: a follow camera over about 40 yards of length, angled (`SIDELINE_SQUASH`), scrolling both ways with room ahead of the attack (home +x, away −x). The HUD floats over the pitch; a minimap sits bottom-right.
- Portrait: a follow camera about 28 yards across, minimap top-left, and a "Turn sideways" hint.
- The sim stays in pitch yards. All mapping is in `src/render/layout.ts` (`fitRegion`, `toScreen`, `fromScreen`, `screenVectorToPitch`). The aim vector depends only on the screen scale, never on the camera position, so camera movement alone cannot change direction or power.

## Gameplay Lab (development and preview builds only)

- Open `/?lab` on the dev server or a branch preview. Pick a scenario and an aim mode. Pause → Reset restarts the scenario.
- Scenarios (`src/game/match/lab.ts`): passing between teammates; short/medium/long passes; 1v1 dribble; 2v1 into a shot; receiving under pressure; loose ball; turnover and recovery; central and tight-angle finishing; touchline.
- Isolation: a lab match is untimed, has no Coach, and never opens the career store, so it cannot earn progression or write a save. `__LAB__` is a build-time constant (`labEnabled` in `vite.config.ts`): on for `vite serve`, on for Cloudflare branch previews (`CF_PAGES_BRANCH` ≠ `main`), off for the production `main` build, where the code is removed. `SMR_LAB=1` forces it on (the browser tests use this).

## Save compatibility

No save schema change. The new state is per-match and never persisted. Career saves (`docs/TRAINING.md`) are untouched.

## Touch controls (Retro Goal-style revision)

**What the references support** (App Store version history, Defector's hands-on review, Nintendo Life interview with New Star Games): swipes start anywhere on the screen to run; passes can be placed to lead a teammate into space; time slows while you set up a pass but opponents keep coming; a double tap is a quick shot that is less precise; an "Expert" control scheme was added later as a separate option. **What they do not establish:** hold times, gesture thresholds, power curves, slow-motion amounts or current version behaviour. Every number below is SoccerMaster tuning, not a measured Retro Goal value, and nothing here was tested against Retro Goal itself.

| Gesture | With the ball | Without the ball |
| --- | --- | --- |
| Quick swipe (travels `swipeCommit` before `aimDelayMs`) | Run that way; fires as soon as it crosses the distance | Steer the controlled defender/chaser (`swipeMin`) |
| Press and hold or slow drag, anywhere | Aim: pull back, the kick goes the opposite way; strength grows from the cancel-circle edge to `maxPull` (curve `POWER_CURVE`) | Movement only, never an aim |
| Release outside the circle | Exactly one kick (pass, through ball or shot, decided by the same physics the guide draws) | — |
| Release back inside the circle | Cancel, nothing launches, never a tap or shot | — |
| Double tap | One quick shot at goal: power `quickShot.power`, seeded target spread `quickShot.spread` × goal half-width | Nothing |

- **Movement vs aim tradeoff** (`TOUCH_TUNING.aimDelayMs` = 110 ms, `swipeCommit` ≈ 7% of the short side): shorter delay starts aims sooner but needs faster swipes to run; longer delay forgives slow swipes but makes aiming feel late. A gesture is classified once and never changes (a run never becomes a kick).
- **Taps:** a still press released within `tapMaxMs` is a tap even if the aim had opened (that aim is cancelled quietly, reason `tap`). A press that left the tap slop or is released later is a cancel, not a tap.
- **Timing:** gestures use input-event timestamps (real time); the simulation's slow motion and frame drops never change what a gesture means. A late move event after `aimDelayMs` is an aim even if no frame ran in between.
- **Ownership:** one pointer owns the gesture; extra fingers and duplicate up events are ignored. Presses within `edgeMargin` of the screen edge (iOS back swipe, home bar) presses on HUD buttons or the minimap never start gameplay gestures, and compatibility mouse events within 800 ms of a touch are ignored (so one tap cannot count twice).
- **Screen vs world:** the drag is measured in screen pixels from a fixed press point; it is converted to a pitch direction only when the action fires, so the following camera cannot change an aim's direction or strength.
- **Slow motion:** one sim time scale (`aim.slowMoScale`) while aiming, spent from the per-possession allowance; the match clock follows sim time. Releasing, cancelling or any interruption restores normal speed and never unpauses a pause or Coach Moment. Aim/cancel spam never refills the allowance.
- **Trajectory:** one ground kick for every pass and shot (no lofted pass gesture). Aim assist never redirects a kick; a shot on target never turns into a pass.
- **Lab setups for controls comparison:** `dribble-1v1` (direction changes), `pass-unpressured` (short pass to a stationary teammate), `through-ball` (moving runner), `receive-turn`, `finish-centre` (both corners), `quick-shot` (rebound), `cancel-pressure`.

## Ball camera (replaces the zoom revision below)

- One fixed framing, no zoom choice: landscape 32 yd of length (depth squash 0.5); portrait 22 yd across.
- Real low-camera perspective (owner's FIFA "Dynamic" reference): a homography about the ball's screen point makes lines converge toward the top and scales players, ball and shadows by depth (`perspective` 0.3: far edge ≈ 0.77×, near edge ≈ 1.4×). Straight pitch lines stay straight; at the ball the mapping is the identity, so stick directions are unchanged.
- Players are 2.1 yd tall on screen (was 2.7) so more space around the ball is readable.
- The camera aims at the **ball**, not the carrier, plus `ballVel × 0.35 s` (capped at 4 yd) and, while the ball is carried, a 2.5 yd look-ahead toward the attacking direction. Smoothing rates 6/s along and 5.5/s across, so the ball stays near the centre while dribbling.
- Hold (pause, break cards) still freezes the camera; bounds still keep goals and run-off in view.
- Portrait has no depth squash, but gets the same perspective (a behind-the-attack view).

## Closer camera (zoom revision, superseded)

The chosen zoom is SoccerMaster tuning inspired by Retro Goal's close mobile framing; it is not a measured Retro Goal value. The final value waits for the owner's iPhone test.

- **Baseline (1×):** the previous follow camera: landscape shows 40 yd of pitch length (height follows the screen aspect with the 0.55 sideline squash); portrait shows 28 yd across. `BASELINE_VIEW` in `src/render/camera.ts`.
- **Zoom:** span = baseline ÷ zoom, with zoom in {1.4, 1.5, 1.6} (default 1.5). Landscape lengths: 28.6 / 26.7 / 25.0 yd; portrait widths: 20.0 / 18.7 / 17.5 yd. The span is recomputed from constants every frame, so resizes, rotations, resets and scene entries cannot compound it. Any other value (`?zoom=abc`, `?zoom=9`) falls back to 1.5. Choose in the Lab (`Zoom` button) or with `?zoom=` in a normal match.
- **Projection unchanged:** same sideline squash; zoom only changes the visible span. Sprites scale with the pitch (player height cap raised so they actually grow).
- **Camera controller** (`CameraController`, pure, unit tested): possession follows the carrier with a 6 yd look-ahead toward the attacking direction; the look-ahead eases slowly and only turns after a direction change has lasted 0.45 s, so a brief backward dribble or a contested ball cannot swing the view. Aiming freezes the camera exactly where it is at aim start (no residual easing, zoom or focus change), so the field cannot slide under a held finger. A travelling free ball is followed with a capped 0.4 s lead (max 7 yd), never a predicted receiver, so an interception simply blends to the new carrier. Paused, Coach Moments and half/full-time cards hold the camera. Smoothing is exponential in real frame time, steps are capped at 0.1 s, and non-finite inputs are ignored.
- **Bounds:** framing limits keep the goals and a 3 yd run-off (plus HUD and tip-line margins) in view; physics boundaries are separate and unchanged.
- **Aim independence:** finger displacement (screen px, thresholds scaled to the screen's short side) sets direction and strength; it becomes a world direction only when the action fires, using a scale ratio that does not depend on zoom or camera position. A unit test feeds identical gestures at all three zooms and gets identical kicks and identical simulation results.
- **Off-screen passes:** when the guide's rest point is off screen, the line stops at the screen edge with a double chevron, and no endpoint or receiver dot is drawn on screen. Kick range is not reduced and there is no auto-targeting. The power meter is kept inside the screen at touchlines and corners.
- **UI:** the HUD, minimap, buttons and text are drawn in screen space and keep their size at every zoom.
- **Pixel art:** textures are code-drawn and rendered with antialiasing; positions are not rounded to whole pixels, because rounding at slow pans makes visible judder. Fractional zoom cannot be pixel-perfect on every phone.
- **Known tradeoff:** at 1.5× in landscape only about 22 yd of the 50 yd width is visible (34 yd at baseline), so wide teammates on the far side are often off screen during a pass; the minimap and the edge arrow are the cues. If this proves too tight on an iPhone, the bounded fix is a slightly wider view only while aiming, not continuous zoom changes.

## Repair pass: pass weight, carrier movement, first touch, pressing

All units are pitch yards (yd) and simulation seconds (s) unless marked real ms. Measured with seeded probes (fixed ratings, 60 Hz fixed step) on `2d2ea43` (before) and this revision (after); the regression tests are in `tests/repair.test.ts`.

**Confirmed root causes**
- **Pass weight:** `kickSpeed` was `lerp(8, 27, power)` and power was `pull^1.4`. The softest kick rolled 9.2 yd, so an 8 yd pass always overshot, and 8–20 yd was squeezed into the first ~30% of the pull.
- **Turning with the ball:** `userCarrierVelocity` rotated the heading at 5 rad/s and cut the target speed to 30% while the heading was far off, and the carrier accelerated at 9 yd/s². A cut mostly braked along the old line: in a 1v1, a sideways swipe moved the carrier 0.01 yd sideways in 0.3 s before he was tackled. Turning upfield after a receive took 1.23 s.
- **Reception reset:** `take()` reset the dribble direction to straight upfield whenever the receiver was moving backward, forcing a reversal on the first touch.
- **Selection flicker:** off the ball, control followed whichever player was the presser or chaser that step, held for only 0.6 s, so it bounced between two players (A→B→A within 1 s 191 times in 20 min of seeded play), and could switch away from a defender the user was steering.
- **Pressing:** the presser re-aimed at the ball every step with perfect information and was faster than the carrier (5.4 vs 5.2 yd/s), so any cut was mirrored instantly. Every dodge in the 1v1 drill lost the ball (0/80).

**Changes**
- **Power curve (`tuning.kick`, `kickRoll`):** power sets roll distance. 4.0 yd at the cancel edge, linear to 34 yd at 70% of the pull (about 0.43 yd per 1% of pull), then eased (with no slope kink) up to 27 yd/s, which is unchanged shot speed. Launch speed = `sqrt(2 × friction × roll)`; ball friction is unchanged, so the ball is not slowed globally. The guide still uses `predictGroundKick` on that same speed.
- **Carrier (`tuning.carrier`):** steers straight at the swiped direction; the only limit is a 20 yd/s² velocity-change cap (no teleport; a 90° cut from full speed takes about 0.37 s). The redirect spam guard (0.12 s) and back-dribble factor (0.75) are kept.
- **First touch:** the receiver keeps his own running direction. A swipe made while our pass is within `bufferReach` (5 yd) of its receiver is buffered for `bufferSeconds` (0.4 s) and becomes his first-touch direction. It is bound to that receiver, is cleared on any touch, pause or control change, and can only set a dribble direction (never a kick).
- **Selection (`tuning.offBall`):** automatic switches never leave a player the user is steering, and returning to the player control just left needs `returnHoldSeconds` (1.5 s). Winning the ball still hands control to the new carrier at once.
- **Presser reaction (`defense.readSeconds` 0.25 s):** pressers close on the carrier as read through a 0.25 s lag. This means a timely cut beats one presser, but running straight at him or cutting when he is on top of you still loses the ball. Tackle radius, contact time, protection and recovery bans are unchanged.

**Before → after (seeded)**
| Measure | Before | After |
|---|---|---|
| Softest pass roll | 9.2 yd | 4.0 yd |
| Roll at 10/30/50/70% pull | 11.0 / 19.0 / 33.1 / 54.6 yd | 8.3 / 16.9 / 25.5 / 34.1 yd |
| Receive then turn upfield (velocity within 20°) | 1.23 s | 0.37 s |
| Receive then turn sideways | 1.12 s | 0.35 s |
| Progress in 1.5 s after receive, swipe upfield | 1.2 yd | 5.3 yd |
| 1v1: sideways cut at 0.2–0.5 s beats the presser | 0/80 | 80/80 |
| 1v1: straight at him / cut at ≥ 0.6 s | lost | still lost |
| Off-ball control switches, no input, 8 seeds × 150 s | 35.1/min, 191 A→B→A under 1 s | 15.5/min, 7 (ball-win handoffs) |
| Normal match, scripted user, 8 seeds × 150 s: pass completion | 62% (166/267) | 65% (200/306) |

**Limitations**
- Interceptions are still about a third of scripted passes in normal play.
- Physical iPhone feel is unverified.

