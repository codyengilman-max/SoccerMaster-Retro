# SoccerMaster 9v9 — Positions, roles and interactions review v0.3

17 October 2026, America/Phoenix.

## Verdict and scope

The v0.2 research foundation has useful principles and 40 scenario seeds, but
does not yet specify enough coordinated behavior to establish an accurate
decision engine for all 18 players. This review supplies the missing role and
interaction requirements. It does not certify unseen game code or claim that
these behaviors are implemented or statistically calibrated.

Reviewed: the v0.2 foundation and engine contract. Preserve v0.1, v0.2 and their
original scenario IDs. This additive review governs role interactions where
older shorthand is ambiguous. It is not a replacement for the physics, rules,
perception or human-input contracts.

First team shape: 1-3-2-3, nine players including the keeper. Slots are GK,
right outside back, center back, left outside back, 6, 8, right winger, 9,
left winger. Numbers are role labels, not mandatory shirt numbers. Apply the
same decision architecture independently to the opponent's nine players.

The opponent may use another legal 9v9 shape: map its roles by responsibilities
and observed positioning, not by pretending it has our exact slot layout.
There is no spare number 10 or second center back in our starting formation.
Any extra central defender or attacker is a temporary reassignment of a real
player and leaves another responsibility to cover.

## Evidence and design distinction

England Football describes support ahead, alongside and behind the ball, plus
defensive restraint and covering gaps when a teammate presses [R1].
FIFA discusses coordinated pressure, cover and balance after loss [R2].
FIFA's goalkeeper analysis relates positioning to ball pressure, numerical
balance and defender/attacker orientation [R3]. These support the general
principles; they do not validate our proposed algorithm or youth parameters.

The role matrix, priorities, scenarios and acceptance criteria below are
authored design recommendations. England's published 9v9 guidance is not an
Arizona competition rules profile [R4]. Youth heading, retreat lines, offside,
goalkeeper restrictions and restart details must come from the selected
competition's verified profile. No new universal rule is asserted here.

## Common decision process for every player

1. Observe ball, opponents, teammates, goal and available space through the
   perception model. Include last scan, orientation, memory and communication.
2. Identify phase: controlled possession, organized defending, gain, loss,
   contested/loose ball or restart. A tackle is not automatically a clean gain.
3. Identify immediate responsibility: ball action, receiver, support, depth,
   width, pressure, cover, balance, recovery or goal protection.
4. Generate physically feasible options. Recognize that a clear passing line
   to a stationary teammate can become intercepted during ball travel.
5. Evaluate likely advantage, execution difficulty and exposure if it fails.
6. Coordinate compatible jobs; act with finite recognition and movement time.
7. Reassess on meaningful changes without cancelling sensible actions every frame.

Use a stable position identity plus a temporary tactical responsibility.
An out-of-position player first solves the nearby danger; they do not run
back to their nominal slot while an opponent shoots. Conversely, temporary
cover does not permanently erase their position.

## All nine positions

### Goalkeeper

- Possession: create an angled reset option; select short, medium, long or
  delayed distribution from pressure, receiver readiness and delivery ability.
  Change support position after passing; do not remain hidden behind a striker.
- Defending: adjust angle and depth to the ball, shooting threat and defensive
  line. Set for a shot; track ball flight and rebounds.
- Gain: secure control first; release quickly if a real advantage exists.
- Loss: choose space defense, hold, retreat or challenge from arrival estimates
  and goal exposure. A high starting position is not an automatic charge.
- Links: communicate with CB and covering back; coordinate claims so defenders
  do not abandon a ball the keeper cannot reach. Claiming is an intention, not
  guaranteed possession. Respect handling/restart rules.

### Right outside back

- Possession: support the right winger below or inside; overlap or underlap
  only when the ball, space, receiver and recovery cover permit it.
- Defending: pressure the right-side threat when assigned; otherwise protect
  inside access and depth. When the ball is left, assess central/far-post threats.
- Gain: offer an outlet or advance into available space after assessing control.
- Loss: if advanced, recover toward the most dangerous route rather than chase
  the ball from behind by default. If already covering, retain that duty.
- Links: right winger, CB and 6 must agree who supplies width and who protects
  the channel. Passing to a winger does not automatically trigger an overlap.

### Center back

- Possession: connect GK, outside backs and midfield; carry when useful, pass
  when an advantage appears, or recycle. Do not force a ball into the 6.
- Defending: organize central depth; decide step, hold, drop or handover.
  Account for the runner behind before following a checking striker.
