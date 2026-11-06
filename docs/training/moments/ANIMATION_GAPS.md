# Tactical Moments: animation-gap report

Supplied outfield sheets (`team-training-v1`, 6 × 4 cells of 160 px): **run** (6 frames), **pass** (plant 7–8, contact 9, follow-through 10), **receive** (reach 13, contact 14, settle 15), **shuffle** (6 frames), all facing **right three-quarter**, mirrored for left. Keepers: stand, run, stride, ready only. Per-scene list: [GAPS_BY_SCENE.md](GAPS_BY_SCENE.md).

| Missing | Effect | Release blocker? |
|---|---|---|
| Front/back facings (running or shuffling up or down the screen) | The overhead camera has home attacking up the screen, so forward runs, carries, recovery runs and most pressing runs are vertical. Sideways sprites are not used as front/back movement. | **Yes**, for the affected scene |
| Passing up/down the screen | The pass row only strikes sideways. | **Yes** |
| Tackle / dispossession | No tackle frames; never faked with pass frames. No current draft needs one (no turnover branch is a tackle). | Yes, if a scene needs it |
| Dribble touch frames | Carry touches are timed on run-cycle frames; the ball stays at the foot. | No (listed for review) |
| Keeper save, dive, catch, throw, punt | Keepers only hold position. | No (no keeper lessons) |
| Head turn / scan | "Pause, scan and communicate" options cannot show a scan. | No (shown as a freeze, as the package says) |

Pressing uses the run or shuffle rows only where the movement is mostly sideways.

**Contact foot:** passes and receptions are drawn on frames 9 and 14. The draft records the striking foot as **right when the body faces right, left when mirrored**. This rule has not been confirmed against the sheet art yet. It needs owner confirmation; until then contact-foot correctness is unverified.

**Result:** 71 of 72 scene versions have at least one release-blocking gap. Only `TM-D36-changed` has none. The framework and review page work regardless; player release waits for the frames or for approved scene changes.
