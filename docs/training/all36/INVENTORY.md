# Coach-approved All36 Team Training package: inventory and crosswalk

Status: **inventory only (Phase One, PR A)**. Nothing here is imported into the game, mapped into `SESSION_CARDS` or able to score. Integration is PR C in [../../REMEDIATION_PLAN.md](../../REMEDIATION_PLAN.md).

## Package identity

| Item | Value |
|---|---|
| Archive | `SoccerMaster_Coach_Approved_All36.zip` (top folder `SoccerMaster_All36/`) |
| Archive SHA-256 | `1a57ffe32a17975bf117972e2a304c428abaeda2f41372d22af3e57c4a30fb87` |
| Library version | 1 (`REVIEW_PACKAGE_ID.txt`) |
| Review baseline (REVIEW_PACKAGE_ID.txt) | `SoccerMaster_All36_Training_Previews.zip` `d0043a01…c474c3` |
| Reviewed package (COACH_APPROVAL.json) | `f0462a67…5f37e9` |
| Approval | coach_approved, Cody Engilman, 2026-10-27, basis: user-declared review; runtime_validation: pending |
| Approval exclusions | animation/physics; dynamic offside/interception; native-device QA; reward/progression integration; governing-body certification |
| Files | 420 (419 listed in `SHA256_MANIFEST.json`, all 419 hashes verified; the manifest itself is unlisted) |

## Folder inventory

| Folder / file | Count | Contents |
|---|---|---|
| `episodes.json` | 36 | situations D01–D36 (72 variants, 288 choice-grade records) |
| `curriculum.json` | 36 | week rows: Season 1 W1–18 + Season 2 W1–18, sessions A/B/C, status `planning_only_not_108_authored_levels`, `runtime_ready: false` |
| `coverage.json` | 36 | per situation: role, sources, 8 panels, coach_approved |
| `COACH_APPROVAL.json` | 1 | approval record with 36 per-situation hashes |
| `sources.json` / `SOURCES.md` | 14 | cited public coaching sources (MSA01…) |
| `previews/` | 288 | SVG panels: 36 × base/changed × boy/girl × decision/consequence |
| `PNG/` | 72 | PNG of base-state boy decision + consequence panels |
| `CONTACT_SHEETS/` | 12 | 6 PNG + 6 SVG overview sheets |
| `assets/` | 19 | sprite sheets: 2 protagonists, 7 teammates, 8 opponents, 2 keepers (+`asset_metadata.json`, 21 rows) |
| `build_scripts/` | 5 | authoring/render/validate scripts (provenance only) |
| `review_history/` | 7 | pre-approval workbook, episodes, coverage, superseded instructions |
| Docs | 9 | README, DEVIN_READ_FIRST, SCENE_REVIEW, REVIEW_FINDINGS, PRIOR_SOURCE_AUDIT, OPEN_ALL_PREVIEWS.html, REVIEW_PACKAGE_ID, validation_results.json, reference_grader.py |

## Counts

- Training scenarios: **36** (12 families F01–F12 × 3).
- Metric records: **72** variant records (base + changed cue) holding **288** choice grades (preferred 72, acceptable 129, misread 87) and 288 branch records.
- Still screenshots: **288** SVG + **72** PNG + 12 contact sheets. Every scenario has all 8 SVG panels; PNG exists for base/boy only.
- Roles taught (protagonist): CB 5, CM 6, DM 5, LB 4, RB 4, LW 4, RW 4, ST 4. **No goalkeeper learner scenarios** (keepers appear as supporting actors only).

## Scenario crosswalk (scenario → role, sources, screenshots, curriculum)

