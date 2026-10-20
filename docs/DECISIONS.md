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


## D27. Weekly Team Training from the soccer-logic catalog (owner request 2026-10-17)

- Catalog text is never executed. Each active entry has a hand-written typed fixture (`StageFixture`, shared with the Gameplay Lab via `stageFixture`) and observable grading in `SituationObserver`: possession kept or lost, ball progress during possession, completed passes, shots on target, goal-side time, ball won back. An open-teammate pass or a sensible-range shot earns part credit even when it fails, so decisions count more than luck.
- Three situations per week from a fixed per-position rotation (`selectSituations`), so every save sees the same week and results can be validated on load.
- Average score → +2 (≥0.75), +1 (≥0.5), 0 (≥0.3), −1 otherwise. Gains go one point each to the best-played trained attributes up to potential; a loss takes one point from the worst-played attribute and never below `CAREER_CONFIG.attributes.start`.
- The `teamTraining` reducer action is idempotent per week and rejects foreign weeks, wrong situation lists and out-of-range scores; `parseSave` rejects duplicate weeks and deltas that do not match the stored scores. Older saves load with no records (no schema bump).

## D28. Season One competition and save migration (owner package v1.0, 2026-10-19)

- League: the same 5 clubs in a triple round robin (30 fixtures, 12 for Batavia) in `src/game/season/league.ts`. Other clubs' games are simulated from the career seed through each round, including a round Batavia skipped. A skipped Batavia game stays pending, never a loss.
- Cups: `src/game/season/tournament.ts`, 4 entrants, a 3-round round robin, then a final (top 2) and a placement game (bottom 2). Group ties are broken by points, head-to-head, goal difference, goals for, then seeded lots. There is no shoot-out engine, so a drawn final or placement game is a shared result. Cup results are stored per cup (`tourney-s1:<career>:<cup>`) and never enter the league table.
- Results are written with `StoryStore.updateRecord` (read, check and write in one transaction), and a cup game's fixture is bound to its story run when it launches (`tfix:<run>`). A second tab finishing the same run cannot overwrite the result or move on to the next game. A failed write leaves the story handoff pending.
- The season ending calls the season complete only when all 12 league results and both cup placings exist (`detail:S1_END_FIELD=season_complete`).
- Save migration: an older story record is archived unchanged under `legacy-story-<career>`, and Season One starts at its prologue. The career save (identity, levels, training, career week) is not touched, so the career week keeps counting from where it was.

## D34. Referee: Laws of the Game calls in the match engine (owner request 2026-10-17)

