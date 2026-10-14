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
