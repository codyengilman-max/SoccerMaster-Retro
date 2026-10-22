# Team Training v1.2: library-to-scenario mapping and half-field adaptations

Adaptation version: **tt12-halffield-1** (`src/scenes/TacticalTrainingScene.ts`, `src/game/training12/drill.ts`).
Package: `SoccerMaster_Team_Training_Fixed_v1.2.zip` (SHA-256 `5695c88c…5cf115c03`), kept unchanged next to this file.
Reference engine, catalog and seasons modules are vendored byte-for-byte in `src/game/training12/ref/` (hashes checked by `tests/training12-ref.test.ts`).

## What is enabled

| Season | Weeks | Sessions | Roles | Level | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 1–4 | 12 (A/B/C × 4) | GK, CB, LB, RB, 6, 8, LW, RW, 9 | 1 | **Enabled**: 108 exact scenario keys in `registry.ts`, each played to completion by `tests/training12-session.test.ts` |
| 1 | 5–18 | 42 | all | 1–3 | Not available yet (shown as such in Career) |
| 2 | 1–18 | 54 | all | ≤3 | Not available yet |

A route opens only when the reference planner selects it **and** its exact `{ key, verified: true, definition }` record is in `VERIFIED_KEYS`. Generated layouts are never trusted on their own.
Career positions offer these roles: DEF → CB/LB/RB, MID → 6/8, FWD → LW/RW/9. GK routes are enabled and tested in unit tests, but the career has no keeper position yet, so they are not reachable from Career.

## Practice formats used by Season 1 weeks 1–4 (level 1)

| Card | Name | Area (m) | Players | Drill family in `drill.ts` |
| --- | --- | --- | --- | --- |
| B1 | Find the exit | 30 × 24 | 6 | build-out: A scores by a controlled reception past an exit gate, B scores in the main goal |
| C1 | Give and go or turn | 24 × 18 | 5 | combination: controlled reception in the far 3 m end zone |
| D1 | Delay and cover | 24 × 18 | 4 | defending: two mini-goals per end |
| F1 | Pass or finish | 24 × 20 | 4 | finishing: A attacks the goal, B counters through two gates |
| K1 | Keeper plus outlets | 28 × 24 | 5 | keeper distribution: exit through either gate |
| S1 | Two goals to choose | 25 × 25 | 6 | switching: two mini-goals, finish inside the last 5 m |
| T1 | Win it and find space | 28 × 22 | 6 | transition: two mini-goals per end |
| W1 | Wide two against one | 26 × 20 | 4 | wide overload: A attacks goal, B counters through a start gate |

## Existing library

- **Legacy weekly Team Training** (`src/game/career/teamTraining.ts`, three logic-catalog situations per week): kept, unchanged, and still playable as "Play Team Training". It and v1.2 share one weekly grade (`countTeamWeek`): whichever completes first counts the week; the other is practice only.
- **Home training, schoolyard games (Crossbar, Jungle Ball), optional skills and matches** are separate destinations and are not touched or scheduled by v1.2. v1.2 never writes fixtures or tournaments.

## Half-field adaptations (tt12-halffield-1)

1. The camera is fixed, straight down and never follows or rotates. It always shows one whole physical half of the 9v9 pitch (34.3 m × 45.7 m): both touchlines, the halfway line and centre-circle arc, the goal line, penalty and goal areas, the whole goal, plus a 2 m margin. The goal is at the top in both portrait and landscape.
2. Each card's practice area is drawn as a marked rectangle centred across the half and mid-way between halfway line and goal line. Every Season 1 W1–4 area fits inside the half with no scaling.
3. Card targets (goal, mini-goals, gates, end zones) are drawn at their card positions inside the area; the 9v9 goal stays visible for context but only scores when the card's own target is that goal.
4. The coaching panel sits under the half in portrait (40 % of the height) and to its right in landscape (38 % of the width), inside the safe area.
5. Round length is 45 seconds of live ball per round (reference default is 90); three rounds are required.

## Learning structure

Observe (play runs) → Decide (play stops; numbered options are drawn on the pitch and listed in the panel; the human must choose) → Execute (NPCs play the choice out) → Explain (outcome, decision quality, reasons, better option) → next situation with seeded variation.
Round 1 is guided (cue line + full reasons), round 2 has no cue, round 3 is timed (5 s to choose; a missed decision scores 0).
Decision quality, execution and outcome are recorded separately (`Attempt.decision`, `Attempt.outcome`). Attendance or idle play earns nothing; at least 30 s of observed active play and healthy telemetry are needed for credit, and `masteryGranted` is always false.
