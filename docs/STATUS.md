# Status


## Referee (branch `devin/1792274864-referee`, not merged, not deployed)

- **CI note (merge of `main` 4c3a81f):** a 60 min GitHub run timed out on phone-landscape `jungle.spec:11`, `pad.spec:88` A03, and `match.spec:72` (phone-landscape and desktop). Under 4-worker load locally, these passed 12/12 on this branch and 12/12 on `main`.
- `src/game/match/referee.ts` (+ `src/modules/RefereeSystem.ts`): throw-ins, goal kicks vs corners from the last touch, offside at the kick instance, slide fouls with free kicks and penalties, indirect free kicks. See D28.
- Match banners: THROW-IN, GOAL KICK, CORNER, OFFSIDE!, FOUL! Free kick, FOUL! PENALTY.
- Tests: `tests/referee.test.ts` (21), including 60 Hz vs 120 Hz identical calls, a seeded no-stuck-restart sweep, and regressions for penalty ball drift, every restart held until the kick, 8 yd kept while a set piece waits, own-goal-from-throw-in corner, and custom pitch geometry.
- Browser check on `942461a` (Chrome phone emulation, touch, 844×390 and 390×844): 11 of 11 restart, banner, pause/menu, half-time and normal-play checks passed. Direct own goal and custom pitch are unit-tested only.
- **CI note:** the `942461a` GitHub run timed out in three unchanged specs (phone-landscape `jungle.spec`, desktop `coach.spec` :82 with sim time only 2.4 s after 45 s, desktop `match.spec` :72). The same three files passed locally, 41 passed / 8 skipped / 0 failed with one worker, and CI was green on `31d2f99` and `5abadfa`, so these are runner-load timeouts.
- Limits: no advantage, cards, handball, aerial corners or build-out line. Not tested on a real iPhone.

## v0.5 tactical engine for computer attacks (branch `devin/1792339383-tactical-v05`, not merged, not deployed)

- v0.5 research package added under `research/logic/v0.5`; engine ported to `src/game/match/tactical.ts` with its 17 tests.
- `?tactics=v05` lets the engine run the computer team's attacking possessions (movement of outfielders, carrier carry/pass/shot through the existing kick path). Default stays the classic AI because the seeded comparison came out worse (see D28).
- 60 Hz and 120 Hz give the identical v0.5 match; 18 players and match invariants hold; human players never get engine orders.

## Jungle Ball v2: arcade football feel (branch `devin/1792453098-jungle-blitz`, PR only, not merged, not deployed)

- **Owner request:** "jungle ball to play like the NFL game attached" (NFL Blitz 2001). The attachment was only the game's N64 ROM; nothing was extracted from it or run, and no art, sound or code from it is used. The feel is copied from how that game is publicly known to play.
- **TURBO** (new 4th button, in the empty PASS slot; Shift / I on a keyboard; it has its own finger slot (`JoystickControls.setModifier`), so it can be held while pressing SHOOT / SLIDE / PUSH): held, it makes the competitor 1.3× faster while a meter drains (≈2.2 s full); released, the meter refills (≈3.3 s). The three AI competitors follow the same meter rules.
- **Turbo moves** cost a quarter of the meter: turbo + PUSH knocks the victim down for 0.9 s and 2 yd (normal push: 0.45 s stun, 1.1 yd); turbo + SLIDE is a 0.5 s dive at 10 yd/s; turbo + SHOOT adds 3 yd/s. A carrier's PUSH shows STIFF ARM!. Protection after a hit is unchanged, so nobody is knocked down twice in a row.
- **ON FIRE:** three goals in a row by one competitor gives unlimited turbo (all moves big) until anyone else scores. Banners BOOM! / CRUSHED! / ON FIRE! / FIRE OUT!, longer hit-stop and shake on big hits, flame trail on the ball, turbo meters under the score bars.
- **Unchanged:** scoring, keeper, 75 s round, the story's Jungle Ball record (scores and place), and Jungle Ball never counting toward match growth. `JUNGLE_SIM_VERSION` is now 2.
- **Seeded sweep, 60 rounds each, scripted player bot** (v1 `main` → v2): goals per round 9.98 → 11.25 with turbo (10.72 without); bot goals per round 6.50 → 6.85 with turbo (5.22 without, because the AI now has turbo); hits per round 47.9 → 32.6, 15.3 of them big; the bot is stunned 10.8% → 11.6% of the time. Idle player: 0 goals in both.
- **Tests:** `tests/jungle-blitz.test.ts` (9 new) plus the existing Jungle Ball tests; `e2e/jungle.spec.ts` checks the TURBO button fits the screen and is held/released.

