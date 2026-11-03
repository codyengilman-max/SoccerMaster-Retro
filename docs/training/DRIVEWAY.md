# Driveway Dribbling (weekly home mini-game)

Owner spec (2026-11) with the owner's reward update: at most **2.00 development points per player per season week**, shared across every difficulty, replay and rewarded attribute.

## Where it is

- Story: at each week close, while this week's round is not done, the story shows "Complete this week's Driveway Dribbling" and **Play Now** instead of Finish week.
- Home Training: a **Driveway Dribbling** button sits next to Back to story (the two curriculum cards are unchanged).
- Scene `src/scenes/DrivewayScene.ts`; rules in `src/game/driveway/` (framework-free).

## Rules (code: `src/game/driveway/config.ts`)

| Item | Value |
|---|---|
| Round | 60 s after a 3 s countdown; 3 chances |
| Player area | lower driveway, x 0.6–7.4, y 1.2–4.8 (of an 8 × 20 lane) |
| Collision | −1 chance, combo reset, 0.6 s at 45% speed, 1.4 s protection, the object is retired |
| Shot | league double tap on SHOOT (`MATCH_TUNING.pad.quickShot`); leaves from the ball; 1.1 s lifetime |
| Ball recovery | 0.6 s; moving allowed, shooting off, extra taps are not queued |
| Scoring | clean dodge 10, target broken 20; ×2 from 5 in a row, ×3 from 10 (applies to the next event) |
| Medals | thresholds per difficulty in `THRESHOLDS`; silver needs ≥ 40 s survived, gold needs the full 60 s and ≥ 50% accuracy |
| Unlocks | Silver or Gold on the highest open difficulty unlocks the next one; unlocks are kept across weeks |

Solid objects (dodge, never break): cone, bucket, watering can, crushed can, basketball, skateboard, scooter, tricycle (the last five roll or cross). Breakable (shoot): cardboard box, box stack, target board. Background scenery never collides.

Waves are seeded; every row is checked at build time for a reachable gap given speed, size, current position, reaction time and recovery (no survival route needs a shot). Crossing objects are flagged on screen before they enter.

## Rewards (quarter points; 1 quarter = 0.25)

| Difficulty | Completed | Bronze | Silver | Gold |
|---|---:|---:|---:|---:|
| Beginner | 0.25 | 0.50 | 0.75 | 1.00 |
| Intermediate | 0.50 | 0.75 | 1.00 | 1.25 |
| Advanced | 0.75 | 1.00 | 1.25 | 1.50 |
| Expert | 1.00 | 1.25 | 1.50 | 2.00 |

- A replay pays only the gain above the week's best (0.75 → 2.00 pays 1.25). Changing difficulty never resets it. Weekly total ≤ 2.00 (8 quarters).
- Points go through the existing growth path (`fitToCap`): attribute maximums and the Season 1 overall maximum of 64 still apply. If the maximum cuts a payout, the result screen shows what was actually applied. Nothing is banked.
- Split: first touch from clean dodges, finishing from targets broken, agility/pace from the difficulty's movement share; no successful action → first touch.
- Any finished round (timer or all chances lost) completes the week, whatever the score. Quit, reload or leaving mid-round gives nothing.
- Each round has a run ID; a repeated submission is rejected. Past weeks never pay.

## Art (owner-provided, 2026-11)

| Source (unchanged, `src/assets/art/driveway-v1/source/`) | SHA-256 prefix | Runtime |
|---|---|---|
| `driveway-background.png` 1536×1024 | `fc01272c541d3e30` | `driveway-background.webp` |
| `breakables-sheet.png` 4×3 (box, box stack, target; intact/cracked/breaking/debris) | `e4098f485add31d0` | `driveway-objects.webp` frames `box-0..3`, `boxStack-0..3`, `target-0..3` |
| `solids-sheet-a.png` 4×4 (cone, watering can, bucket, scooter) | `0992a0343c985504` | `cone-*`, `wateringCan-*`, `bucket-*`, `scooter-*` |
| `solids-sheet-b.png` 4×4 (crushed can, basketball, tricycle, skateboard) | `0e22e832106ed9cc` | `can-*`, `basketball-*`, `tricycle-*`, `skateboard-*` |

Atlas: 44 frames trimmed by alpha and packed at 50% (`driveway-objects.json`). Player and ball: the approved Jungle Ball package sprites (`jungle4-boy` / `jungle4-girl`, `jungle4-ball`), also used for shots and the rolled-in replacement ball.
