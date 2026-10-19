# Season One — coverage checklist

Source: `SoccerMaster_Season_One_Devin_v1.0` (story) and `SoccerMaster_All_Graphics_Devin` (art). Dialogue is authored in
`docs/story/season-one/src/*.story` and compiled by `python3 scripts/story/build-season-one.py` into
`season_one_scenes.json` (127 scenes). Tests: `tests/season-story.test.ts`, `tests/season-competition.test.ts`,
`tests/story-store.test.ts`, `tests/artCatalog.test.ts`.

## Story

Featured slots per week: M (Monday, Cloudy), S (school), C (Coach Code, before training), F (after training,
Cloudy reflection + preparation), P (parent, even weeks), G (match / tournament games), E (week close).
Prologue: `S1_PRO_IDENTITY`, `S1_PRO_DEPART`, `S1_PRO_ARRIVE`, `S1_PRO_ROOM`. Epilogue: `S1_END_FIELD`, `S1_END_AQUARIUM`.

| Week | Kind | Scenes |
|---|---|---|
| 1 | arrival | M, S, C, F, E |
| 2 | preseason | M, S, C, F, P, E |
| 3 | league game 1 | M, S, C, F, G, E |
| 4 | league game 2 | M, S, C, F, P, G, E |
| 5 | league game 3 | M, S, C, F, G, E |
| 6 | league game 4 | M, S, C, F, P, G, E |
| 7 | league game 5 | M, S, C, F, G, E |
| 8 | league game 6 | M, S, C, F, P, G, E |
| 9 | Scottsdale Starter Cup | M, S, C, F, ARRIVE, G1, G2, G3, G4, E |
| 10 | recovery | M, S, C, F, P, E |
| 11 | Desert Lights Cup | M, S, C, F, ARRIVE, G1, G2, G3, G4, E |
| 12 | reset | M, S, C, F, P, E |
| 13 | league game 7 | M, S, C, F, G, E |
| 14 | league game 8 | M, S, C, F, P, G, E |
| 15 | league game 9 | M, S, C, F, G, E |
| 16 | league game 10 | M, S, C, F, P, G, E |
| 17 | league game 11 | M, S, C, F, G, E |
| 18 | league game 12 | M, S, C, F, P, G, E |

- [x] 81 featured weekly slots present (test: `contains the prologue, all 81 featured weekly slots and the epilogue`).
- [x] 12 league games (weeks 3–8, 13–18) bound to the real 9v9 match; result recorded once in `league-s1:<career>`.
- [x] Two 4-team tournaments (weeks 9, 11): 3 group games, then championship or placement from the real table;
      results kept in `tourney-s1:<career>:<cup>`, never in the league.
- [x] Drawn final / placement recorded as shared (no shoot-out exists).
- [x] Skipped or interrupted games stay unplayed, never losses; the epilogue says the season is incomplete.
- [x] Riley friendship by default; crush lines only after an explicit crush choice; no inference from Boy/Girl.
- [x] Remembered consequences (Jordan W3→W5, Alex W6→W9/14/18, Sam W8→W10/12, Casey W15→W16/17/18, parent W2→later).
- [x] Goalkeepers can finish the season without scoring.
- [x] Old 4-week ending no longer runs: an older save is archived to `legacy-story-<career>` unchanged and the
      career starts the Season One prologue. Player, levels and training stay in the career save.
- [x] Team Training handoff uses the existing weekly Team Training (one result per career week).
- [x] Social choices have no effect on physics, accuracy, speed, tactics, eligibility or growth.

## Graphics

| Asset | Shown in | Trigger |
|---|---|---|
| home-screen | Start screen | always (live title/buttons on top) |
| departure-boy / departure-girl | `S1_PRO_DEPART` | saved Boy/Girl; neutral "Moving day" caption |
| arrival-boy / arrival-girl | `S1_PRO_ARRIVE` | saved Boy/Girl |
| s1-bedroom-tank + player-boy/girl-down + clownfish | every `aquarium` scene | saved Boy/Girl |
| recess-goal | `recess` scenes | scene location |
| jungle-ball | Jungle Ball mini-game | activity |
| league-standings | standings handoff after each league game / cup | live table text from save |
| goal-banner | match | sim goal stoppage, once per stoppage |
| referee-foul | match | sim foul stoppage, once per stoppage |
| tank-underwater, tank-mini-goal, tank-pellet | not shown | no Tank Cup activity exists (masters kept) |

Known gaps (labelled, not invented): no Mom or Casey portrait; no daytime aquarium; one expression per character;
no classroom/lunch room; no named in-match sprites for Alex, Sam, Blake, Riley. Departure region: story says
Northeast, art notes say Northwest, so captions name no region. Tournament club names are working names.
