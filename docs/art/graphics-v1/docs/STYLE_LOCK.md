# Visual contract — two approved looks

## Approval and authority
Owner statements: “The cut scenes art is perfect. Lock this in” and “Lock in game play look as well.” Date: 2026-10-15, America/Phoenix.
Reference source commit: 1a927dd3d78d14413eaff3655d636a880fd043a8 (standalone Sprite Lab, not SoccerMaster-Retro main).
Reference URL: https://soccermaster-sprite-lab.codeman1313.chatgpt.site
The package preserves approved original PNG bytes and gameplay drawing geometry. Revision 1.1 corrects demo dialogue and instructional labels to match the current story. Approval concerns visual direction, not physical iPhone performance, finished gameplay or unreviewed later art.

## Gameplay
Oversized readable 2D players, taller proportions, shaded uniforms and clear arms/legs. Strong hair silhouettes: short, curly, Afro, mohawk, long, ponytail, shaggy. Five reference colors: black #211d25; dark brown #65402c; auburn #b04d2f; golden blonde #e6b94f; light blonde #f6df99. Hair is persistent identity, never random every match. Additional natural skin tones/roster customization must follow existing appearance data. Hair shape/color do not grant abilities.
The original visual study uses 64x64 source canvases with foot anchor (32,52). Demo display size is 96x105.6: 1.5x width and 1.65x height. These are reference coordinate values, not a universal Phaser scale. Match apparent proportions at the current game camera; keep physics separate. No forced camera zoom change as part of this package. The packaged factory/atlas adds 16 transparent pixels per side to prevent rotating poses being clipped: padded frame 96x96, foot anchor (48,68), display 144x158.4. The visible body remains the same size.
Team identity also uses kits, shirt numbers and a selected-player ring; color alone is insufficient. The larger hair must not hide the ball or change tackle ranges. Original frames are simplified procedural drawings, not a full eight-view hand-animated atlas.

## Cutscenes
Original flat 2D pixel-art portraits and warm Scottsdale backgrounds. Visible clean square pixel clusters, simple cel shading, dark contours, expressive faces and 1980s-inspired clothes. Preserve the approved rendering rather than adding smooth 3D shading, painterly texture or photorealistic faces.
Main character: player-created name; boy with dark shaggy hair or girl with light-blonde ponytail; both approved Caucasian appearance. Keep their identities consistent across art scales. Names remain live text. Identity choice never changes access, romance assumptions, skill or difficulty.
Four approved portrait references: boy.png, girl.png, jordan.png, blake.png. Approved location reference: school.png. Additional character designs are draft extensions with the same visual technique. Do not claim the owner accepted every new image.

## Wardrobe continuity
Use explicit wardrobe IDs from the scene record; never derive clothing from display name, emotion, match win/loss, frame count or RNG. School arrival, courtyard, crossbar and schoolyard games share SCHOOL_CASUAL. Home/desk/aquarium/individual home practice share HOME_CASUAL. Team training uses TRAINING_KIT. Match arrival, touchline and post-match use MATCH_KIT until an authored changing-clothes boundary. Coach uses CLUB_TRACKSUIT; caregiver HOME_CASUAL; clownfish NONE.
Outfits change at defined scene boundaries, not in the middle of a conversation. A replay uses the recorded outfit revision. Protagonist school navy jacket/orange shirt; home orange ringer tee; training navy/orange jersey; match orange/cream jersey. NPCs retain their individual school palettes. Kit palettes in this pack are demo design groups, not declarations of official club affiliation or licensed uniforms. Map to approved current team data before production.

## Animation scope
PNG portraits are single poses, not rigs or expression atlases. Support entrance/exit, speaker highlight, optional small posture shift and a transition between scenes. Respect reduced motion. Text and choices stay crisp and scalable. Do not stretch or mirror asymmetric clothes/hair casually. If a new expression is required, record it as a missing asset and author it from the identity master; a color tint is not a new expression.
