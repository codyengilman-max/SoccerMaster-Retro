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
- Power = `((pull − cancelRadius) / span) ^ POWER_CURVE` with `POWER_CURVE = 1.4`, so ordinary passes are less sensitive and full power needs a deliberate long pull. Thresholds scale with the screen's short side, so they behave the same across sizes and DPRs.
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

## Closer camera (zoom revision)

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
