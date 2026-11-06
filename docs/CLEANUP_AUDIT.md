# Cleanup audit (D77)

Reviewed: `codyengilman-max/SoccerMaster-Retro`, `main` at `23b3e00` (PR #76 merged; live build `index-DkH2bEmk.js`). No open PRs at the start. Unity (`SoccerMaster-RPG`) and the earlier engine repo (`SoccerMaster`) are out of scope and untouched. Branch: `devin/1793988658-cleanup-pass`.

Evidence below cites code as it stood at `23b3e00`. Phone checks are Playwright phone emulation (390x844, 844x390, 320x568, 568x320), not a real iPhone.

## Findings, ranked by how much they hurt play

| # | Finding | Evidence | Action |
|---|---|---|---|
| 1 | Team Training took two extra cards each way. The story's handoff opened a Career info card (scenario ID, "Earned credit", Sessions A–C note), then Start Weekly Team Training; finishing went back to that card, then Back to story. | `StoryScene.openCareer` (`HANDOFF_SCREEN.team_training`), `WeeklyTrainingScene.leave`, `TacticalMomentsScene.leave` | **FIX**: Start Team Training opens the session; Back to week returns to the story. |
| 2 | The weekly home screen was a list of instructions ("tap Training, then each task, and log it") with the season panel on top. The next step, this week's match or tournament and the player's growth were not on it. | `StoryScene` `home_hub` | **SIMPLIFY**: one board: NEXT, home training ticks, THIS WEEK (league game n of 12 / AZ Showcase), MY PLAYER overall vs 64, TEAM (league, rankings, next opponent). `Next: <task>` opens the assigned lesson. |
| 3 | Starting a home lesson took two taps from the home screen (Training, then Continue). | `StoryScene.openHome`, `CareerScene` `home` | **FIX**: `Next` uses the existing `task` route (as My Player's Start next session). |
| 4 | When home training was done the only cue was body text; Back to story looked the same as before. | `CareerScene.render` nav | **FIX**: Back to story ✓ is highlighted once every required task is done. |
| 5 | Development wording visible to players: "career week N", scenario IDs `(D05)`, "Earned credit", "Demo art ... (review build), not a coach-approved animation", "This preview does not mark anything complete", and the log page saying practice "never" earns attributes (wrong since progression v2, D72). | `weeklyTraining.teamTrainingHandoff`, `CareerScene` team/log/lesson tips, `StoryScene` `home_preview` | **FIX**: plain wording; scenario IDs only with `?debug`. |
| 6 | Story fact cards (`rankings`, `my_player`, `team_profile`, `tournament_group`, `standings`, ...) each add a Continue tap. | `StoryScene` fact cases | **KEEP** for now: they are owner-authored beats. Merging them into a recap changes authored story flow (open decision 1). |
| 7 | Legacy Career screens `progress`, `practice`, `setup`, `focus`, `sessions`, `journal` remain in the screen union. `progress` has no route to it; story adapters `training_arrangement`, `weekly_focus`, `practice` are not used by any Season One week. | `CareerScene` `Screen`, `docs/story/season-one/src/*.story` | **KEEP** (dead-but-safe): old saves and old story catalogs still parse; deleting them needs its own cleanup task with save fixtures (open decision 2). Not restored to any menu. |
| 8 | Start menu in `?dev` lists 9 entries (Story, New game, 9v9, Home Training, Review & Lab, Jungle, Cloudy, My Player, Tactical Moments). Players without `?dev` see only Play Story and New game. | `StartScene` | **KEEP**: the clutter is review-only. |

## Inventory

- **KEEP**: league standings vs team strength rankings; formation screen before matches (1-3-2-3 default) and offside; Juggling and Ball Mastery curricula and their order (two cards); Driveway, Crossbar, Jungle Ball, Cloudy as they are; progression numbers (Season 1 cap 64, 2x/1.7x multipliers, Driveway 2.00-point weekly cap, home credit at most 3 activities) unchanged; Tactical Moments fail-closed (`approvals.json` empty), review controls separate; exactly-once result keys (`run:`, `tfix:`, kickoff records).
- **SIMPLIFY**: weekly home screen (finding 2); Team Training route (1).
- **REMOVE**: player-visible development wording (5).
- **FIX**: one-tap lesson start (3), done-state cue (4).

## Taps (from the weekly home screen or story handoff, counted from code paths)

| Flow | Before | After |
|---|---|---|
| Start this week's home lesson | 2 (Training, Continue) | 1 (Next) |
| Start Team Training / Tactical Moments | 2 (Open Team Training, Start Weekly Team Training) | 1 (Start Team Training) |
| Return to the story after Team Training | 2 (Back to Team Training, Back to story) | 1 (Back to week) |
| Start a league or tournament match | 2 (Play, Kick Off) | 2 (unchanged; formation screen kept) |

## Saves

No save field changed, so no migration. Team Training credit is still written by `WeeklyTrainingScene.record` and read back by `StoryScene.resumeHandoff` from `save.teamTraining`, exactly as before.
