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


## D31. Jungle Ball v2 plays like an arcade football game (owner request, 2026-10-19)

- Reference: NFL Blitz 2001. The owner sent the game's ROM; it is copyrighted, so it was not unpacked, run or mined. Only publicly known play ideas are used: turbo meter, turbo moves, big knockdowns, ON FIRE.
- TURBO is a 4th Jungle Ball button in the PASS slot (PASS is unused in Jungle Ball). The 9v9 controls are unchanged: no sprint there.
- All rules live in `src/game/jungle/sim.ts` (`JUNGLE.turbo*`, `bigKnock`, `knockdownSeconds`, `dive*`, `turboShot`, `fireStreak`); the scene only draws and sends `turbo` press/release commands. AI and player share the same meter and costs.
- Big hits keep the existing stun protection (protection starts after the knockdown ends), so the no-stun-lock rule still holds.




## D36. Season One weeks 1-2 rewrite (owner text, 2026-10-20)

- The owner's week 1 and week 2 text replaces the prologue departure/arrival/room text and the old week 1-2 scenes. Scene ids stay (`S1_PRO_*`, `S1_W01_*`, `S1_W02_*`); `S1_W01_P` and `S1_W02_S2` are new and `S1_W02_P` is retired. The content version stays `s1-v1.0`, so saves are not archived.
- A rewritten scene's header carries `v2`; the compiler prefixes its node ids (`v2n1`). `migrateStory` restarts a save whose node no longer exists at that scene's entry, dropping only that scene's choices and unresolved runs; a save in `S1_W02_P` continues at `S1_W02_E`.
- Crossbar rules per scene (`crossbarRules`): week 1 is against Sam with one warm-up each; weeks 1 and 2 have no sudden death (`Contest.sudden = false`), so a tie stays a draw. Older contests and week 13 keep sudden death. The opponent is a display name; the stored participant id stays `blake`, with the same physics.
- Refusing Blake declines the activity: it is stored as `declined` with no result, never a loss.
- Code's post-training lines read the week's real Team Training grade as a run detail: `strong` (+2), `steady` (+1), `struggled` (0 or -1). The grade cannot tell "right decision, poor touch" apart, so that line is folded into `steady`/`struggled`.
- `{crossbar.score}` renders week 2's saved Crossbar score on the classroom board.
- Later callbacks to removed choices now read the new ones: week 4 Mom (`S1_W01_P.support=minute`), weeks 10 and 17 (`S1_PRO_DEPART.phone=photo`), week 15 (`S1_W02_S` refusal or played).
- Missing art uses stand-ins: park → recess goal, kitchen → home, classroom/lunch → school, training complex → pitch, car → departure plate.

## D37. Season One released weeks (owner, 2026-10-20)
- The owner will send new text for weeks 3–18 later and asked to hide the current ones. `SEASON_RELEASED_WEEKS = 2` in the story runtime: an end node pointing into a later week (or the epilogue) completes the story instead, and `migrateStory` parks a save resting in a hidden week at the last released week's close.
- The hidden scenes stay in the catalog so saves, art mapping and the season tests keep working; those tests open all weeks with `setReleasedWeeks`. Raising the constant reopens the weeks and a parked save continues from there.

## D38. Authoritative weeks 1–4, legacy story removed (owner directive, 2026-10-20)
- `SEASON_ONE` (`s1-v2.0`) is the only story catalog; `catalogFor` and `sceneById` cannot reach v0.7 or the weeks 2–4 draft. `SEASON_RELEASED_WEEKS = 4`; weeks 5–18 are empty source placeholders.
- Story facts come from saved records (`facts.ts`): Jungle Ball result = player vs Blake score; home learning = last week's review (completed / partial / none / unknown); training log = this week's planned sessions plus uncredited extra practice (above / within / below / unknown).
- A conditional activity whose predicate is false is recorded `declined` without a run id; that is how week 4 launches only the chosen school activity.
- Migration never maps old weeks 3–18 onto the new weeks 3–4. Retired content versions are archived and restarted; `s1-v1.0` saves past week 2 need an explicit story-only restart.
- The week 4 school attribute change, personal match feedback bands and in-match sideline lines stay off until the owner defines their rules.

