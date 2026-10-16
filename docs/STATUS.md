# Status

## Story weeks 2–4, Jungle Ball and the local league (branch `devin/1792161560-story-weeks-2-4`, not merged, not in production)

- **Story:** Start → **Story** now continues after the week-one callback into weeks 2–4 (25 scenes, S07–S24 of the v0.7 outline). The dialogue is Devin's **draft**, owner decision A of 2026-10-16. Every draft scene says so on screen, and `DRAFT_SCENES` lists them. Blake is the rival and Sam is a new teammate (decision B).
- **Alex's promise:** the offer in week 2 can be kept, cancelled with notice, missed, or missed then repaired in week 3. Week 4's touchline line comes from what actually happened (`promise_*` predicates over committed decisions and runs). Nothing can be applied twice: a choice is one decision and a run is one entitlement.
- **Week 4 outcome:** the coach gives the package's honest *Limited Evidence* conclusion, because no selection evaluator exists. The chapter ends with "Next chapter in development".
- **Existing saves:** a save that finished the old week-one slice (complete at `W2_SCHOOL_CALLBACK`) continues into week 2 through `migrateStory`, with decisions, runs and history untouched. The package JSON is unchanged; the link into week 2 is patched in code by `mergeCatalogs`.
- **Jungle Ball** (`src/game/jungle`, `JungleScene`, Start → Jungle Ball, and the story in week 2):
  - You, Alex, Blake and Sam play to one goal with a neutral keeper, in 75-second rounds with individual scores and no elimination.
  - A stunned player is then protected from being stunned again, but can still be tackled. Pushes are bounded and restarts are equidistant.
  - Leaving keeps the score so far and invents no result. Scores never count as match growth.
  - AI handicap: 0.9× speed, wider aim error, at most two chasers. This is tuned in seeded sweeps and still needs a playtest.
- **League** (`src/game/league`), owner decision C:
  - FC Batavia, Royal Salt Academy, Valley Rising, Desert Tuzon and Sol Vista play a single round robin, scoring 3/1/0. Next Horizon is not entered.
  - Batavia's fixtures are the story's week 1–4 matches. A finished match's score is recorded once from full time; leaving early records nothing, and a missing result is never a loss.
  - Other clubs' games are simulated deterministically and labelled as simulated. The table shows on each week's post-match scene.
- **Cups:** Pacific Wave Cup and Lone Star International Cup are shown as "U12, coming later", as package §08 requires.
- **Not done:** the indoor school background is waiting on the owner's choice. Real team selection, transfers and the cups are not built.

## Graphics v1.1 (branch `devin/1792120824-graphics-v1`, not merged, not in production)

Owner-approved styles from `SoccerMaster_Graphics_v1.zip`, built on the joystick/story preview commit `b00c71b`. See `docs/ART.md` (inventory, mapping, gaps) and `docs/DECISIONS.md`.

| Area | Status |
|---|---|
| Asset import (28 PNG masters, scene + wardrobe maps, review status) | Integrated; masters unchanged, runtime WebP copies hash-linked |
| 9v9 oversized players (ported sprite factory, fixed hair per slot, boy/girl career look) | Integrated; physics, controls, camera and `src/game/` unchanged. No BLOCK pose; no squad numbers/club kits in engine |
| Story cutscene backdrops + static portraits (all 18 week-one scenes) | Integrated; pinned outfit per scene, speaker highlight, reduced motion, labelled fallbacks |
| Art Gallery (Start → Review & Lab) | Integrated, review only; new character/outfit art `NEW_ART_REVIEW_PENDING` |
| Physical iPhone check | Pending (browser phone emulation only) |

## Controls: joystick + four buttons (branch `devin/1792100194-joystick-controls`, not merged, not in production)

Default 9v9 scheme is now a left joystick plus PASS, SHOOT, SLIDE TACKLE and BLOCK; `?controls=gesture` keeps the old swipes. See `docs/controls/CONTROLS_IMPLEMENTATION.md`, `ACCEPTANCE_RESULTS.md` (A01–A24: 21 pass automatically, A12/A21/A23 partial, none device-checked) and `CHANGELOG.md`. Physical-iPhone acceptance and frame-time measurement pending.

## Combined preview integration (branch `devin/1792089834-all-updates-integration`, not merged, not in production)

