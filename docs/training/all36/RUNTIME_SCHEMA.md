# All36 runtime schema and schedule mapping (PR C step 1)

Status: **data, fingerprints and mapping only.** Nothing here can score yet: `SESSION_CARDS` is still empty and no scene reads this data. Step 2 adds facing, authored continuations, the scene, the save record and credit.

## Source of truth

| Item | Value |
|---|---|
| Archive | `SoccerMaster_Coach_Approved_All36.zip`, SHA-256 `1a57ffe32a17975bf117972e2a304c428abaeda2f41372d22af3e57c4a30fb87`, 420 files |
| Package manifest | 419 of 419 listed hashes match (`SHA256_MANIFEST.json` does not list itself) |
| Per-situation approval hashes | **36 of 36 reproduced**: `reviewed_episode_sha256` in `COACH_APPROVAL.json` is the SHA-256 of the compact JSON (key order as authored) of the matching entry in `review_history/episodes_before_approval.json` |
| Changes since review | none in tactical content: each `episodes.json` entry equals its pre-approval entry except `status` and the added `approval` block |
| Not reproducible | `reviewed_package_sha256` (`f0462a67…`) and `REVIEW_PACKAGE_ID.txt` (`d0043a01…`) hash archives that were not supplied. The per-situation hashes above cover the approved content |

- `docs/training/all36/package/` holds every non-image package file unchanged: 29 files, byte-identical to the ZIP (tested).
- The 288 SVG previews, 72 PNG previews, 12 contact sheets and 19 sprite sheets are fingerprinted in `MANIFEST.json`. They are imported in step 2, where they are used.
- `docs/training/all36/MANIFEST.json` is written by `npm run all36:manifest -- <zip>`. The script extracts into a fresh temporary directory and hashes every file twice: raw, and normalized. Normalized means:
  - canonical JSON;
  - LF text without a BOM;
  - PNG critical chunks only.

  It also records a semantic hash per situation, which covers its tactical content without status or approval. If the exact ZIP is unavailable, the script cannot run and PR C stops.

## Runtime types (`src/game/training12/all36/types.ts`)

- **Package records as read:** `PackageEpisode`, `PackageVariant`, `PackageBranch`, `PackageActor`, `PackageCurriculumRow`.
- **Grades:** the package's `PackageGrade` (`preferred` / `acceptable` / `misread`) maps to a `DisplayBand` through `GRADE_BAND`:
  - preferred → Elite;
  - acceptable → Playable;
  - misread → Low-value.

  Strong and Forced are not assigned. A timeout or technical failure is `no-decision`, never a band. The package grade is stored next to the band.
- **Added for step 2:**
  - `Facing`: a target point or a unit direction.
  - `PathKey` and `AuthoredContinuation`: timed samples for every moving actor and the ball. Endpoints must equal the package branch targets.
- **Roles:** `PACKAGE_ROLE` maps DM → 6, CM → 8, ST → 9, and keeps the others as they are. `CATEGORY_ROLES` gives DEF → LB/RB/CB, MID → 6/8 and FWD → LW/RW/9. There are no goalkeeper learners.

## Schedule (`src/game/training12/all36/schedule.ts`, full table in [SCHEDULE.md](SCHEDULE.md))

**Routes:** 36 curriculum rows × sessions A/B/C × 3 categories = 324 routes. Each route records:
- session (same IDs as the game, `S1-W01-A`), week and slot;
- category;
- topic (row theme) and purpose;
- difficulty (curriculum mode and its rank);
- listed and assigned situation IDs, each with variant, package role and runtime role;
- prerequisite;
- completion key and credit key;
- status, plus blockers that cite the exact IDs.

**Assignment rule:** a learner gets the session's listed situations whose protagonist role is in their category, in the listed order. Nothing else is added and nothing is substituted. If none match, the route is blocked.

**Variant rule:**

| Curriculum `variant_to_author` | Variant |
|---|---|
| Season 1 A "Base scene; explicit cues" | `base` |
| Season 1 B "Reverse the cue that justified the base answer" | `changed` |
| Season 1 C "Different role or flank with reviewed geometry" | `base` of the listed situations |
| Season 2 A/B/C ("New opponent approach…", "Combine pressure and support changes…", "Mixed unfamiliar arrangement…") | none in the package → **blocked** |

**Prerequisite:** existing rule. A session opens in its own career week (`save.week`, Season 1), and A, B and C may be played in any order. The package defines no other prerequisite.

**Keys:**
- Completion: `all36.v1/<session>/<category>`.
- Credit: the existing `tt12Run` record for career week and slot (`tt12/W<week>/<slot>`).

**Result:**
- Season 1 maps 28 DEF, 38 MID and 28 FWD routes of 54 each.
- Season 2 maps none; the game has no Season 2 Team Training yet.
- Narrow roles rotate:
  - DEF: CB 23, LB 21, RB 17;
  - MID: 6 21, 8 30;
  - FWD: 9 17, LW 18, RW 15.

## Conflicts with the existing credit system (to settle in step 2 before any save-schema change)

1. **Weekly credit needs all three sessions.** `tt12Run` grades the week only when A, B and C are all credited (`career/state.ts`). Only 9 (DEF), 10 (MID) and 9 (FWD) of the 18 Season 1 weeks have all three sessions mapped for the category. In every other week the existing Team Training credit can never be paid. This doesn't stop the story: weeks advance without Team Training, as today.
2. **Mapped routes have 1–3 situations, not 9 moments.** The current `ts-1` round model needs `MOMENTS_PER_ROUND` = 3 approved moments per round. Its `creditEligible` rule needs 6 decisions, 3 without a hint. The owner rule replaces this: a session completes when every assigned situation has a decision or a timeout.
3. **The week's graded situations come from the old catalogue.** `countTeamWeek` grades against `selectSituations(position, week)` from the legacy catalogue, and the weekly settlement credits that catalogue's attributes. Reusing the existing credit amount unchanged means passing the All36 session result as the `tt12Run` score while keeping those legacy IDs. Otherwise the settlement would change, and the owner ruled out new progression effects.
4. **Fields the save lacks.** `tt12Run` stores week, slot, run ID, score, credited and decision counts. The owner's record also needs:
   - first-completion timestamp;
   - selected answer per situation;
   - package grade and display band;
   - no-decision count;
   - session accuracy;
   - best mastery.

   These need a new versioned save field. It is proposed in step 2, not changed here.
