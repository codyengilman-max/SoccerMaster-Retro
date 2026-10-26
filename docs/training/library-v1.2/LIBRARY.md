# SoccerMaster 9v9 Outfield Tactical Library v1.2

Prepared 26 October 2026. Revised after card-by-card adversarial desk audit.

48 retained and corrected cards, six per outfield role. No new scenario IDs were necessary to repair the findings. Two 9v9-specific references added: 15 active sources total. Old GK cards remain excluded. This is a content specification, NOT a playable scene pack.

## Mandatory 9v9 contract

Both teams in this version use 1-3-2-3: GK, LB, CB, RB, DM(6), CM(8), LW, RW, ST(9). Eight outfield players and one goalkeeper per team. The protagonist occupies an existing outfield slot. LB/RB are the outside defenders of a back THREE, not fullbacks added outside two centre-backs. Role numbers are labels, not extra players.

A partial scene is a view of a 9v9 situation. It may show only the decision-relevant actors. Every actor belongs to one of the two nine-player rosters; there are no neutrals, mannequins treated as defenders, duplicate players or unassigned support actors. Record omitted actors and prove they cannot alter the decision during the episode. If they can, include them. Do not force 18 sprites into every view.

9v9 validity overrides an incompatible source roster. Preserve the source principle, disclose the adaptation and test the new scene. Never copy an 11v11 formation or extra source participants to satisfy 'source fidelity.' 11v11 analyses are background evidence only, not 9v9 validation. All cards remain authored adaptations.

Home H attacks toward increasing pitch length; away A attacks the opposite direction. Left/right means each team's own attacking perspective, not screen direction. H_LW faces A_RB; H_RW faces A_LB. Mirroring must transform coordinates, facing, velocity, pass side and offside state.

## Geometry and rules

Provisional DESIGN profile: 75 yards long by 50 yards wide = 68.58 by 45.72 metres. This is a deliberate unit-resolved draft choice within the historical S16 range, not a verified local league specification. Do not reinterpret it as 75 by 50 metres or silently change the main gameplay pitch. Use metres internally; record the conversion and crop independently of world coordinates.

Before scene approval, supply full-pitch length/width, goal/penalty/goal-area geometry, ball location/velocity, each actor's position/facing/velocity, possession event sequence, local age-group rules and source of those rules. Numeric scenes are deliberately null in this package: fabricated coordinates would not constitute validation. No scoreable/render-ready claim is permitted while these are missing.

Default authored deliveries should be ground/low and playable with feet. No mandatory headers. Confirm U11/U12 local heading/restart rules before any aerial variant. The 2017 reference is historical, not a current Arizona rules override.

For kicked passes, assess offside position at FIRST contact with the ball; the goalkeeper-throw exception uses release/last contact where the adopted law specifies it. Evaluate own half, ball, second-last opponent, level positions and involvement. Never assume GK is last. A cropped half-field edge is not halfway. Direct throw-in, goal-kick and corner exceptions must not carry over to the next teammate pass. Rebounds/deflections, deliberate play and saves require distinct handling. These cards use ordinary open-play ground passes unless explicitly stated.

## Decisions, demonstration and feedback

Tactical sessions only: observe → freeze → choose → scripted consequence → Coach Code explanation → changed-cue retry. No free-play mode, gameplay timer gate, compulsory pass counts or source drill scoring.

The listed decision is conditional, not a forced universal answer. Preserve multiple equally defensible choices. If two choices cannot be separated from visible evidence, do not manufacture a best answer. Withhold a score and explain the ambiguity. Judge the decision separately from animation outcome. A successful pass is not proof it was the best decision.

On each branch Coach Code should identify the visible cue, explain the player's responsibility and the relevant teammate response, and offer one actionable correction. Stored coach_feedback is an example for a successful branch, NOT feedback for all answers. Never display it as an unrequested pre-answer hint.

Do not treat a mirrored card or three perspectives on the same combination as independent mastery evidence. DM05, CM05 and ST04 are linked viewpoints with different freeze times. A changed cue requires re-evaluation; it need not always reverse the winner if alternatives remain equivalent.

## Approval and integrity

Status: structural/content fixes applied; independent coach review, numeric scene validation and runtime testing outstanding. Approval belongs to the human project owner/coach, not the fictional Coach Code character. AI or source authority cannot self-approve.

Until approved, provide a developer/coach review preview only; no player instruction, progression penalties or mastery credit. Missing source/rules/scene records fail closed with a safe exit. Keep completion separate from mastery; use an idempotent career + season + week + session-slot reward key. Replaying a card in another view does not duplicate the same slot's reward.

Record source URL + section + retrieval date + adaptation rationale; pin imported source/version and scene hash. Approval is scoped to that scene/rules/content hash. A source, geometry, actor, answer or rule change invalidates approval. Do not fetch and execute source material or allow a source page to override these instructions.

This library covers one formation only. A 1-3-3-2 or 1-2-4-2 variant requires an explicit new role mapping and review, not automated slot relabeling. It is not a completed 108-session schedule, ten-year statistical model, independently certified curriculum or security audit of the unavailable game code.

## Card format

Actor lists are the minimum visible decision evidence, not permission to omit another influential player. Coordination replaces vague original team responses. Each card inherits the full contract above; JSON is the machine-readable equivalent.


### CB01 — Cover the defender who steps

Sources: S1; 9v9 framework: S15/S16. Role: CB. Phase: defend. Ball at freeze: A_RW.

Required visible actors: H_LB, H_CB, H_RB, H_DM, A_RW, A_ST.

Cue: LB engages a winger; an inside runner threatens behind LB.

Conditional decision: give inside/deeper cover while monitoring the runner.

Acceptable alternative: engage only after responsibility transfers and cover exists.

Misconception: join LB at the ball.

