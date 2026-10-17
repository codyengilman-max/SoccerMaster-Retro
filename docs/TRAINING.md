# M6 — Individual Home Training and Player Progression

Status: implemented on branch `devin/1792030000-m6-home-training` (stacked on M5, PR #5). Not merged, not deployed.

## What it is

One created **career player** (name, position, six attributes) and a weekly home-practice plan built from
real-ball activities. Three kinds of information are kept apart everywhere (data model, review screen, docs):

| Kind | Source | What it can change |
|---|---|---|
| **Self-reported practice** | Practice Journal entries the player types in | Participation credit (max 3 per career week) and the *suggested* activity level. **Never** game attributes. |
| **Demonstrated gameplay** | `EvidenceCollector` reading the real 9v9 sandbox (`MatchSim` state + events) for the career player's slot, plus Coach Moment answers (M5) | Game attributes, within caps |
| **Real-world physical assessment** | — | Not implemented. The game does not measure or claim physical skill. |

Home practice raising game attributes would reward typing, not playing, so it is deliberately excluded.

## Code map (all framework-free under `src/game/career/`)

- `types.ts`, `config.ts` — model and **every tunable number** (`CAREER_CONFIG`).
- `player.ts` — `CareerPlayer`, `cleanText` (strips control/bidi characters, bounds length; text is always drawn as plain Phaser text, never HTML).
- `catalog/` — 84 core activities (14 × first touch, passing, dribbling, finishing foundations, defending foundations, awareness foundations) + 8-step juggling ladder. `validate.ts` checks every record at test time.
- `planner.ts` — setup suitability, 3-session weekly plan, substitutions.
- `state.ts` — pure reducer for every career change (journal, credit, levels, evidence, end of week).
- `evidence.ts` — sandbox → evidence; `progression.ts` — weekly growth.
- `saveio.ts` — validation, migration, import/export; `store.ts` — IndexedDB store.
- UI: `src/scenes/CareerScene.ts` (Start → **Home Training**). Sandbox evidence: `MatchScene` with `{ career: true }` (Home Training → *Play Sandbox*).

## Weekly plan

Setup inputs: ball only / optional items, small / medium space, indoors / outdoors, safe striking area (outdoors only), minutes (6–20, default 10; a suggestion, there is no timer).

- Three **optional** sessions per numbered career week, each with a familiar activity, a variation, a manageable challenge and, where the focus supports it, an application activity.
- Only a ball is ever required. Wall, cones, targets, goals, yards, helpers and audio are optional; activities that use them have a ball-only version, and the plan uses it when the item isn't available.
- Indoor striking is never planned (validator rejects it). Striking activities (`strikingArea: true`: roll/set strikes, angles, finishes after a dribble or turn, rebounds and the like) need an outdoor, declared-safe striking area. The low-power *Placement* focus (gentle side-foot rolls along the ground, like a pass) is allowed indoors; every other finishing focus is refused indoors with alternatives. If a focus can't be practised honestly, the planner refuses with a reason and lists focuses that *can* be planned with that setup.
- No two consecutive sessions use the same configuration. Equivalent activities share a `variantGroupId` and count as one.
- Substitutions stay inside the scheduled session; the session still earns exactly one credit.
- Career weeks advance only when the player taps **Finish Week** on Weekly Review. Device date, clock and time zone are never read.
- No streaks, no daily login, no countdowns, no penalty for skipping.

## Practice Journal and credit

Each Complete form gets a unique completion id when it opens. Rules (`state.ts`):

- Same id again → ignored ("Already saved"). Double taps, retries and a second tab replaying the same form write once.
- A scheduled session credits once per week; a later log for it is saved as extra practice. Extra practice earns no credit. Max 3 credits per week.
- Skipped → saved, no credit, no penalty.
- Logs must match this week's plan (activity, content version, variant); logs for old weeks are refused.
- Two **distinct** scheduled sessions rated *comfortable* (not using the easier version) suggest the next activity level. The player chooses whether to accept. This changes the plan, not attributes.

## Game evidence (`evidence.ts`, rules in `EVIDENCE_RULES`)

Only actions by the career player's sandbox slot count: DEF → H3, MID → H5, FWD → H8.

| Attribute | Opportunity | Counts as success |
|---|---|---|
| First touch | Career player receives the ball | Still has it after 1.5 s or plays it on; deflection or loss = 0 |
| Passing | Career player passes | A teammate receives it; interception/out = 0 |
| Tactical awareness | Career player passes | Receiver had no opponent within 5 yd (decision, separate from execution) |
| Dribbling | Career player starts carrying | Releases with a pass or shot; loss = 0 |
| Finishing | Career player shoots | ≤ 22 yd and aimed ≥ 1.5 yd from goal centre = 1; ≤ 22 yd at the keeper = 0.5; further = 0 |
| Defending | Opponent carrier within 6 yd of career player | Ball won back with career player within 10 yd = 1; by a teammate further away = 0.5; opponent shot/goal or 10 s without a regain = 0 |
| Awareness (Coach) | Answered Coach Moment | strong 1, reasonable 0.5, risky 0; unanswered = no opportunity |

Goals and wins are never inputs. No opportunity is never a failure. The collector is read-only (a test runs two
identical seeded sims, one observed, and compares them). If events leave the 40-event rolling log before being read,
the pending items are dropped and counted as *missed*, never guessed. Evidence is flushed every 30 s of sim time and
on leaving, as idempotent batches (max 40 batches, 400 items per week).

## Growth (`progression.ts`, numbers in `CAREER_CONFIG.growth`)

Per attribute, per week:
1. Repeats of an equivalent situation (same zone and kind) are weighted 1, 0.5, 0.25, then 0.125 each.
2. Need ≥ 4 weighted opportunities and ≥ 55 % weighted success.
3. Points = floor(weighted successes / 3), max 2 per attribute, max 4 total per week, never above potential (70 by default) or 99.
4. Coach answers count at most half of the counted successes; Coach answers alone give at most +1.

### Worked examples (all in `tests/career-progression.test.ts`)

- **A.** 8 successful passes in different zones, 2 failed: 8/10 = 80 %, floor(8/3) = 2 → **+2 passing** (per-attribute cap).
- **B.** No chances at all: **no change**, reason says it is not a failure.
- **C.** 40 successful carries in one identical situation: weights 1 + 0.5 + 0.25 + 37 × 0.125 = 6.375 → at most +2, not +13. Only 4 such carries: 1.875 weighted successes → **no change**.
- **D.** 30 strong Coach answers and no play evidence: **+1** only.
- **E.** 3 successful plays + 20 strong Coach answers: Coach counted as 3 → 6 weighted successes → +2.
- **F.** Passing 69 with potential 70: **+1** (potential).
- **G.** 3 successful shots, 7 poor ones: 30 % → **no change**.

These defaults are provisional; they need play-testing with real players before they're trusted.

## Save and integrity

- **IndexedDB** (`smr-career`). Each change is read → validate → reduce → write inside **one readwrite transaction**, so a completion and its credit are written together or not at all. Browsers serialise readwrite transactions on the same store across tabs, so two tabs can't both credit the same session (unit-tested with `fake-indexeddb`; the same rule is what Safari/Chrome implement). Other tabs refresh via `BroadcastChannel` where available.
- localStorage is not used: its read-then-write is not transactional.
- Every stored or imported save is fully validated (`parseSave`): types, finite integers, ranges (attributes 1–potential ≤ 99, weeks 1–9999), list sizes, known activity/focus ids, credit consistent with completed sessions. Imports are limited to 400 kB. A fresh object is built from validated fields, so extra keys (including `__proto__`) are ignored.
- Schema version 2; a schema 1 (pre-release draft) migration is implemented and tested. Saves from a newer version are refused.
- An unreadable stored save is kept under a `broken-<time>` key and the game starts fresh with a visible message; it is never silently overwritten.
- If IndexedDB is unavailable (some private modes), the game works in memory and says progress lasts until the page closes.
- A failed write leaves the save unchanged and shows "Save failed. Nothing was changed; try again."

**Limits we don't hide:** this is a browser game with a local save. Anyone can edit their own IndexedDB or import a
hand-made file that passes validation, and anyone can log practice they didn't do. Validation stops broken or
out-of-range data, not a determined player lying to themselves. Self-reported practice is labelled as such and cannot
change attributes, which limits what a false log can do.

## Content review

All 92 activities are original home adaptations, informed by public coaching principles (FIFA Training Centre:
first touch, passing and receiving, ball control; England Football: 1v1 emergency defending, receiving and scanning).
They are not official drills. Every record has `review.coaching: 'pending'`: **a qualified youth coach must review
all activities before release**, in particular the defending, striking and juggling content, the safety notes, and
the level ordering. Known limits are stated on each activity (e.g. self-roll control is not a teammate's pass; solo
defending is movement practice, not tackling; target striking is not finishing against a keeper; audio cues don't
prove reading the game; no heading, no sliding, no unstable obstacles).

## Draft training library v1.1 (review only)

The supplied package (20 exercise families, 100 practice options, 200 planned left/right demos) is stored unchanged in `research/training/v1.1/`, with provenance and owner overrides in `research/training/README.md`. Code under `src/game/career/curriculum/` (framework-free):

- `json.ts`, `manifest.ts`: strict schema-2 importer (1,000,000-byte and depth-16 limits, duplicate/prototype keys, unsafe text, source URL allowlist, cycles, draft-only release status, unchanged package reward/schedule/safety policy).
- `release.ts`: the trusted release manifest. It is **empty**: no option is approved.
- `approval.ts`: an option is published only with a trusted approval whose content hash, coach and QA reviewers, evidence and rights review, resolved claims and both demo assets match. `choose()` tries the family and one declared substitute, then returns "No eligible reviewed activity. Choose another focus or skip without penalty."
- `mapping.ts`: each family belongs to one of the seven existing skill areas; proposed retain/replace/add mapping to the 92 activities (no retirements) and the AI-assisted coaching-review disposition per family.
- `demos.ts`: six code-drawn prototypes (BM01, DR01, TR01, PA02, JU01, FI01 first options) with left/right mirroring that keeps contact surfaces. Each lists the open coaching findings and unresolved claims; none is final. JU03 and FI02 demos stay held.

Owner decisions (2026-10-15): Retro keeps one credit per scheduled session (the package's week-slot journal stamp is not adopted); the seven skill-area levels stay the only progression; the five options are alternatives, not a difficulty ladder; no numeric quota, and the 500-plus soccer-scenario catalog is separate from home training. The planner still uses only the 92 existing activities. Career → Training Library → "Draft library v1.1 (review only)" shows the review cards and prototype demos (switch foot, pause, slow, next step, replay; reduced motion starts paused).

## Not done / depends on later milestones

- Matches have a clock, halves and a result (M4 core), but no formal set pieces, fouls or offside, so evidence never covers those situations.
- Coach evidence is used only when the match is opened with `?coach`.
- Optional audio cues are described as an option for a helper; the game doesn't play audio.
- Physical iPhone testing not done; browser tests use Chromium emulation.

## Weekly Team Training

Career → **Team Training** shows this week's three situations from the soccer-logic catalog (draft, not coach-certified) and plays them in the 9v9 match with the joystick and PASS / SHOOT / SLIDE TACKLE / BLOCK. Each situation lasts 8–12 seconds or ends once the outcome is clear. The week's result changes attributes by at most +2 or −1, only once per week; Home Training credit is separate and unchanged. `?debug&ttSeconds=N` shortens situations for browser tests.