- Gain: secure or progress according to pressure; support the next pass.
- Loss: protect the direct route to goal and delay while help recovers.
- Links: when stepping, require a feasible depth-cover assignment or accept
  explicit emergency risk. The lone CB cannot simultaneously press a receiver,
  cover a runner and occupy a second center-back position.

### Left outside back

- Possession: support the left winger below/inside, or provide a timed outside
  or inside run when the resulting shape remains viable.
- Defending: engage the left-side threat when assigned; cover centrally and
  watch the far post when play is on the right.
- Gain: evaluate outlet, forward support and remaining cover.
- Loss: recover through the dangerous channel; avoid duplicating the 6's press.
- Links: left winger, CB and 6. Mirror the right-back geometry, but preserve
  this player's own foot preference, speed, scanning and technique.

### Holding midfielder — 6

- Possession: find a playable angle beyond cover shadows; scan before receiving;
  turn, bounce, carry, switch or reset based on pressure and body position.
- Defending: protect central access and dangerous runners; press when reachable
  and covered. Screen a lane when tackling would expose more dangerous space.
- Gain: assess forward advantage, then execute or secure possession.
- Loss: block the most dangerous available outlet or become first defender if
  best placed; another player then takes the covering job.
- Links: balance the 8's movement and an advancing outside back. Covering for CB
  means occupying a useful interception/depth position, not shadowing CB's feet.
  The 6 is allowed forward involvement when another player covers their duty.

### Connecting/attacking midfielder — 8

- Possession: connect lines, offer third-player support, change the point of
  attack, carry and arrive late into a distinct finishing lane.
- Defending: screen or mark the relevant pivot and passing lane; support the
  first press while retaining access to midfield.
- Gain: provide a forward option, carry or make a timed support run.
- Loss: pressure if effective; otherwise recover centrally and cover the 6.
- Links: coordinate with the 9 checking short and wingers coming inside.
  Do not follow an opposition number 6 everywhere regardless of team shape.
  Do not enter the box just because a wide player has the ball.

### Right winger — 7

- Possession: stretch or move inside with purpose; receive, attack available
  space, combine, cross, pass or shoot according to the actual opportunities.
- Defending: help steer the press, block an inside route or recover with the
  opposing wide runner. Far-side defending requires inward balance plus scanning.
- Gain: offer width or depth without outrunning every passing option.
- Loss: press/delay if reachable; otherwise recover to a useful lane.
- Links: when right back advances outside, choose inside support or a depth run.
  When play is left, choose switch outlet versus second-striker/far-post duty
  according to the agreed width and delivery assignments.

### Center forward — 9

- Possession: alternate pinning, checking short, threatening depth and creating
  room for another runner. Lay off, turn, carry or finish when feasible.
- Defending: initiate or support the chosen press; curve approach to remove
  a useful outlet. Screen rather than sprint uselessly between defenders.
- Gain: provide a reachable forward option, stretch a defender or connect play.
- Loss: close a viable outlet or recover into screening position.
- Links: if checking short, another attacker can supply depth; do not have the
  8 and 9 automatically check into the same pocket. At delivery, choose a run
  from defender position and ball trajectory, not a permanent near-post script.

### Left winger — 11

- Possession: hold left width or come inside with coordinated cover; compare
  dribble, combination, delivery and shot.
- Defending: press/screen on the left or recover and balance from the far side.
- Gain: offer a useful forward lane or support behind pressure.
- Loss: pressure only when effective; otherwise protect the escape route.
- Links: left back and 8 on the near side; 9 and the far-side width provider
  when narrowing from the opposite flank. Mirror tactical opportunities but
  keep individual ability and footedness distinct.

## Interaction rules — required for both teams

