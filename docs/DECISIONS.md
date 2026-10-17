# Decisions

Approved technical choices. Add a new entry rather than silently changing an old one.

| # | Decision | Reason |
|---|----------|--------|
| D1 | **TypeScript** with `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `noImplicitOverride` (`tsconfig.json`). | Catch mistakes early in a codebase that will grow a simulation. |
| D2 | **Vite 6** as dev server and bundler (`vite.config.ts`, `index.html` entry). | Fast dev loop, static `dist/` output suitable for Cloudflare Pages. |
| D3 | **Phaser 3.90** (final, mature Phaser 3 release) for rendering, input, and scenes. Phaser 4 was not chosen for this foundation because Phaser 3 has the longer track record and documentation. | Stable 2D engine with WebGL/Canvas, Scale Manager, scene lifecycle. |
| D4 | **npm** with committed `package-lock.json`; CI uses `npm ci`. Dependencies pinned to exact versions. Node 20 pinned in `.node-version`. | One package manager, reproducible installs, Cloudflare reads `.node-version`. |
| D5 | **Simulation separated from rendering.** `src/game/` holds framework-free state and geometry (no Phaser, DOM, or render imports, enforced by `tests/architecture.test.ts`). `src/render/` holds drawing helpers (pure layout math in `layout.ts`, Phaser textures). `src/scenes/` holds Phaser scenes that read simulation state and draw it. | Future match logic can be tested headlessly and cannot be entangled with drawing code. |
| D6 | **Phaser Scale Manager `RESIZE` mode** on a `#app` element that fills the iOS safe area. Each scene re-lays out on the scale `resize` event; the pitch runs vertically in portrait and horizontally in landscape. `FIT` was not used because it letterboxes and wastes phone screen space. `src/render/resizeGuard.ts` re-syncs the canvas each step if Phaser 3.90's orientation handler leaves it at the previous orientation's size. | Fills both phone orientations without letterboxing. |
| D7 | **Scene lifecycle rule:** navigate with `scene.start(key)` (stops the current scene). Every listener a scene adds to a shared emitter (`this.scale`, `this.input.keyboard`) is removed in its `SHUTDOWN` handler. One `Phaser.Game` per page; Vite HMR destroys the old game. | Repeated navigation must not leak canvases or handlers. |
| D8 | **Original placeholder art drawn in code** (`src/render/textures.ts`, Phaser `Graphics` → generated textures). System fonts only. No third-party art assets. | No copyright risk; easy to replace with an original art pack later. |
| D9 | **Vitest** for unit tests (`tests/`), **Playwright (Chromium, phone portrait + landscape emulation)** for browser tests (`e2e/`). | Fast pure-logic tests plus a real-browser check for leaks, layout fit, and console errors. |
| D10 | **Debug handle** `window.__SMR__` exposed only in dev or with `?debug` in the URL; reports canvas count, active scenes, listener totals, and layout bounds. | Lets browser tests and humans verify there are no leaks without shipping debug UI. |
| D11 | **Build stamp:** `__APP_VERSION__` and `__BUILD_SHA__` are injected at build time (from `CF_PAGES_COMMIT_SHA`, `GITHUB_SHA`, or `git rev-parse HEAD`) and shown in the start-screen footer. | Lets a future deploy prove which commit is being served. |
| D12 | **GitHub Actions CI** (`.github/workflows/ci.yml`) runs type check, unit tests, production build, and browser tests on every push and pull request. | Every change is verified the same way. |
| D13 | **Hosting: Cloudflare Pages (planned, not configured yet).** | Static hosting with per-commit preview deploys. |
| D14 | **M2 attack drill rules live in `src/game/attack/`** (`AttackSim`): fixed 1/120 s steps, explicit phases `reset → live ⇄ aiming → ended`, one `ball.owner` field (single possession), every number in `tuning.ts`, seeded RNG only for small start-position jitter. | Deterministic, unit-testable soccer rules with no Phaser dependency. |
| D15 | **Input layer `src/input/`** is pure: `GestureRecognizer` (swipe vs hold-to-aim thresholds) and keyboard bindings both map to the same `Command`s the sim accepts. | Touch, mouse and keyboard cannot drift apart; gestures are unit-tested. |
| D16 | **Aiming slows sim time (×0.3) for a bounded 1.6 s real-time budget** that refills only while not aiming; cooldowns, players and ball all use sim time. | Gives time to aim without an unlimited freeze. |
| D17 | **Landscape-first elevated sideline view**: `fitRegion` compresses the across-pitch axis (squash 0.55); portrait keeps a top-down view plus a rotate suggestion. | Readable on phones; portrait stays playable. |
| D18 | **Debug-only `?debug&setup=shooting` fixture** starts attempt 1 with a teammate through on goal, used by the browser goal and save tests. The full receive → dribble → shoot loop is covered by seeded unit tests. | Browser timing in headless CI is too variable to script a whole move reliably. |
| D19 | **M3 9v9 sandbox is a second framework-free sim in `src/game/match/` (`MatchSim`) that reuses M2's controls, `Command`s, ball/kick/keeper numbers and gesture layer.** M2's `AttackSim` stays untouched and playable. | Extends the existing architecture instead of a competing engine; M2 remains a regression reference. |
| D20 | **Fixed 1/120 s steps for every phase** (kickoff, live, aiming, stoppage). Pause sets time scale 0; aim slow motion scales the whole sim. All movement/AI numbers live in `src/game/match/tuning.ts` (`MATCH_TUNING`). | Same play at 30/60/144 fps; one place to tune. |
| D21 | **Formations are data** (`formations.ts`): per role a base position, in/out-of-possession duty, movement bounds and adjacent roles. Switching (paused only) maps roles slot-to-slot (`roleMap`), keeping every player object, position, velocity, the ball, possession and score; only roles and future targets change. | Stable, explicit remapping with no teleport or hidden bonus. |
| D22 | **Team coordinates:** each team plans as if attacking +x from its own goal at x = 0; away coordinates are mirrored. One planner serves both teams. | Same AI for both directions; fewer mirrored bugs. |
| D23 | **AI sees only visible state and completed kicks.** One presser (best arrival time with role penalties) and one cover per defending team, each held for a commitment spell; loose balls get one chaser per team. Seeded RNG for small decision noise and reaction delay. Stale aims are void via `controlEpoch`. | Credible, non-swarming defending that cannot cheat on the user's unreleased aim. |
| D24 | **Sandbox stoppages, not match rules:** goals and ball out of play stop play briefly, are labelled as sandbox restarts, and restart in place (goal: conceding team from the centre; out: other team from the spot). No offside, fouls, set-piece rules or match clock. | Keeps M3 about team behaviour; full match flow is a later milestone. |
| D25 | **Debug-only `?debug&setup=pass` / `setup=final-third`** start the sandbox with the user carrier in space, used by the browser pass test. | Deterministic browser checks without changing normal play. |
| D26b | **Retro Goal-style touch controls** (supersedes the aiming/double-tap parts of D26): with the ball, a press anywhere that has not travelled `swipeCommit` within `aimDelayMs` becomes an aim (no hold on the carrier, no arming wait beyond that); faster travel is a dribble. Double-tap = quick shot; feint is keyboard-only. Gesture timing uses input-event timestamps; presses in an edge margin are ignored. | Matches the documented reference behaviour (swipe anywhere, slow-motion aim, double-tap quick shot) with project-specific tuning; see `docs/GAMEPLAY_FEEL.md`. |
| D26c | **Closer follow camera with a zoom choice** (`src/render/camera.ts`, pure): visible span = fixed baseline (landscape 40 yd of length, portrait 28 yd across) ÷ zoom choice 1.4 / 1.5 (default) / 1.6, recomputed from constants every frame. One `CameraController` with explicit modes (possession, aiming = held, travel = ball with capped lead, loose, hold = paused) and exponential, frame-rate-independent smoothing; look-ahead turns only after an attacking-direction change persists 0.45 s. Gestures stay in screen space; the camera never feeds the sim. Off-screen aim rest points are drawn as an edge arrow. | Bigger, readable players (Retro Goal-inspired framing, not a measured value) without changing kick strength, physics or outcomes; the final zoom is chosen after an iPhone test. |
| D26d | **Ball-focused dribbling camera replaces D26c** (`src/render/camera.ts`, owner request): fixed short-range span (`CAMERA_VIEW`: landscape 32 yd length, portrait 22 yd across), low landscape angle (`landscapeTilt` 0.5) plus a screen-space perspective homography anchored on the ball (`layout.withPerspective`, strength 0.3; identity Jacobian at the anchor so joystick directions are unchanged; sprites scaled by `depthScaleAt`), target is always the ball plus a capped velocity lead and a short attacking look-ahead; zoom choices removed. Render-only: simulation and aiming are unchanged and camera-independent (unit tested). |
| D26 | **Unified sandbox controls** (`src/input/touchControls.ts`, pure): one gameplay pointer, explicit states idle → pending → dribble / aiming / spent, stable screen-space origin, thresholds scaled by the viewport's short side. Swipe = dribble direction, still hold on carrier = aim (pull back, cancel circle), double-tap carrier = feint. One action per gesture. The M2 drill keeps its own recognizer. | One intuitive kick instead of a Pass/Shoot mode; arbitration is unit-testable without a browser. |
| D27 | **Aim allowance per possession spell**, spent in real time, refilled only by regaining the ball after genuine opponent possession or Reset. Commands are validated in the sim (ownership, finite values, power clamp, cooldowns, phase). | Slow motion cannot be farmed by cancel/pass spam; malformed input cannot corrupt physics. |
| D28 | **M5 Coach Moments run inside the existing `MatchSim` behind `?coach`**, not in a new engine. M4 match flow is not built, so a coached session is a fixed-length sandbox session (300 s sim time) with a summary. | Builds the learning layer on the real sim honestly without pretending a full match exists. |
| D29 | **Two pause reasons in the sim** (`pauseReasons.user`, `pauseReasons.coach`); the sim is paused while either is set. `coachRelease` clears only its own reason and drops banked frame time. Formation changes need the user pause. | Continue cannot undo a background pause; a long question cannot cause a catch-up burst. |
| D30 | **Coach logic is framework-free in `src/game/coach/`**: facts → eligibility → evaluation → director (scheduling, records, summary). The Phaser `CoachOverlay` only draws and forwards taps; a full-screen blocker zone stops touch-through. | Testable without a browser; UI cannot change grading. |
| D31 | **Templates are authored data with functions** (23 templates), validated at load time; options use `available()` so no choice invents an open teammate or lane; grades are strong / reasonable / risky and several can be strong. No runtime AI. | Deterministic, reviewable, age-appropriate questions. |
| D32 | **Consequences are bounded:** on-ball choices show a cue and the player must execute; off-ball choices set one temporary `coachIntent` (≤ 6 s, ends on possession change, receiving, restart or reset) that feeds normal AI movement. | Choices change real play without automatic goals, teleports or stat boosts. |
| D33 | **Decision quality and execution are recorded separately** (selected grade vs observed action and outcome in the 6 s after Continue). | A good idea that is badly executed is still a good idea, and vice versa. |

