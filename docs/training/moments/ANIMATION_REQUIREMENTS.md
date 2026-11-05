# Tactical Moments: directional animation requirements (generated)

Grouped by action and facing so one directional sheet per character covers every scene. Facing is the screen direction on the true overhead pitch (home attacks up the screen). Every outfield sheet below is a distinct character: boy and girl are the two protagonist options; teammate_01-07 orange kits; opponent_01-08 green pinnies. Contact rows need reviewed contact metadata (foot, surface, supporting foot); facing never decides the foot.

| Action | Facing | Existing frame reusable? | Contact metadata | Sheets needing it | Uses |
|---|---|---|---|---|---|
| dribble touch (no frames exist; drawn on run cycle) | E: screen right | yes: existing right three-quarter frames as drawn | contact foot, supporting foot, surface: TBD | boy, girl | 1 |
| dribble touch (no frames exist; drawn on run cycle) | N: away from camera (up the screen) | no: no frames face away from the camera | contact foot, supporting foot, surface: TBD | boy, girl, teammate_01, teammate_02, teammate_03, teammate_04 | 46 |
| dribble touch (no frames exist; drawn on run cycle) | S: toward camera (down the screen) | no: no frames face the camera | contact foot, supporting foot, surface: TBD | opponent_01, opponent_02, opponent_04 | 20 |
| keeper ready | E: screen right | yes: existing right three-quarter frames as drawn | — | keeper_away, keeper_home | 45 |
| keeper ready | N: away from camera (up the screen) | no: no frames face away from the camera | — | keeper_home | 100 |
| keeper ready | S: toward camera (down the screen) | no: no frames face the camera | — | keeper_away | 80 |
| pass (strike) | E: screen right | yes: existing right three-quarter frames as drawn | contact foot, supporting foot, surface: TBD | boy, girl | 8 |
| pass (strike) | S: toward camera (down the screen) | no: no frames face the camera | contact foot, supporting foot, surface: TBD | boy, girl | 2 |
| pass (strike) | W: screen left | yes: true horizontal mirror of the E frames (swaps anatomical left/right) | contact foot, supporting foot, surface: TBD | boy, girl | 7 |
| receive (first touch) | E: screen right | yes: existing right three-quarter frames as drawn | contact foot, supporting foot, surface: TBD | teammate_01, teammate_02, teammate_04 | 7 |
| receive (first touch) | N: away from camera (up the screen) | no: no frames face away from the camera | contact foot, supporting foot, surface: TBD | keeper_home, teammate_01 | 4 |
| receive (first touch) | W: screen left | yes: true horizontal mirror of the E frames (swaps anatomical left/right) | contact foot, supporting foot, surface: TBD | teammate_01, teammate_03, teammate_04 | 6 |
| run | E: screen right | yes: existing right three-quarter frames as drawn | — | boy, girl, opponent_01, opponent_02, opponent_03, opponent_04, teammate_01, teammate_02, teammate_03, teammate_04 | 112 |
| run | N: away from camera (up the screen) | no: no frames face away from the camera | — | boy, girl, opponent_01, opponent_04, teammate_01, teammate_02, teammate_03, teammate_04 | 149 |
| run | S: toward camera (down the screen) | no: no frames face the camera | — | boy, girl, opponent_01, opponent_02, opponent_03, opponent_04, teammate_01, teammate_04 | 129 |
| run | W: screen left | yes: true horizontal mirror of the E frames (swaps anatomical left/right) | — | boy, girl, opponent_01, opponent_02, opponent_04, teammate_01, teammate_02, teammate_03, teammate_04 | 70 |
| shuffle | E: screen right | yes: existing right three-quarter frames as drawn | — | opponent_04, teammate_01, teammate_02 | 5 |
| shuffle | N: away from camera (up the screen) | no: no frames face away from the camera | — | teammate_02 | 2 |
| shuffle | W: screen left | yes: true horizontal mirror of the E frames (swaps anatomical left/right) | — | opponent_01, opponent_02 | 7 |
| stand (looking) | E: screen right | yes: existing right three-quarter frames as drawn | — | boy, girl, keeper_away, keeper_home, opponent_01, opponent_02, opponent_03, opponent_04, teammate_01, teammate_02, teammate_03, teammate_04 | 328 |
| stand (looking) | N: away from camera (up the screen) | no: no frames face away from the camera | — | boy, girl, keeper_home, opponent_01, opponent_02, opponent_03, opponent_04, teammate_01, teammate_02, teammate_03, teammate_04 | 402 |
| stand (looking) | S: toward camera (down the screen) | no: no frames face the camera | — | boy, girl, keeper_away, opponent_01, opponent_02, opponent_03, opponent_04, teammate_01, teammate_03, teammate_04 | 389 |
| stand (looking) | W: screen left | yes: true horizontal mirror of the E frames (swaps anatomical left/right) | — | boy, girl, keeper_away, opponent_01, opponent_02, opponent_03, opponent_04, teammate_01, teammate_02, teammate_03, teammate_04 | 293 |

Scene/branch IDs per row: `ANIMATION_REQUIREMENTS.json` (`<scene>/watch`, `<scene>/<choice>`, `<scene>/<choice>#outcome`).
