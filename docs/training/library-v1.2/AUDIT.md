# Full content audit and remediation report — v1.2

Date: 26 October 2026. Scope: both files in the v1.1 handoff, all 48 briefs, 13 existing source mappings, 2 new 9v9 references, role arithmetic, tactical wording, rules, scoring and import risks. Method: adversarial assistant desk review plus local structural tests. No separate human red team, game repository, engine build, runtime scenes or independent coach review was available.

## Verdict

The authored specification is now consistently constrained to 9v9 1-3-2-3 and excludes goalkeeper decisions. It is suitable for developer/coach scene authoring review. It is NOT cleared for player-facing scored training: the package contains no numeric scene geometry and no real-game runtime test evidence. Publishing the text is not equivalent to proving the choices correct in an animation.

The previous description 'fully reviewed 9v9 scenarios' would be too strong. Correct description: '48 source-informed, structurally checked 9v9 briefs with explicit adaptation and scene-approval requirements.'

## Findings and dispositions

| ID | Severity | Finding | Applied correction | Disposition |
|---|---|---|---|---|
| F01 | Critical | Source fidelity could override nine players | Hard two-team roster ceiling; partial views are subsets, not copied source teams | Specification fixed |
| F02 | High | Outside backs could be treated as additions to two CBs | Exactly one CB; named remaining outside back and DM cover for overlaps | All relevant cards fixed |
| F03 | High | Source S3 says four defenders | Explicit three-defender adaptation; four-back instruction excluded | Source mapping fixed |
| F04 | High | S4/S8 import risk: two CBs, midfield three, neutrals | Team-specific actor bindings; no neutrals or extra 10/8 | Source and cards fixed |
| F05 | High | Gygax 10v1 and 9v9 sections conflated | Separate source sections; no protected wide zones or four mandatory box runners | Source and cards fixed |
| F06 | High | Boothroyd includes an 11v11 final exercise | S12 restricted to Part 3; Part 4 excluded | Source mapping fixed |
| F07 | High | CB05 relied on unopposed circuit for an opposed answer | Added S8; explicit receiver/interception checks and draft gate | Evidence improved; scene test open |
| F08 | High | 11v11 analysis mistaken for 9v9 proof | S7/S9/S14 marked background only; S15 added; S12 strengthens cutback choices | Provenance fixed; human adaptation review open |
| F09 | High | ST03 omitted ball/own-half conditions | Added both; clarified contact timing and phase distinction | Text fixed; engine law tests open |
| F10 | High | Distances/timing undefined; yards/metres ambiguity | Unit-resolved provisional pitch, world-coordinate contract and blocked numeric_scene=null | Gate fixed; calibration open |
| F11 | High | Generic source support used as answer certification | Every record states authored adaptation and has no approval | Fixed; approval intentionally pending |
| F12 | Medium | Vague support/cover actors | Named ball owner, protagonist, visible evidence and coordination per card | 48/48 fixed |
| F13 | Medium | Identical principle variants could inflate mastery | Mirror/linked-perspective warning; idempotent slot key | Spec fixed; runtime implementation open |
| F14 | Medium | Counterfactual assumed always to reverse answer | Re-evaluation may yield tie/ambiguity; no forced reversal | Fixed |
| F15 | Medium | Cropped view could hide offside/cover evidence | Full state retained; influential actors must be visible | Spec fixed; camera tests open |
| F16 | Medium | Coach Code might be interpreted as approval authority | Human owner/coach signs; fictional coach only presents feedback | Fixed |
| F17 | Medium | Feedback only supported correct choices | Branch-specific critique requirement; success line not universal | Fixed |
| F18 | Medium | GK exclusion, sessions-only and graphics could regress | Migration/read-first requirements carried forward | Spec fixed; game implementation untested |
| F19 | Medium | A citation or cached approval might survive changed scenes | Hash-scoped approvals; source/rules/scene changes invalidate review | Spec fixed; implementation open |
| F20 | Medium | Retained S5/S3 support too broad for precise choices | Source limitations disclosed; decisions explicitly authored, not source-exact | Fixed labeling; no certification claimed |

## All-card review ledger

Every row inherits F01, F10–F19. 'Corrected' means the written brief/role mapping was corrected, not that a playable scene passed tests. All 48 remain blocked from player training pending geometry and human approval.