## Sprites v2 — 14 owner sprite sheets (branch `devin/1792525700-sprite-sheets`, PR only, not merged, not deployed)

- **Art:** all 14 sheets kept unchanged (`docs/art/sprites-v2/source/`, SHA256SUMS) and built into 14 WebP atlases (2.6 MB) with frame metadata. Inventory, pose coverage, gaps and rollback: `docs/art/sprites-v2/README.md`.
- **In game:** match players wear Batavia's match kit (training kit in Team Training), the created boy/girl their own sheet, and story league/cup opponents their club's sheet, including Next Horizon in cups. Next Horizon is still not in the league. Coach Code stands beside Team Training cards with a pose for each beat. Jungle Ball's created player uses their match sheet. The Art Gallery's gameplay page shows every sheet.
- **Unchanged:** controls, physics, AI, progression and saves. If an atlas is missing or still loading, that player shows the old drawn sprite.
- **Tests:** `tests/sprites-v2.test.ts` (source hashes, atlas bounds, foot anchors, a frame for every requested pose, club mapping, league membership).
- **Not tested on a physical iPhone.**

## Training / Schoolyard revision v1.2 (branch `devin/1792431040-training-schoolyard`, PR only, not merged, not deployed)

- **My Training hub:** Career home shows the week's focus card, Team Training (Not started / Complete), Home Practice (optional: sessions, library, journal) and Progress (weekly review, character development, 9v9 match). Nothing was removed; opening a card never changes attributes.
- **Team Training:** the real 9v9 engine on one half (the half holding the staged ball), camera 1.3× closer, HUD "Team Training · drill · Attempt n/3 · time", Back/Pause, no score or SANDBOX tag, Bell94-style park drawn outside the pitch. Each attempt ends on its objective, turnover, goal, out of play or time, then Retry / Continue; the week is written in one transaction before "Complete". Coverage per drill family: `TRAINING_RELEASE_COVERAGE.md`.
- **Crossbar Challenge:** new schoolyard backdrop (`crossbar-schoolyard`) and one grounded goal drawn from the same `CROSSBAR` model the simulation scores (`src/render/crossbarView.ts`); one-row HUD; Pause holds help, shot log, text speed and Leave; launches and results are compare-and-commit (`commitLaunch` / `commitResolve`), so a stale tab or double tap cannot launch twice. `?debug&hitbox` draws the scoring band.
- **Review fixes:** shot results are confirmed saved before the story continues, Pause freezes the flight and the final result, sudden death always gives Blake his reply shot (`tests/crossbar-sudden.test.ts`), Team Training ends an attempt when the ball leaves its half, a failed weekly save keeps the results for Finish to retry, and the result buttons re-layout on rotation.
- **Tests (`ea1bfad`):** unit 630 passed, 0 failed. Chrome touch emulation, 390×844 and 844×390: 18 checks passed, 1 failed, 4 not run. The failure is the normal-match portrait footer overlapping the bottom buttons, which `main` also has. Not run: the ball leaving the drill half, a failed shot save, a failed weekly save, two tabs.
- **CI note:** desktop `coach.spec:83` and `match.spec:72` timed out on a 55 min runner. Under 4-worker load locally they passed 8/8 on this branch and 8/8 on `main` (`14094ce`).
- **Not tested on a physical iPhone.**

## Season One — 18 weeks + all supplied graphics (branch `devin/1792370575-season-one`, review preview only, not merged, not in production)

