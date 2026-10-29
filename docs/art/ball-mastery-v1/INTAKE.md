# Ball Mastery art v1 — intake (work in progress)

Source: `SoccerMaster_Ball_Mastery_Art_Devin.zip` (owner handoff 2026-10-29), copied unchanged to `source/`.

| File | SHA-256 | Size |
|---|---|---|
| START_HERE_DEVIN.md | e6289dd5820310a3a5bb47816a4cd6ecb23ef788d25b9b949d905b5e4ef28f79 | |
| boy_contact_poses_DRAFT.png | f880ae7e3ebb69396fbafc2168d5b68043ed6406b1d5525bc79e38527fc22e51 | 1536x1024 RGBA |
| girl_contact_poses_DRAFT.png | 8338716637fa47f12aca41cbd300a1047a4a4fe5d29c65be03f137a1b0695058 | 1536x1024 RGBA |
| boots_and_ball_DRAFT.png | 211124691cee790a4b43ee31567e8980c35b42e44662085c40492c9c9534cf98 | 1774x887 RGBA |

## Measured (not assumed)

- Alpha: background alpha 0 but RGB underneath is brown; body pixels alpha 250–254 (never 255 on the character sheets);
  a faint haze of alpha 1–15 (boy 65,788 px, girl 93,250 px, boots 157,095 px) surrounds figures. Derivatives must
  threshold the haze and set body alpha to 255.
- Boy sheet: 12 separate figures in a 4x3 grid (bounds in pixels x,y,w,h):
  r1 (60,10,279,336) (443,10,277,336) (829,10,250,336) (1215,9,262,337);
  r2 (59,348,254,344) (458,348,255,345) (819,353,247,335) (1197,354,269,336);
  r3 (79,688,247,325) (457,690,244,324) (805,689,286,324) (1197,691,261,314).
- Girl sheet: 11 components; P6 and P10 (column 2, rows 2–3) touch (448,340,264,664) and must be split on the row line.
- Boots/ball: 16 boot views in 2 rows of 8 (rows repeat the same directions with mirrored variants) + 16 balls in 2 rows.
- Figures face the viewer (3/4 front), not side-on like the in-game sprites-v2 training sheets.

## Identity conflict (owner decision needed)

The in-game approved protagonist training sheets (`docs/art/sprites-v2/source/{boy,girl}-training.png`) wear a
BLUE kit with orange trim and WHITE boots, in pixel-art style. These drafts wear an ALL-ORANGE kit and BLUE boots in a
painted (non-pixel) style. START_HERE asks to preserve "orange kit, blue boots" and the selected identity.

## Derivatives

`scripts/art/build-ball-mastery.py` writes `derived/*_clean.png` + `derived/frames.json`: haze alpha <= 24 removed,
alpha >= 200 made opaque, components < 400 px dropped, holes filled; per-figure rect, both boot blobs, ground line
and visible height (boy 316–341 px, girl 316–325 px). Frames are sliced on the 4x3 grid lines, which separates the
touching girl P6/P10.

## Pose reading (boy; figure faces the viewer, so the character's right foot is on the image left)

Mirror pairs: P1/P2 foot extended to the side (toe out), P3/P4 one foot drawn back, P5/P6 knee raised, foot lifted
forward (sole/step-on), P7/P8 one foot lifted behind, P9/P10 working leg crosses in front of the support leg,
P11/P12 wide stance, one foot out. No ball is drawn, so contact surface is not shown by the art: each lesson
must assign the surface from its own reviewed steps.

## Week board and progression conflicts

- Story Continue Week (StoryScene) unlocks on `weekAssignments(...).complete`, which from Week 6 includes
  `learning` (planned home sessions, reached through Weekly Focus). Removing Focus must keep a route or the owner
  must retire the requirement. Asked 2026-10-29.
- Team Training leaves the weekly board but stays reachable from Story, My Player, MatchScene and its own scenes.