| Card | Phase | Specific finding/correction |
|---|---|---|
| CB01 | defend | One centre-back only; cover cannot abandon A_ST to double-team A_RW. |
| CB02 | press | Step only while pressure restricts the forward ball; opponent's turn reverses the recommendation. |
| CB03 | transition | Specify which runner is dangerous; do not prescribe an automatic tackle or chase. |
| CB04 | build | Replace source's two centre-backs with this back-three map; no neutral receiver. |
| CB05 | build | Add S8 opposed guidance to S13 technique; require a viable receiver first touch, not just an apparently clear line. |
| CB06 | defend | Switch pressure/cover only after role transfer; remove H_RB cover in counterfactual. |
| LB01 | build | Pass inside only if H_DM has a usable next action; touchline is a real boundary. |
| LB02 | defend | Back turned alone is insufficient; approach must arrive before receiver can exploit behind. |
| LB03 | transition | Home left and opponent right are not screen-left labels; threat changes determine recovery. |
| LB04 | wide | Replace four-back assumptions. If H_RB is already advanced or H_DM cannot screen A_ST, hold instead. |
| LB05 | cross | No neutral wide player or cross-only scoring. Show receiver, delivery path and opponent goalkeeper. |
| LB06 | transition | Define broken press as an actual completed bypass, not a generic animation cue. |
| RB01 | build | Mirror LB01 coordinates and facing; verify inside receiver is not facing an immediate trap. |
| RB02 | defend | Mirror pressure timing and cover, not merely left/right labels. |
| RB03 | transition | Recovery route is threat-led; do not glue the outside back to the touchline. |
| RB04 | wide | Only one outside back overlaps in this authored scene; absence of balance makes holding valid. |
| RB05 | cross | Byline path must be genuinely reachable; if A_LB can close it, recycling is acceptable. |
| RB06 | press | Do not screen a fast weak-side switch out of view; re-evaluate if passer gains time. |
| DM01 | build | Being visible is not enough: ensure reception space; followed movement can clear H_CM instead. |
| DM02 | defend | H_DM screens one named route, not every possible central pass. |
| DM03 | transition | S3 only supports transition context; S5 supports combining. Do not infer always-pass-back. |
| DM04 | build | No imported neutral player, second centre-back or artificial third-line offside boundary. |
| DM05 | combine | At the freeze the ball is with H_DM, not simultaneously with H_ST; defender reach determines release. |
| DM06 | transition | Keep two possession changes in event order; no free teleport of recovery players. |
| CM01 | receive | Only prefer a bounce when its lane and first-touch timing are viable; turn remains valid if pressure leaves. |
| CM02 | press | Two home midfielders, not a hidden midfield three; H_CM cannot press CB and mark DM simultaneously. |
| CM03 | support | New support must create a distinct passing angle; don't reward standing on H_ST's line. |
| CM04 | build | Carrying is conditional on available space and controllable ball, not a universal forward command. |
| CM05 | combine | Freeze precedes layoff; this is a different decision instant from DM05 and ST04, not three simultaneous balls. |
| CM06 | cross | Only one central midfielder joins the box here; no added number 10 or second number 8. |
| LW01 | wide | Show whether the second defender arrives in time; do not penalize a feasible 1v1 solely by headcount. |
| LW02 | press | Restrict outlet by angle and timing; no assumption that all passes are automatically closed. |
| LW03 | offside | Offside depends on ball AND second-last opponent; level is eligible; own half uses real pitch halfway. |
| LW04 | wide | Show the overlap and its cover, not a compulsory winger-inside script. |
| LW05 | cross | Do not use head-height delivery by default; offside checked on the crosser's relevant contact. |
| LW06 | cross | Cutback is not always best: receiver readiness and A_DM interception reach must be visible. |
| RW01 | wide | Mirror LW01 with preserved pressure and foot orientation. |
| RW02 | press | Use opponent's left back on home right; never confuse jersey number with role. |
| RW03 | offside | Mirror LW03 legally and spatially; include omitted opponents in second-last-opponent calculation. |
| RW04 | wide | Source is mixed-format; use only Part 3 delivery/support concepts, not Part 4 11v11 organization. |
| RW05 | cross | Mirror LW05; forbid copying two winger cards into one scene as extra players. |
| RW06 | wide | Reject blind service, but do not reject a newly opened dribble or shot; S12 strengthens receiver-selection evidence. |
| ST01 | receive | Close defender does not automatically permit turning; show actual escape side and ball control. |
| ST02 | press | No four-back opponent or extra midfielder imported. Abandon press if arrival/support condition fails. |
| ST03 | offside | Add missing ball condition. Returning after contact does not cure that phase; a later phase requires fresh assessment. |
| ST04 | combine | A third-player pattern is an option, not an enforced three-pass reward; compare direct turn when available. |
| ST05 | cross | Validate actual low-ball travel and arrival; avoid adult crossing distance or automatic heading. |
| ST06 | cross | No requirement to fill all four box zones with four runners; only named teammates occupy them. |

## Tests actually run

Offline validate_library.py completed successfully:
- 48 unique expected card IDs; six cards per outfield role.
- Two nine-player rosters; one GK each; no GK protagonist.
- Visible actors and ball owners resolve to those rosters.
- Source IDs and source sections resolve to 15 source records.
- Draft/approval flags, alternatives, feedback and changed-cue requirements present.
- Proposed metre/yard conversion consistent.
- 20 deliberately invalid mutations rejected (extra/duplicate actors, extra team, GK decision, wrong formation, unknown/duplicate sources, missing cards/alternatives/sections, invalid approval and unit changes).

These tests check structure and truthful status, not tactical quality, source-link uptime or opponent interception physics. The script is a draft-content linter, not a production approval service. It intentionally rejects approval flags in this unvalidated draft.

## Required runtime acceptance tests — NOT RUN

For every card, author and review:
1. Baseline frozen scene supports the preferred action using visible evidence.
2. Changed cue changes suitability or reveals ambiguity; no fixed answer index.
3. Each defensible alternative receives appropriate feedback, not automatic failure.
4. Opponent reach, ball travel, recovery timing and first touch are plausible at the chosen age/skill.
5. Missing actors cannot influence the action window; otherwise show them.
6. Legal offside timing, ball criterion, own half, level position and second-last opponent are correct.
7. Mirrored scenes preserve tactics while transforming side/facing/velocity.
8. Possession events and ball/sprite contact are synchronized; a successful demo earns no independent mastery.
9. Portrait/landscape keep decision evidence legible and retain protagonist highlighting.
10. Reload, retry, back navigation and replay cannot duplicate slot rewards.

## Outstanding approvals / inputs

- Exact current local competition rules and numeric scene geometry.
- Human coaching review of authored 9v9 adaptations and acceptable answers.
- Source snapshot/scene hash approval records.
- Actual runtime implementation and regression tests.
- Full 108-slot season schedule, which was not present in v1.1 and has not been fabricated here.

No new scenario IDs were necessary. We repaired the existing catalog rather than using additional cards to hide unresolved defects. Further scenarios should be added only to address a demonstrated curriculum gap after these foundational scenes are reviewed.