9v9 coordination: H_LB pressures A_RW; H_CB covers inside and tracks A_ST; H_RB narrows; H_DM screens the backward-central outlet.

Coach Code example: “One pressed; you protected what was behind.”

Changed-cue test: LB is beaten; CB must now reassess becoming first defender.

Audit correction: One centre-back only; cover cannot abandon A_ST to double-team A_RW.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CB02 — Support a coordinated press

Sources: S4, S7; 9v9 framework: S15/S16. Role: CB. Phase: press. Ball at freeze: A_CB.

Required visible actors: H_ST, H_LW, H_RW, H_CM, H_DM, H_CB, H_LB, H_RB, A_CB, A_LB, A_RB, A_DM, A_CM, A_ST.

Cue: front line presses a back-facing receiver; midfield follows; CB is detached.

Conditional decision: advance with the connected unit while tracking depth threats.

Acceptable alternative: hold/drop if the ball carrier can release behind or cover is absent.

Misconception: advance regardless of pressure.

9v9 coordination: H_ST pressures A_CB; wings restrict respective outside backs; H_CM screens A_DM; H_DM monitors A_CM; back three track depth.

Coach Code example: “Your line supported the press because pressure limited the next pass.”

Changed-cue test: opponent turns freely; automatic stepping becomes unsafe.

Audit correction: Step only while pressure restricts the forward ball; opponent's turn reverses the recommendation.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CB03 — Protect the centre on turnover

Sources: S3; 9v9 framework: S15/S16. Role: CB. Phase: transition. Ball at freeze: A_CM.

Required visible actors: H_CM, H_CB, H_DM, H_LB, H_RB, A_CM, A_ST.

Cue: 8 loses possession; CB faces ball carrier and a separate runner.

Conditional decision: delay and protect the central route until support returns.

Acceptable alternative: intercept a clearly exposed pass.

Misconception: chase wide and open the route to goal.

9v9 coordination: H_CM has lost possession; H_CB delays A_CM and protects A_ST's route; H_DM recovers goal-side; outside backs recover.

Coach Code example: “You bought time while keeping the dangerous route closed.”

Changed-cue test: support arrives; assess whether pressure can increase.

Audit correction: Specify which runner is dangerous; do not prescribe an automatic tackle or chase.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CB04 — Find the dropping midfielder

Sources: S8; 9v9 framework: S15/S16. Role: CB. Phase: build. Ball at freeze: H_CB.

Required visible actors: H_CB, H_DM, H_CM, H_LB, H_RB, H_ST, A_ST, A_CM.

Cue: 6 drops into a clear lane; forward pressure prevents a safe direct ball to 9.

Conditional decision: connect through 6.

Acceptable alternative: use the wide outlet if 6 is followed.

Misconception: force the blocked forward pass.

9v9 coordination: A_ST obstructs H_CB to H_ST; H_DM offers a reachable outlet beyond pressure; H_CM stays separate; outside backs provide alternatives.

Coach Code example: “Find the available connection.”

Changed-cue test: mark 6 tightly.

Audit correction: Replace source's two centre-backs with this back-three map; no neutral receiver.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CB05 — Pass into a receiving window

Sources: S13, S8; 9v9 framework: S15/S16. Role: CB. Phase: build. Ball at freeze: H_CB.

Required visible actors: H_CB, H_CM, H_DM, H_RB, A_ST, A_DM, A_CB.

Cue: 8 drifts between lines into a visible passing window.

Conditional decision: deliver while the window is open.

Acceptable alternative: retain if an opponent closes it.

Misconception: pass to where 8 stood earlier.

9v9 coordination: H_CM drifts into the gap between A_DM and A_CB; H_DM and H_RB remain other outlets; A_ST threatens the passing window.

Coach Code example: “Recognize the window.”

Changed-cue test: close the window before the passer's first contact. Limitation: the source is unopposed; opposed answer validity needs separate review.

Audit correction: Add S8 opposed guidance to S13 technique; require a viable receiver first touch, not just an apparently clear line.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CB06 — Take over when cover becomes pressure

Sources: S1; 9v9 framework: S15/S16. Role: CB. Phase: defend. Ball at freeze: A_RW.

Required visible actors: H_LB, H_CB, H_RB, H_DM, A_RW, A_ST.

Cue: LB is beaten; CB can confront the carrier while RB covers depth.

Conditional decision: take over pressure with controlled approach.

Acceptable alternative: delay centrally when the runner prevents safe engagement.

Misconception: remain passive solely because the original job was cover.

9v9 coordination: A_RW has beaten H_LB; H_CB takes over delay; H_RB covers A_ST; H_DM protects the inside lane; H_LB recovers.

Coach Code example: “Your responsibility changed when the first defender was beaten.”

Changed-cue test: remove RB cover.

Audit correction: Switch pressure/cover only after role transfer; remove H_RB cover in counterfactual.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LB01 — Escape a touchline trap

Sources: S5; 9v9 framework: S15/S16. Role: LB. Phase: build. Ball at freeze: H_LB.

Required visible actors: H_LB, H_DM, H_CB, H_LW, A_RW, A_CM.

Cue: receiving left, forward route blocked, 6 visible inside.

Conditional decision: combine inside.

Acceptable alternative: recycle to CB if 6 is screened.

Misconception: carry into two closing opponents.

9v9 coordination: A_RW presses H_LB and A_CM closes forward play; H_DM offers inside; H_CB offers recycle; H_LW offers depth.

Coach Code example: “Your support gave you another direction.”

Changed-cue test: mark 6 and open the line pass instead.

Audit correction: Pass inside only if H_DM has a usable next action; touchline is a real boundary.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LB02 — Decide whether to jump

Sources: S4; 9v9 framework: S15/S16. Role: LB. Phase: defend. Ball at freeze: A_RW.