- **Story:** Start → Story runs the Season One package: prologue, 81 featured weekly scenes (Monday Cloudy, school, Coach Code, after-training Cloudy, parent every even week), match/tournament scenes and the epilogue, 127 scenes in `docs/story/season-one/season_one_scenes.json`, compiled from `docs/story/season-one/src/*.story` by `scripts/story/build-season-one.py`. Checklist: `docs/story/season-one/COVERAGE.md`.
- **Competition:** 12 league games against the 5-club local league (triple round robin, `src/game/season/league.ts`) in weeks 3–8 and 13–18, and two 4-team cups in weeks 9 and 11 (`src/game/season/tournament.ts`: 3 group games, then championship or placement). Every game is the real 9v9 match; the result is recorded once and conflicting duplicates are rejected. Cups never touch the league table. Skipped or interrupted games stay unplayed, never losses. A drawn final is a shared result (no shoot-out).
- **Saves:** an older story save is archived unchanged under `legacy-story-<career>` and the career starts the prologue; unreadable saves are kept under `broken-<career>-<time>`. Player, levels and training stay in the career save.
- **Graphics:** 17 new screen images imported to `docs/art/season-one/` (14 shown in game, 3 Tank Cup images kept but not shown because no Tank Cup activity exists). Home screen, departure/arrival plates for the chosen boy/girl, aquarium with the chosen player looking at Cloudy, recess, Jungle Ball, a standings board with live table text, and goal/referee art shown only on the match engine's own goal and foul stoppages.
- **Review fixes (D28):** league and cup results are written in one read-check-write transaction, cup games are bound to their fixture at launch (`tfix:<run>`), a failed save keeps the story handoff open, a skipped league game still plays the other clubs' round, a declined Season One crossbar challenge offers Continue, and the epilogue's complete-season line needs all 12 league results and both cup finishes. Team Training keeps the career save's own week (shown as "career week N").
- **Tests:** unit 620 passed, 0 failed; Playwright 114 passed, 0 failed, 8 skipped by design (touch-only or desktop-only). Browser runs are Chrome phone emulation, not a physical iPhone.
- **Open decisions:** departure region (story Northeast vs art Northwest: captions name no region), Mom portrait, Casey portrait, cup club working names.

## FIFA brief in full (branch `devin/1792190415-fifa-full`, PR #16, not merged, not deployed)

- **Team Training feedback:** stage banners show the previous situation's score with `n/3`, wrap inside the screen, and the week result stays visible until Menu (routine "You control …" notices no longer replace it). Runtime-checked in phone emulation, portrait and landscape.
- **CI note:** two GitHub runs each timed out on a different unchanged spec (desktop `match.spec` :49/:72, then phone-landscape `pad.spec` A03). Locally, `pad.spec` A03 fails the same way on `main` and on this branch when 4 workers share 2 cores (4/6 each), and passes 8/8 on both with one worker, so these are runner-load timeouts rather than a regression.

- **Old gameplay removed:** the 3v2 Attack drill (`AttackScene`, `src/game/attack`), swipe/gesture controls, slow-motion aiming, the feint and the Lab's aim toggle. The 9v9 match runs only on the joystick plus PASS / SHOOT / SLIDE TACKLE / BLOCK. The story crossbar challenge keeps its own pull-back shot (`src/input/pull.ts`).
- **Allocations:** state vectors updated in place, pooled AI scratch, regression test for vector identity and pool size. Measured about 3.3–5.5 KB per step against 29–91 KB before; not zero (see `docs/FIFA_MECHANICS.md`).
- **Training library in Home Training:** all 100 draft options can be swapped into a scheduled session of the same focus or logged as extra practice, labelled "enabled by owner, not coach-certified". Credit rules unchanged (1 per scheduled session, max 3 a week, no attribute points).
- **Weekly Team Training (soccer-logic catalog):** Career → Team Training plays three position-based catalog situations a week on the real match engine with the normal controls (12 of the 40 entries have typed fixtures and grading in `src/game/career/teamTraining.ts`; the 28 set-piece, aerial, goalkeeping and multi-runner entries stay inactive). The week's average gives +2 / +1 / 0 / −1 attribute points, never above potential or below the starting value 40, counted once per week (replays are practice only, leaving early counts nothing, saves validate the record). Grading thresholds are a first pass and need owner playtesting.

## FIFA-style mechanics (branch `feature/fifa-gameplay-mechanics`; merged to `main` once CI passes, not deployed to production)

- **Locomotion:** a light stick push is close control (slow, tight turns); a full push runs with momentum; a sharp reversal brakes first, shorter with higher agility.
- **Passing:** a 30° cone along the stick; teammates scored by yards from the stick's line plus distance; the pass leads the chosen receiver's run, with hold length still setting power.
- **Jockeying:** hold BLOCK near the opponent carrier to stay goal-side, mirror them, at their speed.
- **Debug:** `?debug&passlog` draws the cone and logs each target search to the console.
- Details, measurements and limits (no strict zero-allocation engine): `docs/FIFA_MECHANICS.md`. Not playtested on a real iPhone.

## Story weeks 2–4, Jungle Ball and the local league (branch `devin/1792161560-story-weeks-2-4`, not merged, not in production)

