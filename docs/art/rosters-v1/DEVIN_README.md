# Soccer Master Retro — diverse roster art v1

10 source PNG sheets, nine player designs per sheet: eight outfield and one goalkeeper. Six league clubs plus four unassigned visitor kit candidates. These are FRONT READY-POSE IDENTITY REFERENCES, not complete gameplay animation atlases. No app code has been changed or tested.

## Preserve the cast and kits

Retain established club kit patterns and goalkeeper colors. The new sheets diversify skin tones, faces and hair rather than changing uniforms. Some visual archetypes recur across clubs; each club has nine different designs within its sheet.

Use existing roster player IDs and bind each generic player to a stable appearance ID. Never randomly change appearance every spawn, frame, match, rotation or load. Preserve boy/girl protagonist choice, Sam, Blake and any other named characters using their canonical assets. Their slots REPLACE generic designs in the nine-player lineup; do not add extra players. Blake retains his approved identity when transferring to Next Horizon. Next Level is a different club and is not assigned a visitor kit by this pack.

The visitor designs remain candidates 1–4, corresponding to the earlier visitor kit sheet columns. Resolve actual tournament roster IDs in the repository before assigning them. Do not invent club names. Sheet coordinates are zero-based row/column in reading order; these are design identifiers, not positions or jersey numbers.

## Animation production still required

Carry each chosen face, skin tone and hairstyle through ALL relevant run directions, idle, pass, shot, chip, slide, shoulder/push, reaction and goalkeeper frames supported by the app. A ready-pose PNG must not substitute for an entire animation. Do not simply tint an entire sprite or paste a static front-facing head onto moving bodies. Preserve facial identity and hair silhouette through turns; match exposed arms and legs to the face. Use the original club sheets for pose and kit reference.

Normalize completed frames to the existing 160x128 cell, ground anchor (80,120), approximately 100px standing body height; keep upright billboards in both orientations. Inspect generated source edges and transparency before slicing, because visible colored fringe or translucent halo may need cleanup. Source sheets have variable dimensions and spacing; do not load them as uniform 160x128 sprite sheets. Pack only validated animation frames into the existing JSON/WebP pipeline and allowlist.

Keep training appearances tied to the same player IDs, switching only wardrobe to established training kits. Do not change attributes, speed, role, collision size or gameplay difficulty based on appearance. Existing save games need deterministic appearance defaults without resetting progress.

## Acceptance checks in the game

- Nine actors have distinct appearances in each lineup; no accidental duplicate appearance IDs. Canonical characters remain recognizable.
- Skin and hair stay consistent across every action, training, save/load and orientation change.
- Kit patterns, stripes and sash direction remain consistent; keeper clearly differs from outfield.
- Verify face and hair readability at actual 35–55px player height, no cropped ponytails, feet sliding or transparent halos.
- Test 390x844 and 844x390 mid-match rotation, plus 320x568 and 568x320. Do not reset match state or change physics.
- Report missing animation frames explicitly; retain existing working assets until replacements pass review.

## Included generation notes

Created with the built-in image-generation tool using original club art as kit/style references. The manifest stores the common prompt and team kit descriptions. All source PNGs are retained unmodified; this handoff supplies visual identity designs, not a claim of runtime readiness.