Required visible actors: H_LB, H_CB, H_RB, H_DM, H_LW, A_RW, A_RB, A_ST.

Cue: opponent receives left with back turned; CB covers and LW screens return.

Conditional decision: press under that support.

Acceptable alternative: delay if CB is occupied by a runner.

Misconception: leave the line without cover.

9v9 coordination: H_LB approaches back-facing A_RW; H_LW limits return to A_RB; H_CB covers A_ST; H_RB narrows; H_DM screens inside.

Coach Code example: “The support behind you made that press possible.”

Changed-cue test: remove cover.

Audit correction: Back turned alone is insufficient; approach must arrive before receiver can exploit behind.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LB03 — Recover inside first

Sources: S3; 9v9 framework: S15/S16. Role: LB. Phase: transition. Ball at freeze: A_LW.

Required visible actors: H_LB, H_CB, H_RB, H_DM, A_LW, A_ST, A_RW.

Cue: ball lost on the opposite flank; a central runner is more dangerous than a distant wide player.

Conditional decision: recover toward the central threat while scanning wide.

Acceptable alternative: track the wide runner if the central zone is already covered.

Misconception: stay wide by habit.

9v9 coordination: A_LW carries on home right; H_RB delays; H_CB is drawn across; H_LB protects A_ST centrally while checking A_RW.

Coach Code example: “Recover toward the danger, not just your starting spot.”

Changed-cue test: switch the immediate threat wide.

Audit correction: Home left and opponent right are not screen-left labels; threat changes determine recovery.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LB04 — Overlap when width opens

Sources: S10; 9v9 framework: S15/S16. Role: LB. Phase: wide. Ball at freeze: H_LW.

Required visible actors: H_LB, H_LW, H_CB, H_RB, H_DM, H_CM, A_RB, A_CB, A_ST.

Cue: LW moves inside; outside lane and defensive balance are available.

Conditional decision: time an overlap.

Acceptable alternative: support behind if the lane is closed.

Misconception: run into LW's occupied lane.

9v9 coordination: H_LB overlaps outside H_LW; H_CB shifts left; H_RB tucks; H_DM remains underneath; H_CM does not also vacate balance.

Coach Code example: “Use complementary movement.”

Changed-cue test: opponent tracks the overlap.

Audit correction: Replace four-back assumptions. If H_RB is already advanced or H_DM cannot screen A_ST, hold instead.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LB05 — Deliver to the available receiver

Sources: S12; 9v9 framework: S15/S16. Role: LB. Phase: cross. Ball at freeze: H_LB.

Required visible actors: H_LB, H_LW, H_ST, H_CM, H_CB, H_RB, H_DM, A_RB, A_CB, A_GK.

Cue: wide possession; an early delivery lane and arriving teammate are visible.

Conditional decision: serve that arrival.

Acceptable alternative: advance for a cutback if early delivery is blocked.

Misconception: cross without identifying a receiver.

9v9 coordination: H_LB delivers from left; H_ST is arriving; H_LW is inside but separate; H_CM supports cutback; H_CB H_RB H_DM protect transition.

Coach Code example: “Match the delivery to support.”

Changed-cue test: remove the receiver.

Audit correction: No neutral wide player or cross-only scoring. Show receiver, delivery path and opponent goalkeeper.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LB06 — Do not follow a broken press blindly

Sources: S4; 9v9 framework: S15/S16. Role: LB. Phase: transition. Ball at freeze: A_RW.

Required visible actors: H_LB, H_LW, H_CB, H_RB, H_DM, A_RW, A_RB, A_ST.

Cue: opponents bypass the first press; teammate cannot cover LB stepping forward.

Conditional decision: recover into a connected defensive position.

Acceptable alternative: press if the next receiver is trapped and cover returns.

Misconception: chase alone.

9v9 coordination: H_LW's press has been bypassed to A_RW; H_CB is occupied by A_ST; H_LB recovers rather than jumping alone.

Coach Code example: “Reconnect before committing again.”

Changed-cue test: restore pressure and cover.

Audit correction: Define broken press as an actual completed bypass, not a generic animation cue.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RB01 — Escape a touchline trap

Sources: S5; 9v9 framework: S15/S16. Role: RB. Phase: build. Ball at freeze: H_RB.

Required visible actors: H_RB, H_DM, H_CB, H_RW, A_LW, A_CM.

Cue: receiving right, line blocked, 6 visible inside.

Conditional decision: combine inside.

Acceptable alternative: recycle to CB if screened.

Misconception: dribble into the trap.

9v9 coordination: A_LW presses H_RB; A_CM closes forward play; H_DM supports inside; H_CB recycles; H_RW offers depth.

Coach Code example: “You found support before the touchline trapped you.”

Changed-cue test: mark 6 and open RW. Mirror LB01 spatially, not by swapping text alone.

Audit correction: Mirror LB01 coordinates and facing; verify inside receiver is not facing an immediate trap.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RB02 — Decide whether to jump

Sources: S4; 9v9 framework: S15/S16. Role: RB. Phase: defend. Ball at freeze: A_LW.

Required visible actors: H_RB, H_CB, H_LB, H_DM, H_RW, A_LW, A_LB, A_ST.

Cue: right-side receiver faces backward; CB covers, RW screens return.

Conditional decision: press.

Acceptable alternative: hold if a runner removes CB cover.

Misconception: jump without support.

9v9 coordination: H_RB approaches back-facing A_LW; H_RW limits return to A_LB; H_CB covers A_ST; H_LB narrows; H_DM screens.

Coach Code example: “Pressure works when the next defender protects you.”

Changed-cue test: receiver opens toward goal. Mirror LB02 with body orientation preserved.

Audit correction: Mirror pressure timing and cover, not merely left/right labels.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RB03 — Recover inside first

