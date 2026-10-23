# Mom portrait replacement v2

This is the approved replacement for OLD standalone Mom dialogue/pop-up art. It does not replace painted cutscene backgrounds, gameplay actors or sideline sprites. No app code has been modified by this package.

## Assets

- `sheets/mom_casual.png`: teal overshirt and ivory shirt; default everyday outfit.
- `sheets/mom_dressy.png`: fitted burgundy wrap blouse; dressier occasions only.
- `portraits/`: 12 separate 512 x 512 PNG cells mechanically extracted from the approved sheets, without redrawing.
- `manifest.json`: explicit filenames and source rectangles. Both source sheets are 1536 x 1024, 3 columns by 2 rows.

Expressions in left-to-right, top-to-bottom order: neutral, laughing, worried, firm, reassuring, proud. These are held portraits, not animation frames. Preserve source alpha; do not add a matte background. Individual cells retain source placement and are not automatically normalized by eye position. Check final layout before shipping.

The Mom driving the approved departure scene is the visual identity reference. These newly approved sheets replace the older painterly/realistic standalone portrait. Preserve her face, auburn waves, age and pixel-art rendering. Do not generate substitutes, recolor outfits or mix old and new Mom faces.

## Replace active Mom mappings

Find the actual Mom portrait keys, loader/atlas entries, dialogue mappings, default portraits, preloads and fallbacks in the repository. Map them to the new set. Keep old art recoverable in version history, but remove it from active selection and fallback paths. Rebuild atlases/allowlists and invalidate stale asset caches using the project's existing strategy. Do not assume these filenames match current runtime keys; report the mapping made.

Use casual/neutral as the ordinary fallback only when a standalone Mom portrait is appropriate. Keep outfit stable throughout a scene. Select dressy only for an explicitly dressed-up scene; do not change wardrobe based on emotion. Select expression per authored dialogue beat. Do not alter dialogue, choices, rewards, branching, or saved progression.

## Stop duplicate characters in every cutscene

Introduce explicit scene/background metadata (adapt to existing schema), such as `embeddedCharacters: ['mom', 'player']` for a car plate that already includes Mom and the selected protagonist. Metadata must correspond to the actual selected boy/girl background variant. It is not inferred from speaker text or a filename.

For each beat, clear stale portrait state, resolve current scene, selected background, current speaker and presentation mode, then decide whether to draw a standalone portrait. If the character is already painted into the selected background, suppress their separate portrait. Keep dialogue and speaker name working. Other characters may appear only when explicitly required by the scene. Do not disable Mom portraits globally.

On narration and player-choice screens, clear speaker portraits by default. Retain one only if explicitly authored, and still apply the embedded-character suppression. Do not leave the previous speaker visible simply because no new portrait key was supplied.

Apply this to ALL characters, not just Mom. Centralize the decision so dialogue advance, choices, skip, scene exit/re-entry, branching, restart and save/load all obey the same rule. Destroy or hide old portrait objects and cancel pending portrait loads/tweens on scene changes so late callbacks cannot bring them back. Re-evaluate on resize without resetting story progress.

Do not erase Mom from the painted car scene. Do not overlay a second Mom to change her expression there. A future animated version would need a clean background without the baked-in character; that is outside this replacement.

## Acceptance checks

1. Boy and girl departure/arrival backgrounds: Mom and player appear only once; all dialogue and choices work.
2. Empty-background Mom conversations: exactly one new Mom portrait, correct expression and outfit.
3. Player-choice/narration beats: no stale portrait unless explicitly requested and eligible.
4. Sam, Blake, Code, Riley and other embedded cast: same suppression rule.
5. Advance, skip, branch, restart, save/load and rapid scene transitions: no stale or duplicate actors.
6. Portrait and landscape phone layouts: no distorted art, clipped faces, opaque backplates or portraits obscuring choices. Preserve aspect ratio and existing safe-area handling.
7. Both outfits and all 12 expressions load. No older realistic Mom appears through a fallback or cached asset.

Provide before/after screenshots, affected scenes, actual old-to-new asset mappings, and test results. State whether real-device testing was performed. The package has not been tested in the live app.
