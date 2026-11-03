# Progression v2 (D72)

One framework-free engine (`src/game/career/development.ts`) develops the main character, Batavia teammates and opposing players. Config: `DEV_CONFIG`.

## Attributes

Ten active outfield attributes, 0–100, full precision (display rounds only): First Touch, Passing, Dribbling, Finishing, Defending, Tactical Awareness, Composure, Strength/Balance, Agility, Pace. Overall is the fixed equal-weight mean of the ten (`overallOf`). The game never had goalkeeper, stamina or aerial attributes, so nothing was removed; goalkeeper play is unchanged and no stamina/fatigue exists.

## Weekly growth

`gain[a] = weeklyBudget (4.2) × sourceShare × evidence score (0–1) × allocation[a] × role multiplier`

| | |
|---|---|
| Source weights | home 35%, Team Training 35%, matches 30% (`DEV_CONFIG.sources`) |
| Role multipliers | main character 2.0, Batavia teammate 2/1.7, opponent 1.0. Exactly one applies; ratings are never multiplied |
| No opportunity (`none`) | its weight is shared over the sources that were scheduled |
| Skipped (`skipped`) | keeps its weight at zero evidence, so skipping costs growth |
| Home | best result per distinct activity, at most 3 a week. Juggling → First Touch 0.5 + Dribbling 0.5 |
| Team Training | the scheduled week's one record; score = mean of its graded situations; allocation 0.5 Awareness + 0.5 the situations' attributes |
| Matches | official reports with minutes; 0.1 each Composure, Strength/Balance, Agility, Pace + action shares |

Every allocation sums to 1 (tested). Growth is applied once, in `endWeek`; the review stores sources, proposed and applied gains in `history[].development`.

## Season 1 maximum (main character only)

New players start at overall 50. Before saving, all gains are proposed, the resulting overall is computed, and positive gains are scaled down proportionally so overall ≤ 64. The review explains capped growth; nothing is banked past the cap. Bonus points: exactly +1, whole or not at all; a point that does not fit stays banked with a reason. AI players have no cap.

Simulated 18-week seasons (`tests/progressionV2.test.ts`): low participation 53.0, typical 59.8, strong reaches 64 after week 12.

## AI

`aiDevelopment.ts`: start 50 ± 4 per attribute, then the same engine with simulated evidence per (club, slot, review). Pure function of `save.history.length`, so loading or opening screens never rerolls. `MatchScene` applies it to all 17 non-protagonist players in career matches. Team strength is only the players' attributes; rankings never feed gameplay.

## Gameplay effects (match multiplier 0.8–1.2, neutral at 50)

| Attribute | Effect | Never |
|---|---|---|
| First Touch | receiving quality, once per genuine reception | applied on carries |
| Dribbling | carry speed between touches | retriggers First Touch |
| Passing | pass speed cap and delivery | bypasses opponents |
| Finishing | normal and quick-shot spread | guarantees a goal |
| Defending | standing-tackle execution | extends reach |
| Tactical Awareness | AI teammates' recovery into team shape | overrides input |
| Composure | scales opponent pressure on shots and first touch | removes error |
| Strength/Balance | carrier's resistance in tackles | guarantees possession |
| Agility | acceleration and tackle execution | |
| Pace | top running speed | adds a sprint button |

## Migration (save schema 2 → 3)

`migrationV2.ts`, run by `parseSave`, keyed on schema so it runs once. Adds Composure, Strength/Balance, Agility and Pace at the old six-attribute mean (overall unchanged), applies the pending fractional carry once, and stores a report (`save.progression`: added values, overall before/after, carry applied, over-cap flag). Over-cap saves keep their ratings, are flagged, and get no ordinary growth until below 64. History and bonus balances are kept.
