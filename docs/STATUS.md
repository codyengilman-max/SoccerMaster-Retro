# Status

## Team Training learning loop (owner brief + mockup, branch `devin/1792950375-tt-learning-loop`, from `main` 56a6e0c, not merged, not deployed)
- Mockup layout on the fixed half: TEAM TRAINING header (season, week, session, round, role, the route's real objective), Bell94/Scottsdale surround outside the lines, navy/gold Coach Code panel with his approved portrait, A–D choice buttons, Hint / Pause / Leave, and the OBSERVE › DECIDE › PLAY › LEARN footer. Portrait and landscape; the panel never covers the half.
- No giveaway before choosing (no arrows, neutral labels, seeded order); hint recorded as assisted; LEARN overlay from the frozen moment; Replay never counts; next attempt varies. Details: `docs/training/v1.2/MAPPING.md`.
- Level 1 opened for Season 1 weeks 5–18 and Season 2 (864 more routes, each played to a credited finish in unit tests). Levels 2–3 stay "not available yet". Season 2 is not reachable from Career (no Season 2 career). Keeper routes via `?dev` only.
- Saved runs carry optional `decisions: { independent, assisted }`; older runs load unchanged with no counts invented.
- Phone emulation only, not tested on a real iPhone.

## Juggling + offside referee (owner package SoccerMaster_Juggling_Referee_Devin, 2026-10-28, branch `devin/1792988972-juggling-referee`, from `main` 56a6e0c, not merged, not deployed)
- Package status kept: `art_review_build_not_shipping_approved` (`src/assets/art/juggling-v1/manifest.json`, copied unchanged). Sheets copied byte-for-byte (boy `614a0210…`, girl `11fb4734…`); the referee PNG (`37c0d849…`) is stored as lossless WebP with its alpha.
- Home juggling demos Ladders 1–5 (`jg-1`…`jg-5`, laces/bounce/catch only) now play the prepared 6 × 4 sheet of the saved boy or girl (160 × 128 cells, origin (80, 120), nearest-neighbour). Each demo is a timeline (`src/render/art/juggleSheet.ts`): hold → release → prep/touch/recover → flight (or bounce wait) → catch prep/catch/finish; consecutive touches alternate the two foot cycles (6–8, 9–11). "Show a miss" plays miss → chase → reach → pickup → stand and loops back to the hold. The ball is the existing separate ball, ballistic between contacts and placed on the calibrated boot/hands point of the contact frame; the planted boot is held still (≤ 8 px shift per frame). "Slow" plays at 0.4×. Ladders 6–8 (thigh, settle, pass) keep the sprite-v2 poses: the pack has no thigh, settle or pass poses, and no dedicated JU03 air-to-ground cushioning art.
- Deficient poses (not relabelled, `DEFICIENT_FRAMES`): boy 9 (no backswing, reads as a stride), boy 9–11 (near duplicate of 6–8, same side kicks, working foot not distinguishable; 10's support boot 17 px off either stance spot), girl 6/7 and 9/10 (support boot swaps sides), girl 8 and 11 (raised-knee recovery), girl 15 (catch-prep stance 8.5 px off centre). The manifest's `working_foot_verified: false` stands: the alternating cycles are "cycle A / cycle B", not proven right/left feet.
- Offside referee popup (`src/render/offsidePopup.ts`, MatchScene): only for a stoppage whose `reason` is `offside` (the referee's confirmed call), once per stoppage object, never for an offside position alone. Above the pitch (depth 6001), below HUD/pads/Coach dialogue, clear of the minimap; runtime "OFFSIDE!" caption; slides in, fade only with reduced motion; clears on tap, restart, pause, the end of the 1.2 s dead-ball pause (2.6 s at most), scene change and reload. Referee state, restart and score unchanged.
- Browser staging (`&deadBall=4` lengthens the dead ball in debug builds): `?debug&setup=offside` (H6 → H9 pass received offside) and `?debug&setup=offside-position` (H9 offside, H8 keeps the ball). Phone emulation only, not tested on a real iPhone.

## Season One Weeks 6–7 (owner scripts 2026-10-26, branch `devin/1792728226-weeks6-7`, stacked on PR #38, not merged, not deployed)
- Week 6 "Head Up" (no school scene, League Game 4) and Week 7 "Louder Doesn't Mean Open" (Blake's Next Horizon clips, Riley's showcase, Code's correction of Blake, League Game 5) compiled into the existing story format; `SEASON_RELEASED_WEEKS = 7`. Owner text kept in `docs/story/season-one/owner/`; every spoken line matches it word for word (straight quotes, as in Weeks 1–5). Blake stays on Batavia; no transfer before Week 8.
- Recess and after-match lines follow the real Crossbar/Jungle Ball and league results; a skipped match shows no result line. Choices are saved (park plan, Riley's request as availability only, Mom's "Making Room" plan).
- Crossbar follow-up (browser review of PR #41): a ball that clears the bar and lands past the back net is now drawn before the net (`ballSprite().behindNet`, from `NET_DEPTH`), so the mesh covers it. Warm-up shots say "Warm-up, no score." instead of "One point." (`pointWord`). Scoring unchanged.
- Team Training reaction (weeks 6+): strong week → "THERE!"; the evaluator's own "right choice, did not come off" evidence (`choiceMissed`, new optional field on the saved record) → "tidy up the execution"; poor week → "What changed while the ball was travelling?". Older records never claim the execution line. Situations are the existing pool for the career position (no keeper position exists).
- Home menu: Week 6 requires juggling + first touch + this week's planned home sessions; Week 7 swaps in passing. Cloudy Talk / Feed & Play stay optional. The script gives no showcase time, so Riley's line says the time hasn't been sent and nothing can conflict.
- **Fix (required home training was hard to find):** from the story home menu, Home Training now lists that week's required tasks at the top (`req-juggling`, `req-firstTouch` / `req-passing`, `req-learning`), each opening the matching Training Library list or My Home Sessions. Logging one returns to the list, ticks it off and says so. Before, the only route was Home Practice (labelled optional) > Library > family > activity > Log, and logging landed on the Journal with "earns no extra credit". Both screens use the same `homeTasks(weekAssignments(...))`; the gate rule is unchanged (`tests/home-tasks.test.ts`, `e2e/career.spec.ts`).
- Code's after-match "strong example" / "support movement" praise never shows: match records do not track scanning or off-ball support, so the "Otherwise" line plays.
- Phone poses (owner image, five characters): Sam's texts, the group chat, Blake scrolling at school and after Week 7's match, the player replying by text. Only the listed characters show on those lines; Riley (no phone art) and Mom's phone pose (no Mom phone scene yet) are not shown.

## Mom Replacement v2 (owner package 2026-10-25, branch `devin/1792724543-mom-portraits-v2`, from `main` 4808b23, not merged, not deployed)
- All standalone Mom portraits now use the v2 art: casual teal by default, burgundy only for listed dressier scenes (none in Weeks 1–5), one outfit per scene, expression per line. Mapping and coverage: `docs/art/season-one/MOM_V2.md`.
- Characters painted into a backdrop (car: Mom + player; aquarium: player + Cloudy) never get a second portrait. Portraits show only on spoken lines; narration and choices clear them.
- Story text, speakers, choices, rewards and gameplay unchanged. Phone emulation only, not tested on a real iPhone.


## Match Report + My Player (owner spec 2026-10-24, branch `devin/1792698553-player-dev-report`, stacked on PR #35, not merged, not deployed)
- Match Report on the sunset art after every career match and from Match History; My Player on the bedroom art from the Week 5 home hub (and `?dev` Start).
- Event ledger, stats with numerator/denominator, rating, saved immutable reports, 35/30/30/5 weekly settlement with fractional carry (`docs/REPORTS.md`).
- Gaps: no Energy/Form, no keeper or DNP reports, recess not yet passed to the settlement, not tested on a real iPhone.

## V3 Week 5 "Put the Work In" (owner package SoccerMaster_V3_Week5, 2026-10-23, branch `devin/1792700000-v3-week5`, stacked on PR #34, not merged, not deployed)
- Package copied unchanged to `docs/story/v3/` (its own validator passes there). Week 5 compiled into the existing Season One story format (`05_week05.story` → `season_one_scenes.json`); the story is released to week 5 (`SEASON_RELEASED_WEEKS = 5`), weeks 6–18 stay unwritten and unreachable. Weeks 1–4 and the prologue are byte-identical (hash-pinned in `tests/story-week5.test.ts`, with the week 5 source and the package's `WEEK_05_APPROVED.md`).
- Route: science-sub talk → recess Crossbar or Jungle Ball (reaction from the real result) → required Team Training (no "Not this week" from week 5; feedback from the recorded grade: strong / struggled; the pass-weight line only on recorded pass evidence (`pass_weight`), which week 5's legacy situations do not produce yet) → ambition (saved as a decision, no reward) → home menu on the owner's background (`home-v3`): Training (required: a logged juggling task and control/first-touch work this career week, `homeAssignments`), Cloudy: Feed & Play (optional, opens Feeding Frenzy and returns), Cloudy: Talk (optional; the ambition is mentioned only if the player chooses to tell Cloudy), Continue Week (locked until the home sessions are done) → League Game 3 (aftermath from the real result; a completion without a result is rejected, never a loss) → park plan (practice / hang out / rest, saved only).
- Saves: a completed week 4 save at `S1_W04_E` continues into week 5 through the existing release migration; choices, runs, matches and rewards are kept, nothing replays.
- Opened from the story, Career hides Finish Week (the story closes the week). Recess `result:` reads the played run, not the declined placeholder.
- Known gaps: the home menu's "required training" is enforced by the story host (StoryScene) from the career save, not inside the story reducer. Next Horizon stays outside the league (earlier owner rule) although V3's continuity notes put it in; this does not affect week 5. Not tested on a real iPhone.

## Cloudy's Feeding Frenzy (owner brief 2026-10-23, branch `devin/1792691488-cloudy-feeding-frenzy`, PR #34 stacked on #33, not merged, not deployed)
- Playable aquarium mini-game on the supplied painting and Cloudy sheet: Easy/Medium/Hard, 45 s round after a 3 s countdown, drag-to-swim (touch or mouse), DASH (0.35 s, 3 s cooldown), x1/x2/x3 combos, two ball chances (about 12 s and 28 s, 10 s each) scored once (+50) when the whole ball enters the painted goal from outside.
- Pause (button, Escape/P, app hidden, focus lost) freezes timers, spawning, physics, currents and cooldowns. Results save the best score and stars per difficulty once per run through the career reducer (`cloudyResult`); a failed write keeps the round and offers Retry save. No soccer attributes or match statistics.
- Reachable only through `?dev` Start for now; the V3 Week 5 home menu opens it in the next PR.
- Tests: `tests/cloudy.test.ts` (sim, transform, save) and `e2e/cloudy.spec.ts` (portrait and landscape: art fit, goal alignment, drag, DASH, pause, results, reload, app switch, rotation, listener counts). Not tested on a real iPhone.

## Team Training v1.2 (owner package 2026-10-22, branch `devin/1792646912-team-training-v12`, not merged, not deployed)
- Package kept unchanged in `docs/training/v1.2/`; reference modules vendored with their 36 tests in `npm test`.
- Playable: Career → Team Training → Session A/B/C (v1.2) for Season 1 weeks 1–4, every role offered to the career position. Fixed overhead half-field camera, coached Observe → Decide → Execute → Explain loop, 3 rounds (guided, unguided, timed), pause, two-tap leave, rotation-safe.
- Weeks 5–18 and Season 2 are "not available yet". GK routes pass unit tests but have no career position.
- Rewards: three credited sessions grade the week once through the existing economy (shared with the legacy situations).
- Sprites: every player in the drill uses the sprite atlases (owner, 2026-10-23): teammates in Batavia training kit, opponents in Batavia match kit, neutrals in Sol Vista, keepers in their club's keeper art; the player you control is the saved girl/boy with the gold ring.
- PR #32 review fixes: a failed save keeps the finished session and offers "Try saving again" (same run id); the store is closed if the scene shuts down while loading; exit gates (B1/K1) and the C1 end zone score only on a controlled reception, a loose ball crossing a gate does not; a turnover in D1/T1 keeps play live for a 3 s counter; v1.2 runs after the legacy weekly grade are saved as practice only. Participation spans are capped just under 5 s (longer counters were rejected by the reference). Coaching text is re-fitted above the buttons on every refresh.
- PR #33 review fixes: legacy Team Training refuses to grade a week once a v1.2 session has counted (the v1.2 sessions grade it); S1 finishes count only from the last 5 m (`shotOriginWithinEndMeters`), and long shots are not offered; a neutral on the ball plays for the side that passed to it and releases the ball like a wall; a passer can't re-trap its own pass in the first 1.5 m; portrait choices switch to two columns (then shorter buttons) before they cover the title and prompt.
- Not tested on a physical iPhone.

## Jungle Ball: bigger, bouncier ball (owner, 2026-10-23, PR #33)
- `JUNGLE.ballRadius` 0.2 → 0.3 yd (drawn to the same ratio, 1.5x), `bounce` 0.45 → 0.68 with `bounceMinSpeed` 0.6 yd/s, `wallRestitution` 0.7 → 0.85. Rules, controls, scoring and saves unchanged. Test: dropped from 2 yd it rebounds above 0.85 yd and bounces at least 5 times (fails on the old constants).

## Jungle Ball v3 arcade upgrade (owner brief 2026-10-22, branch `devin/1792638887-jungle-arcade-v3`, stacked on PR #30, not merged, not deployed)

- HIT / SLIDE / staged knockdowns / charged shots / ball height with posts, bar and net / keeper dives, catches, parries and throws / goal celebration / pause with Leave confirmation; see D43.
- Owner action sheets (boy, girl, Blake, Sam) packed into the jungle atlases. Gaps: no Alex sheet, no slide-tackle pose, keeper keeps its existing sheet.
- Tests: `tests/jungle-v3.test.ts` plus updated v2 suites. Not tested on a physical iPhone.

## Mom portraits, Cloudy aquarium paintings, Jungle Ball sheets (owner art 2026-10-22, branch `devin/1792623784-jungle-mom-aquarium`, not merged, not deployed)
- **Mom:** the owner's 6-expression sheet (`docs/art/season-one/assets/v2/mom_expressions_source.png`, unchanged) is cut by `scripts/art/crop-mom-portraits.py` into `mom-neutral`, `mom-proud`, `mom-worried`, `mom-laughing`, `mom-firm`, `mom-sad` (2:3, bottom-anchored). `SPEAKER_ROLE.Mom = 'caregiver'`; every Season One scene where Mom speaks casts her portrait (7 scenes: prologue departure/arrival, weeks 1 and 4 home talks, weeks 1 and 4 pitch lines, week 2 aquarium). The script has no per-line expression field, so every line uses `mom-neutral`; the other five are loaded into the catalog and Art Gallery, ready once the script names expressions.
- **Cloudy:** the owner's two aquarium paintings (`s1-tank-girl`, `s1-tank-boy`) are the backdrop of all 5 Cloudy scenes (`S1_PRO_ROOM`, `S1_W01_F`–`S1_W04_F`), chosen from the saved Boy/Girl. They already show the player and Cloudy, so no portraits or code-drawn figure go on top (`cast_in_backdrop`). Before a look is chosen, or if a painting fails to load, the old tank backdrop / labelled fallback is used.
- **Jungle Ball:** the package's 4 sheets become sprite atlases `jungle-boy`, `jungle-girl`, `jungle-blake`, `jungle-sam` (`scripts/art/build-jungle-sprites.py`; sheets kept unchanged in `docs/art/sprites-v2/source`). Bound by competitor id (`player` = saved look, `blake`, `sam`), never by display name. Run (6 frames, mirrored for leftward), idle (front/back/side), kick = pass contact pose, down/slide = stumble. Main-character frames 18–21 (hand actions) are never packed. Rules, controls, scoring, rewards and saves unchanged.
- **Leak test:** the Jungle round-trip snapshot now waits until the courtyard and sheets have loaded (`gameplay.art`). On the live site the loader's one-shot `filecomplete` listener was sometimes still pending, giving ±1 listener / display-list differences.
- **Gaps:** Alex has no sheet (reference roster look). No shoot clip for the main characters (pass pose reused). Celebrate, trap, header, chest and shoulder poses are packed or available but not shown: the minigame has no matching state to drive them. Package backgrounds are not used yet.

## Saved protagonist in Team Training + New game (owner report 2026-10-22, not merged, not deployed)
- Team Training now gives the saved Boy/Girl look to the player each drill puts you in control of (`stageTeamSituation`), instead of the fixed formation slot (`CAREER_SLOT`). Before, a girl save controlled a Batavia boy while the girl stood elsewhere on the pitch.
- Start has a "New game" button under "Play Story". It needs a second tap within 5 s. It archives the career save (`archive-<time>` in `smr-career`), the story, the league and the cup records (never deleted), then starts the story from the prologue at week 1 (`CareerStore.startOver`, `StoryStore.newGame`). Before, there was no way to start over, so an old save kept its training week (e.g. week 121).
- Tests: `tests/new-game.test.ts`, `e2e/protagonist.spec.ts` (girl look on the controlled player in Team Training, New game two-tap and archive).

## Season One structure from the storyboard + story mode only (owner outline "A Place on the Field", 2026-10-21; stacked on PR #26, not merged, not deployed)
- **Story mode only:** Start shows one "Play Story" button. Free 9v9 match, Home Training, Jungle Ball and Review & Lab (and the `T` shortcut, and Home Training's "Play a 9v9 match") need `?dev` in the link (`shouldExposeDevMenu`). Inside the story, matches, Crossbar, Jungle Ball and training still open as before. Browser specs that use the developer entries now load `/?debug=1&dev`; `navigation.spec` checks the player start screen has only Story and that `T` does nothing.
- **Calendar** (`src/game/season/calendar.ts`): the 18 storyboard titles; league games 1–6 in weeks 3–8, 7–8 in weeks 10–11, 9–12 in weeks 13–16; AZ Showcase week 9, Holiday Classic week 12 (three weeks apart); week 14 keeps league game 10 and adds a non-league friendly against Next Horizon, Blake's new club (owner, 2026-10-21; `friendly` on the week, never league points); State Cup semifinals week 17, final week 18. Mom's deeper scenes in weeks 1, 4, 7, 9, 12, 16 plus the week 18 family decision (79 slots). Weeks 1–4 slots are unchanged.
- **Tournaments** (`tournament.ts`, save version `s1-t2`): 8 teams, 2 groups of 4, three group games each, group winners meet in the final. Ten-point system (win 6, draw 3, +1 a goal up to three, +1 clean sheet). Tiebreakers: points, wins, head-to-head only for a two-team points tie, goal difference capped at ±3 a match, fewest conceded, then the drawing of lots recorded at creation; no restart after a partial split. Batavia's group: Batavia, one league club, two out-of-state clubs. Next Horizon (not a league club, owner: special exemption) is in the other group with one league club and two out-of-state clubs. Eight random fictional out-of-state clubs with colours (owner: "random out of state team names and colors"). Tournament points never touch the league.
- **State Cup** (`stateCup.ts`): the league's top three once all league games have results, plus Next Horizon as the fourth team by exemption (owner, 2026-10-21; `STATE_CUP_INVITED`). The semifinal draw is recorded once; Batavia outside the top three is not entered and the cup is simulated without an invented berth.
- **Strength ranking** (`strength.ts`, review-only default): Elo (start 1500, K 24) over league and tournament results in season order, recomputed from saved results, never stored. Separate from league position and tournament points.
- **Not done / gaps (not invented):**
  - Weeks 5–18 have no scenes until the owner sends scripts; the story still ends after week 4, so tournaments, the State Cup and the strength table are not reachable in play yet.
  - No playable penalty shoot-out exists: a level tournament final or State Cup game gets a seeded shoot-out winner, labelled simulated.
  - Out-of-state clubs have colours but no sprite sheet and the match renderer only knows sheet clubs, so they are not drawn in their colours yet.
  - Energy, endurance and health (minutes, workload, recovery by elapsed game time) are not started.
  - School activity +1/−1/neutral rule: still unconfigured.
  - Week 4: the script has no Mom line acting on the support preference at League Game Two.

## Season One weeks 3–4 (owner directive "REPLACE LEGACY STORY CONTENT", branch `devin/1792547837-story-weeks-3-4`, not merged, not deployed)
- Only approved weeks 1–4 are authoritative. Weeks 1–2 (owner rewrite) unchanged; weeks 3 "When It Counts" and 4 "Everybody Wants Something" replaced from the owner scripts. Blake's gendered line uses the directive's replacement "Come on. Prove you can play some real soccer."
- One content source and one runtime: `src/game/story/content.ts` exports only `SEASON_ONE` (`s1-v2.0`, compiled from `docs/story/season-one/src`). The v0.7 week-one package and the weeks 2–4 draft are no longer imported anywhere; `DRAFT_SCENES`, `WEEK_ONE`, `WEEKS_2_4` and `STORY` are gone.
- Weeks 5–18 and the epilogue are ordered, comment-only placeholders; nothing is generated or loaded for them. `SEASON_RELEASED_WEEKS = 4`: the story ends after week 4 with "Weeks 1–4 complete. More weeks are coming soon."
- Week 3: Jungle Ball (existing game unchanged; WIN/DRAW/LOSS from the saved player vs Blake score), home-learning follow-up from last week's saved review, Team Training, League Game One with WIN/DRAW/LOSS branches.
- Week 4: Crossbar or Jungle Ball by the player's choice (the unchosen one is recorded as declined, never launched), Mom's talk chosen from the real training log (above / within / below / unknown), League Game Two with WIN/DRAW/LOSS branches.
- Facts are read from records only (`src/game/story/facts.ts`); missing records are "unknown", never "did not train".
- Saves: retired `0.7` and `w24-draft-1` story saves are archived unchanged and a fresh Season One story starts; a `s1-v1.0` save still in weeks 1–2 resumes in place; a `s1-v1.0` save with progress in old weeks 3–18 is not mapped and the story screen offers an explicit "restart story" (archives the story and league record; career, player, attributes and training are kept).
- **Not implemented, owner decision needed (not invented):**
  - Week 4 school activity ±1 "overall attribute point": the game has no overall rating and neither minigame has strong/poor bands. Recorded as `unconfigured`; no attribute changes.
  - Weeks 3–4 personal match feedback (strong / mixed / difficult debut / limited time): the match hands back only the team result; no rule maps match evidence to these bands.
  - Week 4 Code's in-match stoppage lines ("They're playing a match. Speak with the adults afterward." / "Set up. Next play."): the match engine has no sideline-pressure events.
- Choice labels may now be up to 72 characters so the owner's exact answers fit.
- Merged `main` (PR #27 at-home demos) into this branch on 2026-10-21; STATUS/DECISIONS keep both entries (D38 here, D39 from #27). After the merge: 717 unit tests passed, and the home demo, career, story and Review browser specs passed 18/18. The first CI run (1.2 h runner) failed only desktop `coach.spec:83` (known slow-runner baseline) and phone-portrait `jungle.spec:72` (keyboard moved 0.46 yd vs 0.5 in 400 ms real time; passed 4/4 locally). Neither file is touched by this branch.
- Fix (found in browser testing): the week 3 and week 4 close screens showed the retired 5-club league ("no league result recorded yet") instead of the Season One table; they now show the live season standings.
- Fix (found in browser testing): in week 4 the unchosen school activity still offered "Play Jungle Ball / Not today" (Play was refused by the runtime). It now shows one Continue that records it as declined.
- Review fixes: weeks 1–2 activity runs are re-keyed to `s1-v2.0` on migration (a launched Crossbar/Team Training resumes instead of restarting); Mom's "above the plan" ignores skipped logs; the week 4 close card says more weeks are coming instead of "week 5 opens".

## At-home training demos use the created player (owner request 2026-10-21, PR #27, merged to `main` and deployed 2026-10-21 at `8559977`)
- Every at-home exercise demonstration (92 catalog exercises) is now drawn with the saved Boy/Girl protagonist in the blue training kit, from the owner's sheets, with the ball drawn separately. One shared mapping: `src/render/art/homeDemo.ts` (`demoSet`, `demoPose`). Coverage list and gaps: `docs/art/HOME_DEMOS.md`.
- There was no embedded video: demos were code-drawn dots and circles. Juggling ladder levels each have their own contact pattern (laces / thigh, alternating feet, bounce, settle and dribble or pass); passes and shots strike on the frame the ball leaves the foot; defending uses jockey/block poses.
- Not converted: the 6 review-only demo prototypes in the Review hub, and the 100 v1.1 draft entries (never had a demo). No goalkeeper home exercises exist. Missing poses (sole, hands catch, receive, chest/head, real left foot) are listed as gaps.
- Watching or replaying a demo changes nothing in the save (`e2e/homedemo.spec.ts`). Portrait demo area grew from 20% to 27% of screen height.


## Merge of open PRs #17, #18, #22 and #23 into `main` (owner request 2026-10-20)
- Owner: "merge all remaining prs", then "only merge new weeks 1 and 2 stories as we will give you remaining weeks later". #23 (new weeks 1–2) is merged; #15 (approval of the older weeks 2–4 draft) is left out.
- Conflicts were docs only, plus `sim.ts` where the referee (#17) and the v0.5 tactics director (#18) both hook the constructor and carrier logic; both kept, set-piece hold first. Tactics stay off by default (`?tactics=v05`).
- PRs #6 and #13 had no commits that `main` lacks; nothing to merge from them.
- Season One weeks 3–18 are hidden (owner: "hide them") until the new text arrives: the story ends after week 2's close with "Weeks 1–2 complete. More weeks are coming soon." The weeks stay in the catalog; a save already inside them rests at week 2's close with its choices and results kept, and continues into week 3 once more weeks are released (`SEASON_RELEASED_WEEKS` in `src/game/story/runtime.ts`).
- Review fixes (Devin Review on PR #25, v0.5 tactical director, off by default): acknowledged kick commands now reach the engine before being cleared, so a carrier is no longer stuck without kick decisions; held orders keep the engine's metres and convert to world yards once (home and away); each observation carries the referee's offside line as `runLimit`, and teammates beyond it are not pass targets. Regression tests in `tests/tacticalDirector.test.ts` fail on the old code.
- Review hub story line now reads weeks 1–2 (owner rewrite), weeks 3–18 hidden.
- Checks on this branch: typecheck clean; unit 49 files / 707 tests passed, 0 failed; e2e (phone portrait, landscape, desktop) 114 passed, 0 failed, 8 skipped by design. Not tested on a real iPhone.
- Not tested on a physical iPhone.

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

## Season One weeks 1-2 rewrite (branch `devin/1792522894-story-weeks-1-2`, PR only, not merged, not deployed)

- **Week 1:** Monday move (phone choice), new house, Cloudy settled; Tuesday park with Sam and a playable Crossbar against Sam (one warm-up each, three counted shots, no sudden death) with result-specific lines and Sam's invitation; Thursday first training with Coach Code (real Team Training; his reply follows the real grade) and the receiving assignment; Friday Cloudy; Friday night Mom ("I'm nervous too") with the support choice.
- **Week 2:** Monday empty chair; Tuesday Crossbar against Blake with the audience choice and a refusal that is remembered as a refusal, real WIN/DRAW/LOSS, ties stand; Wednesday classroom board showing the real score, Riley; Wednesday training "find the passing angle"; Thursday Cloudy with the closing intention. No Mom talk (moved to week 1).
- **Saves:** content version unchanged. A save in the middle of a rewritten scene restarts that scene; a save in the retired week 2 parent scene continues at the weekend. See D30.
- **Not done:** no new park, car, kitchen, classroom or training-complex art (stand-ins); Sam has no in-match sprite in the Crossbar screen; Code's "right decision, poor touch" line has no separate grade.

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
- **Crossbar fix (scoring matches the picture):** the ball was drawn at least 4 px wide and the crossbar with a 3 px thicker outline than the simulation uses, so near misses could look like hits, and a ball that cleared the bar was drawn on top of it. `ballSprite()` / `goalGeometry().barWidth` now use the same `CROSSBAR` radii and projection as `simulateShot()`, a ball past the goal line is drawn behind the frame, and the result line says "One point." or "No point.". Scoring itself is unchanged; `tests/crossbarView.test.ts` checks the picture against the simulation in portrait, landscape and desktop.
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

## Rankings (League, National, Team Profile)
- 120-team registry, background season, Elo rankings with weekly snapshots, Rankings / Team Profile / League / Compare screens, THIS SEASON panel on the Home menu, TEAM IMPACT on the Match Report. See `docs/RANKINGS.md` and `docs/RANKINGS_REGISTRY.md`.

## Team shape (match AI)
- Shared team-shape controller (`src/game/match/shape.ts`) moves the back line with the team in and out of possession; offside survives saves/deflections; dev overlay shows the lines, offside boundary, unit gaps and each player's reason. Deterministic scenarios in `tests/teamShape.test.ts`.
- Open: feel needs a phone playtest; spacing values are provisional.
||||||| 714405c


### Team Training presentation pass (PR #43)

Pitch-first layout at true proportions (390×844 down to 320×568 and 568×320 checked in the loop browser test), cones and a dashed line instead of the orange box, pixel mini-goals coloured by attacking team, muted background goal, team foot discs and carrier ring, tags kept off players and the ball, compact coaching panel with a state-worded question, technical readouts moved to diagnostics. Replays no longer use round time; all good reads are offered. Browser phone emulation only, not a physical iPhone.