| ID | Family | Title | Role | Actors | Sources | SVG panels | PNG | Curriculum uses |
|---|---|---|---|---|---|---|---|---|
| D01 | F01 | Own-half superiority — CB | CB | 9 | MSA01 | 8/8 | 2/2 | 10: S1W1A S1W1B S1W12C S1W13A … |
| D02 | F01 | Own-half superiority — LB | LB | 9 | MSA01 | 8/8 | 2/2 | 12: S1W1A S1W1B S1W1C S1W13A … |
| D03 | F01 | Own-half superiority — DM | DM | 9 | MSA01 | 8/8 | 2/2 | 10: S1W1A S1W1B S1W12C S1W13A … |
| D04 | F02 | Escape the first press — LB | LB | 9 | MSA02 | 8/8 | 2/2 | 8: S1W1C S1W2A S1W2B S1W13C … |
| D05 | F02 | Escape the first press — RB | RB | 9 | MSA02 | 8/8 | 2/2 | 6: S1W2A S1W2B S1W2C S2W2A … |
| D06 | F02 | Escape the first press — DM | DM | 9 | MSA02 | 8/8 | 2/2 | 8: S1W1C S1W2A S1W2B S1W13C … |
| D07 | F03 | Create a local overload — LW | LW | 10 | MSA03 | 8/8 | 2/2 | 10: S1W2C S1W3A S1W3B S1W14A … |
| D08 | F03 | Create a local overload — CM | CM | 10 | MSA03 | 8/8 | 2/2 | 12: S1W3A S1W3B S1W3C S1W14A … |
| D09 | F03 | Create a local overload — RW | RW | 10 | MSA03 | 8/8 | 2/2 | 10: S1W2C S1W3A S1W3B S1W14A … |
| D10 | F04 | Switch and exploit space — CM | CM | 10 | MSA04 | 8/8 | 2/2 | 8: S1W3C S1W4A S1W4B S1W14C … |
| D11 | F04 | Switch and exploit space — RW | RW | 10 | MSA04 | 8/8 | 2/2 | 6: S1W4A S1W4B S1W4C S2W4A … |
| D12 | F04 | Switch and exploit space — LW | LW | 10 | MSA04 | 8/8 | 2/2 | 8: S1W3C S1W4A S1W4B S1W14C … |
| D13 | F05 | Beat recovery pressure — ST | ST | 10 | MSA05 | 8/8 | 2/2 | 10: S1W4C S1W5A S1W5B S1W15A … |
| D14 | F05 | Beat recovery pressure — CM | CM | 10 | MSA05 | 8/8 | 2/2 | 12: S1W5A S1W5B S1W5C S1W15A … |
| D15 | F05 | Beat recovery pressure — LW | LW | 10 | MSA05 | 8/8 | 2/2 | 10: S1W4C S1W5A S1W5B S1W15A … |
| D16 | F06 | Complement finishing runs — RW | RW | 10 | MSA06 | 8/8 | 2/2 | 8: S1W5C S1W6A S1W6B S1W15C … |
| D17 | F06 | Complement finishing runs — ST | ST | 10 | MSA06 | 8/8 | 2/2 | 6: S1W6A S1W6B S1W6C S2W6A … |
| D18 | F06 | Complement finishing runs — CM | CM | 10 | MSA06 | 8/8 | 2/2 | 8: S1W5C S1W6A S1W6B S1W15C … |
| D19 | F07 | Coordinate central pressure — ST | ST | 10 | MSA07 | 8/8 | 2/2 | 10: S1W6C S1W7A S1W7B S1W16A … |
| D20 | F07 | Coordinate central pressure — CM | CM | 10 | MSA07 | 8/8 | 2/2 | 12: S1W7A S1W7B S1W7C S1W16A … |
| D21 | F07 | Coordinate central pressure — DM | DM | 10 | MSA07 | 8/8 | 2/2 | 10: S1W6C S1W7A S1W7B S1W16A … |
| D22 | F08 | Press as a front unit — LW | LW | 10 | MSA08 | 8/8 | 2/2 | 8: S1W7C S1W8A S1W8B S1W16C … |
| D23 | F08 | Press as a front unit — RW | RW | 10 | MSA08 | 8/8 | 2/2 | 6: S1W8A S1W8B S1W8C S2W8A … |
| D24 | F08 | Press as a front unit — ST | ST | 10 | MSA08 | 8/8 | 2/2 | 8: S1W7C S1W8A S1W8B S1W16C … |
| D25 | F09 | Pressure and cover — LB | LB | 10 | MSA09 | 8/8 | 2/2 | 10: S1W8C S1W9A S1W9B S1W17A … |
| D26 | F09 | Pressure and cover — CB | CB | 10 | MSA09 | 8/8 | 2/2 | 12: S1W9A S1W9B S1W9C S1W17A … |
| D27 | F09 | Pressure and cover — RB | RB | 10 | MSA09 | 8/8 | 2/2 | 10: S1W8C S1W9A S1W9B S1W17A … |
| D28 | F10 | Keep a connected block — DM | DM | 10 | MSA10 | 8/8 | 2/2 | 8: S1W9C S1W10A S1W10B S1W17C … |
| D29 | F10 | Keep a connected block — CB | CB | 10 | MSA10 | 8/8 | 2/2 | 6: S1W10A S1W10B S1W10C S2W10A … |
| D30 | F10 | Keep a connected block — CM | CM | 10 | MSA10 | 8/8 | 2/2 | 8: S1W9C S1W10A S1W10B S1W17C … |
| D31 | F11 | Defend the inside route — RB | RB | 9 | MSA11 | 8/8 | 2/2 | 10: S1W10C S1W11A S1W11B S1W18A … |
| D32 | F11 | Defend the inside route — LB | LB | 10 | MSA11 | 8/8 | 2/2 | 12: S1W11A S1W11B S1W11C S1W18A … |
| D33 | F11 | Defend the inside route — CB | CB | 10 | MSA11 | 8/8 | 2/2 | 10: S1W10C S1W11A S1W11B S1W18A … |
| D34 | F12 | Defend a wide delivery — CB | CB | 9 | MSA12 | 8/8 | 2/2 | 8: S1W11C S1W12A S1W12B S1W18C … |
| D35 | F12 | Defend a wide delivery — DM | DM | 9 | MSA12 | 8/8 | 2/2 | 6: S1W12A S1W12B S1W12C S2W12A … |
| D36 | F12 | Defend a wide delivery — RB | RB | 9 | MSA12 | 8/8 | 2/2 | 8: S1W11C S1W12A S1W12B S1W18C … |