- Rules live in `src/game/match/referee.ts` (framework-free, unit tested); `src/modules/RefereeSystem.ts` re-exports it under the name the spec asked for. Scenes only show the call banner.
- Pitch yards on the U11 markings (`U11_9V9_PITCH`), with length, width, goal width and ball radius taken from the match tuning. Not pixels: the perspective camera changes pixel sizes every frame, so pixel boundaries would change calls.
- Out of play only when the whole ball is over the line (centre past line + ball radius). Throw-in to the team that did not touch it last, from the crossing point, taken by their nearest outfielder (not "nearest full-back", which can be far away); taker held on the line, AI throws after 0.6 s, the user's player after 4 s unless they pass first. Goal line: attackers last → goal kick from the goal-area corner on that side (keeper takes, opponents leave the area); defenders last → corner at the nearest flag. Every restart waits for the kick: the taker is held and the ball stays on the spot until it is played (AI after 0.6 s; the user's outfielder after 4 s unless they pass first). Opponents are kept 8 yd from the ball (out of the area for a goal kick) for the whole wait, not just at the placement.
- Offside follows the Laws, not "last outfield defender": at the kick instance the line is the second-last opponent (keeper counts), never behind the ball or in the passer's own half; level (within 0.25 yd) is onside. Judged on the next touch by any teammate of the passer (involvement), using positions cached at the kick. Any touch ends the check. No offside straight from a throw-in, goal kick or corner. Sanction: indirect free kick at the offence spot; a ball sent straight into a goal from an indirect free kick or throw-in is a goal kick if it went into the opponents' goal, and a corner if it went into the taker's own goal.
- Slide foul when the slide is faster than `maxSafeTackleThreshold` (3.5 yd/s) and comes from behind (victim's front = their ball side, else running direction) or reaches the body before the ball. Slower contact plays on. In the slider's own penalty area: penalty from the 10 yd mark, keeper on the line, everyone else outside the area and held until the kick; else a direct free kick at the contact point.
- Calls run inside the fixed-step tick and write into preallocated fields, so 60 Hz and 120 Hz give the same calls (tested). The rest of the engine still allocates small objects per step (D-FIFA notes).
- Not built: advantage, cards, handball, aerial crosses from corners (corners restart on the ground), the 9v9 build-out line, keeper six-second/back-pass rules.

## D35. v0.5 tactical decision engine for computer attacks, off by default (owner choice B, 2026-10-18)

- The v0.5 logic package is kept as research in `research/logic/v0.5` (its bundled git history is not imported). `src/game/match/tactical.ts` is a TypeScript port of `engine/decision-engine.mjs`; its 17 standalone tests are ported in `tests/tactical.test.ts`.
- `tacticalDirector.ts` adapts the match to the engine: each team is observed in its own frame (own goal at x = 0, direction +1, away mirrored as in `ai.ts`), yards are converted to metres (0.9144) on the configured pitch, and the 1-3-2-3 slots map to GK/LB/CB/RB/6 (LCM)/8 (RCM)/LW/9 (ST)/RW. Other formations stay on the classic AI.
- Phase 1 scope is one attacking possession: while a team holds the ball or has its own pass in flight, the engine sets the movement targets of its computer outfielders and decides the AI outfield carrier's carry, PASS or SHOOT. Defending, loose balls, keepers, the user's player, the pass receiver and Coach Moment intentions stay on the classic AI.
- Engine kicks are revalidated (same owner, possession and control generations, not expired) and go through the sim's own `kickBall` with the same seeded aim and power noise, so physics, first touch, offside and the referee are unchanged. If the engine ever rejects an observation, that sim falls back to classic AI for the rest of the match (`tactics.failure`).
- Measured over 12 seeded matches (2 × 45 s, scripted user, `tests/tacticalMatch.test.ts`): {"classic":{"passes":446,"completed":398,"shots":74,"goals":16,"conceded":0,"turnovers":81,"failures":0},"v05":{"passes":329,"completed":281,"shots":82,"goals":15,"conceded":0,"turnovers":94,"failures":0}}. The v0.5 attack passes less, completes a lower share (85% vs 89%) and loses the ball more, so it is not the default. `MatchSimOptions.tactics` defaults to `'classic'`; `?tactics=v05` turns it on in the match.

## D29. Training / Schoolyard revision v1.2 (owner package, 2026-10-13)

- Crossbar keeps its existing 3-D fixed-step model (`CROSSBAR_SIM_VERSION = 1`) instead of the package's 2-D fallback. Visual goal, net, ball and aim aids come from `crossbarView` / `goalGeometry`, which read `CROSSBAR`; the backdrop is scaled so its grass line meets the projected goal line. The package `scene-layout.json` is a presentation reference only.
- Crossbar writes are `StoryStore.updateRecord` read-check-write: launch only from the exact attempt count this client saw, resolve only a still-launched attempt. A reload replays a launched attempt from its frozen input.
- Team Training reuses MatchScene and `SituationObserver`; the half-field is a camera/drill-area rule (`TEAM_TRAINING_ZOOM = 1.3`, bounds clamped to one half). The physical pitch, players and AI are unchanged, so normal matches are untouched.
- Retry drops the attempt's result and replays it; only Continue records it. The weekly credit stays the D27 reducer (idempotent per week).
- The career has DEF/MID/FWD roles only; drill families without a role-appropriate drill are listed as deferred in `TRAINING_RELEASE_COVERAGE.md`, not remapped.
- The Bell94 image is imported as a reference (`training-bell94`) and is not stretched under play; the venue is code-drawn around the pitch.

## D30. Owner sprite sheets v2 as runtime atlases (owner package, 2026-10-20)

- The 14 owner sheets are kept unchanged in `docs/art/sprites-v2/source/`; `scripts/art/build-sprites.py` cuts poses by
  alpha connectivity (splitting poses that touch), normalises scale per sheet and packs 160×128 cells with the feet on one
  anchor into WebP atlases plus Phaser JSON. Runtime loads only the atlases a screen shows.
- Sheets are cosmetic. `RosterLook.set` names the atlas; `PlayerArt.apply` shows the atlas frame or, if the atlas is missing
  or still loading, the existing code-drawn frame. The sim, controls, AI and saves are unchanged.
- Club mapping (owner-confirmed): orange/royal blue Batavia, red/navy/gold Royal Salt, black/red Valley Rising, blue-white
  stripes Desert Tuzon, light blue/white Sol Vista, purple with silver-white sash Next Horizon. Next Horizon stays outside
  `LEAGUE_CLUBS`.
- The story passes the fixture's opponent club to Formation → Match (`opponent`); other matches show Royal Salt.