| ID | Relationship | Correct behavior and failure case |
|---|---|---|
| I01 | GK–CB–outside backs | Create staggered playable angles; goalkeeper remains an option where safe. Do not put all outlets on one screened line. |
| I02 | CB–6 | 6 moves out of the screen; CB can carry/pass around it. Neither must force the central pass. |
| I03 | 6–8 | Stagger for support and defensive balance. Either may advance if the other/another player covers; avoid a rigid parallel line. |
| I04 | Outside back–winger | Allocate width and inside/depth run deliberately. Two players may combine nearby but should not collide in an identical lane. |
| I05 | 8–9 | If 9 checks, 8 can run beyond or support at another angle. Preserve some depth when opponents would otherwise step forward freely. |
| I06 | Opposite winger–9 | Time narrowing for a delivery or central overload; retain/reassign width when a switch remains useful. |
| I07 | Advancing back–6–CB–far back | Reassess opponent outlets and arrival times before releasing another defender. Count effective cover, not merely players behind the ball. |
| I08 | Carrier–supporting player | Support must be visible/reachable before pressure closes; a nearby teammate inside a cover shadow is not automatically an option. |
| I09 | Passer–receiver–third player | Third player times the run from the actual wall-pass opportunity, not a mandatory animation sequence. |
| I10 | First defender–cover defender | First applies pressure/delay; cover protects the dangerous escape. Choose the most effective arrival, not only nearest distance. |
| I11 | Cover–balance defenders | Other defenders protect central depth and far-side threats without all chasing the ball. |
| I12 | CB–6 tracking a dropping striker | Hold, follow or hand over with an achievable replacement; monitor the runner behind. |
| I13 | Winger–outside back defending overlap | Decide who pressures and who tracks the runner; revise when the overlap becomes an underlap or decoy. |
| I14 | Defensive line–GK | Match line depth to ball pressure, runners and keeper coverage. Avoid stepping up while an unpressured passer can exploit depth. |
| I15 | Pressing front–midfield–back line | Curved press, screened outlets and supporting shift must agree. Abort or reshape if the opponent plays through. |
| I16 | Shot blocker–keeper | Defender closes a plausible shot lane while goalkeeper tracks ball visibility; no automatic block or keeper telepathy. |
| I17 | Attacking delivery unit | Allocate distinct feasible near/central/far/cutback/rebound jobs by trajectory and numbers; not every job must be occupied. |
| I18 | Defending delivery unit | Assign ball pressure, first contact, dangerous runners and cutback/second ball; adapt to short cross, pullback and clearance. |
| I19 | Gain across all roles | Ball winner needs control, facing support and forward threat; counter only while usable advantage remains. |
| I20 | Loss across all roles | Best placed player pressures/delays; others remove outlets/recover. No automatic all-team chase or instantaneous retreat to formation. |
| I21 | Loose ball across both teams | Estimate reachable arrival; one contests when appropriate while others cover next action. Possession remains contested until controlled. |
| I22 | Restart unit | Assign taker, receivers/runners and recovery cover; opponents organize legally. Re-evaluate immediately after the ball becomes live. |
| I23 | Rotation/substitution | Transfer responsibility explicitly and preserve player identity, fatigue and communication delay; no duplicated or vacant slot by bookkeeping error. |
| I24 | Opponent adaptation | React to observed shape and tendencies; never read hidden tactic settings or user inputs. Same architecture supports different styles. |

## Corrections to unconditional shorthand

- “Nearest player presses” becomes “best placed effective first defender
  pressures or delays,” accounting for arrival, angle and danger left behind.
- “8 marks their 6” is a phase-specific assignment with handover, not a leash.
- “Opposite winger becomes second 9” is conditional on width and attack timing.
- “Outside backs overlap” becomes a choice among support, overlap, underlap
  and holding balance.
- “6 covers CB” is a responsibility with feasible geometry, not two players
  chasing the same opponent.
- “Keep extra players back” is evaluated against specific counter threats,
  not just a universal headcount. Two defenders positioned badly can be worse
  protection than a coordinated interception and recovery structure.
- “Attack space then switch” requires the opposite side actually becoming
  accessible; taking the available local advantage is also correct.
- “Shoot/cross when near goal” compares shot, pass, carry, delay and recycle,
  accounting for goalkeeper, blockers, receiver arrival and contact ability.

## Fully coordinated example: left-side attack

Illustrative authored example, not a compulsory play. Left winger has controlled
possession, left back overlaps, 8 offers inside support, opponent shifts toward
that side. The 9v9 team must account for every player:

| Player | Current intention | If possession is lost |
|---|---|---|
| GK | Adjust support/depth behind defense | Evaluate space protection versus retreat/set |
| Right back | Narrow enough to protect central/right counter threat | Cover depth or engage the emerging receiver as assigned |
| CB | Maintain central coverage and pass connection | Protect goal route; delay dangerous carrier |
| Left back | Time overlap without overtaking before pass is viable | Pressure if genuinely reachable, otherwise recover through left channel |
| 6 | Offer reset/switch route and screen counter outlet | Protect central escape or become first defender with handover |
| 8 | Offer inside combination at a separate angle | Pressure/delay if best placed; otherwise recover central cover |
| Right winger | Hold switch access initially | Balance inward or recover opposing wide runner |
| 9 | Pin/adjust central depth and prepare a distinct run | Screen an outlet or threaten depth only if defensive balance permits |
| Left winger | Compare carry, overlap pass, inside pass, switch or recycle | Press/delay after loss when feasible; otherwise recover |