## Session × position coverage (curriculum.json: 36 week rows × 3 sessions = 108 sessions)

Retro Team Training has 9 positions (GK, LB, CB, RB, 6, 8, LW, 9, RW). Proposed role mapping: DM → 6, CM → 8, ST → 9 (needs owner confirmation). A session/position route is coverable only when the session lists a situation for that role.

| Position | Sessions with ≥1 situation for it (of 108) | Season 1 (of 54) |
|---|---|---|
| GK (GK) | 0 | 0 |
| LB (LB) | 38 | 19 |
| CB (CB) | 44 | 22 |
| RB (RB) | 34 | 17 |
| 6 (DM) | 40 | 20 |
| 8 (CM) | 52 | 26 |
| LW (LW) | 36 | 18 |
| 9 (ST) | 32 | 16 |
| RW (RW) | 30 | 15 |

Curriculum rows: Season 1 Weeks 1–18 and Season 2 Weeks 1–18. Each session lists 3 situation IDs, so 108 sessions × 9 positions = 972 routes, and **at most 306 are coverable** (sum of the column above). GK has 0. Every curriculum row is `planning_only_not_108_authored_levels` with `runtime_ready: false`.

## Validation done in PR A (shell, no game code)
- **Manifest:** all 419 entries in `SHA256_MANIFEST.json` match their files.
- **Unchanged since review:** `episodes.json` matches `review_history/episodes_before_approval.json` field for field, except `status` (`review_candidate` → `coach_approved`) and the new `approval` block.
- **Previews:** every one of the 288 SVG previews matches `D##_{base|changed}_{boy|girl}_{decision|consequence}`, with none missing and no orphans. All 72 PNGs are base/boy.
- **Counts:** the package's `validation_results.json` reports structural PASS, 12 corrupted copies rejected, and 288 grade records, matching the counts above.

