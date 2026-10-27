# Remediation plan (2026-10-27 audit, consolidated owner decisions H1–H8)

Baseline: `main` at `04e947be46baa3cd78dd838b1fc20c58d287f191` (live build). Owner decisions: [DECISIONS.md](DECISIONS.md#owner-decisions-2026-10-27-h1h8). Each PR is focused, branches from current `main`, and is merged only on explicit owner approval. Browser emulation (Chromium or WebKit) is never reported as real-iPhone verification.

| PR | Scope | Depends on |
|---|---|---|
| A | Decisions, documentation and All36 package inventory (this PR) | — |
| B | Classic vs v0.5 tactics comparison, ≥50 shared seeds | A |
| C | Coach-approved All36 Team Training integration | A, owner answers in [training/all36/INVENTORY.md](training/all36/INVENTORY.md#owner-decisions-needed) |
| D | Standing tackle + pad double-tap quick shot | A |
| E | Rest defence + golden-moment highlights | A, owner sign-off on proposed thresholds |
| F | Regression and stability | C, D, E (reruns B with E's metrics) |
| G | Real-iPhone verification by a person | F |
| H | Tournament Results Screen extracted from #37 | A |
| I | Animated Rosters v2 extracted from #37; then close #37 | A, H |

## PR A — Decisions, documentation and package inventory
- Files: `AGENTS.md`, `README.md`, `TRAINING_RELEASE_COVERAGE.md`, `docs/{DECISIONS,STATUS,ROADMAP,VISION,COACH,REMEDIATION_PLAN}.md`, `docs/controls/CONTROLS_IMPLEMENTATION.md`, `docs/specs/*.md`, `docs/training/all36/INVENTORY.md`.
- Acceptance: only `.md` files change, with nothing under `src/`, `tests/`, `e2e/`, `scripts/`, `public/` or config. Typecheck, all unit tests and the production build pass. PRs #6, #13, #15, #39 and #40 are closed with branches kept, and #37 is untouched. Nothing is merged or deployed.

## PR B — Classic vs v0.5 comparison (no default change)
- Files: `scripts/tactics-compare.ts` (headless `MatchSim` runner), `src/game/match/metrics.ts` (pure measurements), `tests/tacticsCompare.test.ts`, `docs/TACTICS_COMPARISON.md` with traces.
- Metrics: width, depth and inter-line distances; back-line movement against ball movement; time defenders stay parked; pressing distance and time to pressure; cover and balance; transition recovery; offside calls and trap success; opponent chances and shot quality; stuck play and restart completion; referee events; ms per tick; determinism; regression results.
- Acceptance: at least 50 shared seeds per mode, and the same seed and mode give the same trace hash twice. The report gives means and spreads and recommends promote, revise or retire. The default stays `classic` and existing tests pass. Rest-defence numbers are not final until PR E.

## PR C — All36 Team Training integration
- Files:
  - `docs/training/all36/` (archive imported unchanged and hash-pinned).
  - `scripts/training/import-all36.py`.
  - `src/game/training12/all36/{catalog,validate,map}.ts`.
  - `src/game/training12/library/gate.ts` (`SESSION_CARDS` holds only verified combinations).
  - `src/scenes/TacticalTrainingScene.ts` and `src/render/` helpers.
  - `tests/all36*.test.ts`, `e2e/teamTrainingAll36.spec.ts`.
  - `TRAINING_RELEASE_COVERAGE.md` (the coverage report).
- Every playable scenario keeps its stable ID, approved title, objective, metrics, supported role, choices and grades, movement, facing, causal continuation, one credit only, reload persistence and duplicate-reward protection.
- Acceptance:
  - Every route outside the package, and GK, stays fail-closed.
  - The coverage report has one row per scenario with these columns: ID, name, approval, metric located, screenshot located, roles, code mapping, playability, movement, facing, grading, completion, credit, reload, portrait, landscape, blocker.
  - Screenshots are used as reference only, never shipped as gameplay.

## PR D — Standing tackle + double-tap quick shot
- Files: `src/game/match/{sim,types,tuning,referee}.ts`, `src/input/joystickControls.ts`, the `MatchScene` HUD, `docs/controls/CONTROLS_IMPLEMENTATION.md`, `tests/standingTackle.test.ts`, `tests/quickShot.test.ts`, `e2e/pad.spec.ts`.
- Acceptance:
  - **Tackle:** the outcome depends on reach, timing and attributes. It has recovery time and foul risk, and it never guarantees possession.
  - **Quick shot:** it releases faster than a normal shot, keeps the same spread and keeper/defender outcomes, and single-tap/hold SHOOT is unchanged.
  - **Not added:** chip, lofted or other new controls.

## PR E — Rest defence + golden-moment highlights
- Files: `src/game/match/{restDefence,highlights}.ts`, `shape.ts`/`ai.ts` hooks, `tests/restDefence.test.ts`, `tests/highlights.test.ts`, `docs/specs/REST_DEFENCE_GOLDEN_MOMENTS.md`.
- Acceptance:
  - **Rest defence:** seeded sweeps report each measurable rule for both teams.
  - **Highlights:** at least one authentic highlight per match.
  - **Director is observe-only:** the same seed with highlighting on and off gives identical scores and canonical event-ledger hashes.

## PR F — Regression and stability
- Files: flaky specs (`jungle`, `pad`, `match` pause→formation), `e2e/seasonJourney.spec.ts`, `playwright.config.ts` WebKit project.
- Acceptance:
  - Flaky tests pass 20 of 20 under `CI=1` with 4 workers, without weakened assertions.
  - Browser coverage: Chromium phone, WebKit touch and desktop.
  - Weeks 1–10 journey with a reload after every week: results, credit and consequences apply exactly once.
  - The critical journey runs against both the local production build and the deployed Cloudflare build, with both SHAs recorded and any difference reported.
  - PR B is rerun with PR E's metrics.

## PR G — Real-iPhone verification
- Files: `docs/DEVICE_CHECKLIST.md`, plus an optional `?debug` FPS/memory overlay.
- **Done by a person on a physical iPhone:** Safari, home-screen install, portrait, landscape and rotation; new game, story, match, Team Training, Home Training, minigames; save, exit and reload; touch controls, IndexedDB, frame rate, load time, memory.
- **Recorded:** iPhone model, iOS version, build SHA, URL, screen recording, results.

## PR H — Tournament Results Screen (from #37)
- Only the tournament-results scene/view and its tests, rebased onto current `main`. #37 itself is not merged.

## PR I — Animated Rosters v2 (from #37)
- Only the roster atlases, sprite-loader changes and roster tests. #37 is closed only after the H and I decisions are made and the approved work is preserved.

## Test plan (all PRs)
`npm ci` · `npm run typecheck` · `npm test` · `npm run build` · `npm run test:e2e` (phone + desktop) · `npm audit` (baseline: 2 moderate dev-only). Reports give the branch, full SHA, and total/pass/fail counts, with baseline failures kept separate from regressions. Tests are never weakened or skipped.

## Removed from the backlog
- **Removed:** match-long position lock (H1); story-match Coach Moments, in-match tactical questions, Decision Heat in story matches, tactical-choice Match Report scoring (H3).
- **Deferred:** chips, lofted shots, extra passing and defensive controls (H6).
