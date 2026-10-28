# Team Training release coverage (v1.2)

> **Superseded runtime (2026-10-27, `main` 04e947b).** The table below describes the earlier `career/teamTraining.ts` drills played in `MatchScene`; that route is no longer reachable from the story. Live Team Training is Sessions A–C in `TacticalTrainingScene`, gated by `src/game/training12/library/gate.ts` on the Audited v1.2 Tactical Library: 48 cards (GK01–GK03 retired), 0 approved for scoring, `SESSION_CARDS` empty, so all 108 sessions × 9 positions (972 routes) are **blocked** and show "not counted". The story continues without credit. The coach-approved All36 package (D01–D36, outfield roles only, approved 2026-10-27) is now the Team Training source; it is inventoried in `docs/training/all36/INVENTORY.md` and integrated in PR C of `docs/REMEDIATION_PLAN.md`. Only verified scenario/position/session combinations will open; GK and every other route stay blocked. No route is approved automatically.

Source: `docs/training/v1.2/06_DRILL_RELEASE_COVERAGE.md` and `training-coverage-plan.json`.
Runtime: `src/game/career/teamTraining.ts` (`TEAM_TRAINING_SITUATIONS`, `selectSituations`, `SituationObserver`), played in `MatchScene` Team Training mode on the real 9v9 engine (no second engine).

The career save has three roles (`DEF`, `MID`, `FWD`); there is no GK career player and no LB/CB/RB/6/8/LW/9/RW split. A package role is shown as **supported** only when a career role plays that drill on its real slot (DEF = H3/H4/H2 back line, MID = H5/H6, FWD = H7/H8/H9). Nothing is silently remapped.

| Family | Package roles | Runtime drills | Career roles that get it | Status |
|---|---|---|---|---|
| TT01 Receive under pressure | all outfield | SIX01 | MID | Partial: DEF and FWD versions deferred |
| TT02 Show a passing angle | all outfield | none | none | **Deferred** (needs an off-ball support objective the observer cannot grade yet) |
| TT03 Use the overload | LB, RB, LW, RW | AT01 (3 v 2 break) | FWD (wingers H7/H8) | Partial: full-back version deferred |
| TT04 Find the other side | all outfield | none | none | **Deferred** (needs a switch-of-play objective) |
| TT05 Pressure and cover | LB, CB, RB, 6 | CB04, OB03, DEF01 | DEF | Partial: 6 (MID) version deferred |
| TT06 React after loss | all outfield | DT01 | DEF, MID | Partial: FWD version deferred |
| TT07 Choose the finish | 8, LW, 9, RW | WING01, NINE02 | FWD | Partial: 8 (MID) version deferred |
| TT08 Build from the keeper | GK, LB, CB, RB, 6 | CB01 (carry out from the back) | DEF | Partial: GK unavailable (no GK career role); 6 deferred |

Other active drills not in a v1.2 family: SIX04, EIGHT01, GM01 (MID). They stay in the weekly rotation.

## Session rules (all families)

- One real half: the camera is held on the half that contains the staged ball, from the halfway line to the goal line, at `TEAM_TRAINING_ZOOM = 1.3` × the match view. World sizes, speeds, reach and collision are unchanged.
- Three attempts per week (`SITUATIONS_PER_WEEK`). An attempt ends only on the observer's objective, a turnover/goal, out of play, or time.
- After an attempt: one observed point, one cue, **Retry** (replays the same attempt; the earlier result is dropped) or **Continue**. After the third: the week is written in one `CareerStore.dispatch` transaction; "Complete" is shown only after it resolves. A counted week is practice only on replay.
- Focuses or roles without a drill fall back to the role's weekly rotation; no extra credit is created.

## D checks

| Check | Result | Evidence |
|---|---|---|
| D01 inventory | PASS | table above; `tests/teamTraining.test.ts` |
| D02 alternatives | PASS | Retry replays the same attempt without a result (`e2e/teamtraining.spec.ts`) |
| D03 selection / locking / fallback | PASS | `selectSituations` fixed per-position rotation; week list validated on load (`saveio.ts`) |
| D04 isolation and normal-match regression | PASS | Team Training zoom/half/HUD apply only when `this.team`; match/full-match e2e |
| D05 identity / progression | PASS | story e2e Boy/Girl + long-name runs; attribute delta within ±2, floor at creation value |