The right winger may later narrow for a delivery; if wide access is still
needed another player must supply it through real movement. The 8 should not
make a box run while their central cover duty is still necessary.

The opponent also makes decisions: its near wide player may track the overlap;
near defender may delay rather than tackle; central defender protects the 9;
midfield may screen the inside/switch route; far defender checks the far winger;
keeper adjusts for shot/delivery; remaining players balance or retain outlets.
Assignments depend on its actual shape. Our tactic never forces these responses.

## Decision quality and development

Player attributes alter perception speed, execution range and movement ability.
Recognizing a good option does not guarantee performing it. Do not limit a
position to stereotyped actions: defenders may dribble/finish, attackers may
cover centrally, and the goalkeeper can initiate an attack.

An intended pass needs receiver arrival, control orientation, pressure and
the subsequent option evaluated—not pass completion alone. Off-ball runs can
be useful by opening a lane without receiving. Defenders can succeed by denying
a chance without tackling. Assess these without granting unlimited rewards
for repeated decoy runs, scans or harmless passing loops.

Use youth-appropriate imperfect coordination. Delays, missed scans and technical
errors must emerge from modeled ability and context, not arbitrary failure
to make a predetermined match score happen.

## Acceptance coverage before declaring accuracy

For every named slot on both teams, create fixtures for: possession/on-ball;
possession/off-ball; organized defending; gain; loss; loose ball; attacking
restart; defending restart. These are coverage categories, not eight identical
tests per player. Each requires appropriate primary action, support/cover,
abort cue and continuous next state.

Additional mandatory interaction fixtures:

1. One outside back advances; release/hold the other against different outlets.
2. 6 presses while CB holds; alternative CB steps while 6/another covers.
3. 9 checks short while 8 supplies depth; alternative 8 supports without a run.
4. Wide 2v1: defender delays until help arrives; attacker can still beat it.
5. Third-player wall pass unavailable: cancel/adapt the run without teleporting.
6. Switch target narrows too early: detect lost access and select an alternative.
7. Shot versus cutback: vary blocker, keeper and receiver arrival.
8. Near/far-post/cutback runners allocate distinct jobs; no compulsory box crowd.
9. Opponent striker checks to draw CB out while another runs behind.
10. Direct ball and second ball: contest plus support and cover, no instant gain.
11. Back pass under pressure: GK offers angle and obeys handling profile.
12. Keeper loses a claim: all players continue from the actual loose ball.
13. Press beaten: midfield/back line adjust rather than pursue in a straight line.
14. Counter 3v2: carrier and support separate lanes; defenders protect priority threat.
15. False turnover: deflection does not trigger simultaneous possession for both sides.
16. Mirrored left/right fixture with equal attributes; repeat with different footedness.
17. Different opponent shapes: 1-3-3-2 and 1-2-4-2, each totaling nine.
18. Late lead/late deficit: risk preferences change without magical execution.
19. Legal restart to open play: assignments expire and normal decisions resume.
20. Same observation, different hidden state: no pre-cue AI decision change.

All of these gameplay fixtures are NOT RUN. Existing passing repository tests
do not satisfy them. Accuracy requires gameplay traces and repeated simulation
results, then coaching review and target-device playtesting.

## Implementation order

First: phase detection, observations, one coherent task assignment per player,
and pressure/cover/support continuity. Next: receiving and pass/shot feasibility.
Then: combinations, runs, delivery/finishing, restarts and opponent policies.
Build this into the current engine only after mapping existing implementations.
Do not activate all 40 original seeds by changing a validation flag.

## References

R1. England Football Learning, What are the principles of football?
https://learn.englandfootball.com/articles-and-resources/coaching/resources/2022/What-are-the-principles-of-football

R2. FIFA Training Centre, Regaining possession high up the pitch.
https://www.fifatrainingcentre.com/en/practice/elite-sessions/transition-to-defending/regaining-possession-high-up-the-pitch.php

R3. FIFA Training Centre, Goalkeeper positioning in transition from attack to defence.
https://www.fifatrainingcentre.com/en/game/individual-qualities/goalkeeping/goalkeeper-positioning-in-transition-from-attack-to-defence.php

R4. England Football Learning, How to play and manage 9v9 games.
https://learn.englandfootball.com/articles-and-resources/coaching/resources/2025/How-to-play-and-manage-9v9-games

Sources consulted 17 October 2026. R2 was consulted through its retrieved search
extract; R1, R3 and R4 article text was opened. No video review or data fitting.
