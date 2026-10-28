# Graphics integration: tournament art + Animated Rosters v2

Status of the owner graphics packages in this branch. Browser emulation only; nothing tested on a real iPhone.

## Packages (kept unchanged)

| Package | Location | Check |
|---|---|---|
| New Graphics handoff (tournament + rosters v1) | `docs/art/tournament-v1/`, `docs/art/rosters-v1/`, `docs/art/FILE_INVENTORY.json` | 32 files, SHA-256 verified by `scripts/art/build-tournament-art.py` |
| Animated Rosters v2 (partial, Part 1 + Part 2) | docs: `docs/art/animated-rosters-v2/`; packed sprites: `src/assets/art/rosters-v2/` | 108 packed files copied byte for byte; `PACKAGE_SHA256.txt` lists all 715 package files. Source sheets (47 MB) and previews are not committed |

## Runtime mapping

| Source | Game ID / use | Where |
|---|---|---|
| `az-showcase` background, logo, trophy, medal | `TOURNAMENTS.az_showcase` | `TournamentScene` |
| `holiday-classic` background, logo, trophy, medal | `TOURNAMENTS.holiday_classic` | `TournamentScene` |
| Results components (title, group A/B, match result, outcome, continue) | Results board panels | `TournamentScene` |
| `fc_batavia_01`..`_08`, `_09` | Batavia match-kit slots 1–8, keeper slot 0 | `appearanceSet()` in `spriteSets.ts` |
| `royal_salt_01`..`_08`, `_09` | Royal Salt match-kit slots 1–8, keeper slot 0 | same |

- Appearance = lineup slot, so the same player looks the same in every match and after reload. No save field is needed or changed.
- The created boy/girl keeps their own sheet in their slot. Team Training keeps the Batavia training sheet for outfield players.
- A club switches only when all nine appearances are drawn. Valley Rising, Desert Tuzon and Next Horizon (5 of 9), Sol Vista (keeper only) and the visitor kits keep their Sprites v2 club sheets.
- Left-facing poses mirror the right-facing frames (`flipX`), per the pack. Straight down-screen runs use the front cycle and straight up-screen the back cycle. A kick shows the contact frame; the simulation still owns ball release and timing.
- Disabled slides (`unusedFrames`: Royal Salt 03, Desert Tuzon 02/03) fall back to the held shoulder-brace pose.
- Results text (names, scores, W-D-L, points, headline, next game) comes from `tournamentBoard()` over the saved `TournamentState`; the trophy or medal shows only for `champion` / `runner_up`.

## Not done / blocked

- Tournaments are not reached in the story yet (they come after Week 5). The results screen opens from the `?dev` Review hub with review samples played through `recordTournamentPlayed`.
- State Cup results board, arrival scene, reactions, Blake's Next Horizon art (transfer-gated) and the visitor-kit-to-club mapping are not wired yet. The visitor mapping needs owner approval.
- Animated Rosters v2 is missing 25 source sheets (see `docs/art/animated-rosters-v2/COVERAGE.md`).
- Pass/shoot/chip, keeper catch/throw/punt clips are packed but the match renderer has one `kick` pose and no catch/throw state, so only run, idle, kick-contact, slide and dive frames are shown today.
