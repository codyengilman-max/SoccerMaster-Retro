# SoccerMaster Retro — animated roster expansion v2, partial delivery

IMPORTANT: image generation failed repeatedly before the full roster expansion finished. `COVERAGE.md` lists exactly which appearances have packed animation sets and which source sheets remain missing. Do not treat this as an all-team replacement. Completed artwork is included; missing artwork is not fabricated or delegated as if already drawn.

This pack expands the previously supplied roster appearances into drawn animation poses. Use it with the tournament/new-graphics handoff already supplied. It does not replace that package's event art, story content or named protagonists.

## Start here

Read `manifest.json`, then each character's `.clips.json`. Use the packed `sprites/` assets, not the unsliced source sheets. `animation_review.html` previews the packed clips without needing the game. Contact sheets and GIFs are also in `previews/`.

The pack targets the six established league kits plus four previously supplied unassigned visitor kit candidates. Appearance IDs match the v1 roster manifest: `_01` through `_08` are outfield, `_09` goalkeeper. Preserve existing game player IDs; bind appearance IDs to them. Never create additional lineup slots, reroll an appearance each match, or overwrite the selectable boy/girl protagonist, Sam or Blake with a generic player. Keep each team's established kits. Visitor IDs still require matching to actual repository tournament teams; do not invent club identities or confuse Next Horizon with Next Level.

## Frame conventions

All packed frames are 160x128 pixels, ground anchor (80,120), normalized origin (0.5,0.9375). Each atlas supplies PNG, lossless WebP and JSON. Keep upright billboards and the existing world projection/depth sorting. Atlas cell height is not body height; use the supplied `neutralBodyHeight` to size actual bodies consistently at the existing approximately 35–55px display height.

Outfield frame indices (zero based):

| Frames | Action |
|---|---|
| 0–3 | Run right, four poses |
| 4–7 | Run front/toward camera, four poses |
| 8–11 | Run back/away from camera, four poses |
| 12–14 | Pass right: preparation, contact, follow-through |
| 15–17 | Shoot right: preparation, contact, follow-through |
| 18–20 | Chip right: preparation, scoop/contact, follow-through |
| 21 | Front idle from the canonical roster design |
| 22 | Shoulder brace held pose |
| 23 | Slide held pose where enabled in the clip map |

Goalkeeper frame indices:

| Frames | Action |
|---|---|
| 0–5 | Run right |
| 6–11 | Run front |
| 12–17 | Run back |
| 18–19 | Ready |
| 20–21 | Catch/retract hands |
| 22–23 | Dive right, takeoff/extension |
| 24–25 | Additional dive source poses; excluded from runtime clips |
| 26–27 | Throw right, windup/release |
| 28–29 | Punt right, drop/kick |

Keeper dive-left uses the two right-dive frames mirrored, explicitly declared in the clip map. Outfield run/pass/shoot/chip/brace/slide left likewise use the corresponding right-facing frames mirrored. Honor `flipX` on the sprite; it is metadata for the caller, not a field Phaser automatically applies from animation JSON. Reset it on subsequent clips. Asymmetric sashes and trim also mirror with this existing rendering convention. Do not rotate or stretch a sprite to invent front/back kick views; this pack supplies side-view kicks plus front/back runs.

Blake's supplement is a separate 18-frame atlas: 0–5 run front, 6–11 run back, 12–17 chip right, with a mirrored chip-left mapping. Retain his previously supplied Next Horizon side run and other actions. Enable Next Horizon clothes only after the approved transfer event. These frames preserve his established blond identity.

## Connect animations to the engine

Load each atlas through the project's existing asset pipeline and allowlist, preserving frame names. Register clips using their explicit frame-name arrays, frame rates and repeat values. Namespace animation keys by appearance ID so teams cannot overwrite one another's animations. Load only teams needed for the current scene; avoid preloading every source image.

Choose front/back/side from projected screen movement, not world x alone: portrait swaps the pitch axes. Use the current camera's projected direction so turning the phone changes presentation without changing physics or restarting the match. Preserve animation progress where practical on resize.

Loop running/ready clips only. Play passes, shots, chips, catches, dives, throws and punts once and return to the engine's next state. Brace and slide are held key poses, not multi-frame cycles. Do not play the entire atlas as one animation. Respect `unusedFrames`; slide poses for Royal Salt 03 and Desert Tuzon 02/03 are excluded because their appearances drifted during generation.

The engine remains authoritative for ball release, pass power, chip height, shot trajectory, contact, possession, collisions and player movement. Do not let sprite animation callbacks fire an action twice. For visual synchronization, outfield contact is local clip index 1 in the three-frame kicks; keeper throw/punt release is local index 1; Blake chip contact is local index 3. These are visual alignment suggestions, not new gameplay event times. No soccer balls are baked into these sprites.

Named characters and the selected protagonist keep their existing canonical animation sets. These are match-kit additions; training uses the already established training assets until matching training-kit variants exist. Do not dress every training participant in the match kit solely because this pack was imported.

## Verify in the app

- Check nine distinct lineup appearances, unchanged kit colors, correct goalkeeper and persistent save/load mapping.
- Play every mapped clip on grass and a light background. Check hair/skin continuity, missing limbs, baseline jitter, mirrored directions, scale changes and transparency.
- Confirm player bodies remain readable at actual phone size. Source drawings are compact stylized keyframe cycles; tune playback to the engine's movement and actual review rather than promising smoothness from file count.
- Verify both protagonists and Blake's transfer timing. Generic roster IDs must never replace story identity IDs.
- Test portrait 390x844 and landscape 844x390, including mid-play rotation, plus 320x568 and 568x320. Preserve score, possession, time, controls and pitch geometry.
- Test catch/dive/throw/punt ownership transitions and ensure no duplicate ball or duplicate action event appears.
- Report checks actually run, remaining visual issues and whether testing was browser emulation or real iPhone.

## Delivery status

See `VALIDATION.json` for measured asset counts and packaging checks. The art is drawn and packed; this workspace has not integrated it into the live game or tested it on an iPhone. Original generated sources and exact generation job descriptions are included for traceability. The built-in image generator created the artwork; packing only extracts sprites, removes low-alpha fringe, normalizes scale and creates atlas/clip files. It does not fabricate running motion by shifting or rotating a standing image.