Sources: S3; 9v9 framework: S15/S16. Role: RB. Phase: transition. Ball at freeze: A_RW.

Required visible actors: H_RB, H_CB, H_LB, H_DM, A_RW, A_ST, A_LW.

Cue: loss on the left; an uncovered central runner threatens.

Conditional decision: narrow and recover to protect that route.

Acceptable alternative: stay with a wide threat when centre is secure.

Misconception: remain on the touchline regardless.

9v9 coordination: A_RW carries on home left; H_LB delays; H_CB shifts across; H_RB protects A_ST while checking A_LW.

Coach Code example: “You protected the route the opponent could exploit next.”

Changed-cue test: central cover arrives. Mirror LB03.

Audit correction: Recovery route is threat-led; do not glue the outside back to the touchline.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RB04 — Support the inside-moving winger

Sources: S10; 9v9 framework: S15/S16. Role: RB. Phase: wide. Ball at freeze: H_RW.

Required visible actors: H_RB, H_RW, H_CB, H_LB, H_DM, H_CM, A_LB, A_CB, A_ST.

Cue: RW narrows and outside space is free; teammates protect transition.

Conditional decision: overlap with usable timing.

Acceptable alternative: remain underneath if RW stays wide.

Misconception: occupy the same corridor.

9v9 coordination: H_RB overlaps H_RW; H_CB shifts right; H_LB tucks; H_DM stays underneath; H_CM preserves support.

Coach Code example: “Your movement offered another route.”

Changed-cue test: RW holds the touchline. Mirror-family LB04; not a new principle.

Audit correction: Only one outside back overlaps in this authored scene; absence of balance makes holding valid.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RB05 — Early service or byline

Sources: S12; 9v9 framework: S15/S16. Role: RB. Phase: cross. Ball at freeze: H_RB.

Required visible actors: H_RB, H_RW, H_ST, H_CM, H_CB, H_LB, H_DM, A_LB, A_CB, A_DM, A_GK.

Cue: early cross is blocked but byline space and a cutback receiver are available.

Conditional decision: advance for the cutback.

Acceptable alternative: recycle if the route closes.

Misconception: deliver into the blocking defender.

9v9 coordination: A_LB blocks early service; H_RB can carry to byline; H_CM arrives behind H_ST; H_CB H_LB H_DM provide balance.

Coach Code example: “The open route changed the delivery.”

Changed-cue test: defender closes byline but opens early service.

Audit correction: Byline path must be genuinely reachable; if A_LB can close it, recycling is acceptable.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RB06 — Balance the opposite-side press

Sources: S4; 9v9 framework: S15/S16. Role: RB. Phase: press. Ball at freeze: A_RB.

Required visible actors: H_RB, H_CB, H_LB, H_DM, H_LW, H_RW, A_RB, A_LB, A_LW, A_ST.

Cue: team presses left; RB is detached on the far touchline and central spacing is stretched.

Conditional decision: shift with the unit while monitoring the wide threat.

Acceptable alternative: retain width if the immediate switch requires it and central cover is secure.

Misconception: shift without scanning.

9v9 coordination: H_LW pressures A_RB on home left; H_RB narrows with H_CB while monitoring A_LW; H_RW can recover toward A_LB.

Coach Code example: “Stay connected without losing the far threat.”

Changed-cue test: show an imminent unpressured switch.

Audit correction: Do not screen a fast weak-side switch out of view; re-evaluate if passer gains time.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### DM01 — Become available behind pressure

Sources: S5; 9v9 framework: S15/S16. Role: DM. Phase: build. Ball at freeze: H_CB.

Required visible actors: H_DM, H_CB, H_CM, H_RB, A_ST, A_CM.

Cue: CB has possession; 6 is directly behind an opponent from the ball's perspective.

Conditional decision: move laterally into a usable passing angle, scanning before receiving.

Acceptable alternative: clear the lane for 8 when followed.

Misconception: demand the pass while screened.

9v9 coordination: A_ST hides H_DM from H_CB; H_DM moves laterally; H_CM stays in a different lane; H_RB is a fallback.

Coach Code example: “A small movement made you visible.”

Changed-cue test: marker follows tightly.

Audit correction: Being visible is not enough: ensure reception space; followed movement can clear H_CM instead.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### DM02 — Cover rather than duplicate pressure

Sources: S1; 9v9 framework: S15/S16. Role: DM. Phase: defend. Ball at freeze: A_CM.

Required visible actors: H_DM, H_CM, H_CB, A_CM, A_ST.

Cue: 8 presses ball; pass into striker remains open behind.

Conditional decision: screen the striker route.

Acceptable alternative: take over pressure if 8 is beaten and cover transfers.

Misconception: rush next to 8.

9v9 coordination: H_CM pressures A_CM; H_DM blocks the pass to A_ST; H_CB protects depth.

Coach Code example: “Your job was the next pass, not the same opponent.”

Changed-cue test: 8 loses the duel.

Audit correction: H_DM screens one named route, not every possible central pass.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### DM03 — Reconnect on regain

Sources: S3, S5; 9v9 framework: S15/S16. Role: DM. Phase: transition. Ball at freeze: H_DM.

Required visible actors: H_DM, H_CB, H_CM, H_LW, H_RW, A_CM, A_ST.

Cue: regain facing own goal with immediate pressure and a free supporting CB.

Conditional decision: secure possession through support.

Acceptable alternative: turn forward if scan confirms space.

Misconception: force a blind forward ball.

9v9 coordination: H_DM regains back to goal under A_CM pressure; H_CB supports with a safe lane; H_CM and wings spread.

Coach Code example: “Winning it did not mean the forward pass was ready.”

Changed-cue test: remove pressure and reveal a progressive lane.

Audit correction: S3 only supports transition context; S5 supports combining. Do not infer always-pass-back.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### DM04 — Drop at the right moment

