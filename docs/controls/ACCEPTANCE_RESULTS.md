# Controls acceptance results (A01–A24)

Branch `devin/1792100194-joystick-controls`. Automated runs: Vitest (Node, fixed-step sim) and
Playwright in Chrome phone emulation (390×844 / 844×390 and 320×568 / 568×320). **No row has been
checked on a physical iPhone yet**; every row is "device pending" until the owner tests the preview.

Status key: **Pass (auto)** = automated test passes · **Partial** = part covered or a known gap ·
**Not built** = the engine has no such feature yet.

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| A01 | Diagonal ≤ straight-line top speed | Pass (auto) | `tests/padSim.test.ts` A01; `tests/joystickControls.test.ts` diagonal clamp |
| A02 | Pace / acceleration affect the right properties | Pass (auto) | `padSim` A02 |
| A03 | Move while charging and releasing one pass | Pass (auto) | `padSim` A03; `e2e/pad.spec.ts` A03 (two-finger CDP touch) |
| A04 | Move while charging and releasing one shot | Pass (auto) | `padSim` A04 |
| A05 | Dragging PASS across SHOOT keeps PASS | Pass (auto) | `joystickControls` ownership tests; `e2e/pad.spec.ts` A05/A06 |
| A06 | Cancelled touch never kicks | Pass (auto) | `joystickControls` cancel tests; `e2e/pad.spec.ts` A05/A06 (real `touchcancel`) |
| A07 | Loss during charge/prep cancels, incl. loss then regain | Pass (auto) | `padSim` A07 ×2 |
| A08 | Held disabled button never activates when possession changes | Pass (auto) | `joystickControls` disabled-at-touch-start tests |
| A09 | Extra fingers / repeated taps: no duplicate ownership or actions | Pass (auto) | `joystickControls` extra-pointer tests; `padSim` stale/duplicate ids |
| A10 | Stick noise does not flicker the receiver ring | Pass (auto) | `padSim` A10 |
| A11 | No receiver → pass follows the defined aim | Pass (auto) | `padSim` A11 |
| A12 | Neutral shot aims at the correct goal after half-time | Partial | `padSim` A12 checks the attacking goal; this engine never switches ends (known M4 gap), so "after half-time" is the same goal |
| A13 | Slide spam cannot bypass recovery or speed up movement | Pass (auto) | `padSim` A13 |
| A14 | Missed slide / ball contact / body contact outcomes | Pass (auto) | `padSim` A14 ×3 (foul → opponent free-kick restart, basic) |
| A15 | Block slows movement and releases cleanly | Pass (auto) | `padSim` A15 |
| A16 | Blocking a powerful shot does not guarantee possession | Pass (auto) | `padSim` A16 |
| A17 | Fast-ball collisions resolve before goal | Pass (auto) | `padSim` A17 (swept block line) |
| A18 | Render rate does not change sim speed or action timing | Pass (auto) | `padSim` A18 (30/60/120 Hz) |
| A19 | Pause / background / resume: no stuck movement or phantom kick | Pass (auto) | `padSim` A19; scene cancels on blur, `visibilitychange`, pause (code path, browser-checked only for pause) |
| A20 | Rotation / resize keep correct hit areas and safe margins | Pass (auto) | `joystickControls` layout tests; `e2e/pad.spec.ts` default layout + A20 rotate mid-charge |
| A21 | Off-ball career play keeps player lock and correct availability | Partial | Availability is authoritative (`padSim` availability test). There is **no single-player lock mode** in this engine: career matches use team control with auto-switching, as before |
| A22 | Invalid settings reset safely without touching career saves | Pass (auto) | `joystickControls` invalid-prefs tests; prefs live in localStorage `smr-controls-v1`, career/story saves in IndexedDB |
| A23 | Goalkeeper and set-piece flows usable | Partial | Keepers stay AI (all four buttons disabled if the keeper is selected). Set pieces are not built (known M4 gap); a foul gives only a basic free-kick restart |
| A24 | Story, training, saves, progression, match completion still work | Pass (auto) | Full browser suite (story, career, training review, full match, coach, lab) — see STATUS for the run |

## Performance

Node 20 on the build VM, 7,200 fixed 1/60 s frames after a 10 s warm-up: gesture scheme
0.213 ms/frame, pad scheme 0.252 ms/frame (sim only, no rendering). Physical-iPhone frame-time
measurement is pending (brief requirement); it needs the owner's device.

## Pending on device

Two-thumb feel, button reach and size, safe areas on a notched iPhone in both orientations,
background/resume from the app switcher, rotation mid-hold, frame rate during a full match.
