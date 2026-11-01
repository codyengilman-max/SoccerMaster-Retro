# Regular-match venues: mapping (Moving Camera Venues v2)

Package: `SoccerMaster_Moving_Camera_Venues_v2` (supersedes the earlier Four Venues package). Sources, runtime helpers and
docs are kept unchanged in this folder; runtime assets are in `src/assets/art/venues/`.

## Names

| Internal id (saved, unchanged) | Player-facing name |
|---|---|
| `pinnacle` | Pinnacle Park |
| `bell94` | Dell 94 |
| `scottsdale` | Scott’s Complex |
| `westside` | Westside Grounds |

`sources/` keeps historical names in the original art; those images are never loaded as signs. Runtime signs for
`bell94` and `scottsdale` are the renamed v2 sprites.

## Location and game type -> venue

Matches record only `home` / `away` plus the game type, so only the package's explicit assignment resolves
(`src/game/venue.ts`). Nothing is guessed from kit colours or chosen at random.

| Game type | Location | Venue |
|---|---|---|
| League | Home (FC Batavia) | `pinnacle` (Pinnacle Park, `homeFor: "FC Batavia"`) |
| League | Away | Not assigned: plain field, reported as missing in `__SMR__` |
| Tournament (AZ Showcase / State Cup) | Either | Not assigned |
| Exhibition / friendly / sandbox | Either | Not assigned |

`?debug&venue=<id>` previews any venue in a debug build only; it is never saved.

## Scope

Regular matches only (`MatchScene` with no Team Training session and no Lab scenario). Team Training, Home Training,
Jungle Ball, Crossbar, Cloudy, story scenes and menus are unchanged.

## Runtime assets

- Grass: `src/assets/art/venues/<id>/grass.webp`, one material across 75 x 50 yd on a 20 x 14 projected mesh.
- Props and signs: `src/assets/art/venues/<id>/<prop>.png` + `.json` (anchor, nominal height), world-anchored from
  `venue-layouts.json`.
- Sideline people: `src/assets/art/venues/characters/<role>.webp` + `.json` / `.clips.json` (160 x 128 cells, feet at
  80,120). Roles: `coach_code`, `mom`, `opposing_coach`, `parent_cheering`, `parent_filming`, `parent_seated`.
- Match players and keepers keep their existing atlases.

## Package defect

`SHA256SUMS.txt` is byte-identical to the v1 file (not regenerated), so 7 entries fail: `00_START_HERE.md`,
`ASSET_MANIFEST.json`, `venue-layouts.json` and the `bell94` / `scottsdale` `sign.png` / `sign.json`.
`ASSET_MANIFEST.json` (122 entries) matches every file.
