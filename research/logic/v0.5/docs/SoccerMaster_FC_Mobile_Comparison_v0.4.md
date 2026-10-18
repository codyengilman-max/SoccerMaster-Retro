# SoccerMaster 9v9 compared with EA SPORTS FC Mobile — v0.4

Review date: 17 October 2026. Additive comparison to the v0.3 role review.

## Scope and verdict

FIFA Mobile is interpreted as EA SPORTS FC Mobile. Benchmark continuous Head-to-Head-style play; do not infer full-match AI from isolated scoring-chance modes. Sources below concern Mobile, not console/PC FC. This is a documentation comparison, not hands-on testing, video analysis, reverse engineering or a claim of parity. Historical updates describe intended behavior at release; no assumption that every tuning value survives unchanged in today's build.

Our nine-role structure is compatible with several documented Mobile design principles. The largest unresolved gap is execution: useful runs must become reachable passes, and defensive decisions must survive realistic movement, contact and recovery. Neither our draft nor EA's public notes establish that our engine is accurate or more advanced.

## Verified EA observations

- EA's Game Plans announcement describes mentality affecting forward commitment, width and line height. Roles/work rates still influence runners; changing a plan requires players to move into position. The feature is scoped to H2H and certain PvE matches, excluding VSA and Manager Mode [F1]. Its text disagrees about the number of saved plans, so that count is not used here.
- EA's 2025 Leagues update describes ground through-passes considering space and receiver momentum, improved chasing defense, and removal of skill-move stun in H2H [F2].
- The September 2025 Mobile 26 update describes long lofted-pass travel/accuracy tradeoffs, pressure-dependent crossing, and adjustments targeting kickoff rush [F3].
- EA's launch gameplay notes separate shooting aim, context and attributes, and describe player differences in movement, stamina and technique [F4].

These are documented product intentions, not independently measured outcomes or disclosed algorithms.

## Role-by-role comparison and requirements

Everything in the final column is our proposed design, not a description of EA's internal implementation.

| Our slot | Relevant benchmark | Required SoccerMaster behavior |
|---|---|---|
| GK | Physical continuity and attribute-sensitive execution | Commit, save, hold or sweep from perceived cues; persist rebounds and handling state; stop pursuing a ball once dead |
| Right outside back | Forward commitment has defensive cost | Time overlap with winger's intention; delay a second advancing defender if counter threats are uncovered |
| CB | Lofted passes give defenders a physical response window | Evaluate trajectory and arrival; turn/drop realistically; no instantaneous turn or artificial catch-up speed |
| Left outside back | Same coordination problem on the other side | Mirror geometry while retaining this player's actual footedness, acceleration and recognition |
| 6 | Useful passing access and defensive balance | Become a reachable outlet, not a token in midfield; cover actual counter routes |
| 8 | Role-sensitive forward movement | Support or run beyond based on space and cover; no automatic run at every possession change |
| Right winger | Receiver movement must match pass delivery | Maintain width or time depth; do not stop unnecessarily to receive a playable lead pass |
| 9 | Shot context and run timing matter | Choose check/pin/depth and adjust run timing to passer readiness; finishing remains physically contestable |
| Left winger | Passing and finishing context on the opposite side | Choose switch outlet versus finishing run; width handover must occur before both options are assumed available |

## Changes needed before implementation sign-off

### M01 — Couple passing to receiving

Estimate a reachable interception/contact point from passer capability, ball travel and receiver movement. Compare pass to feet and pass into space. At input commitment, lock the user's intended target/area according to the existing control specification; do not silently retarget because another teammate scores better tactically. After release, the receiver adjusts to real flight and defenders can intercept. Avoid passes that track their recipient like homing projectiles. Separate decision quality from execution error.

### M02 — Give runs a beginning and an end

Each run needs an observed trigger, target region, timing window and abort cue. Delay a run when the passer cannot deliver. A failed wall pass must cancel or redirect the third-player action. Movement should be readable and responsive while preserving finite acceleration and turning. Do not add a new run-trigger control as part of this comparison.

### M03 — Make defending physically credible

Pressure, cover, balance and recovery remain separate assignments. Choose reachable pressure angles; brake before overshooting where possible. A beaten defender may recover through movement and anticipation, not hidden speed boosts or teleporting tackles. Blocking/slide actions must retain the existing input contract; this review does not add a new standing-tackle button.

