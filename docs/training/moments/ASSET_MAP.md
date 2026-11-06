# Tactical Moments: asset mapping (actual repository paths)

Only existing approved assets are used. No new art, no assets extracted from the mockups.

| Slot | Runtime file | Source (unchanged) | Notes |
|---|---|---|---|
| Protagonist (saved boy **or** girl, one slot) | `src/assets/art/team-training-v1/boy.webp`, `girl.webp` | `docs/art/team-training-v1/source/boy_highlight.png`, `girl_highlight.png` | The sheet's own highlight outline is the body identifier; a thin gold ground ring and a YOU tag are the only extras. No scale increase: `ttScale` applies the existing 1.2075× once. |
| Teammates (orange home kits) | `team-training-v1/teammate_01.webp` … `teammate_07.webp` | `source/teammate_01.png` … `teammate_07.png` | Assigned in actor order by `stillCast`; the protagonist is never also a teammate. |
| Opposition (bright green pinnies) | `team-training-v1/opponent_01.webp` … `opponent_08.webp` | `source/opponent_01.png` … `opponent_08.png` | |
| Keepers (support only, no keeper lessons) | `team-training-v1/keeper_home.webp`, `keeper_away.webp` | `source/home_keeper_keyposes.png`, `opposition_keeper_keyposes.png` | Four key poses only. |
| Ball | `src/assets/art/jungle-v4/jungle4-ball.webp` + `.json` (12 spin frames) | `docs/art/jungle-v4` | Separate object; spin frame advances with distance rolled. |
| Coach Code | `src/assets/art/v1/coach-club.webp` (runtime-manifest id `coach-club`) | `docs/art/graphics-v1` | Owner instruction: use coach-club.webp. Cropped to head and shoulders as in Team Training. |
| Pitch | code-drawn | — | True overhead, parallel touchlines, mown stripes, 9v9 boxes and goals inside the package camera bounds. |

Not found / not used: no file named "Retro Soccer Portrait.png" exists in the repository (owner said not to search further).