Sources: S8; 9v9 framework: S15/S16. Role: DM. Phase: build. Ball at freeze: H_CB.

Required visible actors: H_DM, H_CB, H_CM, H_RB, A_ST, A_CM.

Cue: CB needs a connection; 6 can drop beyond the presser's reach.

Conditional decision: offer the timed passing angle.

Acceptable alternative: stay higher if dropping only duplicates another receiver.

Misconception: arrive alongside CB without creating a new lane.

9v9 coordination: H_DM drops to a new angle outside A_CM reach; H_CM stays higher; H_RB offers another direction.

Coach Code example: “Offer a useful connection.”

Changed-cue test: another midfielder already occupies it.

Audit correction: No imported neutral player, second centre-back or artificial third-line offside boundary.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### DM05 — Release the third player

Sources: S9; 9v9 framework: S15/S16. Role: DM. Phase: combine. Ball at freeze: H_DM.

Required visible actors: H_DM, H_ST, H_CM, H_CB, H_LB, H_RB, A_CB, A_DM, A_CM.

Cue: 6 receives a layoff; 8's forward run opens the next pass.

Conditional decision: release 8 while the lane is available.

Acceptable alternative: secure possession if the runner is covered.

Misconception: force the rehearsed sequence.

9v9 coordination: H_ST has laid off to H_DM; H_CM runs beyond A_DM; H_CB and outside backs protect behind H_DM.

Coach Code example: “The third player was the forward option.”

Changed-cue test: defender follows 8.

Audit correction: At the freeze the ball is with H_DM, not simultaneously with H_ST; defender reach determines release.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### DM06 — Screen the next threat after regain is lost

Sources: S3; 9v9 framework: S15/S16. Role: DM. Phase: transition. Ball at freeze: A_DM.

Required visible actors: H_DM, H_CM, H_CB, H_LB, H_RB, A_DM, A_ST.

Cue: immediate re-loss; 8 pressures the ball, central receiver behind 8 is free.

Conditional decision: recover to disrupt that forward connection.

Acceptable alternative: challenge the loose ball if clearly reachable first and cover exists.

Misconception: duplicate 8's chase.

9v9 coordination: A_DM wins the ball immediately after home regain; H_CM pressures; H_DM screens A_ST; H_CB protects depth.

Coach Code example: “Protect the pass that would break the recovery.”

Changed-cue test: ball becomes uncontested.

Audit correction: Keep two possession changes in event order; no free teleport of recovery players.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CM01 — Receive or bounce

Sources: S5; 9v9 framework: S15/S16. Role: CM. Phase: receive. Ball at freeze: H_CM.

Required visible actors: H_CM, H_DM, H_ST, A_DM, A_CB.

Cue: pass arrives between opponents; pressure is tight behind and a support player is free.

Conditional decision: lay off and move.

Acceptable alternative: turn if pressure has withdrawn and space is confirmed.

Misconception: turn blindly into the marker.

9v9 coordination: H_CM receives under A_DM pressure; H_DM is the bounce outlet; H_ST occupies A_CB.

Coach Code example: “Your scan decided whether the turn was available.”

Changed-cue test: withdraw the marker.

Audit correction: Only prefer a bounce when its lane and first-touch timing are viable; turn remains valid if pressure leaves.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CM02 — Support the front press

Sources: S4, S7; 9v9 framework: S15/S16. Role: CM. Phase: press. Ball at freeze: A_CB.

Required visible actors: H_CM, H_ST, H_LW, H_RW, H_DM, H_CB, A_CB, A_DM, A_CM, A_LB, A_RB, A_ST.

Cue: 9 presses a backward-facing CB; opposing 6 offers the inside escape.

Conditional decision: close that receiving lane while staying connected.

Acceptable alternative: hold deeper if the frontline press is unsupported.

Misconception: chase the same CB as 9.

9v9 coordination: H_ST pressures A_CB; H_CM screens A_DM; H_DM monitors A_CM; wings restrict outside outlets; H_CB protects depth.

Coach Code example: “You helped the press by removing the exit.”

Changed-cue test: opposing 6 moves to create a different lane.

Audit correction: Two home midfielders, not a hidden midfield three; H_CM cannot press CB and mark DM simultaneously.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CM03 — Choose a supporting lane

Sources: S5; 9v9 framework: S15/S16. Role: CM. Phase: support. Ball at freeze: H_RW.

Required visible actors: H_CM, H_RW, H_ST, H_DM, H_LW, A_LB, A_DM.

Cue: RW has ball, 9 occupies the direct forward lane, underneath support is missing.

Conditional decision: offer a separate backward-diagonal angle.

Acceptable alternative: run beyond if support already exists and space opens.

Misconception: stand in the striker's lane.

9v9 coordination: H_RW carries against A_LB; H_ST occupies the direct forward lane; H_CM offers underneath outside A_DM cover; H_DM balances.

Coach Code example: “Different angles gave the winger different choices.”

Changed-cue test: add underneath support and open depth.

Audit correction: New support must create a distinct passing angle; don't reward standing on H_ST's line.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CM04 — Progress when the line holds

Sources: S8; 9v9 framework: S15/S16. Role: CM. Phase: build. Ball at freeze: H_CM.

Required visible actors: H_CM, H_ST, H_LW, H_RW, H_DM, A_DM, A_CB, A_LB, A_RB.

Cue: 8 receives facing forward between lines; defenders hold and carrying space is clear.

Conditional decision: advance to engage them.

Acceptable alternative: pass when a defender steps and frees a teammate.

Misconception: run into pressure after the picture changes.

9v9 coordination: H_CM has received facing forward beyond A_DM; A_CB holds; H_ST and wings occupy distinct lanes; H_DM supports.

