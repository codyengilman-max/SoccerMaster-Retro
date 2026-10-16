# FIFA-style mechanics (branch `feature/fifa-gameplay-mechanics`)

Owner directive "Overhaul Core Gameplay to FIFA Mobile Mechanics" (2026-10). Controls stay the left joystick plus
PASS / SHOOT / SLIDE TACKLE / BLOCK; there is no sprint button. Everything below lives in the framework-free
simulation (`src/game/match/sim.ts`, numbers in `src/game/match/tuning.ts`) and runs on the existing fixed step.

## 1. Locomotion (`padVelocity`, `tuning.pad.locomotion`)

Input → desired velocity → acceleration-limited integration, every fixed step:

1. **Stick magnitude bands.** `m = |stick|`. `band = clamp((m − closeControlMax) / (runMin − closeControlMax), 0, 1)`:
   0 at ≤ 0.5 (close control), 1 at ≥ 0.8 (running), blended between. Desired speed is still `m × top speed`, so a light
   push is slow.
2. **Turning.** The acceleration toward the new direction is reduced by
   `agilityTurnPenalty × lerp(closeTurnFactor 0.2, runTurnFactor 1.8, band) × (1 − cos θ)/2 × (2 − agility)`.
   Close control turns almost freely; running carries momentum through the turn. Below ~22% of top speed turning is free.
   Together with the existing exponential approach to the desired velocity this gives the S-shaped speed curve.
3. **Reversal brake.** If the stick points more than ~107° (`brakeCos −0.3`) away from the current velocity while running
   faster than `brakeMinSpeedFrac × top × band`, `pad.braking` is set: desired velocity is zero with
   `brakeAccel × agility × accel` until speed drops under `brakeDoneFrac × top`, then normal acceleration resumes the new
   way. Higher agility brakes sooner.

Measured (seed 7, 60 Hz, `tests/fifaMeasure.test.ts`; targets set before tuning):

| Metric | Before | After | Target |
|---|---|---|---|
| Speed at stick 0.3 (yd/s) | 1.56 | 1.56 | 1.2–2.4 |
| 90° turn at stick 0.3 (s) | 0.10 | 0.08 | ≤ 0.12 |
| Reversal at stick 0.3 (s) | 0.17 | 0.18 | ≤ 0.25 |
| Top speed at stick 1 (yd/s) | 5.2 | 5.2 | 5.2 ± 0.1 |
| 90° turn at stick 1 (s) | 0.32 | 0.38 | 0.38–0.6 |
| Reversal at stick 1 (s) | 0.62 | 0.80 | 0.7–1.0 |

Agility 1.2 reverses at least 15% faster than agility 0.8 (asserted).

## 2. Assisted passing (`pickReceiver`, kick contact)

1. **Cone.** While PASS is charging, every step searches teammates (not the keeper) 3–34 yd away within
   `receiverCone` = 30° (0.5236 rad) of the stick direction (or facing when the stick is idle).
2. **Score** (lower wins): `yards from the stick's line / receiverLineYards (4) + 0.35 × distance / 34`.
   The current ring keeps its target unless another beats it by `receiverStickiness` (0.25), so the ring doesn't flicker.
3. **Trajectory lock.** At contact, with a selected receiver, the ball speed comes from how long PASS was held (unchanged
   power curve). The aim point is the receiver's intercept: three fixed iterations of
   `t = |target − ball| / speed` (≤ 2 s), `target = receiver.pos + receiver.vel × t`. The kick direction may bend up to
   `leadLockAngle` (30°) from the stick toward that point. Without a receiver, the old 0.14 rad lead cap applies.

### Live debugging: `?debug&passlog`

On a 9v9 match URL (for example `/?debug&passlog` → Start → Match), while PASS is held:

- the search cone is drawn from the ball;
- each time the chosen target or the aim (to 0.1) changes, the console prints
  `[passlog] t=… aim=(x,y) chosen=H9` followed by a table of every teammate considered:
  `id, inCone, deg, lineYd, distYd, score`.

The data comes from `MatchSim.passScan`, nine pre-allocated slots overwritten in place. The simulation never reads it.

## 3. Jockeying (`jockeyVelocity`, `tuning.pad.jockey`)

Holding **BLOCK** with an opponent carrier within 7 yd replaces normal block movement (`pad.jockeying = true`):

- **Goal-side point:** the carrier's position a beat ahead (`lookahead` 0.25 s of their velocity) plus `gap` 1.8 yd
  toward the centre of the defender's own goal.
- **Stick:** only shades that point sideways, up to `stickShade` 1.2 yd. Pushing at the carrier can't close the gap,
  so the defender doesn't overcommit.
- **Speed cap:** the carrier's current speed (at least 1.5 yd/s, at most the defender's chase speed).
- Facing still turns toward the ball, and winning the ball still ends the block as before. Without a carrier in range,
  BLOCK keeps its old slowed movement (test A15).

## Determinism and allocations

- All new code runs inside `MatchSim.step`'s fixed step and uses only state and seeded RNG. A 60 Hz and a 120 Hz
  render-rate run give the same path within 0.05 yd (asserted).
- The target search writes into pre-allocated slots and the intercept loop allocates nothing. **Limit:** the engine's
  existing vector helpers (`vec`, `sub`, `scale`, `normalize`) return small new objects throughout the simulation,
  including `padVelocity`'s result. A strict zero-allocation engine would mean rewriting that whole vector layer and is
  not claimed here.

## Tests

`tests/fifaMeasure.test.ts` (locomotion targets, agility reversal, 60/120 Hz, line-distance scoring, cone fallback,
pass scan slots, receiver lead) and the `BLOCK-hold jockeying` block in `tests/padSim.test.ts`. The new passing and
jockeying tests fail on the pre-change engine (`a7a1c5d`), except the speed-cap test, which the old slower block speed also met.