## Comparison with the current Team Training
| Current repo (`main` 04e947b) | All36 | Action in PR C |
|---|---|---|
| `TacticalTrainingScene` Sessions A–C, Coach Code sequence, timed round | Observe → decide → scripted demo → Coach Code → changed-cue retry | **Reuse** the scene shell and sequence; drive it from All36 data |
| `library/gate.ts` fail-closed, `SESSION_CARDS = {}` | Approved situation IDs + `curriculum.json` session lists | **Reuse** the gate; fill only verified (session, role) → D## combinations |
| Audited v1.2 library (48 cards, 0 approved) + PR #49 scene proposals for 39 cards | 36 approved situations with geometry, cues, grades and feedback | **Replace** v1.2 as the scoring source; keep v1.2 files as history |
| Session credit `tt12Run` → `countTeamWeek`, once per week, reload-safe | Reference grader returns `credit: false` and has no reward rule | **Reuse** the existing credit contract unchanged |
| Package art from PR #49 (17 outfield, 2 keepers) | `assets/` 7 teammates, 8 opponents, 2 protagonists, 2 keepers | **Import** the All36 sprites after a frame audit; previews are reference only |
| `training12/drill.ts` (test-only) and legacy `career/teamTraining.ts` | — | **Retire** later (separate cleanup) |
| 9 positions incl. GK | Outfield learners only | **Block** GK and every uncovered route |

## Conflicts and missing information
1. **Grade scale:** the package uses `preferred`/`acceptable`/`misread`, but the owner's bands are Elite, Strong, Playable, Low-value and Forced. No mapping is defined.
2. **Facing:** actors have no facing field. The contract needs player facing; screenshots may guide it but are not data. Scenes that depend on facing are blocked until facing is supplied or approved.
3. **Movement:** branches give only endpoints (`actor_targets`, `ball_target`), with no routes, timing or contact frames. The package forbids interpolating endpoints as football. Demonstration routes must be authored, then re-approved under the renewal rule.
4. **Misread branches** freeze for explanation. Failure demonstrations are not supplied and must not be invented.
5. **Missing contract fields:**
   - **Not present:** phase of play, completion threshold, progression effect, credit/reward rule.
   - **Implied only:** age level, U11–U12 per `DEVIN_READ_FIRST.md`.
6. **Goalkeeper:** no GK learner scenarios. An earlier plan's GK slice is not possible from this package, so GK stays blocked.
7. **Roles:** package roles DM/CM/ST vs Retro `6`/`8`/`9` (proposed 1:1). The career save has only DEF/MID/FWD, and which package roles each offers is undecided.
8. **Hashes:** the archive (`1a57ffe3…`), the review baseline in `REVIEW_PACKAGE_ID.txt` (`d0043a01…`) and the reviewed package in `COACH_APPROVAL.json` (`f0462a67…`) all differ. The per-situation `reviewed_episode_sha256` values could not be reproduced with standard JSON serialisations. The content matches the pre-approval episodes, so this looks like repackaging, but it is not proven.
9. **Approval scope:** the approval excludes animation/physics, dynamic offside/interception, native-device QA and reward integration. Those stay as runtime validation in PR C.
10. **Curriculum:** it is marked planning-only and not runtime-ready. Its session lists are used as the mapping source only if the owner confirms.
11. **Field orientation:** the field is 45.72 × 68.58 m (50 × 75 yd, matching `MatchSim`) with home attacking +y. A coordinate transform is needed; this is not a conflict.

No screenshot is unmatched and no situation is missing an ID, role, cues, choices, grades or feedback. The stop conditions apply to items 1–5 and 7 for PR C, not to this inventory.

## Owner decisions needed
1. How preferred/acceptable/misread map to the five grading bands.
2. Facing source: author from the previews for owner re-approval, or wait for package data.
3. Whether Devin may author demonstration routes (and failure demonstrations) for re-approval.
4. Completion threshold and progression effect, or keep today's credit rule as is.
5. Which package roles DEF, MID and FWD career players get, and whether DM/CM/ST map to 6/8/9.
6. Whether `curriculum.json` session lists are the approved session mapping.
7. Accept the hash discrepancy, or supply the exact reviewed archive.
