# Formation roles and shared responsibilities (D78)

Generated from `src/game/match/formations.ts` (`responsibilities`, `channelOf`, `validateFormation`). Team frame: own goal at x = 0, left touchline y = 0, pitch 75 × 50 yd. The away team uses the mirrored frame, so the same table holds at both ends. Every formation is checked by `tests/formationRoles.test.ts`: one keeper, eight outfielders, unique role IDs, line counts match the notation (with or without the leading `1-`), start spots inside their bounds, every responsibility held by a role that exists.

## Roles

| Formation | Role | Line | Channel | In possession | Out of possession | Start (x, y) |
|---|---|---|---|---|---|---|
| 1-3-2-3 | GK | keeper | central | distribute | goal | 3, 25 |
| 1-3-2-3 | LB | defence | left | width | holdLine | 17, 12 |
| 1-3-2-3 | CB | defence | central | balance | holdLine | 14, 25 |
| 1-3-2-3 | RB | defence | right | width | holdLine | 17, 38 |
| 1-3-2-3 | LCM | midfield | central | support | protectCentre | 31, 19 |
| 1-3-2-3 | RCM | midfield | central | support | protectCentre | 31, 31 |
| 1-3-2-3 | LW | attack | left | width | trackRunner | 46, 8 |
| 1-3-2-3 | ST | attack | central | depth | pressHigh | 50, 25 |
| 1-3-2-3 | RW | attack | right | width | trackRunner | 46, 42 |
| 1-3-3-2 | GK | keeper | central | distribute | goal | 3, 25 |
| 1-3-3-2 | LB | defence | left | width | holdLine | 17, 12 |
| 1-3-3-2 | CB | defence | central | balance | holdLine | 14, 25 |
| 1-3-3-2 | RB | defence | right | width | holdLine | 17, 38 |
| 1-3-3-2 | CM | midfield | central | balance | protectCentre | 30, 25 |
| 1-3-3-2 | RM | midfield | right | width | trackRunner | 34, 41 |
| 1-3-3-2 | LM | midfield | left | width | trackRunner | 34, 9 |
| 1-3-3-2 | LS | attack | central | depth | pressHigh | 48, 19 |
| 1-3-3-2 | RS | attack | central | support | pressHigh | 48, 31 |
| 1-2-4-2 | GK | keeper | central | distribute | goal | 3, 25 |
| 1-2-4-2 | LCB | defence | central | balance | holdLine | 14, 18 |
| 1-2-4-2 | RCB | defence | central | balance | holdLine | 14, 32 |
| 1-2-4-2 | RM | midfield | right | width | trackRunner | 31, 42 |
| 1-2-4-2 | LCM | midfield | central | support | protectCentre | 28, 20 |
| 1-2-4-2 | RCM | midfield | central | balance | protectCentre | 28, 30 |
| 1-2-4-2 | LM | midfield | left | width | trackRunner | 31, 8 |
| 1-2-4-2 | LS | attack | central | depth | pressHigh | 47, 19 |
| 1-2-4-2 | RS | attack | central | support | pressHigh | 47, 31 |

## Shared responsibilities

| Formation | Central screen | Rest defence | Left width | Right width | Forwards | Back-line depth (yd) |
|---|---|---|---|---|---|---|
| 1-3-2-3 | LCM | CB | LW | RW | ST (one forward: depth + check to the ball) | 16 |
| 1-3-3-2 | CM | CB, CM | LM | RM | LS, RS (one runs in behind, the other checks short) | 16 |
| 1-2-4-2 | RCM (no dedicated holder: the deeper central midfielder with the balance duty) | LCB, RCB, RCM | LM | RM | LS, RS (one runs in behind, the other checks short) | 14 |

Cover (`coveredBy`, nearest role on the same or a deeper line): 1-3-2-3 LB←CB, CB←LB, RB←CB, LCM↔RCM, LW←ST, ST←LW, RW←ST. 1-3-3-2 LB←CB, CB←LB, RB←CB, CM↔RM, LM←CM, LS↔RS. 1-2-4-2 LCB↔RCB, RM←RCM, LCM↔RCM, LM←LCM, LS↔RS.

Nothing here invents a player: a missing specialist role (no holding midfielder in 1-2-4-2, no wingers in 1-3-3-2 or 1-2-4-2, two forwards instead of one) is carried by the nearest suitable existing role. Formations offered are unchanged.

## Tactical parameters added (all in `src/game/match/tuning.ts`)

| Parameter | Value | Meaning |
|---|---|---|
| `defense.markHoldSeconds` | 0.8 s | A marking assignment is held at least this long before release or handoff |
| `defense.markHandoffMargin` | 3 yd | A held runner passes to a free marking teammate whose zone anchor is this much closer to him |
| `defense.markReleaseAhead` | 6 yd | A runner this far upfield of the marker's anchor is released |
| `defense.markMaxDistance` | 20 yd | No defender follows a runner further than this from his own anchor |
| `run.checkShort` | 5 yd | Second forward comes this far short of the line while a partner runs in behind |
| `run.checkBack` | 1.5 yd | A forward in an offside position heads this far back onside |
| `run.lineBand` | 6 yd | Opponents this close to the offside line count as on it when finding the gap to run into |

Unchanged and still in force: `teamShape.levelTolerance` 0.25 yd (level is onside; body point = player centre, the sim's only player point), `defense.commitSeconds` 0.9 s, `defense.switchMarginSeconds` 0.6 s, `defense.trackRadius` 9 yd, `run.seconds` 2.2 s, `run.cooldownSeconds` 2.6 s, `run.beyondLine` 6 yd. All timings are elapsed simulation seconds, never frame counts.
