# Rest defence and golden moments (specification, not implemented)

Owner decision H7 (2026-10-27). Status: **required, specification only**. Implementation is PR E in [REMEDIATION_PLAN.md](../REMEDIATION_PLAN.md). Numbers marked *proposed* need owner approval; all distances are pitch yards on the 75 × 50 U11 pitch used by `MatchSim`.

## Rest defence

The players the attacking team keeps behind the ball so that a lost possession does not become an unprotected counterattack. Measured every sim tick while a team is in possession in the opponent half.

| Rule | Measurable state rule (*proposed* thresholds) |
|---|---|
| Back-line positioning | At least 2 defenders goal-side of the ball and at least 3 yd behind the last attacker of their own team; the line holds width ≤ 30 yd |
| Holding-midfielder protection | The deepest central midfielder stays within 15 yd behind the ball and inside the central 20 yd channel |
| Goalkeeper connection | Keeper ≤ 25 yd behind the last defender (sweeper distance) |
| Central protection | At least one rest defender inside the central 20 yd channel at all times |
| Weak-side positioning | The far-side defender tucks in to within 12 yd of the central channel |
| Cover behind attacking movements | When a defender joins the attack, another player drops into the vacated rest slot within 3 s |
| Counterattack prevention | Rest defenders ≥ opponent forwards ahead of the ball + 1 (a "+1" rule) |
| Reaction after loss | Within 1 s of a turnover the nearest rest defender presses when a teammate is within support distance, otherwise the line drops |

Acceptance: seeded sweeps report the share of attacking ticks that meet each rule, for both teams, before and after; no rule may be met by teleporting.

## Golden moments

Every match should contain at least one authentic high-leverage moment: a goal chance, an assist chance, a breakaway, a major save, a last-player tackle, a critical recovery or a match-changing defensive stop.

- The Match Director **detects** these from the live sim (e.g. shot xG above a threshold, attacker through on goal with no defender goal-side, last defender tackle, keeper save on a high-value shot).
- Golden moments are **highlights, not tactical questions** (H3). The Director may only mark, list or replay a moment after it has happened.
- It must not force a goal or turnover, move or teleport players, change possession, redirect a pass, delay or cancel a goal, manufacture a defensive mistake, override the referee, change the score, or change the canonical event ledger.
- If nothing qualifies by full time, it highlights the strongest authentic high-leverage event the sim produced (highest leverage score), labelled honestly.

Acceptance: a deterministic sweep over N seeds shows ≥1 golden moment per match; the same seed with highlighting enabled and disabled gives identical scores and canonical event ledgers (hash-compared).
