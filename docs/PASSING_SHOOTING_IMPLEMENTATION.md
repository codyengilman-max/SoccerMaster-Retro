# Passing and Shooting Accuracy (v1.1) — Implementation

Branch `devin/1792348710-pass-shoot-accuracy`, based on `main` @ `90bae4898b00bbf61f8106fa68e507c3b1fd2fcf`.
Rollback switch: add `?kick=classic` to the URL (no save changes). v1.1 is the default.

## Where it lives

- `src/game/match/kicking.ts` — framework-free pure functions: receiver selection, pass delivery and lead,
  bounded contact correction, goal-plane shot aim and assist, shot execution error, first-touch outcome.
- `src/game/match/sim.ts` — wiring into the existing fixed-step `MatchSim` and pad lifecycle
  (`padPress` → charge → `padRelease` locks → contact after prep revalidates → `kickBall`). No new loop,
  input system or physics. Classic code paths remain behind `kickingMode === 'classic'`.
- `src/scenes/MatchScene.ts` — reads `MatchSim.aimPreview()` only: pass line to the receiving point
  (red dot when the passer can't reach it), 7-yard shot aim line, goal-line marker (yellow on target,
  red wide) or an edge chevron when the marker is off screen. Parses `?kick=classic`.
- `window.__SMR__` snapshot gains `kick` (mode, live preview, last kick record, first touch, target switches).

## Behaviour

**Receiver selection.** Candidates inside a 20° half-cone around the aim, from the ball's contact point,
within the passer's physical range (launch cap / friction), excluding the passer and keepers. Offside
players are not excluded. Ranking: smallest angle first; within `collinearAngle` the nearer; ties by id.
The held receiver is kept while eligible unless another is better aligned by `switchAngle`. Charge never
changes the receiver. No candidate → directional ground pass along the aim (8–22 yd roll with charge).

**Delivery.** Constant-friction physics already in the sim: baseline speed `sqrt(va² + 2·f·d)` arrives at
`arrivalSpeed`; charge scales it by 1.00–1.25; capped at `passMaxSpeed × passing`. A capped pass may fall
short — no extra power for distance, no overhit lottery. Lead = receiver's current velocity × min(travel,
0.35 s), ≤ 3 yd, clamped to the pitch, 3 fixed iterations; non-finite input falls back to the current position
(`fallback: true` in the kick log).

**Release and contact.** Release locks aim, power, receiver, receiving point, command id and sim time
(`PadState.locked`). At contact only a bounded re-aim toward the same receiver is allowed
(≤ 0.07 rad and ≤ 1.5 yd endpoint shift); no reselection, no steering, no homing.

**Aim input.** The existing radial dead zone applies. The last stick direction outside it during a charge is
kept (`PadState.aim`); a fresh neutral pass uses body facing, a fresh neutral shot the attacking goal centre.

**Shooting.** Goal plane from the attacking team (sign ±1), not the screen. Aims just outside the posts
(0.4 yd inset) get a continuous correction capped at 3° (0.0524 rad); inside the posts and clearly wide aims
are untouched; the keeper is not an input. Speed is `lerp(shot.minSpeed, shot.maxSpeed, charge)`.
One execution error at contact: triangular in ±spread, spread =
`(base + pressure·Pp + misalign·Pm + effort·charge·max(pressure, misalign)) / finishing`, capped at 0.14 rad.
Full power alone adds nothing when balanced and unpressured. AI shots use the same function.

**First touch.** Ball-relative speed, ball arriving behind the body, pressure and `control` give a quality
0..1 → `secure` / `heavy` (ball stays loose, slowed, short ignore window) / `deflect`. Deterministic: no extra
failure roll. Runs in the existing friendly-receive path, after interception and keeper handling.

**Attributes.** Career mapping adds `passing` and `finishing` multipliers (same 0.8–1.2 scale as `control`).
No new attributes; no weak foot (the game has no foot model).

## Tuning (`MATCH_TUNING.kicking`, provisional)

| Key | Value | Key | Value |
|---|---|---|---|
| passAimCone | 0.349 rad (20°) | shotAssistMax | 0.0524 rad (3°) |
| passMinRange | 3 yd | shotPostInset | 0.4 yd |
| collinearAngle | 0.07 rad | shotErrorBase | 0.05 rad |
| switchAngle | 0.105 rad | shotErrorPressure | 0.06 |
| arrivalSpeed | 8 yd/s | shotErrorMisalign | 0.05 |
| firmnessTap / Full | 1.00 / 1.25 | shotErrorEffort | 0.03 |
| passMaxSpeed / MinSpeed | 18 / 5.3 yd/s | shotErrorMax | 0.14 rad |
| directionalMin / Max | 8 / 22 yd | touchCleanSpeed / HardSpeed | 13 / 22 yd/s |
| leadHorizon | 0.35 s | touchBehindPenalty / PressurePenalty | 0.3 / 0.2 |
| leadMaxDistance | 3 yd | secureQuality / deflectQuality | 0.5 / 0.15 |
| leadIterations | 3 | heavyTouchSpeed | 5 yd/s |
| contactMaxCorrection | 0.07 rad | touchCushion | 0.5 |
| contactMaxShift | 1.5 yd | heavyTouchIgnoreSeconds | 0.15 s |

`shotErrorBase` was raised 0.012 → 0.05 after full-match measurement (goals/shot 27% → 22%, classic 17%).
First-touch thresholds were relaxed from 11/19/0.6/0.2 after the first version tripled heavy touches.

## Other changes and why

- `ai.ts` scratch pool preallocated to 192 vectors: the new receive path raised its high-water mark by one,
  which the existing zero-growth allocation test caught.
- `tests/fifaMeasure.test.ts`: the two 30°-cone receiver tests now run explicitly with `kicking: 'classic'`
  (unchanged expectations); a new test pins the v1.1 angular-first choice.
- `tests/teamTraining.test.ts` CB04: one seed → 10-seed aggregate. With the new first touch, the single
  seed swung from 0.54 to 0.09 while the 10-seed mean still shows playing beats idling. The assertion still
  requires played > idle and at least one won-back ball.

## Known limitations

- Shots and passes stay on the ground (no aerial physics, per the brief).
- No weak-foot model.
- Physical iPhone testing: NOT RUN.
- Tuning is provisional and needs on-device playtesting.