Coach Code example: “Use space, then reassess.”

Changed-cue test: defender steps early.

Audit correction: Carrying is conditional on available space and controllable ball, not a universal forward command.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CM05 — Be the third-player runner

Sources: S9; 9v9 framework: S15/S16. Role: CM. Phase: combine. Ball at freeze: H_ST.

Required visible actors: H_CM, H_ST, H_DM, H_CB, H_LB, H_RB, A_CB, A_DM, A_CM.

Cue: 9 can bounce the ball to 6; a separate forward lane opens for 8.

Conditional decision: time a run for the next pass.

Acceptable alternative: support underneath if that lane closes.

Misconception: stand beside 9.

9v9 coordination: H_ST can lay off to H_DM; H_CM begins a legal run beyond A_DM; back three remain behind H_DM.

Coach Code example: “Your movement completed the connection.”

Changed-cue test: block the running lane.

Audit correction: Freeze precedes layoff; this is a different decision instant from DM05 and ST04, not three simultaneous balls.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### CM06 — Arrive for the cutback

Sources: S14, S12; 9v9 framework: S15/S16. Role: CM. Phase: cross. Ball at freeze: H_RW.

Required visible actors: H_CM, H_RW, H_ST, H_LW, H_DM, H_CB, H_LB, H_RB, A_LB, A_CB, A_DM, A_GK.

Cue: winger reaches byline; defenders protect the goalmouth, leaving a backward lane to 8.

Conditional decision: offer that lane without crowding 9.

Acceptable alternative: hold balance when another teammate occupies it.

Misconception: join every attacker at the near post.

9v9 coordination: H_RW reaches byline; H_ST is nearer goal; H_CM offers the backward lane; H_LW stays separate; H_DM holds balance.

Coach Code example: “Offer a different finishing angle.”

Changed-cue test: opponent screens the cutback.

Audit correction: Only one central midfielder joins the box here; no added number 10 or second number 8.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LW01 — Combine against a second defender

Sources: S5; 9v9 framework: S15/S16. Role: LW. Phase: wide. Ball at freeze: H_LW.

Required visible actors: H_LW, H_LB, H_CM, H_ST, A_RB, A_DM.

Cue: receiving left, second opponent closes, LB support remains open.

Conditional decision: combine with support.

Acceptable alternative: beat the first defender if the second is too far to cover.

Misconception: dribble into both automatically.

9v9 coordination: A_RB engages H_LW; A_DM closes as cover; H_LB offers support; H_CM and H_ST stay distinct.

Coach Code example: “The second defender changed the decision.”

Changed-cue test: withdraw cover.

Audit correction: Show whether the second defender arrives in time; do not penalize a feasible 1v1 solely by headcount.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LW02 — Close the outlet in the press

Sources: S4; 9v9 framework: S15/S16. Role: LW. Phase: press. Ball at freeze: A_CB.

Required visible actors: H_LW, H_ST, H_CM, H_DM, H_LB, H_CB, A_CB, A_RB, A_DM, A_RW, A_ST.

Cue: 9 pressures CB and opposing RB becomes the available escape.

Conditional decision: position to restrict that outlet while retaining team connection.

Acceptable alternative: recover inside if the press is broken.

Misconception: sprint at the ball and free RB.

9v9 coordination: H_ST pressures A_CB; H_LW restricts A_RB; H_CM screens A_DM; H_LB monitors A_RW with H_CB cover.

Coach Code example: “You pressed the passing option as well as the ball.”

Changed-cue test: ball bypasses the first line.

Audit correction: Restrict outlet by angle and timing; no assumption that all passes are automatically closed.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LW03 — Time the run

Sources: S6; 9v9 framework: S15/S16. Role: LW. Phase: offside. Ball at freeze: H_CM.

Required visible actors: H_LW, H_CM, H_ST, A_GK, A_LB, A_CB, A_RB.

Cue: in opponent half, passer preparing release, winger near the second-last-opponent line.

Conditional decision: delay/curve to remain legally positioned at the relevant contact.

Acceptable alternative: check short.

Misconception: leave early and become involved from offside.

9v9 coordination: H_CM prepares a ground pass to H_LW; H_ST offers another lane; show the defensive line and ball at contact.

Coach Code example: “Your starting position mattered when the ball was played.”

Changed-cue test: defender drops or ball is ahead of winger.

Audit correction: Offside depends on ball AND second-last opponent; level is eligible; own half uses real pitch halfway.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LW04 — Make space for the overlap

Sources: S10; 9v9 framework: S15/S16. Role: LW. Phase: wide. Ball at freeze: H_LW.

Required visible actors: H_LW, H_LB, H_CM, H_DM, H_CB, H_RB, A_RB, A_CB, A_ST.

Cue: LB overlaps; LW can draw a defender inside without obstructing a teammate.

Conditional decision: move inside and assess the release.

Acceptable alternative: stay wide if LB remains behind.

Misconception: both demand the same space.

9v9 coordination: H_LB overlaps; H_LW moves inside only into free space; H_CM avoids that pocket; H_DM H_CB H_RB balance.

Coach Code example: “Your movement helped the overlap.”

Changed-cue test: LB's run is cancelled.

Audit correction: Show the overlap and its cover, not a compulsory winger-inside script.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LW05 — Reach the delivery, not the position early

Sources: S11; 9v9 framework: S15/S16. Role: LW. Phase: cross. Ball at freeze: H_RW.

Required visible actors: H_LW, H_RW, H_ST, H_CM, H_DM, A_GK, A_LB, A_CB, A_RB.

Cue: ball travels to RW for a cross; far-side space is available.

Conditional decision: time an arrival into that space.

Acceptable alternative: hold/reposition if delivery is delayed.

Misconception: arrive too early and become static or offside.