## D39. At-home demos: one protagonist mapping (owner request, 2026-10-21)
- `src/render/art/homeDemo.ts` is the single place a home demo picks its sheet (`demoSet`: saved gender, training kit, keeper sheet for keeper exercises) and its pose (`demoPose`: pure function of the activity's existing `DemoSpec` and playback time). It lives in `src/render/`, not `src/game/`, because it names atlas frames; the catalog's `DemoSpec` data is unchanged.
- Strikes are derived from the demo data (a long, fast ball segment starting at the player's feet), so a kick never loops on its own. Juggling patterns are authored per ladder level from each level's steps. Left-foot contacts mirror the right-foot art; the sheets have no left-foot frames.
- A career with no saved gender (made from My Training before the story) shows the boy, as matches already do.

## D40. Season One structure from the storyboard; story mode only (owner outline, 2026-10-21)
- Players reach the game only through the story; developer and owner-review entries stay behind `?dev` so browser tests and owner review keep working without exposing free modes.
- Tournament ties are broken by recursive splitting: each tied cluster is split by the next criterion only, so a partial separation never restarts at points; head-to-head applies only when exactly two teams were level on points. Lots are drawn once when the tournament is created and saved with it.
- Shoot-outs are seeded and labelled simulated because no playable shoot-out exists; the storyboard's "existing penalty-shootout gameplay" is a gap.
- Strength rating is derived (Elo from saved results), never stored, so it cannot drift from the records and stays idempotent across reloads.
- Next Horizon is not a league club; it enters tournaments and the State Cup by exemption (owner, 2026-10-21).

## D41. Protagonist follows control in Team Training; New game archives (owner report, 2026-10-22)
- Team Training drills choose which Batavia player you control, so the saved look goes on that player each situation. In matches the protagonist stays on the position slot (control can switch to teammates).
- New game never deletes: old career, story, league and cup records are copied aside in the same databases before the fresh start.

## D42. Owner Mom portraits, painted aquarium scenes, Jungle Ball sheets (owner art, 2026-10-22)
- Mom is cast wherever she speaks, using the neutral expression until the script carries an expression per line; expressions are not guessed from the text.
- A backdrop that paints the cast (`cast_in_backdrop`) suppresses both portraits and the code-drawn speaker figure, so Cloudy scenes never show the player twice. The flag only applies once the painting is on screen.
- Jungle Ball sheets join the sprite-set registry as layout `jungle` (pre-mirrored `-w` frames, same 160×128 cell and (80,120) anchor), so `PlayerArt` and its fallback stay the one sprite path.

- Over a `cast_in_backdrop` painting, a separate portrait (Mom in `S1_W02_F`) is shown only while that character speaks. The paintings are cover-fit with a focus box (`BACKDROP_FOCUS`, `coverWithFocus`) so the child's face and Cloudy stay in view in portrait and landscape, with no gaps and no stretching.

## D43. Jungle Ball v3: arcade feel upgrade of the existing mini-game (owner brief + 4 action sheets, 2026-10-22)

- Same format: You, Alex, Blake, Sam each score individually past one neutral keeper; round length, scoring, ties, story record (first write wins) and the "never match growth" rule are unchanged.
- `src/game/jungle/sim.ts` v3 (framework-free, 60 Hz fixed step, seeded): HIT (the v2 `push` command and `canMove('push')` stay as aliases) is a committed lunge that lands only on real contact in a forward cone, one victim, separate HIT/SLIDE cooldowns; a miss ends in a `whiff` and short recovery. SLIDE commits the facing at the press; a missed slide adds `slideMissLag`. Knockdowns run impact → falling → down → rising (`actState`), then protection, which never blocks interception, possession loss or goals.
- SHOOT is press/release: a tap is a quick shot (`quickPower`), a hold charges to a cap (`maxChargeSeconds`); a hit cancels the charge. Aim follows the stick with at most `aimAssistMax`° of help inside `aimAssistCone`; a neutral stick aims inside the post away from the keeper.
- Ball has height (`z`, `vz`, gravity, bounce), round posts and crossbar, boards, side/back netting, and sub-steps ≤ `ballSubstep` so fast shots cannot tunnel. A goal needs the whole ball past the line inside the posts and under the bar, counts once, and credits the last kicker/controller (deflections and parries keep the credit).
- Keeper: reaction delay, limited speed/reach, dives, catches soft shots, parries hard ones into play, holds, then throws to alternating sides; cannot be hit or knocked down.
- After a goal a short `goal` phase (celebration) precedes the fair restart; round expiry still ends the round from any phase.
- AI uses the same meter, cooldowns and rules; it dribbles, charges shots, chases rebounds, and spreads (`aiSpread`) so it does not pile up.
- Scene: HIT/SHOOT/SLIDE/TURBO with rings for cooldowns, charge and turbo; owner action-sheet frames (Alex and the keeper keep their existing art; slides use the falling/grounded frames because the sheets have no slide-tackle pose); net, bar, boards, ball shadow and height; code-synthesised sounds (`?mute` or `smr-sound=off` silences); shake is skipped under reduced motion. The Leave button now pauses, with Resume / Leave round; app hidden pauses and drops held controls.

## D44. Team Training v1.2: reference coordinator, verified routes only, one weekly grade (owner package, 2026-10-22)
- The package's `engine.mjs`, `catalog.mjs` and `seasons.mjs` are vendored unchanged in `src/game/training12/ref/` with `.d.mts` declarations; their hashes and the package's own 36 tests run inside `npm test`. Our code adapts around them instead of editing them.
- A route opens only from an explicit, hand-kept list of exact scenario keys (`registry.ts`) that a full simulated session has passed. Generated layouts are never treated as verified. Season 1 weeks 1–4 (108 routes) are enabled; everything else shows "not available yet".
- The tactical drill (`drill.ts`) is framework-free, metre-based and seeded. The human picks every tactical decision; NPCs only carry it out. Decision quality, execution and outcome are kept separate.
- Rewards stay in the existing weekly Team Training economy: `tt12Run` stores each finished run (idempotent by run ID, one credited run per week/slot) and the third credited slot grades the week through `countTeamWeek`, shared with the legacy situations, so a week can be rewarded once whichever path finishes first. `masteryGranted` stays false.
- `TacticalTrainingScene` uses its own fixed straight-down camera over one whole half (goal at top in both orientations) and never touches the match camera. Half-field adaptations are versioned in `docs/training/v1.2/MAPPING.md` (tt12-halffield-1).
- Rounds are 45 s of live ball (reference default 90) so a session fits a phone sitting; `?debug&ttSpeed=1-8` speeds play for browser tests only.

## D45. Cloudy's Feeding Frenzy: painting-pixel simulation, painted goal, career-save bests (owner brief, 2026-10-23)
- `src/game/cloudy/sim.ts` is framework-free and seeded; every position is in pixels of the 1536x1024 aquarium painting. The scene draws the painting with one uniform fit (`fitBackground`, aspect kept, letterboxed) and maps sim points with the same `toScreen`/`toPainting`, so rendering, physics and the goal trigger cannot drift apart at any screen size. Alternative rejected: screen-space physics, which would move the trigger relative to the painted goal on every resize.
- No goal is drawn: the trigger is a rectangle inset inside the painted goal mouth, and a goal needs the whole ball inside it after being outside (no scoring from behind or by spawning inside).
- Bests live in the career save (`cloudy`, per difficulty, with the last 20 run IDs so a repeated save is ignored) rather than a separate store, so they share the save's backup, migration and multi-tab rules. The mini-game never changes attributes, growth or match statistics.

## D46. V3 content update applied to the existing story engine (owner package, 2026-10-23)
- One story controller: V3 is authored in the existing `.story` source format and compiled by `scripts/story/build-season-one.py`; the paused v0.2 engine was never added and nothing from it runs. The package is kept unchanged in `docs/story/v3/` as the reference.
- New handoff `home_hub` completes with a code-set detail (`talk` or `trained`); the scene branches on `detail:S1_W05_H=talk`, so Cloudy is optional and cannot block the week. The training gate (`homeAssignments`) needs a logged `done` juggling entry and a first-touch entry in the current career week (scheduled or extra, easier variants count), never a story choice or a session count in another focus.
- Ambition and park plan are `remember_choice` decisions only; they carry no attribute, attendance or reward effect (the compiler allows no other effect).
- League results still require WIN/DRAW/LOSS on completion; declined or abandoned matches resolve with no result and skip the result-specific aftermath.

## D47. Match Reports and the 35/30/30/5 weekly development settlement (owner spec, 2026-10-24)
- One pipeline: sim events -> `MatchLedger` -> stats/rating -> `SavedReport` (saved once per `matchId`) -> `endWeek` settlement. See `docs/REPORTS.md`.
- The six existing attributes are kept; requested attributes the game lacks, Energy and Form are shown as not tracked, never invented.
- The owner spec makes Home skills a development source (35%). This supersedes the earlier rule that home practice cannot raise attributes; home logs are self-reported, so they carry 0.6 confidence.
- `computeGrowth` (match/coach evidence thresholds) is unchanged; the settlement adds bounded fractional credits on top, inside the same weekly caps. Past weeks are never recalculated; old saves start with zero carry.
- Decision quality is judged from receiver openness at the pass; positioning stays unavailable without off-ball telemetry.

## D48. Mom v2 portraits and backdrop-embedded cast (owner package, 2026-10-25)
- Old Mom portraits are retired (`runtime: false`), not deleted from history; v2 portraits are padded (not scaled) onto the 2:3 slot. `mom-sad` maps to worried, the closest supplied expression.
- Who is painted into a background is explicit data (`BACKDROP_EMBEDDED`), never inferred from speakers or file names; an embedded character never gets a portrait, even while speaking.
- Cast portraits show only on spoken lines (not narration, choices or hand-offs).

## D49. Weeks 6–7 and phone poses (owner scripts, 2026-10-26)
- Decision vs execution for Code's training reaction comes only from the Team Training evaluator: a situation where an open pass or sensible shot was chosen but did not come off sets `choiceMissed`. The weekly grade decides "strong" and "poor"; no reaction is inferred from score alone beyond that, and records saved before this field never show the execution line.
- Week-specific home requirements live in `weekAssignments` (framework-free); Week 5 keeps `homeAssignments` unchanged.
- Phone poses are per line (`src/render/art/phonePoses.ts`): each moment names exactly who is on screen and who holds a phone, resolved against the compiled script at load (a moment that matches no line or two lines is an error). Phone-only characters join the scene cast but never show on other lines, and only characters that can show take a place on screen, so at most three portraits share it.
- The supplied 1024×1536 images are downscaled exactly 2:1 with nearest-neighbour and saved lossless with their own transparency (`scripts/art/build-phone-poses.py`); no matte, recolour or crop.
- Rankings: one 120-team registry with permanent IDs (`src/game/rankings/teams.json`), K = 24 Elo with tier-seeded Preseason ratings, weekly snapshots published in one IndexedDB transaction. Story league/cup results stay the source of truth; background teams play their own seeded fixtures. No Next Level club (owner). See `docs/RANKINGS.md`.

## D50. Juggling pack timelines and the offside referee popup (owner package, 2026-10-28)
- The prepared runtime sheets are used as-is (no re-slicing of the irregular source sheets). Body frames come from action-specific segments, never a 24-frame loop; the ball is never parented to a foot. Contact/catch points, ball radius (7 px) and per-frame planted-boot offsets are measured from the sheet pixels and kept in `JUGGLE_CAL`; an offset over 8 px is not applied (it would make the body jump) and the frame is listed as deficient instead.
- Only patterns the pack can show (laces, bounce, catch) use it; thigh, settle and pass ladders keep sprite-v2 rather than faking those poses.
- The popup is presentation only: it reads `stoppage.reason === 'offside'` from the sim and keeps its own once-per-call identity, so it cannot affect referee transitions. Its 2.6 s cap runs on the sim's dead-ball phase time, so a slow frame rate or a pause cannot cut it short (pausing hides it; the call does not re-show). Debug builds accept `deadBall=<seconds>` to lengthen the dead-ball pause for browser tests; normal play keeps 1.2 s.

## D51. Shared team shape replaces fixed formation anchors (owner brief, 2026-10-26)
- Cause of the deep back three: each role's anchor was its formation spot slid 0.55 yd per yard of ball travel, clamped to a fixed role box (so with the keeper on the ball all three defenders were pinned at x = 4), and out of possession every defender independently marked the nearest attacker goal-side, so forwards pushed up to 9 yd from goal dragged the line back.
- One controller per team (`src/game/match/shape.ts`, framework-free) now sets the back-line, midfield and front heights, width and lateral shift from the ball, possession confidence, pressure on the carrier (distance, goal-side approach, closing speed), the carrier's facing, backward passes, through balls, a beaten press and their most advanced outfielder. `ai.ts` places every role's anchor from these units (formation coordinates are only the relative layout and stagger); there is no second movement controller. Both teams, all three formations, team-relative so it mirrors at half-time.
- Defenders track only a dangerous runner (behind the line, or running at it); a forward standing on the line is left to offside, so the line is not ratcheted back. When a back-line player presses, the others cover behind him or narrow on the far side and the nearest midfielder fills his lane.
- Offside: a defender's save or deflection no longer ends the check (Law 11: only deliberate play does). The line is still measured from actual positions at the kick.
- Spacing numbers (`tuning.teamShape`) are provisional playtest values, not coaching measurements. Reasons per player are in `state.shape[team].why` and the `?debug` dev overlay (O).


## D52. Team Training learning loop (owner brief, 2026-10-27)
- Choices shown at a decision are a seeded subset (≤ 4) that always includes a good read; order is shuffled per attempt so position never signals quality. Option meaning (id, target, action) is unchanged by the shuffle.
- A hint is help, not mastery: hinted decisions are saved as assisted and count half in the session score; the score still goes through the existing weekly grade, so there is no second attribute economy.
- Replay rewinds the same seeded situation and is practice only: no evidence, no participation seconds, no score. Stale generations reject hint/replay/decide calls.
- Level-1 routes for all 108 sessions are enabled because every one uses one of the eight implemented level-1 cards and each route is played to a credited finish in unit tests; level 2–3 cards stay unavailable until their drills exist.


## D53 — Team Training presentation: pitch first, drill marked by cones, targets as mini-goals

- The half is framed at true proportions with a 0.6 m strip past the lines and the goal's depth; the pitch takes the screen width (portrait) or height (landscape) first, the panel takes the rest. A slim Bell94 fence band sits behind the goal only when there is room.
- The practice area keeps its authored size and position (`drillToHalf`, unchanged). It is marked by corner cones and a thin dashed line; the rest of the half is dimmed. Targets are drawn as small goals (posts, net, frame in the attacking team's colour, chevron into the mouth) on the engine's own target geometry; the full-size goal is drawn muted because it is not a target.
- Crowding was diagnosed, not moved: in S1-W01-C the spawns are 6 m apart and the defender closes to 1.2–2.1 m on the ball while pressing (intended D1 behaviour); world-to-screen scale is uniform and sprites are foot-anchored. Readability comes from team-coloured foot discs, a white ring on the ball carrier, the gold ring on the player you control, and choice tags that move off faces, the ball and each other with a leader line to their true point. No scenario changed.
- The panel shows one coaching question worded from the frozen state (`coachQuestion`), four answers, small Hint / Pause / Leave and the stage bar. Active-play seconds are in diagnostics only; the anti-idle rule is unchanged. The cover answer is labelled "Mark the inside runner" only when that runner is nearer the goal than the ball.
- Review fixes: every good read is shown (up to four), and replays play the drill without ticking the round clock or adding active play.

## Team Training: tactical situations replace small-sided drills (model ts-1)

- Team Training plays authored moments from `research/logic/v0.5/data/scenario_catalog.json` (all 40 seeds) on the full half: real markings, the regulation 9v9 goal, no drill box, mini-goals, gates, end zones, first-to-score or possession targets. The legacy `drill.ts` engine stays in the repo for old saves and its tests but is no longer used by the scene.
- The catalog has no coordinates, counts, timing or outcomes, so `src/game/training12/situations/fixtures/` authors them. They are **prototype, not calibrated or validated**, and use only the players each moment needs (4 to 13 visible).
- A session is 3 rounds x the route's 3 moments: cue variant with hint, counter variant with hint, then a seeded variant at game speed (5 s, no hint). Each moment ends at its authored review point. Credit needs all 9 moments played, at least 6 decided and 3 without a hint; score is mean decision quality (hinted half, timed-out zero). Play time is not used.
- Saves: `tt12Run.model = 'ts-1'` marks tactical runs; old runs without it stay readable. runId idempotency and once-per-session credit are unchanged.
- Mapping of the 108 x 9 routes: `docs/training/TACTICAL_SITUATIONS_MAPPING.md` (generated, test-checked). 328 direct, 433 partial, 211 weak (flagged); weak routes are mostly winger defending and full-back transition/switch, where the library has no seed for that role.
- Limit: fixtures are partial-participant authored states, not the canonical 18-player match engine. Normal matches are unchanged.

## D54. Team Training: the full 18, package art, Coach Code sequence (owner package, 2026-10-29)
- Fixtures keep their authored players and outcomes; `completeSquad` adds the missing 1-3-2-3 roles so every state is 9 v 9. The added players hold and shift the team shape (width, depth, cover, weak side) but are excluded from passing targets, pressure, interceptions and tackles, so no authored lesson changes. Re-authoring all 40 fixtures as full 18-player decision states is left for review.
- Atlases are cut by connected components (not a fixed grid), feet on one baseline, one scale per sheet from the standing pose, protagonist outline excluded from the height. Keepers keep their 4 key poses; no save, dive, catch, throw or punt cycle is invented.
- RETRY OR CONTINUE is its own step after CRITIQUE (one extra tap), so the six stages always appear in order.
- The legacy `MatchScene` Team Training code is unreachable (`teamTraining = false`) and kept for now so normal-match code paths it shares are not disturbed; it can be deleted in a follow-up.


## D55. Team Training is gated on the owner's 9v9 Tactical Library v1 (2026-10-26)

- (Superseded by D56.) The library (`docs/training/library-v1/SoccerMaster_9v9_Tactical_Library_v1.md`, SHA-256 pinned) is imported unchanged by `scripts/training/import-tactical-library.py` into `src/game/training12/library/tacticalLibraryV1.generated.ts`. Each brief keeps its verbatim text, cited sources and its own SHA-256.
- Scored Team Training goes through `scoredSession()` (`library/gate.ts`). A route plays only if an approved session-to-brief mapping exists and every mapped brief has a validated scene plus a Coach Cody sign-off pinned to both the brief hash and the scene hash. Any edit to either makes the sign-off stale. Missing briefs, scenes or sign-offs return exact blockers; there is no fallback to the earlier proposals or to generated drills.
- Today there are no sign-offs, scenes or mappings, so all 108 sessions × 9 roles are held out. The week page says so, nothing is recorded, and the story's Team Training step offers "Continue story · not counted" (a `declined` outcome, never a completion).
- The earlier 40 ts-1 situations stay in the code for review only, behind `?debug&ttProposals`; those runs are saved as practice and never counted.
- Source accuracy now outranks the earlier "all 18 on the half-field" rule: approved scenes will use the source's participants and field area.
- The review sheet (`docs/training/library-v1/REVIEW_SHEET.md`) compares every brief with its fetched source. Approving a brief there does not activate scoring; the scene built from it needs its own sign-off.

## D56 — Team Training gates on the Audited Library v1.2 (supersedes the v1.0 import in D55)

- The owner replaced v1.0 with `SoccerMaster_9v9_Audited_v1.2.zip`. All six package files are committed unchanged in `docs/training/library-v1.2/` and pinned by SHA-256; v1.0 stays in `docs/training/library-v1/` as history.
- `scripts/training/import-tactical-library.py` copies all 48 cards from `scenarios.json` verbatim into `src/game/training12/library/tacticalLibrary.generated.ts`, adding only `gameRole` (DM→6, CM→8, ST→9) and `cardSha256` (SHA-256 of the card's key-sorted JSON). A framework-free `sha256()` replaces the 32-bit FNV scene hash.
- A card scores only when: a numeric scene exists in metres on the 75 x 50 yd profile, uses only the 18 roster actors (no neutrals or extras), shows every required actor, protagonist and ball owner, records every other actor as omitted with a reason, and Coach Cody's sign-off matches the card, rules-profile (pitch + rosters) and scene hashes, with `local_rules_verified` true. Any change makes the sign-off stale.
- GK01–GK03 are retired: GK routes are blocked outright. The 108-session assignment is not in the package and is not invented (`SESSION_CARDS` is empty), so all 972 routes stay blocked. The package's structural lint is ported to the unit tests.
- Review fixes: the rules hash is computed from the pitch in force, so verifying local rules stales older sign-offs. Scored sessions resolve only the gate's approved fixtures, never the proposal registry, and a route needs exactly 3 approved moments. Required actors and the ball must lie inside the scene's view. `NO_FIXTURE_CHECK` keeps every signed scene blocked until code exists that proves the played fixture implements the signed numeric scene.

## D57: v1.2 scene proposals and the real fixture check
- After Cody's "Approved" (26 Oct), the 39 cards marked ready on the review sheet go to scene review; the 9 flagged cards stay blocked. `scripts/training/propose-scenes.py` writes Devin's **proposed** numeric scenes, a cue freeze and a changed-cue freeze per card, to `docs/training/library-v1.2/scenes/proposed-scenes.json`, together with `SCENE_REVIEW.html`, which shows each picture beside its card, sources and adaptations. All geometry is authored by Devin from each card's coordination line. No source supplies it, so none of it is approved.
- The scenes show the required actors plus those named in the card's coordination. Every other actor is omitted, with a reason Cody has to confirm. Only 8 of the 39 fit inside one half; the others need a full-pitch player before they can be played.
- `fixtureMatchesScene` replaces `NO_FIXTURE_CHECK` as the gate's default. It requires an `exact` fixture, which plays exactly the scene's players because `squad.ts` adds no shape-holders when `Fixture.exact` is set. It also checks the same sides, roles, freeze positions, movement into the freeze and ball for both the cue and the changed cue, plus the fixture ID, the protagonist and a view inside one half.
- `SESSION_PROPOSAL.md` / `session-proposal.json` propose 3 ready cards for each of the 864 outfield role routes, picked by route family against card phase. 1454 of the 2592 card slots are weak matches, which shows the 39 cards don't cover the curriculum's families. The proposal is not loaded: `SESSION_CARDS` stays empty.
- Review follow-up: `fixtureMatchesScene` now runs the fixture's passage in the simulator (`playedFreeze`). It compares the frozen positions, velocities and ball with the scene, for the cue and the changed cue. The half-field player stops everyone at the freeze and does not model facing, so every signed scene is blocked until a player exists that can show signed movement and facing. `sceneProblems` also checks that the changed cue keeps the same players and has its protagonist, required actors and ball inside its own view.

## D54. Standing Mom replaces the v2 bust portraits in cutscenes (owner art, 2026-10-26)
- The v2 Mom portraits are 512×512 busts padded onto the 512×768 slot, so her head sat 256 px down and she read as short next to Sam and Code. The owner's three standing sheets (confident, worried, smiling; casual teal left, dressy burgundy right) replace them: `mom3-<outfit>-<face>`, head about 65 px from the top.
- Cut out by alpha only (largest shape per side plus its stray hair pixels), bottom-anchored on one shared 780×1170 canvas so her size and position do not jump when her face changes, then resized to 512×768 with Lanczos (the sheets are not on an integer pixel grid). `scripts/art/build-mom-v3.py`.
- Outfit still follows the scene (casual by default, dressy set empty). The six scripted beats map to the closest face: neutral/firm → confident, worried → worried, laughing/reassuring/proud → smiling (`MOM_FACE`). No line text or beat changed.
- The v2 busts stay loadable for the art gallery but are never selected in the story. Phone lines still use `phone-mom-dressy`; scenes that paint Mom into the backdrop still show no portrait.

## Season One weeks 2–10 owner rewrite (2026-10-27)
- The owner's text is authoritative for weeks 2–10; superseded scenes are deleted from the active story, not hidden. Old save positions map through `RETIRED_SCENES` to the next new scene of the same week; revision `v3` node IDs restart rewritten scenes in place.
- Story handoffs only display or open existing systems (rankings, My Player, Home Training, saved tournament state). Where the game has no system (development target effects, workload, readiness, recovery, named rosters), the story records the choice and shows nothing invented.
- Activity details may contain digits (`group_2`) so tournament finishes recorded by `bataviaFinish` pass the runtime check.

## My Player: real components, required home training from Week 2 (2026-10-27)
- My Player stops being drawn on the bedroom painting; the owner screenshot is a layout guide only. The selected boy/girl home art stays in the player card.
- Required home training is read from Week 2 (`weekAssignments` already returns juggling + first touch for weeks 2–6). Career's story-week gate (`storyWeek`) now accepts Week 2+, and `task` opens a required task screen directly.
- No resumable home-session draft is saved, so My Player never shows "Resume session"; adding one would need a new saved field and is left for a separate decision.
- The screen scrolls with the camera (`scrollY`); diagnostics report hit rectangles after scroll, and e2e uses `revealElement` to wheel controls into view before pressing.


## Owner decisions 2026-10-27 (H1–H8)

From the owner's consolidated decisions after the read-only audit of `main` `04e947b` (second revision, same day: H3 now removes Coach Moments from story matches, and the coach-approved All36 package becomes the Team Training source). Plan: [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md).

| # | Decision | Effect |
|---|----------|--------|
| H1 | **Keep FIFA-style automatic player switching.** No match-long position lock. The chosen DEF/MID/FWD sets the career slot (H3/H5/H8), look and attributes; moment-to-moment control is a separate system and switching to the presser/chaser is intended, not a defect. Tactical situations may still use the career position for position-specific learning and grading. | Position lock removed from the backlog. No control change. |
| H2 | **Tactics v0.5 is a candidate, not the default.** Compare classic and v0.5 on identical seeds (shape, back line, pressing, cover, width/depth, transitions, offside, rest defence once specified, opponent chances/shot quality, parked-defender time, time to pressure, stuck play/restarts, stability, performance, determinism, regression tests) on at least 50 shared seeds before recommending activation. | `classic` stays default; PR B. |
| H3 | **No Coach Moments in story matches.** Story matches stay uninterrupted: no pauses for tactical questions, no answer menus, no Decision Heat, no tactical-answer grades in Match Reports, `?coach` never enabled for ordinary players, controls and automatic switching unchanged. The existing `?coach` code is deprecated and dev-only; deleting it is a later cleanup, not Phase One. Tactical questions, grading bands (Elite/Strong/Playable/Low-value/Forced), explanations and progression belong in Team Training ([spec](specs/RETRO_DECISION_MODEL.md)), native to Retro with no dependency on the separate SoccerMaster repo. | Story-match Coach Moments PR removed. Team Training is PR C. |
| H4 | **Do not merge PR #37 as one change.** Keep it as a reference; extract Tournament Results Screen and Animated Rosters v2 into two focused PRs from current `main`; close #37 only after both decisions and once approved work is preserved. Not modified in Phase One. | PRs H and I. |
| H5 | **Close PR #15 as superseded.** Its "owner approved" labels are not added; the Weeks 2–4 material it referenced was replaced and is not restored. | Closed. |
| H6 | **Approved control changes (later PR):** replace BLOCK with a standing tackle (a deliberate on-feet attempt to win the ball, not a passive stance); add double-tap quick shot to the default pad (faster release, accuracy and execution consequences kept, no guaranteed goal, single-tap/hold shooting unchanged). Standing tackle uses reach, positioning, timing and attributes, has recovery time and foul risk, and never guarantees possession. Deferred: chips, lofted shots, extra passing/defensive controls. | PR D. |
| H7 | **Rest defence and golden moments are required** ([spec](specs/REST_DEFENCE_GOLDEN_MOMENTS.md)), with measurable state rules; golden moments are highlights, not tactical questions; the Director only observes and never forces goals/turnovers, moves players, changes possession, redirects passes, delays goals, manufactures mistakes, overrides the referee, or changes the score or canonical event ledger. | PR E. |
| H8 | **Close superseded stacked PRs #6, #13, #39, #40.** Their work is in `main`; branches and history are kept. | Closed. |
| TT | **Coach-approved All36 package is the Team Training source** (`SoccerMaster_Coach_Approved_All36.zip`, D01–D36, approved by Cody Engilman 2026-10-27; inventory `training/all36/INVENTORY.md`). It supersedes older unapproved metrics, placeholder scenarios and empty mappings; authority order: explicit owner decisions > All36 package > current repo decisions > existing implementation > older drafts. Written metrics control objective, conditions, players, choices, grading, movement, progression and credit; screenshots guide orientation, placement, facing, framing and UI only and are never shipped as gameplay. Each scenario must still pass technical/content validation; unmatched or incomplete ones are blocked and reported. Routes outside the package stay fail-closed; the 972 routes are never approved automatically; `SESSION_CARDS` is never filled with invented approvals. | PR C. |
