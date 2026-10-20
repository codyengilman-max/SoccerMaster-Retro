# Sprites v2 — owner sprite sheets (2026-10-20)

14 owner sheets, kept byte-for-byte in `source/` (`SHA256SUMS`). Runtime atlases are built from them by
`python3 scripts/art/build-sprites.py` (Pillow, NumPy, SciPy) into `src/assets/art/sprites-v2/<set>.webp` + `.json`
(Phaser JSON-hash atlas). The game never loads the full-size PNGs.

## How frames are cut

- Poses are found by alpha connectivity, not an equal grid. Poses touching a neighbour (boy training: a slide touching
  the juggle below it, and two slides touching side by side) are split at their thinnest row/column.
- Faint alpha (≤24) and light edge halo are removed. Every pose is scaled by one factor per sheet so the standing pose is
  100 px tall, then placed in a 160×128 cell with its feet (lowest opaque row) on y = 120 and its alpha centroid on x = 80.
- Side poses (run, kick, slide, block, dribble, jockey, side idle, keeper shuffle/throw, coach walk/point) also get a
  mirrored `-w` copy for the three left-facing directions.
- `bodyBox` in each frame's metadata is the opaque body box `[x0, y0, x1, y1]` in cell pixels; `tests/sprites-v2.test.ts`
  checks that no body is cropped and every foot line is y = 120.

## Inventory

| Atlas | Source sheet | Frames | Atlas size | WebP | Source SHA256 |
|---|---|---|---|---|---|
| `boy-goalkeeper` | `boy-goalkeeper.png` | 40 | 1280×640 | 170 KB | `17bbcfffd039…` |
| `boy-match` | `boy-match.png` | 65 | 1280×1152 | 261 KB | `e1f56dad68ab…` |
| `boy-training` | `boy-training.png` | 65 | 1280×1152 | 264 KB | `fb4fe0d03737…` |
| `club-batavia-match` | `club-batavia-match.png` | 40 | 1280×640 | 163 KB | `927648f0700b…` |
| `club-batavia-training` | `club-batavia-training.png` | 36 | 1280×640 | 137 KB | `446b8a251f81…` |
| `club-desert_tuzon` | `club-desert_tuzon.png` | 40 | 1280×640 | 163 KB | `efd4c110fafd…` |
| `club-next_horizon` | `club-next_horizon.png` | 40 | 1280×640 | 152 KB | `a3fbdf486e1c…` |
| `club-royal_salt` | `club-royal_salt.png` | 40 | 1280×640 | 180 KB | `56433f5a5fc3…` |
| `club-sol_vista` | `club-sol_vista.png` | 40 | 1280×640 | 159 KB | `8cc9ef45c279…` |
| `club-valley_rising` | `club-valley_rising.png` | 40 | 1280×640 | 147 KB | `2c25d95e9349…` |
| `coach-code` | `coach-code.png` | 11 | 1280×256 | 40 KB | `55d070e48b52…` |
| `girl-goalkeeper` | `girl-goalkeeper.png` | 40 | 1280×640 | 187 KB | `b3f7c74c530b…` |
| `girl-match` | `girl-match.png` | 65 | 1280×1152 | 296 KB | `d08aa024450b…` |
| `girl-training` | `girl-training.png` | 65 | 1280×1152 | 289 KB | `76383fa90fc5…` |

Total runtime size about 2.6 MB (lossy WebP q90, lossless alpha). A screen loads only the sets it shows: a match loads
Batavia, the created player's sheet and the opponent's sheet.

## Who wears what

| Player | Sheet |
|---|---|
| Created boy / girl, match | `boy-match` / `girl-match` |
| Created boy / girl, Team Training | `boy-training` / `girl-training` |
| Created boy / girl in goal | `boy-goalkeeper` / `girl-goalkeeper` (art only: the career keeper position does not exist yet) |
| Batavia teammates, match | `club-batavia-match`; keeper uses its keeper row |
| Batavia teammates, Team Training | `club-batavia-training`; keeper uses the match sheet's keeper row (training sheet has none) |
| Team Training opponents | `club-batavia-match` (blue training kit against orange) |
| Story league / cup opponent | that fixture's club: Royal Salt, Valley Rising, Desert Tuzon, Sol Vista, Next Horizon |
| Non-story matches (Play, Lab, sandbox) | `club-royal_salt` |
| Jungle Ball created player | `boy-match` / `girl-match`; Alex, Blake, Sam and the keeper keep drawn sprites (no sheet) |
| Coach Code | Team Training cards: instruct (explain), good attempt (clap), poor attempt (shout), middling (hips), saving (clipboard), complete (point), loading (walk) |

Next Horizon has art only. `LEAGUE_CLUBS` and `NOT_ENTERED` are unchanged; a test pins both.

## Pose coverage

| Sim state | Protagonist | Club outfield | Keeper |
|---|---|---|---|
| idle | 8-direction idle | idle s / n / e (+w) | ready s / n |
| run | 8-frame run (+w) | 6-frame run (+w) | shuffle (protagonist), ready (club) |
| pass / shot / distribution | kick-4 (+w) | kick-3 (+w) | throw-2 (protagonist), ready (club) |
| slide tackle | slide-1 (+w) | slide-0 (+w) | — |
| save / parry | — | — | dive left / right |

## Gaps (not invented)

- **BLOCK, receive, dribble, jockey, catch and juggling poses** are in the atlases but the match has no sim state that says
  "blocking" or "catching" for the renderer, so they are not shown in play yet. Showing them needs a renderer-only reading of
  existing pad/sim state; no gameplay change.
- **Juggling** shows only in the Art Gallery; Home Practice has no animated juggling view. No reward was added.
- **Club keepers** have no running frames (one ready pose) and no distribution pose.
- **Run cycles** are side-view; up/down-screen running reuses the side cycle.
- **Named Jungle Ball characters** (Alex, Blake, Sam) have no sheet.

## Rollback (art only)

- Turn off in code: remove the `dress` argument from the `sideLooks` calls in `MatchScene.setRosterLooks` and the `set`
  on the Jungle Ball player; every player falls back to the code-drawn sprites. `PlayerArt.apply` already falls back
  per player when an atlas is missing or still loading.
- Full revert: revert this PR's commit; `docs/art/sprites-v2/source/` can stay as archived source art.
- Live site: Cloudflare Pages → Deployments → Rollback to the previous deployment.
