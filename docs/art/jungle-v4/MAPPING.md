# Jungle Ball replacement art (package `SoccerMaster_JungleBall_Replacement_Devin`)

Generated review art from the owner, not shipping-approved. Sources are copied unchanged to `source/` (sha256 in
`source/inventory.json`, checked by `tests/jungle4Art.test.ts`). `scripts/art/build-jungle-v4.py` builds the runtime
atlases in `src/assets/art/jungle-v4/`; `frames.json` lists every cut rectangle.

## How frames are cut
- No fixed grid: each pose is a connected component of the sheet's opaque core, ordered by visual row/column.
  Touching neighbours (Blake's slide sheet) are split by erosion; small detached pieces join the nearest pose.
- Background haze is dropped (alpha < 24 away from the pose's own core); character pixels and outlines are kept.
- Frames are trimmed with a per-frame ground pivot (feet), so slides and dives keep their drawn width.
- One scale per character, from the front idle: standing body = 150 atlas px. Slide sheets are scaled so their
  jog-recovery pose matches the run height. Left-facing frames are mirrors (`-w`).

## Who wears what
| Slot (sim id) | Atlas | Name shown |
|---|---|---|
| player | `jungle4-boy` or `jungle4-girl` (saved choice, only one loaded) | YOU |
| alex | `jungle4-rival` (burgundy hoodie) | ALEX (unchanged until the owner names the rival) |
| blake | `jungle4-blake` | BLAKE |
| sam | `jungle4-sam` | SAM |
| keeper | `jungle4-keeper` | — |
| ball | `jungle4-ball` (12 rotations, 64 px, centred) | — |

## Size
Old Jungle Ball body = `PLAYER_ART.bodyScale (1.3) × depth height`. New = that × **1.35**, once
(`jungle4BodyHeight`). Depth scaling is unchanged. The ball keeps the old visible width. Physics, collision radii,
controls, scores, saves and the sim are unchanged.

## Pose map (`src/render/art/jungle4Frames.ts`)
| Sim state | Frames |
|---|---|
| idle | `idle-s` facing down screen, `idle-n` facing up, `idle-e` side |
| run, sprint | `run-0…5` (side) |
| kick | `kick` |
| charge / strike | `shot-0…2` / `shot-3…5` |
| hit (push) | `push-0`, `push-1` |
| impact, stagger | `stumble` |
| falling / down / rising | `stumble`,`down` / `down`,`seated` / `seated`,`recovery`,`rise-3` |
| slide / recover | `slide-1…4` / `slide-5`,`rise-1`,`rise-3`,`rise-5` |
| celebrate | `taunt` |
| keeper set / moving | `side-w` / `lateral-0-w` |
| keeper dive / down | `dive-a0`,`dive-a1`,`dive-b2` / `land-b`,`ground-b`,`up-b` (all `-w`) |
| keeper hold | `catch-chest` (ball in gloves), `throw-w` for the last 0.25 s; the sim releases the ball as before |
| ball | `ball-0…11`, one turn per circumference travelled, frozen while held |

## Gaps (not invented)
- **No front/back running:** running up or down the screen uses the side run.
- **No standing dazed pose:** a plain hit (stagger) shows `stumble` with the existing stars.
- **Keeper dives are side-on:** no dive toward/away from the camera, so dives along the goal line use the side dive.
- **Key poses, not full cycles,** for keeper and ball; transitions step between them.
- **Unused:** `receive`, `slide-0`, `rise-0/2/4`; keeper `ready`, `crouch`, `rear`, `dive-a2`, `dive-b0/b1`
  (drawn facing the other way), `land-a`, `ground-a`, `up-a`, `scoop`, `catch-high`, `roll`, `punt`, `lateral-1`.
  The sim has no punt, roll or scoop distribution; the keeper only throws.

## Retained old art
The old `jungle-*` sheets (`src/assets/art/sprites-v2/`) and the generic keeper stay in the repo and are drawn only
until the new atlases finish loading. No old clip is mixed into a new character.

## Background
`jungle-ball` is now the owner's schoolyard field with the cheering crowd (`docs/art/season-one/assets/
jungle_ball_schoolyard_background.png`, 1536×1024). The old court master stays in the repo. The picture is
cover-fitted and slid so the grass edge meets the play area where the fit leaves room.
