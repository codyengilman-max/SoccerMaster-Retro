# Devin: regular-match moving-camera venue integration

## Scope and priority
Only regular league, tournament and exhibition matches. Preserve training, home tasks, minigames, story, menus, progression, rules, saves and simulation. This document supersedes camera/orientation wording in the older handoff; asset preparation guidance remains applicable. Inspect current repository instructions and renderer before integration.

## Venue identity
Keep internal IDs and directories stable. pinnacle = Pinnacle Park (Batavia home); bell94 = Dell 94; scottsdale = Scott’s Complex; westside = Westside Grounds. Update player-facing labels and sign loading, not saved IDs. Preserve approved match-location/game-type assignments; this package does not establish missing tournament assignments. Original sources contain historical names and must not be loaded as current signs.

## Layer contract
1. Ground: assets/<venue>/grass.webp is a full rectangular pitch material. Map its UVs once across authoritative field coordinates; no screen stretching and no assumed seamless tiling.
2. Markings and goals: draw from the existing authoritative U11_9V9_PITCH; no painted backdrop or duplicate goal. Retain physical geometry.
3. Scenery: separate transparent prop sprites from assets/<venue>, placed using world positions and supplied ground anchors. Preserve aspect ratios. Layout positions are proposals to check for occlusion, not new football boundaries.
4. Sideline actors: assets/characters contains six prepared animation atlases and clip definitions. Keep canonical Coach Code and Mom identities, world-ground anchors and event-driven animation. Cosmetic random choices must not affect simulation RNG.
5. Match actors and ball: use the game's approved regular-match atlases; these are not replaced by this venue package.
6. HUD: screen-fixed, safe-area aware and separate from world layers.

## Camera contract
Landscape elevated sideline view, pitch length left-right. Fixed sideline orientation and stable live-play zoom. Smooth ball-relative tracking, small dead zone, restrained directional lookahead. Do not snap on player selection or possession changes. Keep ball, useful passing options and complete goalmouth visible near goals, including airborne balls. Camera framing prioritizes play over spectators.

Use one shared world-to-screen projection for pitch, markings, goals, feet, props and shadows. Textured ground mesh subdivision must match nonlinear projection. Keep people upright; depth-sort by projected ground contact. Ball height renders above its ground point. Preserve world coordinates, hitboxes, speeds and physics. Apply inverse projection to movement and aim without changing movement magnitude.

Scenery stays at fixed world positions; it must not slide with screen or be duplicated across camera views. BuildGroundMesh and billboard helpers in runtime are adapters, not drop-in Phaser scene integration. Read runtime/README.md and bind them to the actual renderer.

## Mobile lifecycle
Match-only landscape presentation. Preserve state on rotate/resize and recalculate projection, camera clamps, depth, HUD and input mapping. Cancel held inputs on interruption. Restore other screens' original layout on exit. Preserve all existing context-sensitive controls, including quick-shot and GK distribution; do not infer controls from mockups.

## Acceptance
Verify every venue resolves correct textures, props, current sign and actors. Pan through both goals, both touchlines and midfield with no gaps, drifting props or misalignment. Check passing, chips, shots, punts, tackles, restarts, halftime, switching, turnovers and pause/resume. Check simultaneous joystick/action input and small landscape phone screens. Check alpha edges, depth occlusion, texture shimmer, loading and frame time. Confirm excluded modes unchanged.

Run appropriate repo tests/typecheck/build. Supply actual running screenshots at midfield and both goal ends, recording of continuous pan, venue/game-type mapping, atlas paths, changed files and results marked PASS/FAIL/NOT RUN. Physical iPhone testing must be distinguished from emulation. Follow existing release workflow.
