# Graphics v1.1

Source: `SoccerMaster_Graphics_v1.zip` (owner approved the oversized gameplay look and the flat pixel-art cutscene look). Masters: `docs/art/graphics-v1/` (unchanged). Runtime copies: `src/assets/art/v1/*.webp` (half size, built by `python3 scripts/art/build-runtime-art.py`).

## Inventory (28 assets)
- Backgrounds (4): bedroom, school, training-ground, match-ground.
- Player looks: boy, girl, each with home / school / training / match outfits.
- Cast: Alex (school/training/match), Jordan, Blake (school/training/match), Caregiver (home), Coach Code (club), Fish (tank), Sam and Riley (school/training/match; gallery only — no week-one scene casts them).
- Status is shown per image in Start → Review & Lab → Art Gallery. `NEW_ART_REVIEW_PENDING` art is not owner-approved.

## Where it is used
- Story week one: all 18 scene IDs map (`tests/artCatalog.test.ts`). One pinned outfit per scene; player look follows the saved boy/girl choice.
- 9v9 match: oversized players from the ported sprite factory (run, idle, kick, slide, dive).

## Known gaps
- No BLOCK pose (BLOCK still works; idle/run frame shown).
- No named gameplay sheets for Alex, Sam, Blake or Riley.
- No squad numbers or club kits in the engine: numbers are slot + 1; kits are side colours, not clubs.
- No corridor, arrival-day or night bedroom art: bedroom used for all home scenes.
- Static portraits: no expressions or lip-sync.
- The package's own renderer contract test needs `@napi-rs/canvas`, which is not a repo dependency; not run.
- Not checked on a physical iPhone.
