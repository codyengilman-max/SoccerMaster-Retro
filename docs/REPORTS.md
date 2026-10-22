# Match Reports and Player Development

Pipeline (one path, all framework-free in `src/game/report/`):

```text
MatchSim events -> MatchLedger (ledger.ts, dedup by sim seq) -> matchStats (stats.ts) + rateMatch (rating.ts)
  -> SavedReport (report.ts, saved once per matchId at full time, never recalculated)
  -> endWeek: computeGrowth (evidence thresholds) + settleWeek (settlement.ts, 35/30/30/5) -> WeekReview.settlement
  -> Match Report screen (MatchReportScene) and My Player screen (MyPlayerScene)
```

## Event mapping (registry.ts `MAPPING`, version `REGISTRY_VERSION`)

| Event | Evidence | Statistic | Rating category | Attributes |
|---|---|---|---|---|
| pass | sim `pass` by the player; outcome from next reception/interception/tackle/out | Passes (ground) | execution | passing |
| pass choice | receiver open (no opponent within 5 yd) at the pass | — | decision | awareness |
| received | sim `received` | Controlled involvements | execution | firstTouch |
| possession | owner becomes the player | Possessions, losses (once per episode) | execution | dribbling |
| shot | sim `shot`; goal or keeper save = on target | Shots on target, conversion | execution | finishing |
| goal | sim `goal` | Goals | — | none (no extra reward) |
| tackle / intercepted | sim event | Recoveries, interceptions | defending | defending |
| slide | slide start, then tackle/recovery within 1.5 s, no foul | Slides won/attempted | defending | defending |
| foul | sim `foul` | Fouls | defending | none (never rewarded) |

Cancelled pad input (`padCancel`) is never a pass or shot. Chips are always 0/0 (no chipped pass in the
engine). Not tracked: true touches, take-ons, assists, shoulder challenges, off-ball positioning, and the
attributes Lofted Delivery, Composure, Strength/Balance, Agility, Pace and all keeper attributes. They show `—`.

## Weekly settlement (settlement.ts, `SETTLEMENT_VERSION`)

`credits = WEEK_CREDITS x share x factor x confidence x modifier`, split over the attributes the evidence touched.

| Source | Share | Factor | Confidence |
|---|---|---|---|
| Home | 35% | credited sessions / 3 | 0.6 (self-logged) |
| Team Training | 30% | mean v1.2 run score, else legacy TT mean | 1 |
| Matches | 30% | rating overall / 100, opportunity-weighted over the week's reports | high 1, medium 0.75, low 0.5, none 0 |
| Recess | 5% | played 1, skipped 0 | 1 |

- No recess scheduled: its 5% goes to Home and Team in proportion (36.84% / 31.58%); Matches stay 30%.
- Skipped activities are not redistributed; a no-match week leaves match development unearned.
- All matches of a week share one match share (averaged), so more or replayed matches never add more.
- Within 10 points of potential credits shrink to zero; the carry per attribute is capped at 1; whole
  points also respect the existing per-attribute and weekly total caps already used by evidence growth.
- Opening a report or pressing Continue never awards anything; only `endWeek` settles, once.
- Recess is not yet passed to `endWeek` by the story (`recess` is optional), so it is treated as unscheduled.
