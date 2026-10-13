# Status

## Current milestone: M1 — Project foundation (complete, in review)

**This is a project foundation, not a playable soccer match.** There is no player movement, ball physics, opponents, rules, or scoring yet.

### Completed
- Toolchain: TypeScript 5.9 (strict), Vite 6.4, Phaser 3.90, npm with committed `package-lock.json`, Node 20 (`.node-version`).
- Start screen (`src/scenes/StartScene.ts`): "SoccerMaster Retro" title, large "Enter Training Ground" button (tap, click, Enter or Space).
- Pitch scene (`src/scenes/PitchScene.ts`): U11 9v9 placeholder pitch (75 × 50 yd) with boundary, halfway line, centre circle and spot, penalty areas and marks, goal areas, corner arcs, and goals; one static placeholder player and a ball; Back button (tap, click, Esc or Backspace) returns to the start screen.
- Responsive layout: Scale Manager `RESIZE`; pitch runs vertically in portrait and horizontally in landscape; scenes re-layout on resize/orientation change; iOS safe-area insets respected.
- Leak-free navigation: one canvas; scenes remove their scale and keyboard listeners on shutdown. Browser tests check canvas count, Phaser emitter listener totals, and live DOM listener counts across 5 round trips.
- Architecture: framework-free simulation in `src/game/`, rendering helpers in `src/render/`, Phaser scenes in `src/scenes/`. A unit test fails if `src/game/` imports Phaser, the DOM, or rendering code.
- Original placeholder art drawn in code; system fonts; no third-party assets.
- Tests: Vitest unit tests (`tests/`) and Playwright browser tests (`e2e/`, Chromium emulating a 390 × 844 phone in portrait and landscape).
- CI: `.github/workflows/ci.yml` runs type check, unit tests, production build, and browser tests on push and pull request.

### Known limitations
- Not a game yet: everything on the pitch is static.
- Browser tests use Chromium phone emulation. Real iPhone Safari has not been tested yet (planned for M2 once a hosted build exists).
- The canvas renders at CSS-pixel resolution; text is rendered at device-pixel resolution, but shapes can look slightly soft on Retina screens.
- Pitch dimensions and markings are placeholders, not an approved rules decision.
- Phaser is a ~1.5 MB (≈340 KB gzip) chunk; no loading screen yet.
- Headless Chromium logs software-WebGL fallback warnings (environment only, not app errors); browser tests fail on console errors, not these warnings.
- No hosting configured; the app only runs locally or in CI.

### Next task
**M2 — Cloudflare Pages deployment setup** (not changed in this task): connect the repository to Cloudflare Pages with build command `npm ci && npm run build` and output directory `dist/`, enable PR previews, then verify the deployed footer build SHA and smoke-test Start → pitch → Back on a real iPhone in both orientations.
