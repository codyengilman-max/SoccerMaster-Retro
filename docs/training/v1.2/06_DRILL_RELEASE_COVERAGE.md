# Team Training release coverage

Revision 1.2 · Resolves audit RT-04 at the handoff level

This is the authored coverage plan and the reporting contract for the current implementation. None of the eight adaptations is claimed implemented, calibrated or coach approved by this package. The paired `training-coverage-plan.json` is an authoring plan, not a runtime catalog. Its runtime IDs remain unbound until Devin maps the inspected game's actual registry; its activation flags are false.

## Role and focus bindings

Use canonical role labels below only to explain responsibilities. Map them explicitly to the current game's stable IDs and all supported formation slots. “Outfield” means LB, CB, RB, 6, 8, LW, 9 and RW. Preserve the player's identity and assigned role; the task within a drill is not a permanent role reassignment. The opponent roster and every visible participant must be real and feasible.

Focus names are semantic requirements, not invented runtime IDs. Bind the existing locked focus ID/revision to an authored matching objective. Do not rewrite a saved focus to make the mapping fit. Each permitted role must have a defined participant assignment and observable evidence predicate; one generic success threshold is insufficient.

| Family | Eligible role plan | Compatible focus concepts | Controlled task and participant assignment | Evidence and valid alternative | Missing/unsupported case |
|---|---|---|---|---|---|
| TT01 Receive under pressure | All outfield | Directional first touch; receiving under pressure | Controlled receiver + 2 supports vs 1 presser, then authored 2nd defender; preserve role-appropriate starting lane | First control creates a feasible next action away from observable pressure; bounce/shield may be preferable when turning is closed | Use another reviewed version of the same receiving objective and role, else unavailable |
| TT02 Show a passing angle | All outfield | Off-ball support; escaping a cover shadow | Controlled supporting player + 2 attackers vs 2 defenders; role-specific starting lane and reachable outlets | Creates a genuinely reachable passing angle; retain another valid support position if the nominal lane closes | Same support objective/role only, else unavailable |
| TT03 Use the overload | LB, RB, LW, RW | Wide overload; combining or carrying in a 2v1 | 2 attackers vs 1 defender + GK; controlled outside back or winger occupies their assigned lane with a complementary partner | Responds to defender/cover: carry or pass as available; reset/retain rather than force a closed lane | Do not turn a keeper/central player into a winger; unavailable unless an independently authored compatible version exists |
| TT04 Find the other side | All outfield | Switch of play; maintaining width and reset options | 4 attackers vs 3 defenders; controlled role stays in a compatible carrier/support/reset/far-outlet assignment; all roles cannot be forced to play far winger | Accessible far-side route recognized without abandoning a better local advantage; feasible local retain/recycle accepted | Switch-compatible role assignment required; otherwise unavailable |
| TT05 Pressure and cover | LB, CB, RB, 6 | Defensive pressure; cover; delaying a counterattack | 2 defenders + GK vs 3 attackers; controlled defender's task assigned from initial reach/danger and updated physically | Blocks dangerous route/delays while cover arrives; tackle not mandatory; impossible tackle attempt is not success | Do not grade a keeper as first presser; otherwise use a genuine same-focus defending adaptation or unavailable |
| TT06 React after loss | All outfield | Transition after loss; recovery and outlet denial | 3v3 with distinct safe outlet targets; controlled actor can be first presser, cover or recovery based on actual state | True controlled turnover distinguished from deflection; appropriate pressure/cover/recovery rather than all-player chase | Preserve role and transition objective; unavailable if no supported mapping |
| TT07 Choose the finish | 8, LW, 9, RW | Shot selection; cutback decision; arrival timing | 3 attackers vs 2 defenders + GK; carrier/late runner/finisher assignment compatible with controlled role | Sensible shot/pass/carry/reset given blockers and arrivals; a goal is not sufficient evidence of good choice | Do not reroute a keeper/defender into a striker task; unavailable unless compatible adaptation is separately authored |
| TT08 Build from the keeper | GK, LB, CB, RB, 6 | Goalkeeper distribution; buildup outlets; receiving/passing under a press where the actual authored objective matches | GK + 3 outfield supports vs 2 pressers; a GK career controls GK; an eligible outfield career occupies one of the three actual support slots | Playable outlet, support angle, wait/reposition or reset based on pressure; distinguish distribution and receiving sub-objectives in evaluation | Never treat every GK focus as distribution; require the exact compatible sub-objective or show unavailable |

