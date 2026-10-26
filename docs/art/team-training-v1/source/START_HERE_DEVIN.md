# Team-training art handoff

Includes two selectable protagonist sheets with gold highlight, seven individual orange teammate sheets, eight individual green-pinnie opponent sheets, two goalkeeper key-pose strips and the latest two roster reference sheets. Earlier blue/purple kits and rejected crowded movement sheets are excluded. This package covers the recent TEAM-training artwork; home juggling and cutscene portraits are separate packages.

Use one protagonist option + seven teammates + home goalkeeper against eight opponents + opposition goalkeeper: exactly18players. Boy/girl are alternatives for one slot, not two simultaneous players. Home goalkeeper is teal; opposition goalkeeper pink. The home roster reference shows both protagonist options for comparison and therefore has ten columns; do not spawn all ten.

## Individual outfield sheets

Each of the17individual sheets contains24pose cells in six columns/four rows. Intended rows: running, ground pass, receive/first touch, defensive shuffle. Inspect source bounds rather than assuming perfectly aligned generated grids. Preserve consistent body scale and foot anchors when extracting. No runtime atlases or verified animation timelines are supplied.

The new images provide action candidates, not verified coaching animations. Several run frames are similar, some pass/receive feet are raised, and support-foot alignment varies. Check and correct actual frame order, contact height, anatomical foot and ground offset before using them as instructional demonstrations. Keep ball art separate and synchronize its contact events. Missing rear/front movement views are not supplied by these right-facing/three-quarter sheets.

## Goalkeepers

The two strips are mechanical crops of the final column of the supplied roster sources. They contain the existing four key poses only; some source-edge poses have tight/clipped margins. They are included to preserve the keeper artwork already made, NOT as complete keeper animation sheets. Dedicated save, dive, catch, recovery, throw and punt cycles still need drawing. Do not claim these are included or reconstruct movement by bouncing a standing pose.

## Protagonist highlight

Keep a subtle gold outline visible on the saved protagonist in all training states: ready, movement, pass, receive, defense, decision pause and feedback. Tie it to saved protagonist identity, never possession. The protagonist sheets already contain outline art: do not add a thick duplicate glow. If the outline is unreadable at phone scale, use one consistent runtime contour treatment, approximately1–2CSSpx, and preserve clean transparency. Other players get no gold outline. Render depth/occlusion normally; highlighting does not mean drawing through players or UI.

## Sizing and tactical view

Target visible body height1.2075×the ORIGINAL training baseline. If1.15×is already applied, add only1.05×. Do not compound on every load or resize. Asset pixel dimensions do not prove the on-screen increase is installed. Preserve proportions and feet anchors, nearest-neighbor sampling and full-half-field bird's-eye camera. The requested18participants must remain readable in portrait and landscape.

## Session behavior

These assets are for the existing tactical sessions: Coach Code setup, player decision, scripted demonstration and specific feedback. Do not turn team-training weeks into free-play matches. Retain current scenario placements and role identities; adapt graphics without reducing the roster to two or three central players.

## Verification

Check roster counts, both protagonist options, outline persistence across possession changes, team colors, clean alpha, frame clipping, ball synchronization, support-foot alignment and phone rotation. Test real-device rendering separately. PNG dimensions and alpha presence and ZIP integrity were checked during packaging; live integration, animation playback and real-device tests were not performed. Return a list of unresolved frame defects and missing keeper cycles.
