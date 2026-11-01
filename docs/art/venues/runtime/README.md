# Runtime adapters

venue-runtime.mjs is a small dependency-free adapter, not a replacement MatchScene. Its math and event behavior are exercised by `node runtime/test-runtime.mjs`.

1. Load prepared character atlases with Phaser's atlas loader (texture key equals character filename stem); load clips JSON and call registerClips(scene,id,spec).
2. On animation completion, return to the character's idle/seated_idle key. Avoid resetting an active clip every render frame.
3. Call buildGroundMesh(project) with the game's existing world-yard-to-screen projection each time camera/layout changes. It returns screen vertices, UVs and triangle indices. Feed this into the current WebGL mesh/pipeline using appropriate screen-to-mesh conversion; raw screen coordinates are not automatically Phaser Mesh local coordinates. This repository-specific binding remains necessary.
4. positionBillboard expects the actual layout and depthScaleAt convention from the repository. Verify that the latter takes projected y; adjust this wrapper if its signature differs. Provide width/height, pixel anchor and either baseScale (prop) or displayBodyHeight/bodyHeightPx (character). Use world width of 3.3 yards for tent scale; do not size tents like people.
5. SidelineReactions takes actors with id, team, clips and optional seated. Event.team is the scoring team for goal and goalkeeper team for save. Pass unique authoritative event IDs, clear state on match disposal, and use the match presentation clock. A callback plays `venue:<character>:<action>`. Never feed old/replayed events after the 512-ID retention horizon; host replay handling must suppress historical events.

The helper does not alter physics, camera state, inputs or saves. It must be wired to the actual game before integration can be verified. No repository source, credentials or deployed app was accessed.