Counts and role sets above are authored plans. Do not silently add phantom positions to satisfy a nine-player reference engine. If an actual approved runtime role model differs, document the narrow mapping/adjustment and retain its formation meaning. No global validation relaxation.

## Selection and fallback behavior

1. Read the original career/role, authoritative scheduled week and locked weekly focus. Use a deterministic, versioned selection seed for authored variation.
2. Filter only implemented, technically verified, eligible runtime adaptations whose actual objective matches that role/focus and whose required content gates pass. The source research flags remain unchanged.
3. Prefer a suitable unused/recently less-used variation within that eligible set using existing history if available. Variation must not create a new weekly entitlement. Do not promise nonrepetition when only one eligible adaptation exists.
4. If the chosen variation is unavailable, choose another adaptation only after the same eligibility/objective check. Do not weaken pressure artificially, change the player's role or clear the focus lock to make it fit.
5. If no compatible activity exists, show “No team drill is available for this focus yet.” Offer Back and optional Home Practice; preserve saved focus, status and history. Do not mark Complete or invent a gain. This is an explicit release coverage gap, not a technical success.

Goalkeeper behavior is intentionally explicit. TT08 does not automatically cover every focus a goalkeeper can receive. List any remaining GK focus gap in the delivery report; do not claim full-role coverage from a single distribution drill.

## Required runtime adaptation record

For each shipped adaptation, retain a versioned record with:

- Stable runtime drill ID and content version, local family ID and exact source seed/interaction IDs.
- Exact runtime focus IDs/revisions and role/formation bindings, including supported sub-objectives and player assignment.
- Actual participant IDs/role responsibilities, valid starting geometry, goal/outlet positions, half-field boundaries and session-scoped rules profile.
- Entry/abort conditions, perceptible cues, movement/contact feasibility, conditional evidence predicates, accepted alternatives and neutral feedback when evidence is absent.
- Attempts/time limits, reset/exit behavior, deterministic variation seed and duplicate-evidence rules.
- Technical implementation/calibration status separately from actual coaching-review status. Preserve required existing content gates. An authored prototype must be identified honestly.

## Required implementation report

Create `TRAINING_RELEASE_COVERAGE.md` in the game branch. Replace NOT VERIFIED cells only with evidence from actual code/tests. Include every planned family, even if deferred. Do not edit this handoff to claim tests ran before implementation.

| Family | Source seeds | Source interactions | Runtime status in this handoff | Focus/role bindings in current repo | Runtime evidence |
|---|---|---|---|---|---|
| TT01 | SIX01, EIGHT01 | I08 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT02 | CB02, SIX02 | I02, I08 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT03 | WING01, OB01 | I04, I08 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT04 | WING02, WING03 | I06, I08 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT05 | CB04, DEF01, DEF02 | I10, I11 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT06 | DT01, DT02, AT01 | I19, I20 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT07 | EIGHT03, WING04 | I17 | NOT VERIFIED | To bind after inspection | NOT RUN |
| TT08 | GK01, CB02 | I01, I02 | NOT VERIFIED | To bind after inspection | NOT RUN |

The implementation target is the eight listed families where their actual prerequisites are available. A partial release must explicitly name deferred families and unsupported role/focus combinations; it must not be described as the complete training library. An unavailable row cannot be presented as implemented simply because its UI route exists.

Required verification:

- **D01 — inventory:** enumerate every role and weekly focus the current release can assign; record eligible mappings or explicit gaps. Match the JSON plan's eight family IDs and source mappings.
- **D02 — alternatives:** exercise each enabled adaptation with the nominal option open and closed; evidence must accept a valid alternative and avoid imaginary explanations.
- **D03 — selection:** test focus locking, missing/unreviewed content, deterministic variation, compatible fallback and no-compatible-drill UI. No wrong-role reassignment or completion from opening a card.
- **D04 — isolation:** complete, abort, time out and fail safely out of every enabled adaptation. Then run a normal match in each supported formation, both attacking directions. Validate full roster rules, original input, camera, bounds, time, physics and no stale AI callbacks/commands.
- **D05 — identity and progression:** run with saved boy/girl choices and long names; verify the same career/entitlement binding and no duplicate match or story events.

These are implementation acceptance cases, not results from this package. A compiled catalog is not evidence that a coach approved its teaching or demonstrations.