9v9 coordination: H_RW prepares delivery; H_ST uses near-side route; H_LW times far-side arrival; H_CM supports edge and H_DM stays behind.

Coach Code example: “Arrive with the delivery.”

Changed-cue test: RW is forced backward.

Audit correction: Do not use head-height delivery by default; offside checked on the crosser's relevant contact.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### LW06 — Select the cutback target

Sources: S14, S12; 9v9 framework: S15/S16. Role: LW. Phase: cross. Ball at freeze: H_LW.

Required visible actors: H_LW, H_CM, H_ST, H_RW, H_DM, H_CB, H_RB, A_RB, A_CB, A_DM, A_GK.

Cue: byline possession; near-goal lane blocked, trailing 8 available.

Conditional decision: pass backward toward 8's usable space.

Acceptable alternative: recycle if that lane closes.

Misconception: hit a blind ball across defenders.

9v9 coordination: H_LW at byline sees H_CM arriving behind H_ST; H_RW is separate; H_DM H_CB H_RB balance.

Coach Code example: “Find the teammate the defence left.”

Changed-cue test: a recovering defender covers 8.

Audit correction: Cutback is not always best: receiver readiness and A_DM interception reach must be visible.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RW01 — Combine against a second defender

Sources: S5; 9v9 framework: S15/S16. Role: RW. Phase: wide. Ball at freeze: H_RW.

Required visible actors: H_RW, H_RB, H_CM, H_ST, A_LB, A_DM.

Cue: on right, second defender closes, RB offers support.

Conditional decision: combine.

Acceptable alternative: attack isolated first defender if cover is absent.

Misconception: force the same dribble despite cover.

9v9 coordination: A_LB engages H_RW; A_DM covers; H_RB supports; H_CM and H_ST keep separate options.

Coach Code example: “Read the covering defender before committing.”

Changed-cue test: remove cover. Mirror LW01.

Audit correction: Mirror LW01 with preserved pressure and foot orientation.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RW02 — Close the outlet in the press

Sources: S4; 9v9 framework: S15/S16. Role: RW. Phase: press. Ball at freeze: A_CB.

Required visible actors: H_RW, H_ST, H_CM, H_DM, H_RB, H_CB, A_CB, A_LB, A_DM, A_LW, A_ST.

Cue: 9 presses CB; opposing LB offers escape.

Conditional decision: restrict that outlet in connection with teammates.

Acceptable alternative: recover inside once bypassed.

Misconception: duplicate 9's pressure.

9v9 coordination: H_ST pressures A_CB; H_RW restricts A_LB; H_CM screens A_DM; H_RB monitors A_LW with H_CB cover.

Coach Code example: “Your position made their next pass harder.”

Changed-cue test: bypass the press. Mirror LW02.

Audit correction: Use opponent's left back on home right; never confuse jersey number with role.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RW03 — Time the run

Sources: S6; 9v9 framework: S15/S16. Role: RW. Phase: offside. Ball at freeze: H_CM.

Required visible actors: H_RW, H_CM, H_ST, A_GK, A_LB, A_CB, A_RB.

Cue: right winger near offside line in opposing half as teammate prepares pass.

Conditional decision: time/curve the run from a legal position.

Acceptable alternative: offer short support.

Misconception: be early and interfere.

9v9 coordination: H_CM prepares a ground pass to H_RW; H_ST occupies another lane; show ball and defensive line.

Coach Code example: “The run and the pass had to work together.”

Changed-cue test: defender drops; recalculate rather than reuse answer. Mirror LW03.

Audit correction: Mirror LW03 legally and spatially; include omitted opponents in second-last-opponent calculation.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RW04 — Keep width until it serves a purpose

Sources: S12; 9v9 framework: S15/S16. Role: RW. Phase: wide. Ball at freeze: H_CM.

Required visible actors: H_RW, H_CM, H_RB, H_ST, H_DM, A_LB, A_DM, A_CB.

Cue: central route congested; RW provides an accessible wide outlet.

Conditional decision: retain useful width to receive.

Acceptable alternative: move inside when a fullback supplies width and the inside lane opens.

Misconception: narrow into an occupied pocket.

9v9 coordination: H_CM has no viable central penetration; H_RW offers width outside A_LB; H_RB remains underneath; H_DM balances.

Coach Code example: “Your width offered a route around.”

Changed-cue test: touchline reception becomes trapped.

Audit correction: Source is mixed-format; use only Part 3 delivery/support concepts, not Part 4 11v11 organization.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RW05 — Attack the far-side delivery

Sources: S11; 9v9 framework: S15/S16. Role: RW. Phase: cross. Ball at freeze: H_LW.

Required visible actors: H_RW, H_LW, H_ST, H_CM, H_DM, A_GK, A_LB, A_CB, A_RB.

Cue: LW prepares a cross; 9 attacks a different zone.

Conditional decision: time a run into the free far-side zone.

Acceptable alternative: adjust if delivery is delayed.

Misconception: follow 9 into the same space.

9v9 coordination: H_LW prepares delivery; H_ST chooses near-side route; H_RW offers far side; H_CM supports edge, H_DM holds.

Coach Code example: “Give the passer distinct targets.”

Changed-cue test: a defender closes that zone. Mirror-family LW05.

Audit correction: Mirror LW05; forbid copying two winger cards into one scene as extra players.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### RW06 — Do not cross just because you are wide

Sources: S14, S12; 9v9 framework: S15/S16. Role: RW. Phase: wide. Ball at freeze: H_RW.

Required visible actors: H_RW, H_RB, H_CM, H_ST, H_LW, H_DM, A_LB, A_CB, A_RB, A_DM, A_GK.

Cue: wide possession; both forward receivers covered, backward support free.

Conditional decision: recycle and reset the attack.

Acceptable alternative: deliver when a receiver separates and the lane opens.

