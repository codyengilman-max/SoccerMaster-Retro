# Home training phases: initial target table (PROPOSED, for coaching review)

These are starting values for this game. They are **not** established age standards for 10–12-year-olds. Every number lives in one config table (`HOME_PHASES` in `src/game/career/homeMastery.ts`) so a coach can change it without touching the rules.

## Rules that apply to every skill

- **Start:** every player starts at Phase 1 in every skill, including experienced players. Phases are tracked separately for each skill.
- **Each session:** 3 logged attempts.
  - **Juggling:** an attempt is one count.
  - **Technique:** an attempt is one set of 10 repetitions, logged as successes out of attempts.
- **Advance:** meet the target in at least 2 of the 3 attempts, in 2 separate completed sessions, at the phase's own setup (same variation, foot and task). Then the next phase unlocks.
  - Editing a session never makes it count as two sessions.
  - An easier variation never counts toward a harder one.
- **Earned phases stay:** a poor session never removes an earned phase. After 3 sessions in a row below target, the screen offers the easier variation and a smaller next goal. That doesn't change the phase target.
- **Weekly completion:** logging the week's required practice completes the weekly obligation, whether or not the target is met.
- **Self-reported:** manual entries are marked self-reported. Minigame scores are saved automatically and kept separate.

## Juggling (each variation keeps its own records, personal best and median)

| Phase | Assignment (existing) | Variation | Successful repetition | Target per attempt |
|---|---|---|---|---|
| 1 Basic control | Ladder 1–2 (jg-1, jg-2) | touch-and-catch | one contact, then a clean catch | 3 in a row |
| 2 Repeatable control | Ladder 3–4 (jg-3, jg-4) | bounce-assisted | a contact, with one bounce allowed between contacts | 6 contacts |
| 3 Linked actions | Ladder 5–6 (jg-5, jg-6) | continuous | a contact with no bounce | 5 in a row |
| 4 Variation / weaker foot | Ladder 7 (jg-7) | continuous, weaker foot included | a contact with no bounce, at least one on the weaker foot | 8 in a row |
| 5 Applied challenge | Ladder 8 (jg-8) | continuous, then settle and pass | juggle 5, settle, pass to the spot | 2 clean sequences out of 3 tries |

**Surprising-score check** (an entry check only, not a verdict). It fires when a count is above **40** (phases 1–2) or **80** (phases 3–5). It also fires when a count is above **3× the player's median for that variation + 10**.

## First touch

| Phase | Assignment (existing) | Successful repetition | Target per set of 10 |
|---|---|---|---|
| 1 Basic control | Soft Landing (ft-soft-landing) | ball stays within one step | 6 / 10 |
| 2 Repeatable control | Side Door (ft-side-door) | first touch goes through the chosen gate | 6 / 10 |
| 3 Linked actions | Touch–Turn–Travel (ft-touch-turn-travel) | touch, turn and travel without an extra touch | 7 / 10 |
| 4 Variation / weaker foot | Called Exit (ft-called-exit), weaker foot | exit through the called gate with the weaker foot | 6 / 10 |
| 5 Applied challenge | First-Touch Circuit (ft-circuit), timed | a clean circuit (timed: duration, clean reps, errors) | 3 clean circuits, at most 2 errors |

## Passing

| Phase | Assignment (existing) | Successful repetition | Target per set of 10 |
|---|---|---|---|
| 1 Basic control | Wide Gate (ps-wide-gate) | the ball goes through the gate along the ground | 6 / 10 |
| 2 Repeatable control | Two-Foot Targets (ps-two-foot) | target hit, alternating feet | 6 / 10 |
| 3 Linked actions | Near–Far (ps-near-far) | the called distance is reached | 7 / 10 |
| 4 Variation / weaker foot | Through the Channel (ps-channel), weaker foot | ball stays in the channel | 6 / 10 |
| 5 Applied challenge | Passing Circuit (ps-circuit), timed | a clean circuit (timed: duration, clean reps, errors) | 3 clean circuits, at most 2 errors |

**Surprising-score check (technique):**
- 10 / 10 in all three sets in a player's first session at a phase;
- or a jump of 5 or more successes over the player's median for that setup.

Comparisons are made only between matching setups (same assignment, variation and foot).
