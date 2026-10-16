# Controls changelog

## Unreleased — joystick + four buttons (branch `devin/1792100194-joystick-controls`)
- New default 9v9 controls: left-thumb joystick and PASS, SHOOT, SLIDE TACKLE, BLOCK. No sprint.
- Movement speed, acceleration and turning come from player attributes.
- Charged ground pass and shot with receiver ring, charge meter and kick validation at contact.
- Slide tackle with start/active/recovery/cooldown, ball-first poke, body-first foul and free-kick restart.
- Block stance: slower movement, swept deflection of fast balls, no guaranteed possession.
- Pause panel: control size, opacity, Reset controls (stored apart from career saves).
- Desktop keys: arrows/WASD, Space/J pass, K shoot, L slide, I block.
- `?controls=gesture` keeps the previous swipe / pull-back scheme.
- Match length: 2 × 165 s of actual play (5.5 min total, owner cap 5–6 min), down from 2 × 240 s.
- Review fixes: an interruption (rotate, blur, pause, Coach card) during kick preparation now discards
  the kick; slide-vs-ball contact uses both swept paths, so fast balls cannot pass through a slide;
  slide speed is capped at the player's running top speed (was 8.5 yd/s, a speed burst); the
  highlighted receiver is the pass target whenever the pass reaches a teammate; held pad input
  defers Coach cards; a key-up only releases an action that key started (never a finger's);
  career first touch/dribbling now set match control/agility (the career has no pace rating).
- Test fixture: the body-first slide foul test now starts 0.9 yd behind the carrier (was 1.6 yd,
  which only connected thanks to the removed speed burst). Assertions unchanged.

### Known issues
- No set pieces, offside, added time or switching ends (pre-existing M4 gaps).
- Shots stay on the ground (engine has no ball height).
- Keepers are not user-controlled; no single-player career lock.
- Not yet tested on a physical iPhone.

### Rollback
Open with `?controls=gesture`, or flip the `padMode` default in `MatchScene.create`; see
`CONTROLS_IMPLEMENTATION.md`.
