# Integration guide for Devin

## Current stack and safe scope
Inspect the real repository before choosing paths. Historical chat says Phaser/TypeScript/Vite on Cloudflare Pages; this handoff has not inspected that repo's current HEAD. Retain its architecture. No Unity, server renderer or runtime generative model is needed for these assets. Store static images in the project's existing asset pipeline; no hotlinking to the private preview or third-party hosts.

Read SOURCE_PRECEDENCE.md first. Use character-continuity.json and scene-visual-map.json; reconcile the exact current scene IDs, then import.

## Stage A — import and map
Create an asset inventory from actual story scripts and renderer callers. Map canonical playerId/characterId/teamId/locationId to this pack's cosmetic IDs. The v0.7 cast is player, Alex, Sam, Jordan, Blake (working name), Riley (working name), Coach Code, caregiver and clownfish. Do not rename Alex to the protagonist. Jordan is a school friend, not automatically a teammate. Do not assign Blake/Riley a real club just from this art. In v0.7 the club world uses fictionalized names; preserve the current approved definitions, rather than importing historical names from this preview.

Every reachable scene should resolve an explicit background and outfit. The included map covers documented contexts, not a verified enumeration of the current game. Compare every actual scene and report unmapped entries. New/unknown NPCs require identity art rather than reusing another named character. For a missing noncritical art asset show an honest placeholder in the review build; never silently change identity or commit story effects on image load.

Store a visual-approval record that distinguishes STYLE_APPROVED, REFERENCE_APPROVED and NEW_ART_REVIEW_PENDING. Review pending art may be loaded in the review gallery and integration preview; it is not a claim of owner acceptance. Do not stall supported import/rendering work while producing the gap list.

## Stage B — gameplay rendering adapter
Read the existing animation clock, world coordinate conventions, character origin, asset loading and input transforms. Use `code/sprite-factory.mjs` to reproduce the reference or use its browser atlas exporter to bake one appearance. Integrate only renderer functions and art; the preview's 16-second scripted movement/ball sequence is not the soccer simulation.

Maintain simulation position and foot contact. Larger display art must not enlarge the body collider, touch-select targets, tackle reach or shot direction. Draw decorative hair outside the collider. Use the latest approved controls SOW: left joystick and fixed PASS, SHOOT, SLIDE TACKLE, BLOCK. No sprint or reintroduced feint/advanced-gesture system. Graphics must not revert the newer input path. Preserve pointer ownership, charge/release, cancellation and generation checks; if that controls work is pending, report the dependency instead of implementing a second controls system in the graphics task. If a visual enlargement needs an input-layout correction, document and test that exact correction; do not tune passing physics as part of an art change.

Use actual heading for frame selection and existing velocity/possession for animation, not t%16. No dedicated Block pose is supplied: expose this art gap and keep the real Block action operational with an explicitly labeled temporary visual only if the existing implementation already supports one. Mirror only where asymmetry is acceptable. Connect supplied idle/run/kick/slide/dive poses only to corresponding existing states; don't create unimplemented actions just to show a pose. Use current roster numbers and team palettes; the preview's repeating 10/6/1 numbers and BAT/RSA scoreboard are examples.

Persist cosmetic identity separately from stats. Apply a bounded current-roster texture cache, never eagerly generate the full cartesian product. Keep pixel filtering appropriate to the art without globally changing text/UI smoothing. Measure on target screens before changing atlas resolution.

## Stage C — cutscenes
Use existing scene renderer if one exists; add the smallest adapter. Portraits are transparent PNGs. Load only active and next needed portraits/backgrounds. Keep source masters unmodified; generate optimizations to a separate folder and compare against masters over light and dark backgrounds for edge halos. Preserve alpha when converting.

Use foreground/background layers, anchor portraits consistently and reserve dialogue-safe space. Fit with contain; do not clip heads to fill the scene. Keep names/dialogue as text APIs, never interpolate HTML or use names as file paths. Asset paths must come from a build-time allowlist. Use canonical story name validation; preview maxLength is not a replacement for the v0.7 identity contract.

Continue/fast-forward must stop at choices and activity handoffs. Cancel held touches when entering/leaving, require fresh input after a mode boundary, and prevent double-advance. Suspend game input behind the cutscene. Existing atomic story effect service remains sole writer. Replay/history is read-only. Sprite loads, tween completion and resize must never award points or change relationships.

No sprite swapping by mood may change match accuracy, pace, control responsiveness, rankings, selection or growth. This is an art revision only.

## Stage D — verification and delivery
Inspect source in `tests` before executing. Package checks validate file paths and renderer contracts; they do not test production Phaser behavior. Run relevant repository suites without hiding failures. Use a browser to record the actual integrated app, log the exact commit, show start/match/cutscene/back-to-match, and verify deployed build identity. Do not infer production acceptance from this file or the style approval. Keep the existing Cloudflare project and valid build setup (historically npm run build / dist / repo root). Discover current values rather than blindly rewriting config. Never solve a failing build by disabling tests or deleting save data.

Do not mix this graphics task with merging every unrelated PR. Follow the owner's current deployment authorization and existing branch protections. A verified preview plus a separately listed physical-iPhone check is an honest outcome if production access is missing.

## Review-only art and defaults
Do not use the bedroom trophy as earned achievement evidence or force sunset into morning. Do not alias a missing corridor to an indoor scene. Respect the explicit art flags and report required variants. No generic NPC sprite, hardcoded shirt number or unbound club palette silently satisfies character continuity.
