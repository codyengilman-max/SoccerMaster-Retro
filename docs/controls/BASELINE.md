# Joystick + four-button controls: baseline (Milestone 1)

Brief: `SOCCERMASTER — GAMEPLAY CONTROLS STATEMENT OF WORK` (Cody, 2026-10). This file records the project as found before any controls change.

## Repository
- Repo `codyengilman-max/SoccerMaster-Retro`; branch `devin/1792100194-joystick-controls`, started from `41446e99de404609db9c4a43742791b5bdbefd49` (head of PR #8, the combined preview: gameplay feel + training drafts + logic catalog + story week one).
- TypeScript 5, Vite, Phaser 3, Vitest, Playwright; npm with `package-lock.json`. Node 20.

## Input and game loop
- Touch: `src/input/touchControls.ts` (`TouchControls`, pure state machine: swipe = run, press-and-pull with the ball = aimed kick, double tap = quick shot). Keyboard: `src/input/keyboard.ts`. Both feed `MatchScene.handleControls`, which issues `MatchSim.command(...)`.
- Event times come from `pointer.event.timeStamp` (`eventTime()` in `MatchScene.ts`); a per-frame `controls.update(performance.now())` promotes a still press to an aim.
- `MatchSim.step(realSeconds)`: wall time clamped to `maxFrameSeconds`, then whole fixed ticks of `stepSeconds` from an accumulator (render rate does not change sim speed). Aiming may slow time (`aim.slowMoScale`) within a per-possession allowance.

## Movement and attributes
- `MatchPlayer` has no attributes. Every outfield player shares `MATCH_TUNING` speeds (`carrier.speed`, `carrier.accel = 20 yd/s²`, `movement.*`). **Pace / acceleration / agility / ball control do not exist in the match engine.**
- Career attributes (seven skill areas, `src/game/career/`) exist but are not read by `MatchSim`.

## Ball, possession, contact
- 2D ground ball only (`ball.pos`, `ball.vel`, friction). **No ball height** in the 9v9 engine (the story crossbar mini-game has its own 3D sim).
- Possession: `ball.owner`; `possessionSeq`, `establishedTeam`, `controlEpoch`, `controlledId` (user player lock with off-ball switching rules).
- Tackles: `resolveTackles()` is proximity-based and automatic. A defender within `tackle.radius` for `tackle.contactSeconds` wins the ball. There are no tackle inputs, slide or block.
- Interceptions and keeper saves: `distanceToSegment` of the ball's per-tick path (swept against players/keepers).
- **No fouls, free kicks, throw-ins, corners, goal kicks or offside.** `tickStopped` is a "temporary sandbox reset" after the ball goes out.

## Camera and HUD
- `src/render/camera.ts` `CameraController` (follow camera, zoom 1.4/1.5/1.6), minimap, scoreboard/clock, pause/help buttons, rotate hint in portrait (`MatchScene`). The HUD is in screen space and the pitch in world space.

## Goalkeeper and set pieces
- Keepers are AI-only. The user never controls a keeper. There are no set-piece controls (none exist).

## Saves and deployment
- Career save: IndexedDB (`src/game/career/store.ts`, `saveio.ts`). Story: separate IndexedDB `smr-story`. No control preferences are stored anywhere.
- Previews: Cloudflare Pages deploy hook bound to `devin/1792017697-gameplay-feel` (PR #8). Pushes to other branches produce no preview. Production is `main` (`35cbf67`), untouched.

## Commands and baseline results
- `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` (Playwright, phone portrait/landscape/small/desktop, 1 worker).
- `41446e9`: typecheck pass; unit tests 514 passed, 0 failed (29 files).
- `0656fd2` CI: 163 passed, 1 failed, 17 skipped. The failure was a touch race in the swipe controls: a frame promoted a swipe to an aim before its queued move arrived. Fixed in `41446e9`, with 3 regression unit tests.

## Gaps the brief depends on
| Brief item | Status |
|---|---|
| Attribute-driven speed (pace, acceleration, agility) | Missing in the engine. Needs per-player match attributes |
| Slide tackle foul handling | No foul or restart system. Minimum foul → free-kick restart required (brief §8) |
| Shot height | Ground only. Documented limitation |
| Goalkeeper / set-piece controls | None exist to preserve. Keepers remain AI |
