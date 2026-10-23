# League, National Rankings and Team Profiles

Simulated career-world rankings for the U11 9v9 category. Offline only: no online leaderboard.

## Code
- `src/game/rankings/teams.json` / `teams.ts` — the canonical 120-team registry (see `RANKINGS_REGISTRY.md`).
- `src/game/rankings/background.ts` — fixtures between the 106 background teams and their seeded results.
- `src/game/rankings/ratings.ts` — Elo, weekly snapshots, settlement, performance stats, save parsing.
- `src/game/rankings/views.ts` — read-only view models: league table, search, rank history, TEAM IMPACT.
- `src/scenes/rankingsData.ts` — reads saved story results and settles inside one IndexedDB transaction.
- `src/scenes/RankingsScene.ts` — National / State / League tabs, search, My Team, Around Me, Top 25, Team Profile, Compare.
- Home menu (Story, from Week 5): THIS SEASON panel and a League & Rankings button. Match Report: TEAM IMPACT on the competition line.

## Fixture ownership
- Batavia league games and Batavia tournament games are played by you. Other league and cup fixtures are simulated by the existing league/tournament code, exactly as before. Background fixtures involve only the 106 background teams and are simulated by `background.ts`. A fixture belongs to exactly one of these, so nothing is both played and simulated.
- All three feed one list of finalized results (`worldResults`), in order of week, kickoff slot and fixture ID.
- A fixture with no saved result is Scheduled. It is never a draw and never counted.
- States: Scheduled (no result), In Progress (a story match run that is launched but not finished; the existing story run record), Finalized (a saved result). Postponed and Cancelled are not used in Season One: no fixture is ever moved. A result saved late (for example after an interrupted match) is counted in the next weekly settlement, labelled "not yet in rankings" until then.
- Byes: the five-team league gives each team a bye per cycle; a bye is no game and changes nothing. Multi-week tournaments are counted week by week as their games are saved.

## Ratings (defaults)
- Expected = 1 / (1 + 10^((opponent − team) / 400)); Change = K × (result − expected); K = 24; win 1, draw 0.5, loss 0.
- Both teams use their rating from before the match; changes are equal and opposite. No goal-margin multiplier. Full precision is stored; only the display rounds.
- A shoot-out counts as a draw for ratings; the tournament still records the shoot-out winner.
- Start ratings come from each team's tier (1500 ± 75 per tier, plus a small fixed offset per team), stored as the Preseason snapshot.
- Background scores: Poisson-like goals around 1.6 per team, ×1.3 per tier of difference, ×1.05 for the home team, seeded from the career seed and the fixture ID.
- Rankings publish once per matchweek, when you finish a week (or on the next visit to the rankings screen). Each week's background results are simulated once and saved, so a reload cannot change them.
- Provisional: while not every team is linked to every other by results, the label says so.

## Stats
- Attack = goals scored ÷ counted matches. Defense = goals conceded ÷ counted matches (lower is better). Schedule = average opponent rating just before each counted match. Matches = counted matches; under 5 shows "Limited results"; none shows "—".
- Counted matches: league and competitive tournament games. All games are 2 halves of the same length in this game, so no duration adjustment is needed.

## League table
- 3/1/0 points, ordered by points, goal difference, goals scored. Teams level on all three share a position. The existing name order only fixes display order; the State Cup keeps its existing top-three rule. Tournament games give no league points. Before any result: "Season not started".

## Saves
- Rankings are stored as `rankings-s1:<careerId>`; kickoff ranks as `kickoff:<run>`. They are derived records: deleting them and settling again rebuilds the same snapshots from the same saved results (the background seed is the career seed).
- Settlement runs inside one IndexedDB read-modify-write, so a second tab, a reload or a repeated Continue cannot publish a week twice.
- Kickoff ranks are saved once when a league or tournament match launches; replays and resumes keep the first value.
- Old saves: a save that reaches this feature mid-season starts its rankings history at its current week. Its real saved story results are counted; background games from earlier weeks are not invented.
- Ratings give no player attributes and do not touch the 35/30/30/5 development settlement.
- Season rollover: there is only Season One. Before a second season or an age/category change, a policy is needed (carry ratings, regress, or reset).
