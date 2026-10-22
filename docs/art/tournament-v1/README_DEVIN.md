# SoccerMaster Retro — tournament artwork

Includes the requested items 1, 2, 3, 4, 7, 8 and provisional artwork for item 10. This is source art plus source-space extraction maps, not an integrated game patch.

## Included

- AZ Showcase, Holiday Classic and Arizona State Cup: one character-free arrival background each and one six-object transparent source sheet each (logo, field board, pennant, trophy, medal, blank title ribbon).
- Shared results UI: six separate illustrated components on one transparent sheet. Title, two four-team group panels, match card, outcome panel and Continue button. No fixed scores, names or player portraits.
- Eight full-body held reaction poses each for selected boy, selected girl, Sam and Coach Code. Top row positive reactions; bottom row disappointed, frustrated, reflective and supportive. Do not play these eight unrelated states as one looping animation.
- Blake: six Next Horizon cutscene portraits plus a 24-pose gameplay source sheet. Purple and silver gear, same sandy-haired identity.
- Visiting kits: four UNASSIGNED uniform candidates, each with outfield and goalkeeper design. These are eight neutral-pose design sources, NOT complete team animation sheets and NOT four newly approved roster identities. Check actual visitor IDs and existing assets before assigning or expanding them. No Next Level assets are included; item 9 was not requested.

## Import and scene rules

Read ASSET_MAP.json for image dimensions and source-space regions. Preserve source PNGs. Export appropriately cropped sprites/components through the existing pipeline; normalize gameplay frames to the project's 160x128 cells with anchor (80,120) and consistent body scale where applicable. Source sheet cells are NOT already those runtime dimensions. Crop/timing and mirrored direction behavior require visual playback review. Blake's running poses are stylized, and no front/back running cycle or dedicated chip cycle is supplied; retain compatible existing directional/action fallbacks until additional frames are authored. Never claim a held pose is a smooth animation.

For cutscenes, select only the saved protagonist and use existing identity IDs. Mom, Riley, season-review screen and park ending are outside this selected batch. Keep generated match clothes aligned with the approved club wardrobe; do not silently update every roster athlete.

Blake's Next Horizon clothes become eligible only after his actual Week 8 post-match transfer. They must not change his membership earlier or substitute Next Level for Next Horizon. Keep his original FC Batavia assets available for earlier weeks.

Arrival scenes are landscape cutscene backgrounds, not new live match fields. Preserve aspect ratio. On portrait phones, prefer an image above dialogue/controls or deliberate framing; do not stretch or blindly crop away gateway/signs. People, names, phase labels, event data and result decorations are separate. Add the event logo/sign art to each blank gateway where useful. Reuse existing gameplay venues.

State Cup uses the same identity/background with live SEMIFINAL or FINAL labels; these are phases, not different fixed outcomes. Show the cup/medal with a player only when earned according to actual results. Holiday decoration does not authorize a change in date, weather or match schedule. Entrance lighting is an illustration, not a new match-time rule.

## Results screen layout and data

Use extracted panels independently. Portrait: title, Group A, Group B, match/result summary and Continue in a readable scrollable stack; landscape: groups side by side with summary and controls below. Use the match-result card for knockout fixtures. For State Cup hide group panels and repeat match cards to show two semifinals and the final as appropriate. Keep interaction and layout in code. Header text, team names/badges, point totals, fixture scores, placement, advancement/elimination status and button labels come from current game data.

AZ Showcase/Holiday Classic: groups of four and three group matches; group winners reach the final. Reuse the approved 10-point scoring implementation; tournament points never become league points. Hide or show states from real eligibility/results. Do not award rewards from a displayed graphic or grant an automatic win. For long names, reflow/wrap; never reduce all text to unreadable size. Render live text at appropriate resolution and retain safe areas and touch target sizes.

## Visitor candidates

Candidate 1: emerald/cream; keeper coral/black. Candidate 2: yellow/black; keeper magenta/navy. Candidate 3: white/burgundy; keeper turquoise/black. Candidate 4: charcoal/mint; keeper red/navy. These are design proposals, not verified missing kits. Their bodies are placeholders for uniform presentation, not new named cast. Keep a canonical existing club design if one is present. Check team/keeper/official color clashes and assign an approved alternate only where necessary. Remaining work for accepted candidates is animation expansion and actual roster binding.

## Verification

Check the image index, extracted edges and consistent anchors before import. Inspect alpha on light and dark backgrounds. Validate both protagonists, all eight reactions, Blake's transfer timing and visitor mapping. Test results with long names, pending results, eliminated/nonqualified and winning paths. Rotate 390x844 to 844x390 without lost state; also inspect smaller viewports. Confirm no extra baked characters, duplicate goals/trophies or hardcoded results. Report emulator checks separately from real iPhone checks. This package itself has not been tested in SoccerMaster Retro.

Source-art generation used the built-in image generator; prompt set is included. Original pixels are preserved, with no claimed runtime atlas normalization or deployment.