## M6 — Home training and progression

- **Self-report never changes attributes.** Journal entries earn bounded participation credit and level suggestions only; attributes grow from the career player's own sandbox actions (and capped Coach answers). Keeps typing from beating playing.
- **IndexedDB, one readwrite transaction per change.** read → validate → pure reducer → write in the same transaction, so completion and credit can't split and tabs serialise. localStorage rejected (no transactional read-then-write). `fake-indexeddb` (dev only) tests it.
- **Pure reducer (`src/game/career/state.ts`).** Every career change is one `Action`; unit-testable, and the store is a thin wrapper.
- **Completion ids created when the form opens** make Complete idempotent across double taps, retries and tabs.
- **Career weeks advance by an in-game action, never by device time.**
- **Evidence collector reads `seq`** so the 40-event rolling log is safe; gaps are counted as missed, never guessed.
- **All numbers in `CAREER_CONFIG` / `EVIDENCE_RULES`**, provisional until play-tested.
- **Plain-text rendering only** (Phaser Text); names/notes are cleaned of control and bidi characters and length-bounded.

## M4 core — match clock
- The clock lives in `MatchSim` (`state.clock`, `src/game/match/clock.ts`), counts only ticks with the ball in play, and therefore stops for pauses, backgrounding, Coach holds, kick-off countdowns and stoppages. One sim tick is the only time source, so results stay deterministic.
- At the whistle everything in progress ends where it is: an aim is cancelled (never fired), a ball in flight does not count, Coach intentions end. Only pause/resume, Coach hold/release, reset, formation and `startSecondHalf` commands are accepted during half-time and full-time.
- Teams keep the same ends after half-time because the team AI assumes fixed attacking directions; swapping ends is deferred.
- `MatchSim` without `halfSeconds` remains the open-ended sandbox, so M3/M5 unit tests and `?sandbox` keep their behaviour.