One build containing the gameplay-feel revision (PR #8), the training library v1.1 drafts (PR #9) and the soccer-logic research catalog v0.2. Start → **Review & Lab** opens a hub with Gameplay Lab (preview/lab builds only), Training Review, Soccer Logic Review and Home Training. Opening the hub does not create a player or touch the save.

| Area | Status |
|---|---|
| Gameplay feel (controls, receiving, camera, AI, Lab) | Integrated and testable; owner iPhone acceptance pending |
| Training library v1.1 (20 families / 100 options) | Imported as review-only drafts; none published or recommended; one credit per scheduled session unchanged |
| Soccer-logic catalog v0.2 (`research/logic/v0.2`) | Imported, catalog only: 40 draft outlines, 0 active, no source links, not calibrated or game-validated. The 500-plus scenario goal is 460 short and separate from home training |
| Coach Moments | Integrated behind `?coach`; no player-facing setting; weekly focus does not choose moments |
| RPG / story (identity, cutscenes, clubs, tournaments, Next Level) | Partial: week one of story package v0.7 playable (identity, 18 scenes, crossbar, training/match/week-close handoffs, W2 callback). Weeks 2–4, leagues, tournaments, transfers and relationship arcs not implemented; club world is design data only |

## Training library v1.1 import (draft, branch `devin/1792084019-training-library`)
- Package stored unchanged; strict importer, empty release manifest, review-only Draft library screens and six demo prototypes. No option is in player plans, journal or credit.
- Open before release: qualified coach and QA review, resolution of the package's coaching findings (TR01, TR02, RC01 revise; JU01/JU02/PA02/FI01 contact mechanics; JU03 and FI02 demos held), 11 unresolved claims, real reviewed left/right demo assets, owner acceptance.


## In review: gameplay feel revision (not merged, not deployed)

Dribbling, passing, receiving and shooting feel: off-ball control, shared kick prediction, receivers that meet passes, aim-assist modes, follow camera and minimap, and a Gameplay Lab. See `docs/GAMEPLAY_FEEL.md`.

Closer camera (pending the owner's iPhone pick): gameplay zoom 1.5× over the previous framing by default (landscape shows about 26.7 yd of pitch length instead of 40); 1.4× and 1.6× are selectable in the Lab (`Zoom` button) or with `?zoom=1.4|1.5|1.6`. Off-screen pass endpoints show an edge arrow.

## Release integration: M4 core match flow + M5 + M6

Start → **Play 9v9 Match** → pick a formation → Kick Off plays a timed two-half match (2 × 165 s = 5.5 min of actual play; owner cap 5–6 min): clock, half-time card (Start 2nd half), away kick-off for the second half, full-time result with stats, Play again. `?coach` Coach Moments span the whole match and their summary is the full-time screen. Home Training's match button plays the same timed match. Not built: formal throw-ins/corners/goal kicks, fouls, offside, added time, swapping ends. `?sandbox` opens the old open-ended sandbox.

## Current milestone: M6 — Individual Home Training and Player Progression (in review)

Start → **Home Training**. Full rules and worked examples: `docs/TRAINING.md`.

### Playable now
- Create one career player (name, position, six attributes; potential 70, start 40).
- Weekly Focus, setup (ball only / optional items, small / medium, indoors / outdoors, safe striking area), three optional home sessions per career week, substitutions, Training Library (84 core activities + 8-step juggling ladder) with steps, cues, limits, sources and an original programmatic demo.
- Practice Journal: completion, learning / improving / comfortable, foot, easier version, personal best, short reflection; export / import of the save.
- Play Sandbox from Home Training: the career player's slot (DEF H3, MID H5, FWD H8) is recorded as game evidence; with `?coach`, Coach answers also count (capped).
- Weekly Review keeps self-reported practice, demonstrated gameplay and character changes (with reasons) apart, and suggests a next focus. Character Development shows each attribute and what grows it.
- Saves in IndexedDB with one-transaction writes, validation, migration and recovery.

### Known limits
- Home practice gives participation credit only; it never changes attributes. Physical skill is not assessed.
- Evidence comes from the sandbox (no full match, M4 not built). Coach evidence needs `?coach` (M5, PR #5, unmerged).
- Growth numbers are provisional and need play-testing. All activities await qualified coaching review.
- Name, personal best and reflection use the browser's text prompt.
- Tested in Chromium phone emulation only, not on a physical iPhone.

## Previous milestone: M5 — Contextual Coach Moments (in review, development flag)

Turn on with `?coach` (or `?coach=4`…`6`) on the 9v9 sandbox: Start → "9v9 Team Sandbox" → pick a formation → Kick Off. Details and authoring rules: `docs/COACH.md`.

### Playable now
- A **coached session** of 300 s sim time with 5 Coach Moments by default (4–6 configurable), spread through the session, then a summary.
- Each moment comes from the live sim state: play freezes, the relevant players/lanes/space/goal are highlighted, one short question with 3–4 choices, feedback (strong / reasonable alternative / risky, other strong options named), Continue, and play resumes from the same state.
- 23 templates across attacking, support, defending and restarts; several answers can be strong.
- Choices change real play in a bounded way: on-ball choices show a cue that you must execute yourself; off-ball choices give one teammate a short (≤ 6 s) support/run/width/press/cover/protect job using normal movement.
- Each moment records frozen facts, options and grades, the choice, the applied intention, and what actually happened afterwards. The summary shows moments completed, strengths and one next-match focus. Nothing is saved; no XP or stats.
- HUD shows `COACH n/5 · m:ss` (session time left). Desktop: keys 1–4 answer, Enter/Space continue.

### Missing match dependencies (M4 not built)
- No match clock, halves, half-time, full-time or final result: the session timer stands in for a match. Half-time/full-time handling is therefore not tested.
- No throw-ins, corners, goal kicks, fouls or offside. Restart templates use the sandbox restart only; no template mentions offside; time-left facts are never shown.
- No weekly learning focus yet; the "next match" focus is shown but not carried forward.
- Not tested on a physical iPhone; Chromium phone emulation only.

### Verification
`tests/coachTemplates.test.ts` (every template eligible / ineligible / counterexample, catalog validation, multiple strong answers, broken facts) and `tests/coachSession.test.ts` (seeded sessions in all three formations, 4–6 clamping, freeze/resume, duplicate answer/Continue, background pause kept, aim allowance not refilled, no moment while aiming or with a kick in flight, shortfall when nothing is eligible, abandonment, intention validation/expiry/no teleport, invalid facts, mirrored attacking direction, safe names). `e2e/coach.spec.ts` plays a whole shortened session to the summary on phone portrait/landscape, small phones and desktop, plus touch-through, double taps, backgrounding + rotation during a moment, keyboard, and names.

## M3 — 9v9 team behaviour and formations (complete)

A **9v9 team-play sandbox**: two teams of eight outfield players plus a keeper (H1–H9 attack right, A1–A9 attack left) on a 75×50 yd pitch with two goals. It is a sandbox for team behaviour, **not** a rules-complete match.

### Playable now (Start → "9v9 Team Sandbox" → pick a formation → Kick Off)
- **Formations:** `1-3-2-3` (default), `1-3-3-2`, `1-2-4-2`. Pick before kick-off; change while paused (Pause → formation buttons, or keys 1/2/3). Players keep their positions, the ball and possession stay as they were, and players walk to their new roles after Resume.
- **Unified touch controls (controls revision, in review):** no Pass/Shoot selector.
  - **Dribble:** a quick swipe anywhere on the pitch sets your carrier's direction (forward, back, sideways, diagonal, relative to the screen); he keeps going that way until you swipe again. Speed, acceleration and turning are bounded; swipe length and repeated swipes add nothing; reversals slow down before turning. Ball touches and tackles still happen.
  - **Kick:** hold still on your carrier until the circle appears, pull back, release. The arrow shows direction (opposite your pull) and the meter shows power: short pull = soft ground ball, long pull = strong, capped. One kick for passes and shots; it goes exactly where aimed, from the ball's current position, with no assisted reception. Opponents use the same kick-speed mapping. Any kick that would roll into the goal mouth counts as a shot from any range, and keepers react to every on-target ball, whoever kicked it. Releasing back inside the circle cancels.
  - **Quick shot (touch):** double-tap anywhere with the ball for one immediate shot at goal (fixed power, seeded placement spread). Same possession and contact rules as an aimed kick; spam cannot shoot twice. See `docs/GAMEPLAY_FEEL.md` → Touch controls.
  - **Body feint (desktop only):** `F`. A nearby defender may or may not bite (seeded chance); no teleport, no protection, sim-time cooldown, extra presses never queue. Touch no longer has a feint (double-tap is the quick shot).
  - **Slow motion:** each team gets one aiming allowance (2.4 s real time) per possession spell, shown as a blue strip beside the power meter. Cancelling, pausing, passing or changing carrier never refills it; only winning the ball back after the opponent had it (or Reset) does. When empty, aiming still works at normal speed.
  - **Safety:** one gameplay finger at a time; extra fingers, UI taps, pointer cancel, lost capture, blur/backgrounding, pause, reset, rotation and possession changes cancel pending input. Thresholds scale with screen size (`src/input/touchControls.ts`).
  - **Tutorial:** a 4-step "Try it" line at the bottom advances as you dribble, aim, kick/cancel and quick-shoot; `? Help` restarts it.
  - Control moves to whoever receives your pass. When the opponent has the ball, the nearest home player is highlighted; your team defends automatically.
- **In possession (AI teammates):** width and depth from the formation, support beside/ahead/behind the ball, lane-aware support spots that do not stack, timed forward runs, give-and-go after a pass, weak-side outlet, narrowing in the final third, players kept back for balance.
- **Out of possession (both teams):** one presser chosen by arrival time and role, one cover, the rest shift toward the ball and protect the centre, track runners and recover; assignments are held for a short commitment spell so they do not flicker.
- **Opponent possession:** carries into space, passes, plays back when forward lanes are blocked, shoots when in range, with seeded reaction delay and aim noise. AI never sees your unreleased aim.
- **Keepers:** both position between ball and goal, dive within reach limits, catch or parry, then distribute.
- **Stoppages (sandbox, not match rules):** a goal or ball out of play stops play for a moment with a "sandbox restart" label, then the other team restarts in place. Normal possession changes never reset anyone.
- **Controls:** Pause/Resume, Reset, Menu; dev overlay (off by default; pause panel or `O`) shows IDs, roles, intents, movement targets, formation anchors, presser/cover rings, ball owner. Desktop: arrows/WASD dribble (combine for diagonals), F feint, hold Space to aim (arrows adjust; default aim is goal when in range, else the best pass), P/Esc pause, R reset, O overlay, M menu. Mouse drag works like touch.

### Not implemented / simplified
- No offside, fouls, cards, throw-ins, corners or goal kicks (restarts are simplified sandbox restarts), no match clock or halves, no substitutions, no ball height.
- Only the home formation is selectable; the opponent plays `1-3-2-3`.
- Ground kicks only (no chips/lofted balls). The M2 attack drill keeps its original cut/push/check + Pass/Shoot controls.
- Not tested on a physical iPhone; Chromium emulation only. Tuning is a first pass.

### Verification
See the PR for exact counts. `tests/match.test.ts` covers the 18-player roster, formation data, paused-only formation changes that preserve identity/ball/possession/positions, movement without teleporting, passes and control transfer, stale-aim cancellation, presser/cover without swarming, width/depth, give-and-go, opponent passes and shots, both keepers saving and distributing, pause/resume/reset, goal and touchline stoppages, frame-rate consistency (30/60/144 fps, ball within 1.5 yd) and long seeded invariant runs. `tests/touchControls.test.ts` and `tests/controls.test.ts` cover gesture arbitration (swipe-then-hold stays a dribble, hold-then-drag gives one kick, tap/double-tap limits, extra fingers, cancellation, invalid/extreme input) and the sim side (backward/sideways dribble, bounded reversal, no speed stacking or teleport, frame-rate consistency, feint cooldown and no queueing, allowance non-refill, command validation, no kick redirection). `e2e/match.spec.ts` covers picker → sandbox, HUD fit, hidden overlay, pause + formation change + resume without teleporting, a touch/mouse aimed pass, backward/sideways swipes, cancel-circle release, UI taps not reaching play and a double-tap feint (staged `?setup=pass` and `?setup=space`), desktop keyboard controls, and repeated navigation with one canvas and stable listeners.

## M2 — Retro Bowl-inspired playable attack (still playable, in review)

One repeatable **training attack** is playable: 3 attackers vs 2 outfield defenders and a goalkeeper in the attacking half. This is a control prototype, **not** a full 9v9 match and not the full soccer-intelligence engine.

### Playable now (Start → "Play Attack Drill")
- **Auto-dribble**: your player (yellow ring + marker) dribbles toward goal; the ball moves out and back with each touch.
- **Swipes** (anywhere): up/down = lateral cut, toward goal = heavier push (ball goes loose briefly), away = check back. Cooldown 0.5 s and a ball-control meter (cut 0.3, push 0.4, check 0.15; refills 0.35/s) stop unlimited speed.
- **Aimed kicks**: hold your player ~0.16 s, drag back (slingshot), release. The guide shows direction and power. Aiming slows the whole simulation to ×0.3 for at most 1.6 s of real time (refills only while not aiming). A short drag or a quick swipe never kicks.
- **Pass/Shoot selector** (top right, Pass by default, resets to Pass after every shot and retry).
- **Receiving**: an attacker who controls the ball becomes your player; nobody is repositioned. Passes can be intercepted (ball ≤ 13 yd/s within 1.1 yd of a defender), deflected (faster balls), missed, or roll out.
- **Shots** travel as real ball trajectories; the keeper shades toward the ball, reacts after 0.25 s, and catches slow shots (≤ 15 yd/s) or parries hard ones. Parries/deflections do not end the attempt. The first support run starts as play goes live and a defender needs 0.2 s to react to a pass that is not hit straight at him, so the opening pass to the runner has about 1 s before the press arrives. Placement matters: from around the penalty spot, a hard shot aimed 2 yd or more off centre toward the far post (the outer 1.5 yd) beats the keeper, while shots near the centre are saved (seeded unit test).
- **Team behaviour**: supporting attackers hold width and come inside when crowded; one makes a timed run into space when its lane is clear; the nearest defender presses goal-side, the other covers the most dangerous passing lane (they never chase the same point).
- **Attempt ends** on a goal, ball out of the training area, or a defender/keeper securing the ball; the outcome panel explains why and **Retry** fully resets without reloading.
- **Desktop**: arrows/WASD = swipes, hold Space to aim (←/→ turn, ↑/↓ power, release kicks), Tab/Q toggle, 1/2 pick Pass/Shoot, R/Enter retry, Esc back (or cancel aim). Mouse drag works like touch.
- Portrait works (top-down view) with a "rotate to landscape" suggestion.

### Tuning
All numbers are in `src/game/attack/tuning.ts` (speeds, cooldowns, control costs, aim slow-motion, pass/shot power, receive/intercept/tackle ranges, keeper) and `src/input/gestures.ts` (`GESTURE_TUNING`: swipe 30 px within 300 ms, hold 160 ms within 12 px, hold radius 80 px, drag 18–150 px).

### Verification
See the PR for exact counts. Unit tests cover swipe-vs-aim recognition, single possession and control transfer, aim time limit and cooldowns on sim time, single goal/out resolution, retry reset, and input cancellation. Browser tests (Playwright Chromium: 390×844 and 320×568 portrait, 844×390 and 568×320 landscape, 1280×720 desktop mouse/keyboard) cover a completed pass to a moving teammate, an interception, a goal, a keeper save, pointer-cancel and rotation during an aim, keyboard controls, layout fit, and repeated retries/navigation with one canvas and stable listener counts.

### Known limitations
- Not tested on a physical iPhone; Chromium emulation only.
- The browser goal and save tests start from a debug-only fixture (`?debug&setup=shooting`); the full receive → dribble → shoot → goal/save loop is verified in seeded unit tests. Headless browser timing makes long scripted moves unreliable.
- A browser-level swipe-vs-hold test was dropped because CDP touch latency in headless Chromium exceeds the 160 ms hold threshold; swipe-vs-hold is covered by unit tests and the keyboard cut test.
- No ball height (chips/headers), no offside, no fouls, no sound. AI is deliberately small: press/cover/keeper rules only.
- Tuning is a first pass and should be adjusted after playtesting on a phone.

## Next task
Real-iPhone playtest of the coached sandbox, then M4 match flow so Coach Moments can run in real matches (halves, restarts, clock).
