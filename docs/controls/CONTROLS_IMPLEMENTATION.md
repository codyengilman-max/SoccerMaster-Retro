# Joystick + four-button controls: implementation

Brief: the controls specification supplied 2026-10-15 (left-thumb joystick and exactly four buttons:
PASS, SHOOT, SLIDE TACKLE, BLOCK; PR D replaced BLOCK with TACKLE, a committed standing tackle). It replaces the swipe / pull-back scheme as the default for the
9v9 match. The old gesture scheme stays reachable with `?controls=gesture` for comparison and rollback.

## Layers

| Layer | File | Owns |
|---|---|---|
| Pure input | `src/input/joystickControls.ts` | Pointer ownership (one stick finger, one action finger, extras ignored), floating stick origin, radial dead zone, diagonal clamp, button hit areas, layout (portrait/landscape, safe areas, narrow-screen shrink), preference validation. Emits `move` / `press` / `release` / `cancel`. No Phaser, no DOM. |
| Simulation | `src/game/match/sim.ts` (`padMove`, `padPress`, `padRelease`, `padCancel`, `tickPad`, `padContact`, `resolvePadContacts`) | Authoritative action state (`state.pad`), availability, charge, receiver choice, kick validation at contact (actor, control epoch, owned-since, command id), attribute movement, standing tackle and jockey, slide phases, swept slide contacts, quick-shot tap window, foul stoppage. Fixed step, sim time only. |
| Tuning | `src/game/match/tuning.ts` → `pad` | Every number above (charge times, power ranges, receiver cone/stickiness, standing tackle (`pad.standing`), quick shot (`pad.quickShot`), jockey and slide geometry and timings). |
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
- **TACKLE (standing tackle, PR D):** available off the ball. A press commits a short on-feet step
  into the ball along the stick (or toward a nearby ball): start 0.1 s → active 0.2 s → recovery
  0.45 s at 35% speed, then a 0.35 s cooldown. Through start and active the lunge bends after the
  carrier's ball (at most 4 rad/s, within 4 yd), so a carrier shifting the ball aside isn't an automatic
  whiff. It resolves once, the first moment in the active window
  the lead foot (0.35 yd ahead) is within 1.15 yd of the ball. Win chance (seeded, clamped 5–85%, so
  never certain) rises with a closer foot, meeting the carrier on the ball side, timing it while the
  carrier's touch has pushed the ball out, and agility + control over the carrier's; it drops sharply
  through the carrier's back. A win pokes the ball loose (never straight into possession) and emits
  `standing` `won ball from <id>`; a miss emits `standing` `missed …`; a miss with body contact can be a
  foul (10% base, +45% from behind, more at speed) with the normal free-kick / penalty call. Out of
  reach it whiffs (`standing` `missed`). Holding TACKLE after recovery becomes the jockey (slower,
  goal-side, mirrors the dribbler); releasing returns to ready. The old passive BLOCK wall that
  deflected shots is gone. Ball Winner counts a standing tackle (1 half-point unit) only from these
  explicit events and only when the defender's team then has controlled possession within 2 s;
  ordinary contact tackles never count as standing tackles.
- **Double-tap quick shot (PR D):** a SHOOT tap (released within 0.18 s) waits up to 0.25 s of sim
  time for a second press. No second press: the same ordinary tap shot locked at release goes ahead
  (0.25 s later than before). A second press: a quick shot at a fixed 55% charge leaves the foot 0.03 s
  later (normal preparation is 0.08 s), with the same aim assist, the same execution-error spread and
  the same keeper/defender/frame resolution; shot detail starts with `quick`. Held shots never wait.
  Losing the ball, a control change or a pause during the window cancels it without a shot.

## Desktop keys (pad scheme)

Arrows / WASD move · Space or J pass · K shoot (double-tap K for a quick shot) · L slide tackle · I tackle (hold to jockey) · P pause.

## Rollback

- Per session: open the game with `?controls=gesture`.
- In code: change the `padMode` default in `MatchScene.create` (one line) or revert the controls
  commits on `devin/1792100194-joystick-controls`; the sim keeps `controls: 'gesture'` as its default,
  so the engine path used by tests, the Lab and the attack drill is unchanged.