- **Story:** Start → **Story** now continues after the week-one callback into weeks 2–4 (25 scenes, S07–S24 of the v0.7 outline). The dialogue is Devin's **draft**, owner decision A of 2026-10-16. Every draft scene says so on screen, and `DRAFT_SCENES` lists them. Blake is the rival and Sam is a new teammate (decision B).
- **Alex's promise:** the offer in week 2 can be kept, cancelled with notice, missed, or missed then repaired in week 3. Week 4's touchline line comes from what actually happened (`promise_*` predicates over committed decisions and runs). Nothing can be applied twice: a choice is one decision and a run is one entitlement.
- **Week 4 outcome:** the coach gives the package's honest *Limited Evidence* conclusion, because no selection evaluator exists. The chapter ends with "Next chapter in development".
- **Existing saves:** a save that finished the old week-one slice (complete at `W2_SCHOOL_CALLBACK`) continues into week 2 through `migrateStory`, with decisions, runs and history untouched. The package JSON is unchanged; the link into week 2 is patched in code by `mergeCatalogs`.
- **Jungle Ball** (`src/game/jungle`, `JungleScene`, Start → Jungle Ball, and the story in week 2):
  - You, Alex, Blake and Sam play to one goal with a neutral keeper, in 75-second rounds with individual scores and no elimination.
  - Owner direction (Cody): three buttons, **SHOOT / SLIDE / PUSH**, played like a vintage arcade fighter. The stage is side-on: the supplied Graphics v1 **school courtyard** is the backdrop, with the play area chalked on its paving. Players are Graphics v1 factory sprites with the same run, kick and slide poses as matches, drawn back-to-front and oversized (art only). You get your chosen boy or girl look, and the keeper wears the reference keeper kit and dives on saves. Gap: Alex, Blake and Sam have no supplied gameplay sheet, so they use reference roster hair in their own bib colours. with fighting-game score bars and a centre timer. Banners show ROUND 1 / PLAY! / WHAM! / SMASH! / GOAL! / TIME!, and a landed hit gets a 70 ms hit-stop and a screen shake. PUSH is a short shove in your facing direction: it moves the target a bounded distance (1.1 yd) and pops the ball loose, with a 0.6 s cooldown. SLIDE is a 0.35 s lunge that hits at most once and pokes a loose ball, followed by 0.4 s down on the grass and a 1 s cooldown. A ball carrier can't slide. The AI pushes and slides too, decided once per reaction period. Every stun still respects protection, so there's no stun-lock. Keyboard: J pushes, L slides, Space/K shoots.
  - A stunned player is then protected from being stunned again, but can still be tackled. Pushes are bounded and restarts are equidistant.
  - Leaving keeps the score so far and invents no result. Scores never count as match growth.
  - Carrying the ball over the goal line inside the mouth counts as a goal unless the keeper is there to save it.
  - AI handicap: 0.9× speed, wider aim error, at most two chasers. This is tuned in seeded sweeps and still needs a playtest.
- **League** (`src/game/league`), owner decision C:
  - FC Batavia, Royal Salt Academy, Valley Rising, Desert Tuzon and Sol Vista play a single round robin, scoring 3/1/0. Next Horizon is not entered.
  - Batavia's fixtures are the story's week 1–4 matches. A finished match's score is recorded once from full time; leaving early records nothing, and a missing result is never a loss. A story match only finishes at full time (growth evidence alone no longer finishes it); after an early exit the same match can be played again. The fixture comes from the story match's week (W2_MATCH → week 2), not the career week. Skipping a match still simulates that round's other fixtures.
  - Other clubs' games are simulated deterministically and labelled as simulated. The table shows on each week's post-match scene, including week 1.
- **Weeks 2–4 art:** every draft scene uses only the supplied backgrounds and outfits, mapped in code (`DRAFT_SCENE_ART` in `src/render/art/catalog.ts`) with one location per scene. A speaker with no outfit for that location is left out of the cast (the caregiver in the school repair scene). The package scene map is unchanged. There's still no indoor school art, pending the owner's choice.
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

Ball camera (owner request, replaces the zoom-choice follow camera): one fixed close view centred on the ball, led a little along the ball's motion (≤ 4 yd) with a 2.5 yd attacking look-ahead while carried. Low camera with real perspective, after the owner's FIFA "Dynamic" reference: pitch lines converge toward the top of the screen and players, ball and shadows shrink with distance (`perspective` 0.3, anchored on the ball). Landscape shows 32 yd of pitch length (depth squash 0.5); portrait 22 yd across. Players are drawn smaller relative to the pitch (2.1 yd tall, was 2.7). The 1.4/1.5/1.6 zoom choices, `?zoom` and the Lab zoom toggle are removed. Owner iPhone check pending.

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
