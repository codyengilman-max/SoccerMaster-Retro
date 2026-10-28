# Retro tactical-decision model for Team Training (specification, not implemented)

Owner decision H3 (2026-10-27, revised). Status: **proposed specification**. Implementation is PR C in [REMEDIATION_PLAN.md](../REMEDIATION_PLAN.md).

SoccerMaster Retro owns this contract. It must not create any runtime, build or deployment dependency on the separate SoccerMaster repository (AGENTS.md).

## Scope

- Tactical questions, grading, explanations and progression live **only in Team Training**.
- **Story matches never pause for tactical questions**: no Coach Moments, answer menus, Decision Heat or tactical-answer grades in Match Reports. The `?coach` prototype (`src/game/coach/`) is deprecated and dev-only.
- Content comes only from the coach-approved All36 package (D01–D36). See [../training/all36/INVENTORY.md](../training/all36/INVENTORY.md). Nothing is authored here.

## Contract version

`retro-tt-decision-1`. Every saved decision record stores this version plus the package version and archive hash, so later grading changes never rewrite old results.

## Session flow (from the package)

Observe → decide (four credible choices, one answer, no drawing) → scripted demonstration → Coach Code feedback → changed-cue retry. Not free play. The selected career position chooses position-specific situations; it does not lock match control (H1).

## Three separate layers

1. **Decision:** the package grade for the chosen option in the current variant (base or changed). It never depends on attributes or on what happens next.
2. **Execution:** how the demonstration plays out. Attributes may affect execution, never the decision grade.
3. **Outcome:** what the demonstration shows. A good decision that fails is still a good decision.

## Grades and bands

The package grades every choice `preferred`, `acceptable` or `misread`; the owner's bands are Elite, Strong, Playable, Low-value and Forced. How the three map onto the five needs an owner decision (see INVENTORY conflicts). Until it is decided, PR C stores the package grade verbatim and shows no band.

## Credit and persistence

The package's reference grader returns `credit: false`; the package defines no completion threshold, progression effect or reward rule. PR C adapts the existing session-credit contract (`tt12Run` → `countTeamWeek`): one credit per session, saved in the existing transaction, reload-safe, never paid twice. Any new threshold or reward needs owner approval.

## Open owner questions

- Mapping of preferred/acceptable/misread to Elite/Strong/Playable/Low-value/Forced.
- Completion threshold and progression effect per session.
- Which package roles a DEF/MID/FWD career player is offered.
- Whether a timed decision window applies.