Misconception: force service into a crowded area.

9v9 coordination: A_CB and A_RB cover H_ST and H_LW; A_LB pressures H_RW; H_RB is safe support; H_DM holds.

Coach Code example: “Wait for a usable target.”

Changed-cue test: show a clear arriving receiver.

Audit correction: Reject blind service, but do not reject a newly opened dribble or shot; S12 strengthens receiver-selection evidence.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### ST01 — Hold, lay off or turn

Sources: S5; 9v9 framework: S15/S16. Role: ST. Phase: receive. Ball at freeze: H_ST.

Required visible actors: H_ST, H_CM, H_LW, H_RW, A_CB, A_DM.

Cue: receiving back to goal with tight pressure and 8 available.

Conditional decision: protect and lay off.

Acceptable alternative: turn if the defender's position and available space genuinely allow it.

Misconception: assume proximity alone makes turning correct.

9v9 coordination: H_ST receives back to goal under A_CB pressure; H_CM is free of A_DM; wingers maintain depth.

Coach Code example: “You kept the next action available for the team.”

Changed-cue test: defender backs away and a turning lane opens.

Audit correction: Close defender does not automatically permit turning; show actual escape side and ball control.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### ST02 — Initiate only a supported press

Sources: S4, S7; 9v9 framework: S15/S16. Role: ST. Phase: press. Ball at freeze: A_CB.

Required visible actors: H_ST, H_LW, H_RW, H_CM, H_DM, H_CB, H_LB, H_RB, A_CB, A_LB, A_RB, A_DM, A_CM, A_ST.

Cue: backward reception, winger and 8 ready to close exits.

Conditional decision: initiate coordinated pressure.

Acceptable alternative: screen and wait if teammates are detached.

Misconception: sprint alone and allow an easy bypass.

9v9 coordination: A_CB receives facing own goal; H_ST can arrive; wings restrict outside backs; H_CM screens A_DM; H_DM covers A_CM.

Coach Code example: “The trigger mattered because your teammates could support it.”

Changed-cue test: detach midfield.

Audit correction: No four-back opponent or extra midfielder imported. Abandon press if arrival/support condition fails.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### ST03 — Adjust rather than wait offside

Sources: S6; 9v9 framework: S15/S16. Role: ST. Phase: offside. Ball at freeze: H_CM.

Required visible actors: H_ST, H_CM, H_LW, A_GK, A_CB, A_LB, A_RB.

Cue: striker in the opposing half, beyond both the ball and second-last opponent, teammate not yet playing the ball.

Conditional decision: return to an eligible position before the relevant pass contact or offer a different run.

Acceptable alternative: remain uninvolved while another teammate plays, without interfering.

Misconception: receive after merely stepping back following release and assume legality is restored.

9v9 coordination: H_ST is beyond ball and second-last opponent in opponent half before H_CM plays; H_LW offers another route.

Coach Code example: “Coming back after the pass did not erase the earlier position.”

Changed-cue test: begin in own half; apply the correct rule.

Audit correction: Add missing ball condition. Returning after contact does not cure that phase; a later phase requires fresh assessment.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### ST04 — Bounce for the third-player route

Sources: S9; 9v9 framework: S15/S16. Role: ST. Phase: combine. Ball at freeze: H_ST.

Required visible actors: H_ST, H_DM, H_CM, H_CB, H_LB, H_RB, A_CB, A_DM, A_CM.

Cue: 9 receives under pressure; 6 supports and 8 runs beyond.

Conditional decision: lay off to enable 6's forward pass.

Acceptable alternative: turn if pressure withdraws and space is confirmed.

Misconception: insist on turning into the marker.

9v9 coordination: H_ST receives against A_CB; H_DM supports; H_CM runs beyond A_DM; home back three retain balance.

Coach Code example: “Your pass opened someone else's route.”

Changed-cue test: cover 8 and open a turn.

Audit correction: A third-player pattern is an option, not an enforced three-pass reward; compare direct turn when available.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### ST05 — Match the cross with the run

Sources: S11; 9v9 framework: S15/S16. Role: ST. Phase: cross. Ball at freeze: H_RW.

Required visible actors: H_ST, H_RW, H_LW, H_CM, H_DM, A_GK, A_CB, A_LB, A_RB.

Cue: early wide delivery is available behind the defensive line.

Conditional decision: time an onside run into its reachable path.

Acceptable alternative: delay when the crosser is blocked.

Misconception: run without reading the delivery.

9v9 coordination: H_RW can deliver early behind A_CB; H_ST runs onside into reachable space; H_LW offers a distinct route.

Coach Code example: “Synchronize the run and service.”

Changed-cue test: delay the ball; reassess offside at the passer's first contact.

Audit correction: Validate actual low-ball travel and arrival; avoid adult crossing distance or automatic heading.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

### ST06 — Separate from the other box target

Sources: S10; 9v9 framework: S15/S16. Role: ST. Phase: cross. Ball at freeze: H_LW.

Required visible actors: H_ST, H_LW, H_RW, H_CM, H_DM, H_CB, H_LB, H_RB, A_GK, A_CB, A_LB, A_RB.

Cue: teammate occupies near-post space; a reachable central zone remains open.

Conditional decision: offer the distinct central target.

Acceptable alternative: change route if a defender closes it.

Misconception: converge on the teammate.

9v9 coordination: H_LW delivers; H_RW occupies near-post space in this scene; H_ST uses central space; H_CM stays at edge; H_DM balances.

Coach Code example: “Different runs gave different options.”

Changed-cue test: central zone becomes marked.

Audit correction: No requirement to fill all four box zones with four runners; only named teammates occupy them.

Status: DRAFT_BLOCKED_FOR_PLAYER_TRAINING. Exact source sections are in scenarios.json; source limitations are in SOURCES.md.

