# Ball Mastery demonstration designs v1.0 — integration map

Package: `research/training/ball-mastery-designs-v1.0/` (unchanged; all 52 files match `SHA256.json`, checked by `tests/ballMastery.test.ts`).
Loader: `src/game/career/ballMastery.ts` (framework-free). Review only: no design is a player lesson.

## What changed, mapped to the existing implementation

| Package asks for | Existing implementation | Change |
|---|---|---|
| Two Home Training sections: Juggling, Ball Mastery | `CareerScene` `home` screen and Training Library root (7 family buttons) | Home gains `nav-juggling` and `nav-ballmastery`. Library root shows the two sections (`lib-juggling`, `lib-ballmastery`). Ball Mastery holds first touch, passing, dribbling, finishing, defending, awareness (`HOME_SECTIONS`). All 92 activities kept, same IDs. |
| Start juggling opens existing juggling flow | `library` family `juggling` → `activity` (juggling pack demo) | Unchanged screens, new entry. |
| Watch & practise opens the lesson | `activity` screen with sprite demo (`drawSpriteDemo`, `homeDemo.ts`) on the saved boy/girl training sheet | Same screen becomes the viewer for Ball Mastery activities: Coach Code cue line, Play/Pause (`demo-pause`), Step (`demo-step`, jumps to the next pose/contact change), 0.5× (`demo-half`), Foot detail inset (active foot + contact). Reduced motion starts paused. |
| Right/Left | Existing demos draw one authored side per contact | **Not added.** No existing activity has a reviewed demo for each foot, and the package forbids treating a mirror as valid. Pending. |
| Log practice as a report | `log-open` → `log` → `log` reducer action | Unchanged. Watching changes nothing; logging adds one journal entry; credit/attributes rules unchanged. |
| Team Training separate | `nav-team` → `team` | Unchanged. |
| Saved boy/girl, approved sprites | `demoSet(player.gender)` training sheets | Unchanged; concept images are not used as art. |
| Saves | `SAVE_SCHEMA = 2` | No schema change, no migration needed. |
| 14 designs blocked from players | Planner/assignments use `ALL_ACTIVITIES` only; v1.1 release gate empty | Designs live only in `ballMastery.ts`; `ASSIGNABLE_DESIGNS` is empty. Review screens: `bmDesigns`, `bmDesign` (Ball Mastery section and Review hub). |

## Design matches (none replaces an existing lesson)

| Design | Existing lesson | Verdict |
|---|---|---|
| BM-002 Inside cut | dr-inside-cut | Equivalent: design and its sources (D4, D8) linked on the lesson |
| BM-003 Outside cut | dr-outside-cut, v1.1 TR02 | Ambiguous: package flags mechanics |
| BM-012 Hook / Cruyff turn | dr-cruyff, TR03 | Ambiguous: hook vs Cruyff |
| BM-017 Sole stop / start | dr-stop-start, DR03 | Ambiguous: package flags mapping |
| BM-053 V pull and exit | dr-pullback, TR01 | Ambiguous: research unresolved |
| BM-071 Lateral sole roll | dr-sole, BM02 | Ambiguous: package flags mapping |
| BM-056 Inside-foot shuffles | dr-inside, BM01 | Ambiguous: on the spot vs travelling |
| BM-029 Side step | dr-body-feint | Ambiguous: side step vs shoulder dip |
| BM-055, 081, 082, 083, 009, 018 | none | New, review only |

Ambiguous links are shown on the lesson as "possible match, needs review" so source references are kept.

## Pending
- Research Expansion v2 package (release rules, 69 further candidates) was not supplied.
- Coach approval, frame-reviewed source media, reviewed normal-speed demonstrations, left/right validation, rights records for all 14.
- Right/Left switch, until reviewed per-foot demonstrations exist.
