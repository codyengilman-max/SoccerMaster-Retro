# Joystick + four-button controls: implementation

Brief: the controls specification supplied 2026-10-15 (left-thumb joystick and exactly four buttons:
PASS, SHOOT, SLIDE TACKLE, BLOCK). It replaces the swipe / pull-back scheme as the default for the
9v9 match. The old gesture scheme stays reachable with `?controls=gesture` for comparison and rollback.

## Layers

| Layer | File | Owns |
|---|---|---|
| Pure input | `src/input/joystickControls.ts` | Pointer ownership (one stick finger, one action finger, extras ignored), floating stick origin, radial dead zone, diagonal clamp, button hit areas, layout (portrait/landscape, safe areas, narrow-screen shrink), preference validation. Emits `move` / `press` / `release` / `cancel`. No Phaser, no DOM. |
| Simulation | `src/game/match/sim.ts` (`padMove`, `padPress`, `padRelease`, `padCancel`, `tickPad`, `padContact`, `resolvePadContacts`) | Authoritative action state (`state.pad`), availability, charge, receiver choice, kick validation at contact (actor, control epoch, owned-since, command id), attribute movement, block stance, slide phases, swept slide/block contacts, foul stoppage. Fixed step, sim time only. |
| Tuning | `src/game/match/tuning.ts` → `pad` | Every number above (charge times, power ranges, receiver cone/stickiness, block and slide geometry and timings). |
| Presentation | `src/scenes/ui/PadHud.ts`, `src/scenes/MatchScene.ts` | Draws the stick and buttons, receiver ring and charge meter; maps screen stick to pitch direction; forwards events as sim commands; feeds `sim.padAvailability()` back to the input layer every frame; cancels on blur, background, pointer cancel, lost capture, pause, navigation, resize/rotation. |
| Preferences | `PadHud.ts` (`PREFS_KEY = 'smr-controls-v1'`, localStorage) | Size and opacity (pause panel), Reset controls. Separate from career/story saves (IndexedDB); invalid stored values fall back to defaults. |

There is one input path per scheme: in pad mode the gesture recogniser is not updated and gesture
keyboard actions are swallowed, so there is no competing handler, and the sim keeps a single loop.

## Behaviour

- **Movement:** stick length 0..1 after the dead zone; diagonals never exceed 1. Top speed comes from
  `pace`, acceleration from `accel`, turning from `agility` (each 0.8–1.2 of the base). No sprint.
- **PASS / SHOOT:** press starts a charge (only when the controlled player has the ball), release
  locks direction and power and enters a short prep; contact happens only if the same player still
  owns the ball under the same control epoch. Losing the ball (even if regained) voids it. Pass aim:
  the stick picks a receiver inside a cone with stickiness; with no receiver the pass goes along the
  stick, or along facing when the stick is neutral. Neutral SHOOT aims at the side's attacking goal.
  Ground passes only.
- **SLIDE TACKLE:** available off the ball. Start → active → recovery, then a cooldown; presses during
  any phase are ignored. Ball first = poke away; body first, or body contact after the follow-through
  window, = foul and a stoppage.
- **BLOCK:** held stance off the ball, slower movement, turns toward the ball; a swept line in front
  of the player deflects fast balls (shots) without granting possession. Release returns to normal.

## Desktop keys (pad scheme)

Arrows / WASD move · Space or J pass · K shoot · L slide tackle · I block · P pause.

## Rollback

- Per session: open the game with `?controls=gesture`.
- In code: change the `padMode` default in `MatchScene.create` (one line) or revert the controls
  commits on `devin/1792100194-joystick-controls`; the sim keeps `controls: 'gesture'` as its default,
  so the engine path used by tests, the Lab and the attack drill is unchanged.
