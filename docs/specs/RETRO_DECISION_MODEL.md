# Retro tactical-decision model (specification, not implemented)

Owner decision H3 (2026-10-27). Status: **proposed specification**. No code exists yet; implementation is PR C in [REMEDIATION_PLAN.md](../REMEDIATION_PLAN.md).

SoccerMaster Retro owns this contract. It must not create any runtime, build or deployment dependency on the separate SoccerMaster repository (AGENTS.md).

## Contract version

`retro-decision-1`. Every saved decision record stores this version so later grading changes never rewrite old results.

## Story-match Coach Moments

- Every story match (league and tournament) contains **4–6** Coach Moments. No `?coach` flag is needed.
- A moment is triggered only from the live `MatchSim` state (the existing `CoachDirector` trigger/fact pipeline is the starting point). No authored diagram, no teleport, no reset.
- The match freezes; the player reads the frozen state and picks **one** of several credible choices (normally 3–4). There is no drawing mechanic.
- More than one choice may receive a strong grade.
- After the choice, play continues causally from the same frozen state: the chosen action is issued to the sim as a normal command and the sim resolves it.
- Normal match controls, including the existing automatic presser/chaser player switching (H1), are unchanged outside moments.
- The selected career position (DEF/MID/FWD → H3/H5/H8 slot) chooses which position-specific moments the player is offered and how they are graded; it does not lock match control.

## Three separate layers

| Layer | Question | Inputs | Must not use |
|---|---|---|---|
| Decision | Was the choice intelligent for this state? | Frozen state facts only | Attributes, execution roll, outcome |
| Execution | How well was it performed? | Choice + player attributes + seeded roll | — |
| Outcome | What happened next? | Sim continuation | — |

Attributes may change execution probability only. They never change the decision grade.

## Grading bands

`Elite`, `Strong`, `Playable`, `Low-value`, `Forced`. Every offered choice gets a band and a one-line rationale computed from state facts before the player chooses. `Forced` is reserved for moments where only one reasonable action exists, or for the timeout default.

## Decision Heat

Cumulative 0–100 per match: starts at 0 and adds a fixed band value per moment, normalised by the number of moments (proposed: Elite 100, Strong 80, Playable 55, Low-value 25, Forced 40), shown on the Match Report. Final weights need owner approval before shipping.

## Persistence and safety

- Decision records are written with the match result in one transaction keyed by the existing `resultKey`/run id, so a reload never applies a match or its decisions twice.
- Backgrounding during a moment keeps the freeze (existing coach e2e behaviour).

## Open owner questions

- Decision Heat weights (above are a proposal).
- Whether a decision timer applies in matches (Team Training already has a timed round).
