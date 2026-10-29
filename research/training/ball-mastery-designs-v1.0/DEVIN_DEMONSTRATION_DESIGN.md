# Devin — demonstration design handoff

This is an additive design pack for the 14 drafted Ball Mastery lessons in research expansion v2. It does not update the catalog’s approval, media or publication fields. Keep the other 69 candidates blocked. Do not replace the existing training library or reward rules.

## Screen direction

Keep the two Home Training cards: Juggling and Ball Mastery. Open a Ball Mastery lesson into one large demonstration stage, one short Coach Code cue and controls for Play/Pause, Step, 0.5x and Right/Left. Place Log practice below the demonstration; a view or click is not proof of successful execution.

Use the cream background, navy panels, orange focus accents and blue navigation from SoccerMaster. The delivered boards are technical schematics, not replacement character art. In production use the saved boy/girl protagonist and approved training appearance; preserve the subtle identity-bound outline without adding a duplicate outline. Do not reuse gameplay sprite scaling or manufacture a new character.

Camera: three-quarter front full-body demonstration with a larger foot/ball inset. Solo Ball Mastery does not need Team Training’s half-field camera or 18 players. Keep body orientation visible during turns; an overhead ball path alone cannot teach support-foot action.

## Motion implementation

Read designs.json. Its coordinates describe illustrative ball routes; never use them directly as world-space physics or human joint positions. The four phases are teaching beats, not a four-frame animation atlas. Proposed 900 ms holds are UI pauses only, not real execution speeds.

Use a separate ball object and authored contact events. Distinguish sole-hold, sole-roll, inside impulse, outside impulse and no-contact fake. Do not move the ball merely because a player animation frame advances. A sole roll is continuous contact; an inside/outside touch has a contact event followed by free movement. The contact point, support foot, body turn and exit must be authored for each skill.

Right/left switching changes foot identities, ball routes, body turns and spoken cues together. Never flip readable labels or protagonist identity. Alternating exercises change the starting side, not the need to practise both feet. A reversed video is not automatically a mechanically valid mirrored demonstration.

## Required delivery per lesson

- Approved mechanics reference and coach-reviewed pose/contact sequence.
- Original or licensed normal-speed loop; left-led and right-led versions checked separately.
- Pausable slow view, four labelled review stills and a phone-readable contact inset.
- Separate ball track, contact frames and support-foot/body-orientation notes.
- Correct source attribution and unresolved questions explicitly closed by reviewer.
- Media ID, version, digest and rights record for the v2 release gate.

The 28 SVG storyboards and 14 PNG right-led previews are review aids, not accepted media. Do not set media QA or coach approval from their existence. Record approval only after the actual demonstration is reviewed.

## Test checklist

Check ball/foot contact, support-foot clearance, no ball teleport, continuous sole rolls, correct right/left labels, body rotation on turns, protagonist consistency, pause and reduced-motion behavior, portrait/landscape layout and unobscured foot detail. Test every draft remains blocked from player assignment without trusted approvals. Do not score a player for watching an animation.
