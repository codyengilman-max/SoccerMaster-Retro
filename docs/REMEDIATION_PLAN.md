# Remediation plan (from the 2026-10-27 audit and owner decisions H1–H8)

Baseline: `main` at `04e947be46baa3cd78dd838b1fc20c58d287f191` (live build). Owner decisions: [DECISIONS.md](DECISIONS.md#owner-decisions-2026-10-27-h1h8). Each PR below is focused, branches from current `main`, and is merged only on explicit owner approval. Browser phone emulation is never reported as real-iPhone verification.

| PR | Scope | Depends on |
|---|---|---|
| A | Decisions and documentation reconciliation (this PR) | — |
| B | Classic vs v0.5 tactics comparison | A |
| C | Story-match Coach Moments (Retro decision model) | A |
| D | Team Training vertical slice | A, owner approvals |
| E | Standing tackle + pad double-tap quick shot | A |
| F | Rest defence + golden moments | A, B |
| G | Regression and stability | C–F |
| H | Real-iPhone verification support | G |
| I | Tournament Results Screen extracted from #37 | A |
| J | Animated Rosters v2 extracted from #37 | A |

## PR A — Decision and documentation reconciliation
- **Files:** `AGENTS.md`, `README.md`, `docs/VISION.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/COACH.md`, `docs/controls/CONTROLS_IMPLEMENTATION.md`, `TRAINING_RELEASE_COVERAGE.md`, new `docs/REMEDIATION_PLAN.md`, `docs/specs/RETRO_DECISION_MODEL.md`, `docs/specs/REST_DEFENCE_GOLDEN_MOMENTS.md`.
- **Accept:** H1–H8 recorded; no doc claims offside is missing or #49 unmerged; shipped / dev-only / blocked / deferred / proposed are separated; PRs #6, #13, #15, #39, #40 closed with a reason, branches kept; #37 untouched; no file under `src/`, `tests/`, `e2e/`, `scripts/`, `public/` or config changed.
- **Tests:** typecheck, `npm test`, build (unchanged results); `git diff --stat origin/main` shows docs only.

## PR B — Tactical-mode comparison (no default change)
- **Files:** `scripts/tactics/compare.ts` (or `tests/tactics-compare.test.ts`), `docs/tactics/CLASSIC_VS_V05.md`, trace output under `docs/tactics/traces/`. No change to `src/game/match/sim.ts` defaults.
- **Accept:** the same N ≥ 50 seeds run headless with `tactics: 'classic'` and `'v05'`; report per metric with mean/spread: team shape (inter-line distances, width, depth), back-line x vs ball x correlation and time parked, pressing (presser distance/time to press), cover/balance, transitions (time to recover shape after loss), offside calls and trap success, opponent chances/xG, match stability (stuck play, restarts taken), sim ms per tick, referee events and existing regression tests passing in both modes; rest-defence metrics added once PR F's rules exist. Ends with a promote / revise / retire recommendation backed by those numbers.
- **Tests:** comparison is deterministic (same seed, same trace hash twice); full unit + e2e suite unchanged.

## PR C — Story-match Coach Moments
- **Files:** `src/game/coach/*` (decision contract `retro-decision-1`, grading bands, Decision Heat), `src/scenes/MatchScene.ts` (enable in career/story matches without `?coach`), `src/game/career/evidence.ts`, `src/game/report/*` (Match Report shows Heat), `docs/COACH.md`, tests `tests/coach-story.test.ts`, `e2e/story-coach.spec.ts`.
- **Accept:** each story match has 4–6 moments from live state; several credible choices with bands Elite/Strong/Playable/Low-value/Forced and rationales; decision grade independent of attributes and outcome (unit test swaps attributes and outcome rolls, grade unchanged); continuation from the frozen state with no position jump > max speed × dt; automatic player switching untouched; Decision Heat 0–100 saved; match result and decisions applied exactly once across reload.
- **Tests:** seeded unit sweep (moment count 4–6 for every seed), grading independence, continuity; e2e Story → league match → moments → report → reload (portrait + landscape).

## PR D — Team Training vertical slice
- **Files:** `src/game/training12/library/gate.ts` (`SESSION_CARDS` filled only with owner-approved cards), approved scene files under `docs/training/library-v1.2/scenes/`, `src/scenes/TacticalTrainingScene.ts` (full-pitch view, movement and facing), tests `tests/training12-slice.test.ts`, `e2e/teamtraining-slice.spec.ts`.
- **Accept:** a small owner-approved set covering GK, outside back, centre back, holding mid, advanced mid, winger and centre forward; each scenario has approved card, stable ID, observable trigger, correct 9v9 context, four credible choices, grading rationale, movement, facing, causal continuation, credit once, reload protection; every other route stays fail-closed; no automatic approval of the 972 routes.
- **Tests:** gate unit tests with the real approved fixtures; e2e plays one approved session to credit, reloads, credit not paid twice; an unapproved session still shows "not counted".

## PR E — Control changes
- **Files:** `src/game/match/sim.ts` (standing-tackle action replaces BLOCK stance), `src/game/match/types.ts`, `src/game/match/tuning.ts`, `src/game/match/referee.ts` (standing-tackle fouls), `src/input/joystickControls.ts`, `src/scenes/ui/PadHud.ts`, `docs/controls/CONTROLS_IMPLEMENTATION.md`, tests `tests/padSim.test.ts`, `tests/joystickControls.test.ts`, `e2e/pad.spec.ts`.
- **Accept:** TACKLE is a committed on-feet attempt with reach, timing window, success probability from attributes, recovery time and foul risk, never a held passive stance; double-tap on the default pad fires a quick shot with shorter wind-up, keeps accuracy spread and keeper/defender outcomes, never guarantees a goal, and a single tap or normal SHOOT hold still behaves as before; no chip or lofted controls.
- **Tests:** unit: tackle success varies with timing/attributes, foul from behind, no possession guarantee; double-tap timing window vs single tap; e2e touch: tackle button and double-tap on phone portrait/landscape; desktop key mapping.

## PR F — Rest defence and golden moments
- **Files:** `src/game/match/shape.ts`, `src/game/match/ai.ts`, new `src/game/match/restDefence.ts`, new `src/game/match/director.ts`, `docs/specs/REST_DEFENCE_GOLDEN_MOMENTS.md`, tests `tests/restDefence.test.ts`, `tests/goldenMoments.test.ts`.
- **Accept:** the measurable rules in the spec are met at the owner-approved rate in seeded sweeps for both teams; ≥ 1 golden moment per match over N seeds; the same seed with the Director on and off gives identical scores and event ledgers; no teleport or illegal state.
- **Tests:** deterministic sweeps; regression test that fails on the pre-PR code for rest defence.

## PR G — Regression and stability
- **Files:** flaky specs (`e2e/jungle.spec.ts`, `e2e/pad.spec.ts`, `e2e/match.spec.ts` formation pause), new `e2e/season-journey.spec.ts`.
- **Accept:** flaky tests pass 20/20 under `CI=1` at 4 workers without weakening assertions; an automated Weeks 1–10 player-facing journey reloads after every week; match results, training credit and story consequences are applied once and persist.
- **Tests:** the journey spec plus all match, referee, save, training, rankings and minigame suites.

## PR H — Real-iPhone verification support
- **Files:** `docs/DEVICE_CHECKLIST.md`, optional `?debug` performance overlay (fps, load time, memory where Safari exposes it).
- **Accept:** a person on a real iPhone records Safari and home-screen install, portrait, landscape, rotation, new game, story, match, Coach Moment, Team Training, Home Training, minigame, save, exit and reload, touch controls, IndexedDB persistence, frame rate, loading time and memory stability, with the served build SHA visible. Emulation results are listed separately.
- **Tests:** checklist results with device model, iOS version and build SHA.

## PR I — Tournament Results Screen (extracted from #37)
- **Files:** the tournament board scene/view and its tests from #37 (`tests/tournament-board.test.ts`, tournament e2e), re-applied onto current `main`; story `tournament_report` handoff switched to the screen.
- **Accept:** only results-screen work; real AZ Showcase results; portrait and landscape screenshots; owner review.

## PR J — Animated Rosters v2 (extracted from #37)
- **Files:** per-appearance roster atlases for Batavia and Royal Salt, `tests/rosters-v2.test.ts`, sprite loader changes from #37.
- **Accept:** only roster work; stable slot appearances; mirrored left poses; no regressions in `sprites-v2`/`artCatalog` tests; screenshots; owner review. #37 is closed only after I and J decisions are complete.

## Removed from the backlog
- Match-long position lock (H1: automatic switching is intended).
- Chip, lofted shots and extra passing/defensive controls (H6: deferred).
