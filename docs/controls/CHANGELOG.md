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

### Known issues
- No set pieces, offside, added time or switching ends (pre-existing M4 gaps).
- Shots stay on the ground (engine has no ball height).
- Keepers are not user-controlled; no single-player career lock.
- Not yet tested on a physical iPhone.

### Rollback
Open with `?controls=gesture`, or flip the `padMode` default in `MatchScene.create`; see
`CONTROLS_IMPLEMENTATION.md`.