## Training library v1.1 import (draft)
- The package is kept byte-for-byte in `research/training/v1.1/`; revisions will go in a new versioned folder, never by editing it. Its 63 Python reference tests stay unchanged and still assert the package's own P-001 contract.
- Owner override of P-001: no week-slot journal stamp. Credit stays one per scheduled `sessionId`; substitution, catalog update and replay add none (`tests/curriculum-economy.test.ts`).
- Families are curriculum organization inside the seven skill areas, not progression tracks. Prerequisites only gate suitability.
- Publication authority is a repository-side release manifest (`curriculum/release.ts`), never imported content or saves. It is empty until real coach/QA review and reviewed demo assets exist.

## Combined preview integration
- One integration branch (`devin/1792089834-all-updates-integration`) merges PR #8 gameplay and PR #9 training; both feature branches stay as they were. The PR #8 preview hook is reused (owner instruction "use old hook"), so PR #8's branch is fast-forwarded to the integration head; `devin/1792017697-gameplay-feel-backup-fdec076` keeps the gameplay-only state.
- Soccer-logic package v0.2 is copied byte-for-byte to `research/logic/v0.2` (its scripts are not run). `src/game/logic/catalog.ts` loads it strictly and rejects any seed marked enabled, calibrated or non-draft; `activeLogicScenarios()` is empty, so the catalog has no effect on match behaviour. Its 40 entries are not counted toward the 500-plus scenario goal as fulfilled.
- Start → Review & Lab opens review screens without creating a player or writing the save.

