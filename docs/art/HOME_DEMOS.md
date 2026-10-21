# At-home training demonstrations (owner request, 2026-10-21)

Every at-home exercise demonstration is drawn by `CareerScene.drawSpriteDemo()` from one shared mapping,
`src/render/art/homeDemo.ts`:

- `demoSet(gender, keeper)` picks the sheet from the saved Boy/Girl choice (`save.player.gender`, written by the
  story's identity scene): `boy-training` (brown hair) or `girl-training` (blonde ponytail). Keeper exercises would
  use `boy-goalkeeper` / `girl-goalkeeper`. A career with no saved choice (created from My Training before the story)
  shows the boy, as the match does.
- `demoPose(activity, t)` maps the activity's existing `DemoSpec` and the playback time to a sheet frame, a mirror
  flag, the player's spot and a separately drawn ball (position + height). It is pure, cosmetic and never touches the
  save: watching or replaying a demo awards nothing (asserted in `e2e/homedemo.spec.ts`).
- Frames come from the runtime atlases built from the owner's sheets (`docs/art/sprites-v2/`, extracted by alpha
  connectivity, feet anchored). The sprite keeps one uniform scale per demo (never stretched); on-the-spot demos fill
  the frame and leave room for the ball's highest point, moving demos keep the practice-area scale.

There was no embedded video anywhere: before this change every demo was code-drawn (a blue dot and a white ball for
moving demos, a row of numbered circles for still-frame demos).

## Coverage (192 at-home entries)

| Group | Exercises | Demo now | Animation |
| --- | --- | --- | --- |
| Juggling ladder `jg-1`…`jg-8` | 8 | Protagonist | Own contact pattern per level: one touch + catch (1), right then left with catches (2), touch-bounce-touch (3), two touches (4), alternating feet (5), foot-thigh-foot-thigh (6), juggle-settle-dribble (7), juggle-settle-pass (8). Each contact is prepared (the surface rises in the last part of the previous beat), the contact frame shows exactly when the ball is at laces (0.45) or thigh (1.05) height; the ball rises and falls between contacts. Left contacts are mirrored right-foot frames. |
| Passing | 14 (all path) | Protagonist | Run/dribble to the ball, `kick-2` (prep) → `kick-4` (contact, on the frame the ball leaves the foot) → `kick-5` (follow-through), then recovery run. |
| Finishing | 14 (all path) | Protagonist | Same strike timing as passing, toward the drawn targets; dribble-to-finish routes dribble first. |
| Awareness | 14 (all path) | Protagonist | Dribble frames while the ball is at the feet, run frames when apart. No strike unless the ball really leaves the foot. |
| Dribbling | 4 path + 10 still-frame | Protagonist | Path: dribble cycle. Still-frame (inside / outside / sole touches): closest pose with the ball at the touched side (an "away" step shows the push into space, not a kick); left-foot steps mirrored. |
| First touch | 9 path + 5 still-frame | Protagonist | Path: run to the ball, settle with the dribble pose. Still-frame: air → juggle pose with the ball raised, inside / outside / sole → dribble poses. |
| Defending | 12 path + 2 still-frame | Protagonist | Jockey frames when shadowing, run frames when recovering fast, block pose when set; still-frame "away" steps use the jockey pose. |
| Training-library drafts `v11-*` | 100 | No demo (unchanged) | These screens never showed a demonstration: text steps only. |
| Review-only demo prototypes (BM01-L1, DR01-L1, TR01-L1, PA02-L1, JU01-L1, FI01-L1) | 6 | Unchanged (foot close-ups) | Review hub only, not player-facing. **Gap**: not converted. |

Verified in phone emulation (390×844 and 844×390, rotating on the same screen, after reloading the save) for one
exercise of each group with both a boy and a girl save: `jg-6`, `fn-ground-placement`, `ps-wide-gate`, `dr-inside`,
`ft-soft-landing`, `df-side-step`. Unit tests check every frame of all 92 exercise demos exists on both sheets.

## Gaps (not invented)

- **No goalkeeper exercises exist at home**, so the keeper sheets are wired (`demoSet(gender, true)`) but unused.
- **No dedicated pose** on the training sheets for: sole-of-foot control (dribble pose used), a hands catch (standing
  front pose with the ball held in front), receiving / cushioning (dribble pose), chest or head control.
- **Left foot** is a mirror of the right-foot art (the sheets draw right-foot, right-facing poses only).
- **Surface detail**: juggle frames are classified laces (`juggle-0/1/7`) and thigh (`juggle-2/6`) by inspection;
  `juggle-3/4/5` (knee lifts) are not used.
- **Inside vs. laces strike** look the same: the sheet has one kick sequence, used for passes and shots only.
- **Moving demos are top-down routes**, so the player sprite is the side-view sheet moved along the route.
