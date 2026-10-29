# Implement the four venues

Work in codyengilman-max/SoccerMaster-Retro. Inspect repository instructions and the current branch before editing. User-supplied measurements came from devin/1792603406-season1-structure at b0fd97f, in Chromium phone emulation; verify them against current code. Implement all four venues, using Pinnacle Park as the first integration checkpoint. Follow the established release workflow and report any access gates accurately.

## Preserve the existing match

World coordinates are yards: pitch x=0…75, y=0…50. Penalty area 14×36, goal area 5×18, goal width 7 and depth 2, centre-circle radius 8, penalty spot 10 from goal line, corner radius 1. Keep authoritative geometry in U11_9V9_PITCH. Continue code-drawn stripes (15), markings and goals. No lines are painted into supplied grass art. Preserve physics, AI, controls, competition rules, protagonist choice, saves and match state. Use the latest approved controls; historical BLOCK screenshots do not override subsequent chip/shoulder-charge/goalkeeper-distribution work.

## Prepared art supplied

The assets folder already contains extracted props and six packed character animation atlases. Use these first; the original-art preparation notes below describe their source and target conventions. Clapping, pointing/calling, walking, cheering, disappointed and filming cycles are now supplied according to each character's clips JSON. Do not repeat extraction unless an in-game visual issue is found. Inspect the supplied previews and adapt clip playback speed to game events.

Retain original PNGs unchanged. Extract each tent, sign, bench, prop and person from its actual image bounds. Inspect alpha on white, black and grass backgrounds; remove stray pixels/fringes if needed. Preserve shape and use consistent visual scale. Source art has not been validated as exact production cells or seamless tiles.

Character target: 160×128 transparent cells, feet at (80,120), approx. 100px body height. A complete 6×4 sheet would be 960×512. Normalize each extracted pose individually; never shrink an entire scenery sheet into this size. Tent target 320×320, base bottom centre, nominal width 3.3 yards. Props target 128×128; record actual ground anchor. Long benches may need a wider atlas frame to preserve aspect ratio; document the exception. Convert prepared art to the existing WebP/JSON atlas pipeline and allowlist. Map world width/height explicitly; canvas dimensions do not imply physical dimensions.

Coach Code is the same person across venues. Use one approved canonical sprite identity and existing compatible animation set rather than treating the four sheet interpretations as four different coaches. Likewise keep Mom's established identity consistent. Opposing-coach visuals should follow the actual opponent, not arbitrarily change with the venue. Tents may be selected by team; neutral venue defaults are supplied.

## Grass rendering

Each grass PNG is a full rectangular material source for the 75×50-yard pitch, not a screen-sized background or a verified repeating tile. Map UVs continuously across the world pitch and clip exactly to its boundary. Existing flat-color quads do not automatically support these textures. Add a textured mesh or suitable existing renderer primitive and project its vertices through the same layout mapping as the field. Subdivide enough that texture projection agrees with the existing nonlinear perspective; a single unwarped screen rectangle is insufficient. Keep code-drawn stripes translucent enough that they do not hide the texture. Draw markings above grass and below actors.

Use one full-field mapping initially. Do not repeat the image without testing edge continuity. If you derive 256×256 repeating tiles (4×4 yards), validate their seams. Use filtering/mipmaps appropriate to the renderer and check for shimmer at phone resolution. Keep flat-color fallback available if loading/rendering fails. Use flat-color world quads for run-off/path/gravel initially; optional textured surrounds require the same projection work.

## Projection, sprites and camera

Baseline: Phaser 3.90 AUTO/WebGL, RESIZE, canvas at 1×CSS pixels inside safe-area insets. Landscape maps pitch length left-to-right with crossScale=scale×0.5. Portrait maps length bottom-to-top with equal axis scale. Both have ball-relative perspective. Use current layout helpers and depthScaleAt rather than reimplementing a divergent transform. Upright people and props remain camera-facing; do not rotate the PNG with world axes. Depth-sort by projected ground contact, consistent with existing setDepth(100+y). Shadows are separate. Large tents can occlude actors; handle their layering deliberately.

Baseline camera shows 32 yards along in landscape and 22 yards across in portrait. Camera modes possession/travel/loose/hold and 2.5-yard attack look-ahead should continue. Expand the scenery envelope to roughly y=-7…57 and preserve goal-end runoff, but distinguish world visibility from camera-centre limits. Wider limits alone do not expose spectators during midfield play. Prioritize ball and passing options during live play. Show sidelines naturally near touchlines and use a wider establishing view before kickoff; no forced live-play cuts just to display scenery.

Layouts in venue-layouts.json are proposals. Resolve full object footprints, player visibility and camera occlusion in the actual renderer. Keep people off the playing surface and behind-goal areas clear. Paths and scenery must not introduce football collisions or alter rules boundaries.

## Animation integration

Use assets/characters/*.clips.json as the authoritative supplied coverage. Coach Code has clap, point, walk and cheer; opposing coach has clap, call, walk and disappointed; Mom and the cheering parent have idle, clap, cheer and disappointed; filming parent adds film; seated parent has seated idle/clap and standing cheer/disappointed. Idle fallback for coaches is a static neutral frame. These are stylized six-frame cycles, not motion-captured or in-game-tested animation. Keep seated parent seated for live reactions: standing clips need a separate chair and explicit transition to avoid chair popping. Point/call are the tactical instruction actions. Do not promise unsupported directional walking; front-facing walking is supplied.

Drive reactions from authoritative events (goal, save, miss, foul, full-time). Home and away groups react differently. Stagger starts and add cooldowns; avoid synchronized perpetual cheering. Ensure replayed events and scene resume cannot duplicate effects. Cosmetic randomness must not consume the simulation random stream. Pacing stays within technical areas. Disable unnecessary offscreen animation work.

## Rotation and mobile checks

Recalculate projection, camera clamps, sprite scales, shadow positions, depth and input bounds on resize without recreating the match. Keep score, possession, clock, player/ball coordinates and training/save identity intact. Check pointer release/cancellation during rotation so movement/actions do not stick.

Baseline measured: portrait 390×844 at 17px/yard, player ~35.7px; landscape 844×390 at 26.4px/yard along and 13.2 across, player ~55.4px. These are observations, not fixed constants. HUD, minimap and lower-corner controls obscure scenery: do not solve this by putting parents on the pitch. Test 390×844, 844×390, 320×568, 568×320 and 1280×720, plus real iPhone Safari when available. Account for browser bars and actual safe areas. Distinguish physical-device tests from emulation.

## Completion and deployment

Run relevant repository tests/typecheck/build. Verify all four venue IDs load correct art, both protagonist variants work, and field markings/ball/players remain aligned while scrolling and rotating. Exercise both touchlines, both goals and central play, including airborne ball and goalkeeper distribution. Verify frame time, atlas loading, no console/asset errors, no excessive texture shimmer, and character visibility at small display size.

Deliver a working preview, portrait and landscape evidence, animation coverage matrix, changed-file list, test results and known gaps. Then follow the project's normal GitHub/Cloudflare deployment workflow, respecting protected branches and access gates. Verify deployed commit and asset responses. Provide live URL if deployed and asset-specific rollback instructions. Do not claim source artwork alone is a finished venue or that physical iPhone testing occurred if only emulation was available.