## Story v0.7 week one

- Package stored unchanged in `docs/story/v0.7/`; v0.7 corrections and `week_one_scenes.json` are authoritative. Only `remember_choice` effects and the `always` / `crossbar_accepted` predicates exist; everything else is rejected by the loader.
- Story state lives in its own IndexedDB database (`smr-story`), one transaction per command with revision and sequence checks, so career saves are untouched by story bugs. Unreadable records are kept under `broken-<id>-<time>` keys, never overwritten.
- Boy/girl is an optional field on the career player; older saves load unchanged. Identity never affects attributes, growth or eligibility.
- Activity outcomes come only from the existing systems' saved state (career save revision, focus, logged scheduled session, saved match evidence, `endWeek`). The story never invents a result, and home training keeps one credit per scheduled session.
- The crossbar challenge uses its own framework-free 3-D ball model because the 9v9 engine has no ball height; same pull-back gesture, no Shoot button.
- Club world is design data only: no league table, scheduler or tournament entry is built from it.

## Controls — joystick + four buttons
- The owner's controls brief replaces swipe / pull-back as the default 9v9 scheme. The old scheme stays behind `?controls=gesture` for comparison and rollback; the sim defaults to `gesture` so the Lab, attack drill and engine tests keep their contract.
- Pointer ownership lives in pure `src/input/joystickControls.ts`; the sim owns availability and validation (`padPress`/`padRelease`/`padCancel`). One input path per scheme, one sim loop.
- Control preferences are stored in localStorage (`smr-controls-v1`), separate from IndexedDB career/story saves; invalid values fall back to defaults.
- A slide that hits the body first is a foul with a basic opponent free-kick restart; the engine has no other set pieces yet.

- Owner cap: actual playing time is 5–6 minutes max per match. Default `halfSeconds` is 165 (2 × 2:45 = 5:30 of play); the clock still stops for pauses, Coach Moments, kick-offs and stoppages, so those do not count. The displayed 25-minute U11 half clock is unchanged.

## Graphics v1.1 (owner-approved styles; branch `devin/1792120824-graphics-v1`)
- Package stored byte-for-byte in `docs/art/graphics-v1/` (checksums verified). `scripts/art/build-runtime-art.py` derives half-size WebP runtime copies into `src/assets/art/v1/` and records each master's SHA-256 in `runtime-manifest.json`; masters are never edited.
- `src/render/art/catalog.ts` is the only path from story data to art: a fixed asset allowlist, the package's scene and wardrobe maps, and speaker *roles* (Player, Jordan, Blake, Caregiver, Coach Code, Alex). Typed names are never used to pick art, so a player named Alex is still the player. Unknown scenes and missing/failed images show labelled neutral placeholders, never another character.
- Match players are drawn by a TypeScript port of the package's Canvas2D factory (`render/art/spriteFactory.ts`), cached as lazily built textures (≤ 512 frames, freed on shutdown). Art scale and foot anchor are presentation only; physics, collision, camera, controls and `src/game/` are unchanged. Poses come from real sim state/events; animation time is sim time.
- The engine has no squad numbers, club kits or named gameplay characters: numbers are formation slot + 1, kits are home/away/keeper reference colours, hair is fixed per roster slot. The career player uses the saved boy/girl look on their career slot.
- Cutscene portraits are static: entrance slide/fade and a tint-only speaker highlight, disabled under `prefers-reduced-motion`. Art never writes story, saves, rewards or input; dialogue, names and choices stay live text.
- New character/outfit art stays `NEW_ART_REVIEW_PENDING` in the Art Gallery until the owner reviews each image.

## Story weeks 2–4, Jungle Ball, league (2026-10-16)
- Week one stays byte-identical to package v0.7. The weeks 2–4 draft is a separate catalog (`docs/story/weeks-2-4/weeks_2_4_draft.json`, version `w24-draft-1`) that may use code-resolved `branch` nodes. `mergeCatalogs` links the two catalogs, and the save `contentVersion` stays `0.7`, so existing story saves and run keys stay valid.
- Relationship consequences come from committed facts (choices and resolved runs) through code-owned predicates, never from effect operations in content. That makes them idempotent by construction.
- League results move through the story database: `matchresult:<runId>` is written once at full time, and `league:<careerId>` holds the table. This keeps `MatchScene` unaware of careers and leagues beyond one result key.
- Jungle Ball is a separate framework-free sim, so the 9v9 engine and its tests are untouched.