### M04 — Make team policy modify risk, not outcomes

Attacking/defensive policy changes desired commitments and spacing, with role-specific constraints and real movement delay. Do not force every player forward or grant immediate reorganized shape. In 9v9, account for only one nominal CB and two central midfielders; do not copy an 11v11 template and delete two players. A policy change cannot generate guaranteed goals or saves.

### M05 — Connect finishing to the whole interaction

Evaluate angle, distance, pressure, balance, foot/contact and goalkeeper/blockers. Include an extra touch, pass, cutback or delay when feasible. Receiver arrival and delivery quality influence finishing opportunities. Keep long-range shots possible but difficult through calibrated execution rather than a blanket ban. Do not import adult heading mechanics into youth play without the selected rules profile allowing them.

### M06 — Audit repeatable exploits

Test kickoff-to-long-ball patterns across varied defenders, passer ability and pressure. Prevent skill-command spam from resetting defender reaction, fatigue or balance. No automatic stun effect. Do not solve exploits by making a legitimate tactic always fail; preserve genuine speed/position advantages with ordinary physical constraints.

### M07 — Match perceived responsiveness to simulation truth

Measure input-to-visible-response, touch-to-release and action-to-next-control on the target phone. Record frame stalls and canceled actions. Use current engine measurements to set budgets; do not invent EA latency numbers. Visual feedback may acknowledge input immediately while the kick waits for physically valid contact. Cosmetic animation must not silently delay a ready action beyond the modeled contact timing.

## Acceptance scenarios — not executed

1. Moving winger receives a lead pass without arbitrary stopping; repeat under pressure and with different passing ability.
2. Same aim with receiver stationary versus running gives a physically valid and intentional delivery.
3. Receiver changes direction after release: ball does not home toward the new location.
4. Pressed crosser and unpressured crosser differ in calibrated execution risk without guaranteed failure/success.
5. Kickoff long ball against different starting positions and speeds has credible counters without magical defender recovery.
6. Defender overshoots, brakes and recovers without a frozen animation or speed cheat.
7. Repeated skill/cancel commands grant no free stun or fatigue reset.
8. 8 makes a run only while a usable passing opportunity and adequate balance exist.
9. 9 checks and winger runs beyond; opposition can hand over or track through actual movement.
10. Far winger narrows: switch access is reassigned or the passer chooses another option.
11. Policy changes alter team intentions gradually; no teleportation or contradictory assignments.
12. Blocked shot creates a contested rebound rather than awarding possession from a scenario label.
13. Target-device replay preserves simulation behavior across render rates and pause/resume.
14. Same fixtures mirrored and played by both teams; player attributes, not side identity, explain asymmetry.

## Adoption decision

Adopt the benchmarks of readable movement, meaningful attributes, contextual passing/shooting and real attack-versus-cover tradeoffs. Retain our more explicit 9v9 teaching requirements as a design goal, without claiming superiority. Do not import new buttons, sprint controls, skill inventories, card systems or a different formation from this review. Existing control/ball-dynamics specifications remain authoritative for their domains and must be read before implementation.

The next verification step is to run the above situations in SoccerMaster, collect per-player decisions and ball trajectories, and inspect corresponding gameplay recordings. This package contains requirements and sources, not a tested implementation.

## Sources

F1. EA, Game Plans Deep Dive (official FC Mobile forum announcement; retrieved 17 October 2026):
https://forums.ea.com/blog/ea-sports-fc-mobile-game-info-hub-en/game-plans-deep-dive/13738698

F2. EA, Mobile Leagues Update — Gameplay Improvements 2025:
https://www.ea.com/en-gb/playtesting/news/gameplay-improvements-2025

F3. EA, FC Mobile 26 Update — Gameplay Deep Dive, 25 September 2025:
https://www.ea.com/games/ea-sports-fc/fc-mobile/news/fc-mobile-26-update-gameplay

F4. EA, FC Mobile launch gameplay deep dive (historical 2023 baseline; article body explicitly identifies Mobile despite unusual URL path):
https://www.ea.com/games/battlefield/news/fc-mobile-gameplay-deep-dive
