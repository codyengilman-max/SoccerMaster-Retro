# Passing and Shooting Accuracy (v1.1) — Acceptance Results

Branch `devin/1792348710-pass-shoot-accuracy`. Exact build commit and bundle hash: see the PR description
(a file can't contain the hash of the commit that adds it). Test file: `tests/kicking.test.ts`.

## Acceptance tests

| ID | Check | Result |
|---|---|---|
| P01 | Short/medium/long (8/16/24 yd) passes arrive at a controllable speed, in the sim | PASS |
| P02 | Charge is monotonically firmer to the same point (1.00 → 1.25) | PASS |
| P03 | Angle first; nearer of collinear teammates; stable id tie-break | PASS |
| P04 | Held target kept (hysteresis); charge alone never cycles it (0 switches) | PASS |
| P05 | No receiver in cone → finite directional pass, no backward snap | PASS |
| P06 | Lead bounded by horizon, 3 yd, pitch; NaN → safe fallback | PASS |
| P07 | Target can't be replaced after release; contact correction ≤ 0.07 rad; no homing | PASS |
| P08 | Passing ability caps launch; far target not guaranteed | PASS |
| P09 | Faster / from-behind / pressured balls are harder; 25 yd/s ball not secured in the sim | PASS |
| P10 | Opponent in the lane intercepts before the receiver | PASS |
| S01 | Aim sweep: assist ≤ 3°, continuous, wide stays wide | PASS |
| S02 | Near-post and far-post aims stay distinct | PASS |
| S03 | Neutral stick keeps last aim; fresh neutral → goal centre; drift ignored | PASS |
| S04 | Goal plane from attacking direction, not the screen | PASS |
| S05 | Hold → power monotonic; 3 s hold never auto-fires | PASS |
| S06 | 100 paired seeds: awkward/pressured scatter > 2× balanced; full power alone adds nothing | PASS |
| S07 | Parallel, backward, beyond-line, NaN geometry safe | PASS |
| I01 | Possession loss while charging cancels; no kick | PASS |
| I02 | Second button, cancel, double release → at most one kick | PASS |
| I03 | 30/60/120 Hz give identical kick, flight and first touch | PASS |
| I04 | Full-power shot swept against the goal line at 30/60/120 Hz; goal after shot, same time | PASS |
| I05 | Same seed + inputs reproduce the match exactly | PASS |
| I06 | Seeded full matches: 18 players, finite state, shots happen | PASS |
| — | Physical iPhone Safari/Chrome | NOT RUN |

Camera/resize invariance: the kick is computed in `src/game` from pitch yards only (enforced by
`tests/architecture.test.ts`); the existing FIFA test that the same stick gives the same pass from any camera
still passes.

## Metrics (before = `?kick=classic`, after = v1.1)

**Pass targeting, 100 paired seeded trials** (intended teammate 8–24 yd within ±57°, a distractor 10–36° off,
±5° aim noise, 0.2 s hold, identical layouts for both modes):

| | Wrong target | Mean angle launch vs receiver | Target switches | Release → contact |
|---|---|---|---|---|
| Classic | 23 / 100 | 2.50° | 0 | 83.3 ms |
| v1.1 | 0 / 100 | 0.87° | 0 | 83.3 ms |

**Full matches, 12 seeds × 2 × 45 s, both teams AI:**

| | Passes | Received | Shots | Goals | Heavy touches | Hot/deflected | Interceptions | Turnovers |
|---|---|---|---|---|---|---|---|---|
| Classic | 504 | 505 | 111 | 19 | 0 | 10 | 60 | 207 |
| v1.1 | 515 | 517 | 104 | 23 | 9 | 18 | 44 | 195 |

Pass arrival speed (P01, sim): within 6–11 yd/s at 8, 16 and 24 yd (target 8 yd/s).

## Not measured

- Receiving displacement and cancellation-reason distributions are logged per event (`__SMR__.kick`,
  `padCancel` events) but not aggregated.
- Physical-device feel: NOT RUN.
