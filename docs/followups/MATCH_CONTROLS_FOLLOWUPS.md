# League-match controls: follow-up findings (not fixed in the controls PR)

## Team shape (separate from switching)
- Supporting runs are planned by `ai.ts` (`planTeams`, shape lines in `s.shape`); the controls PR does not change them.
- When the controlled player is the previewed SWITCH pick's neighbour, both can chase the same loose ball because the AI chaser (`chaser.home`) and the controlled player are chosen independently. Worth a team-shape task: suppress the AI chase when the user's player is already the challenger.
- Stability tests use parked rosters; a full-match sweep of shape gaps (`sh.midX - sh.lineX`) was not part of this PR.

## Camera
- Measured by code path: `MatchScene` feeds the camera only ball position/velocity and the ball carrier (`camera.update({ mode, ball, ballVel, carrier, attackDir })`). `controlledId` is never an input, so a switch cannot retarget or snap the camera. No camera changes were made.
- Unresolved: the camera follows the ball, so a SWITCH pick can be off screen in portrait; the preview ring is only visible when on screen. An edge arrow for an off-screen controlled player is a possible follow-up.
