# SoccerMaster Retro — new graphics handoff

Devin: import and integrate the attached tournament artwork and diverse roster designs into the existing SoccerMaster Retro project. Inspect the current repository and its instructions first. Preserve existing working assets and saves. This ZIP combines the two latest graphics batches; it is not the entire historical graphics portfolio.

## Contents

- `SoccerMaster_Tournament_Art_v1/`: 14 PNGs, visual index, extraction map, generation prompts and detailed instructions. Includes AZ Showcase, Holiday Classic and State Cup arrival backgrounds and event assets; reusable results components; boy, girl, Sam and Coach Code reaction sheets; Blake Next Horizon portraits and gameplay poses; four visitor kit candidates.
- `SoccerMaster_Diverse_Rosters_v1/`: 10 PNG roster sheets, appearance manifest and instructions. Covers FC Batavia, Royal Salt Academy, Valley Rising, Desert Tuzon, Sol Vista, Next Horizon and four unassigned visitor kit candidates. Each sheet contains eight outfield designs and one goalkeeper design.

Read both included README files and their JSON maps. This document resolves overlap between them: the diverse roster sheets expand the visitor kit candidates into appearance designs, but do not authorize new club identities. Named cast assets always take precedence over generic roster designs. The tournament README's request not to silently change every athlete's wardrobe means preserve club kits; the newer diversity request explicitly authorizes distinct generic player appearances.

## Implementation requirements

1. Inventory existing team, player, scene, animation and tournament IDs. Create an explicit mapping to these assets. Do not rename story characters or invent visitor club names. Keep Next Horizon distinct from Next Level. Apply existing approved game rules if a package note conflicts; do not change scheduling or scoring merely to import art.
2. Preserve original PNG source art. Extract tournament objects and UI components using the supplied source maps, checking each crop visually. Keep live text, scores, rankings, rewards and buttons controlled by code. Use backgrounds for arrivals/cutscenes, not for scrolling match pitches. Select the saved boy or girl protagonist rather than showing both.
3. Bind generic roster players to stable appearance IDs so nine players no longer share one face and haircut. Retain the same appearance across actions, training, matches and save/load. Preserve named protagonist, Sam and Blake assets; they occupy existing lineup slots rather than increasing team size. Blake's Next Horizon art becomes eligible at the approved transfer event, not before it. Keep kits and goalkeeper colors consistent.
4. Complete the remaining sprite preparation before replacing gameplay animations. Roster sheets contain a single front ready pose per design, not run/pass/shot/keeper cycles. Author missing poses with consistent identities; do not fake a complete animation using one standing image. Blake's gameplay sheet also lacks some directional/action cycles. Preserve compatible working fallbacks and report unavailable artwork clearly.
5. Normalize finished gameplay frames to the existing 160x128 cells, ground anchor (80,120), approximately 100px standing body height. Check alpha edges, hair clipping and consistent scale. Pack validated frames through the existing JSON/WebP pipeline and allowlist. The generated source sheets are not uniform runtime atlases.
6. Make results UI responsive in portrait and landscape, with safe areas and readable text. Use actual tournament state for qualification, scores, advancement, rewards, elimination and final outcome. Reactions are separate held states, not one looping clip. Use existing gameplay venues and leave pitch physics unchanged.
7. Verify 390x844, 844x390, 320x568 and 568x320; rotate during play without resetting time, score or possession. Check all club kits, unique lineup appearances, both protagonists, named cast continuity, training wardrobe, goalkeeper behavior and long team names. Test pending, losing, winning and nonqualified result states. Distinguish browser emulation from real-device testing.

## Handoff report required

Provide the changed files, asset-to-game ID mapping, completed animation coverage, screenshots of both orientations, checks actually run and any missing artwork or integration blockers. Do not report source designs as completed animated sprites or claim deployment without verifying it.

## Current status

24 source PNGs are included, with maps and instructions. The 10 roster sheets contain 90 design slots; some appearance archetypes recur across clubs. No game code, complete diversified animation sets or verified app deployment is included. Existing canonical character/training assets remain dependencies in the game repository. This package is ready for Devin's asset preparation and implementation work.
