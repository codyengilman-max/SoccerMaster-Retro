# Tactical Moments: supplied art integration (D76d)

The owner authorized the animations in `tactical-moments-art-package.zip` for Tactical Moments. No replacement art was commissioned and no new art-review package was made. The package's source sheets are the same sheets already imported unchanged as the `team-training-v1` atlases (hash-checked in `src/assets/art/team-training-v1/manifest.json`), so the runtime uses those atlases directly.

## Character mapping

| Slot | Atlas | Identity kept |
|---|---|---|
| Protagonist (one slot, saved boy or girl) | `boy.webp` / `girl.webp` | sheet's own outline + gold ground ring |
| Home outfield (6 + protagonist) | `teammate_01`–`07` | fixed per slot for the session, retries and replays |
| Away outfield | `opponent_01`–`08` | fixed per slot |
| Keepers | `keeper_home`, `keeper_away` | key poses only |
| Ball | `jungle-v4/jungle4-ball` (separate object) | spin frames advance with distance rolled |

## Action mapping (160×160 cells, anchor 80,154, one scale for every sheet)

| Timeline action | Frames | Timing |
|---|---|---|
| stand | row 2 col 1 (upright two-foot stance; no idle cycle supplied) | held |
| stand, defending within 8 m of the ball | shuffle row col 1 (ready stance) | held |
| run | run row, 6 frames | distance-driven, one cycle per 1.6 m |
| shuffle (defensive) | shuffle row, 6 frames | distance-driven |
| pass | plant 7 → 8, strike 9 (ball leaves), follow-through 10 | 0.35 s plant, 0.12 s contact, 0.3 s follow |
| receive | first touch 14 (ball arrives), settle 15 | 0.15 s contact, 0.35 s settle |
| dribble | run row; the ball is pushed up to 0.6 m ahead on each timed touch and caught up before the next | touch times from the timeline |
| keeper | stand / run / stride / ready key poses | held |

## Documented fallbacks

- **Up/down the screen (run, shuffle, stand, pass):** the closest supplied view is the three-quarter side frame. Body facing is chosen separately from travel: the look direction when it has a sideways component, otherwise toward the ball's side, otherwise the previous facing. Routes and positions are unchanged.
- **Left:** horizontal mirror of the right-facing frames, anchors mirrored with the image.
- **Dribble touches:** no touch frames exist; run-cycle frames are used and the separate ball shows each touch.
- **Keeper actions:** only four key poses exist; no save, dive, catch, throw or punt cycle is invented.
- **Tackle:** no stand-in (must not be faked with pass frames); it still blocks release. No current draft attempts one.

Contact foot, surface and supporting foot stay **UNVERIFIED** and are recorded, not inferred from facing or mirroring. They no longer block using the art. Player release still needs owner scene approval.
