# AGENTS.md — SoccerMaster Retro

Standalone U11 9v9 browser soccer game for iPhone. TypeScript + Vite + Phaser 3. Separate from earlier SoccerMaster repos: do not read, copy, or depend on them.

## Commands (all verified on Node 20.19 / npm 10.8)

```bash
npm ci                                  # install from package-lock.json
npm run dev                             # Vite dev server, http://localhost:5173 (debug handle on)
npm run typecheck                       # tsc --noEmit (strict)
npm test                                # Vitest unit tests (tests/)
npm run build                           # tsc --noEmit && vite build -> dist/
npm run preview                         # serve dist/ locally
npx playwright install chromium         # once per machine, for browser tests
npm run test:e2e                        # Playwright: builds, serves dist/, runs e2e/ in phone portrait + landscape
RECORD_VIDEO=1 npm run test:e2e         # same, slowed down, with videos in test-results/
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, typecheck, unit tests, build, and browser tests on every push and PR.

## Layout

- `src/game/` — simulation layer. Framework-free: **no Phaser, DOM, or `src/render`/`src/scenes` imports** (enforced by `tests/architecture.test.ts`). Positions are in pitch yards.
- `src/render/` — drawing helpers: `layout.ts` (pure pitch→screen math, unit tested), `textures.ts` (code-drawn placeholder art), `theme.ts` (palette, fonts).
- `src/game/attack/` — M2 attack drill rules (`AttackSim`, `tuning.ts` holds every gameplay number).
- `src/game/match/` — M3 9v9 sandbox (`MatchSim`, `formations.ts`, team AI in `ai.ts`, every number in `tuning.ts`). Reuses M2 commands and tuning.
- `src/game/coach/` — M5 Coach Moments (facts, templates, validation, `CoachDirector`), framework-free; turned on in the sandbox with `?coach`. See `docs/COACH.md`. `?debug&coach&coachSeconds=40` shortens the session for browser tests.
- `src/game/career/` — M6 career player, activity catalog, planner, journal reducer, game evidence, growth and IndexedDB save (framework-free). UI in `src/scenes/CareerScene.ts`. See `docs/TRAINING.md`.
- `src/input/` — pure gesture recognizer + keyboard bindings → the same sim `Command`s (also framework-free).
- `src/scenes/` — Phaser scenes (`StartScene`, `PitchScene`, `AttackScene`, `FormationScene`, `MatchScene`, `CareerScene`) and UI (`ui/Button.ts`). Scenes read simulation state and draw it; they never own soccer rules.
- `src/debug/diagnostics.ts` — `window.__SMR__` (dev, or `?debug` in the URL): canvas count, active scenes, listener totals, layout bounds, and the attack drill's gameplay snapshot. `?debug&setup=shooting` is a debug-only fixture used by the goal and save browser tests; `?debug&setup=pass` stages the 9v9 sandbox pass test and `?debug&setup=space` gives the carrier room for the swipe, cancel and feint tests.
- `docs/` — `VISION.md`, `DECISIONS.md`, `ROADMAP.md`, `STATUS.md`. Update `STATUS.md` at the end of every milestone.

## Rules

- One milestone at a time; follow `docs/ROADMAP.md`. Record new technical choices in `docs/DECISIONS.md`.
- Navigate with `this.scene.start(key)`. Any listener a scene adds to a shared emitter (`this.scale`, `this.input.keyboard`, `this.game.events`) must be removed in its `Phaser.Scenes.Events.SHUTDOWN` handler. The e2e leak test compares listener totals across 5 round trips; keep it passing.
- Every screen must fit phone portrait and landscape; re-layout on `Phaser.Scale.Events.RESIZE`.
- Original art only (code-drawn or original files); no copyrighted assets or fonts.
- Use npm only; keep `package-lock.json` committed and versions pinned.
- Do not weaken or skip tests to make them pass. Do not change hosting without a task for it.
