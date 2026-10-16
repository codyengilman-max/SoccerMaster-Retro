# Art coverage and capability limits

The locked visual direction is preserved. The following are specific coverage limits, not completed features:

| Item | Supplied | Required before claiming complete |
| --- | --- | --- |
| Player boy/girl | Four cutscene outfits each and a simplified gameplay reference for each | Map immutable player ID to selected appearance; use actual roster number and kit |
| Alex, Sam, Blake, Riley | School/training/match portraits | Create or adapt identity-matched gameplay appearances; current generic roster sheets are not those people |
| Jordan | School portrait | Additional settings only if authored; do not invent team membership |
| Coach / caregiver | One fixed outfit each | Additional named adults need separate IDs/assets; no cloning one caregiver into two parents |
| Clownfish | Fantasy portrait with a baked soccer pellet | A separate fish/ball/goal art set for playable Tank Cup; this image cannot supply ball physics |
| Bedroom | Sunset room, aquarium, desk and ball | Newly moved-in and time-appropriate variant; remove or justify the unearned trophy, add moving boxes for arrival. Current image is review reference only |
| School | Outdoor courtyard | Indoor corridor asset if the actual scene requires it; do not label the courtyard as an indoor room |
| Team kits | Fixed per-character palette variants | Normalize team trim details after canonical club/kit mapping; supported away/transfer kits are not supplied |
| Character acting | One pose per outfit | Needed expression/pose variants or honest restrained acting. Tints cannot substitute for facial expressions |
| Gameplay animation | Simplified run/idle/kick/slide/dive | Dedicated Block stance and any missing keeper/role-specific poses; directions are simplified, not a full artist-authored eight-view set |

The scene map flags the bedroom and corridor questions. The art gallery exposes these flags. These images can be reviewed without silently committing props, timing, affiliation or character facts to the story. No approved original PNG was altered by this audit.

Names use plain text and a single allowlisted token. Portrait paths are selected from a fixed mapping. Input/name/effect guards are prototype examples; production must reuse its current validated services and atomic persistence. The new demo executes no narrative effects, rewards, save writes, activity launches or networking.

The archive is an asset/source handoff, not a save-game import. Keep the game's save importer JSON-only and preserve its separate bounds and validation. Archive checksums detect corruption, not authenticity.

Load only needed textures. All 28 cutscene masters decoded simultaneously would require about 168 MiB of RGBA pixels; the 19 gameplay sheets add about 53.4 MiB before Canvas/GPU/caching overhead. This is arithmetic, not a measured phone memory budget. Avoid eager loading the entire gallery in the match runtime; stage active scenes, dispose unused textures and measure the actual integrated build.
