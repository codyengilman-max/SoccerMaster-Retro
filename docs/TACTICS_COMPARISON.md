# Classic vs v0.5 computer tactics (PR B)

Measurement only. The default stays `classic` (`MatchSimOptions.tactics`); nothing in the match engine changed.

## How it was measured

- `npm run tactics:compare -- 50 1` (`scripts/tactics-compare.mjs`) plays seeds 1–50 under both modes with full timed halves (`MATCH_TUNING.match.halfSeconds` = 165 s each), at a fixed 1/60 s step. Every match is played twice and must give the same trace hash and score (200 of 200 did).
- `src/game/match/metrics.ts` (`measureMatch`) only reads `sim.state` and the event list. `tests/tacticsCompare.test.ts` checks this: an unmeasured run of the same seed, mode and input ends with the same final positions, ball and score.
- The home controlled outfielder needs input (the sim has no home autopilot), so the same scripted input is used in both modes. Two profiles:
  - **chaser** (`HomeBot`): runs at the ball, carries toward goal, shoots inside 20 yd, otherwise taps PASS after 0.6 s. A crude, aggressive player.
  - **sweep** (`SweepBot`): the scripted user from `tests/tacticalMatch.test.ts` (stick sweeps, a PASS or BLOCK press every 2 s). These numbers were measured before PR D; since PR D the off-ball press is TACKLE (a committed standing tackle), so a rerun will differ for the sweep profile. Mostly passive, so it shows the computer team's attack.
- Raw data: `docs/tactics/results.json` (every run, including trace hashes). Full tables with min–max and per-seed hashes: `docs/tactics/summary.md`.
- Metric definitions are in the comments on `TeamMetrics` in `metrics.ts`. Distances in yards, times in sim seconds. Shape (width, depth, line gaps) is sampled 10 times per sim second while the team has the ball; pressing and goal-side counts while the opponent has a carrier. "Pressure" means an outfielder within 3 yd of the carrier; "parked" means a defence-line player under 0.3 yd/s for more than 3 s of live play.

## Results (50 shared seeds, mean ± sd per match)

### Against the aggressive chaser input

| Computer team (away) | classic | v0.5 |
|---|---|---|
| Goals conceded to the bot | 3.32 ± 1.43 | **10.28 ± 1.67** |
| Ball lost to bot tackles | 3.14 ± 1.68 | **36.64 ± 4.57** |
| Shots / big chances | 0.18 / 0.14 | 4.38 / 2.90 |
| Passes / received | 151.5 / 121.1 | 72.4 / 67.7 |
| Width / depth in possession | 38.3 / 28.8 | 33.8 / 26.8 |
| Defence→midfield / midfield→attack gap | 9.0 / 9.5 | 5.1 / 14.8 |
| Parked defender seconds | 0.47 ± 0.84 | 13.88 ± 6.19 |
| Press distance / time to pressure | 2.07 / 0.22 | 1.84 / 0.11 |
| Turnovers never pressed | 2.22 | 4.66 |
| Stoppages | 5.98 | 13.38 |

Home bot record: W50 D0 L0 in both modes.

### Against the passive sweep input

| Computer team (away) | classic | v0.5 |
|---|---|---|
| Goals | **3.24 ± 1.66** | 2.04 ± 1.35 |
| Shots / on target | 9.82 / 7.54 | 20.06 / 11.18 |
| Big chances (inside 18 yd, ≥ 20° mouth) | 4.10 | 12.48 |
| Mean shot distance | 15.5 | 13.0 |
| Passes / received | 154.4 / 132.9 | 95.9 / 82.4 |
| Possession share | 0.67 | 0.62 |
| Defence→midfield / midfield→attack gap | 16.1 / 6.2 | 6.5 / 16.4 |
| Back line follows ball (correlation) | 0.81 | 0.76 |
| Parked defender seconds | 7.53 ± 5.37 | 34.35 ± 10.86 |
| Out of play (last touch) | 0.84 | 3.40 |
| Offside called against the bot (trap) | 0.04 | 0.40 |

Home bot record: classic W0 D1 L49, v0.5 W0 D6 L44.

### Both inputs

- Determinism: 200 of 200 matches replayed to the same trace hash and score.
- Tactics failures (fallback to classic): 0. Invariant violations: 0. Failed restarts (stoppage not restarted within 12 s): 0. Stuck spells (ball in a 2 yd circle for 8 s of live play): 1 classic, 1 v0.5 across 200 matches.
- Fouls: 0 in every match for both teams.
- Cost: 0.042 → 0.053 ms per tick with chaser, 0.040 → 0.052 with sweep (about +25%, measurement included), far inside a 16.7 ms frame.

## Reading

- **v0.5 is exploitable.** A bot that just runs at the ball wins it back 37 times a match from v0.5 carriers (3 from classic) and scores three times as many goals. In the story, the opponent is the computer team, so this is the biggest risk of promoting it.
- **v0.5 creates better chances but finishes fewer.** Against the passive input it doubles shots and triples big chances, from closer, but scores 2.0 a match against classic's 3.2. Classic passes about 60% more against the passive input and twice as much against the chaser.
- **v0.5's shape is split.** The back line sits close behind the midfield (5–6.5 yd gap) while the attack is 15–16 yd ahead, and its defenders stand still 2–5 times longer. Classic is the opposite: a deeper gap behind midfield and a compact front.
- Against the passive input v0.5 kicks the ball out more (3.4 vs 0.8) and catches the bot offside more (0.40 vs 0.04).
- v0.5 only drives the computer team's **attacking** possessions (D35); defending stays on classic AI in both modes, so defensive differences come from the different attacking positions the team is in when it loses the ball.

## Recommendation: revise, do not promote

Keep `classic` as the default. Do not retire v0.5: its chance creation (more and closer big chances) is the one thing it does better. Before another comparison, v0.5 needs:

1. Carrier protection: release or shield under pressure instead of losing the ball to a straight run (target: tackles conceded within 2× classic against the chaser input).
2. Fewer parked defenders while the team attacks (target: parked defender seconds within 2× classic).
3. Midfield→attack distance closer to classic (target: under 12 yd mean).
4. Shot selection or finishing so goals per big chance are not worse than classic.

Rest-defence thresholds are not final until PR E; this comparison is rerun in PR F with them.

## Limits

- Scripted inputs, not a person. The chaser input is crude on purpose; real players will sit between the two profiles.
- One formation (1-3-2-3 both teams, the only formation v0.5 maps) and one tuning.
- Headless engine only; nothing here was run in a browser or on an iPhone.
