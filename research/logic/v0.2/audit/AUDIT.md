# Adversarial design audit — 13 October 2026

## Scope

Reviewed the entire 24,054-byte v0.1 foundation, its 40 scenario rows, source
attributions, proposed decision architecture, statistical interpretation and
handoff risks. Reopened the four UEFA pages S2, S3, S4 and S8 whose detailed
claims previously depended in part on search results; they support the scoped
qualitative statements. Existing retrieved text supports the other cited
observations. No embedded video was watched and no entire season dataset was
analyzed. The audit does not cover unseen prior chats, other Library files,
the game source, dependencies, hosting, authentication or multiplayer services.

Method: trace claims to evidence; challenge tactical rules with counterexamples;
trace information available to a player; examine conflicts and state transitions;
consider repeated-input and evaluation exploits; verify preservation and data
gates programmatically. This was one adversarial review, not multiple independent
reviewers or a penetration test.

## Findings and dispositions

Severity here means implementation risk if the draft were treated as production
instructions. It is not a CVSS score or a finding of an exploited vulnerability.
All listed documentation defects have a specified correction. Runtime risks
remain open until implemented and tested against the game.

| ID | Severity | Finding / failure case | Correction and location | Disposition |
|---|---|---|---|---|
| A01 | High | Seeds could be mistaken for executable, validated scenarios | Explicit draft status, production disabled, missing-fields lists and catalog guard | Fixed in data/spec; runtime integration untested |
| A02 | High | Scenario choice may leak exact hidden world state | Per-player observation boundary; privileged physics isolated from decisions, C01 | Fixed in specification; runtime gate T01 |
| A03 | High | Two scenarios can assign the same player incompatible duties | Atomic unit assignments, task priorities, expiry and hysteresis, C02 | Fixed in specification; runtime gate T02 |
| A04 | High | Direct switch, kick or claim may bypass trajectory/interception physics | Feasibility check, swept ball flight and continuous contested state, C03 | Fixed in specification; runtime gates T03/T04 |
| A05 | High | Tactical updates can vary with device frame rate or pause duration | Simulation-time scheduling, ordered events and replay contract, C04 | Fixed in specification; runtime gate T05 |
| A06 | High | Rapid gestures can duplicate kicks or reset reactions | One action per accepted command; dedupe, cancellation, no free reset, C05 | Fixed in specification; runtime gate T06 |
| A07 | High | Youth rules are named but not sufficiently configured | Required versioned rules profile; unsupported profile blocks competitive play, C06 | Fixed in specification; runtime gate T07 |
| A08 | High | Winners-only analysis and aggregate percentages can become action rewards | Explicit denominators and no derived action odds; evidence confidence separated from applicability, C07 | Fixed in evidence/spec; statistical calibration pending |
| A09 | High | Ten-season completeness implied by a broad research label | Ten explicit ledger rows; no row marked fully analyzed | Fixed in data; missing research remains open |
| A10 | High | Adult spatial patterns could become adult youth execution parameters | Separate format, ability, physical and rules profiles; no unvalidated parameter transfer, C08 | Fixed in specification; youth calibration pending |
| A11 | Medium | Carry-until-commit wording implies defenders must eventually engage | Conditional carry with shot, support, loss-of-control and pressure exits, C09 | Corrected in v0.2 |
| A12 | Medium | WING01 implies a winger can force an opponent response | Replace guarantee with an attempt to provoke; preserve defender autonomy | Corrected in v0.2 |
| A13 | Medium | AT02 treats early level support as inherently wrong | Evaluate timing/angle; level support may be useful | Corrected in v0.2 |
| A14 | Medium | Turnover feedback may infer an unseen cause with certainty | Separate observation, decision assessment, execution result and uncertain attribution, C10 | Fixed in specification; runtime gate T08 |
| A15 | Medium | Repeated safe passing or switches could farm tactical rewards | Reward net situation improvement, cap repeated-loop credit and preserve risk, C10 | Fixed in specification; runtime gate T09 |
| A16 | Medium | Fixed global action weights may double-count progress and ignore uncertainty | Versioned value definitions and horizons; uncertainty-aware alternatives, C11 | Fixed in specification; calibration pending |
| A17 | Medium | References lack machine-readable claim and coverage status | 18-entry register distinguishes source verification from causal, youth and implementation evidence | Fixed in data |
| A18 | Medium | Seed count hides gaps in finishing, perception and restarts | Explicit coverage backlog; do not claim complete soccer coverage | Fixed in docs; catalog expansion pending |
| A19 | Medium | Text sources could become executable instructions in an AI import pipeline | Strict data-only parsing, length/enum/finite-value checks and no eval, C12 | Fixed in specification and catalog validator |
| A20 | Medium | No reproducible boundary between preserved original and corrections | Immutable archive checksum, two commits, tracked diff, archive provenance | Fixed and checked |
| A21 | Medium | Repository deliverable could be mistaken for a GitHub push | Remote status documented; no fabricated remote URL or access claim | Fixed in README/handoff |
| A22 | Medium | Data and article access could be mistaken for permission to redistribute entire sources | Store own paraphrases/links; no raw provider dataset or full article republication, C07 | Fixed in package; dataset-use review remains open |
| A23 | Medium | Finishing rules not specified despite engine ambitions | Add finishing/shot selection requirements and specific validation gaps, C13 | Fixed as requirements; models and fixtures pending |
| A24 | Medium | A deterministic counter rule could prevent legitimate attacking success | Defenders choose from perceived feasible responses; never guaranteed prevention, C09 | Fixed in specification; runtime gate T10 |

## Corrections to football wording

- CB01: a carry has conditional exit cues; the defender is free to keep delaying.
- WING01: provoke a response, not guarantee commitment.
- AT02: retain passing access and appropriate timing; do not ban level support.
- OB04: recovery shape responds to observed ball travel, passer orientation and
  threats; avoid an automatic full expansion the instant a switch starts.
- The opposite winger's width-versus-second-striker duty is assigned explicitly
  rather than left to two simultaneously active patterns.
- Good-choice feedback uses the available observation, not post-action hindsight.

## Residual work — not falsely marked fixed

No code-level exploit can be closed without game code. Required follow-up:
implement the contracts; build spatial fixtures; run every runtime acceptance
case; obtain appropriate datasets; complete ten-season extraction; calibrate
probabilities and youth behavior; benchmark the target phone. Sources support
ideas but do not validate the authored scenarios.

## Verification boundary

Repository checks verify preservation, references, counts, explicit production
blocking and ledger structure. Negative tests challenge corrupted IDs, missing
sources, accidental production enablement and misleading validation status.
They do not simulate football or validate a trained statistical model.

