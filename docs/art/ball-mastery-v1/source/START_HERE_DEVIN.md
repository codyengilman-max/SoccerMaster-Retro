# SoccerMaster Ball Mastery art integration

Owner handoff — October 29, 2026. Additive integration, not a rebuild.

## Package status

Contains latest boy and girl 12-pose contact-study sheets and one combined boots/ball sheet. These are generated SOURCE DRAFTS, not tested animation atlases, complete lesson sequences, or coach-approved demonstrations. Brown backgrounds remain in character sheets. Boots have repeated directions and inconsistent perspective. Do not deploy them unchanged or claim they are transparent based on their names.

## Implement in the existing project

1. Inspect repository instructions, current training UI, approved protagonist assets, lesson IDs, saves and progression before editing. Work on a separate branch. Preserve originals, save history, approvals and unrelated gameplay.
2. Add these files under a new training-only source-art directory. Keep existing gameplay sprites, camera, physics, story and tactical library unchanged. Preserve selected boy/girl identity, face, hairstyle, orange kit, blue boots and existing training scale; do not apply another size multiplier. Avoid doubling the protagonist outline.
3. Produce clean transparent derivatives, remove background/glow without erasing hair or clothing, verify alpha on light and dark backgrounds. Inspect actual bounds before slicing; record rectangles, foot anchors, scale and orientation. Normalize anchors without distorting proportions. Correct repeated/incorrect boot directions and anatomical left/right contact surfaces. Keep the ball separate. If accurate corrections are not possible, list the exact frames and request replacement art; never substitute unrelated running frames.
4. These 12 poses are contact studies, NOT chronological move rows. Do not play rows as finished animations. Author each supported lesson from its actual reviewed library mechanics: preparation, supporting-foot position, working-foot contact, weight transfer, ball path, recovery. Keep hook and Cruyff turns distinct. No name-only equivalence, invented mechanics or automatic approval transfer. Research Expansion v2 and Demonstration Designs are separate prerequisite/reference packages, not included here.
5. Use one timeline for full player, foot inset, separate ball and caption. Synchronize ball direction changes to contact. Slow motion changes time only. Foot selector refers to anatomical left/right and must switch the whole reviewed sequence. Ball panel rotation should agree with travel. Allow enlarged inset, replay, manual step, pause and reduced motion.
6. Weekly training board: exactly two primary activity sections, Juggling and Ball Mastery. Remove Team Training and Home Focus/choose-a-focus options and obsolete board copy. Move optional home-practice logging into the relevant section; keep Progress secondary. Remove retired board-task requirements without fabricating completion, granting rewards, deleting history or removing unrelated tactical features. Preserve remaining completion/reward policies; report any conflict rather than inventing a new policy.
7. Open each approved move directly into one teaching page with demo and enlarged-foot inset, short Coach Code cue, three clear steps, one common mistake and correction, and practice logging. Expand extra tips in place. No intermediate technical report, Open Lesson step, or ambiguous More text pagination. Retain evidence/review notes in coach/developer views; hiding them must not bypass publication gates.
8. Explain what to do with the working foot, supporting foot, body and ball in child-friendly language derived from the approved lesson. Separate watching, self-reported practice and verified mastery. Do not add attribute rewards or make self-reports certify mastery.

## Required acceptance checks

- Both protagonists, both-foot variants, normal/slow/manual-step playback; no clipped limbs, floating support feet, false contact or inset disagreement.
- Portrait/landscape and physical iPhone readability where available; clearly label emulation separately.
- Existing and new saves, partially complete weeks, week rollover, reopen/resume and repeated log submissions; no duplicated credit or blocked progression from retired tasks.
- Existing approved lessons remain available; draft lessons cannot be exposed through direct links or alternate menus.
- Deliver preview, changed-file list, preserved/added/replaced inventory, tests and unresolved frame defects. Complete one existing approved lesson as a reviewable vertical slice before rolling out other lessons.

Do not mark the work complete based only on importing PNGs. Owner review of rendered movement and existing release checks remain required before player release.
