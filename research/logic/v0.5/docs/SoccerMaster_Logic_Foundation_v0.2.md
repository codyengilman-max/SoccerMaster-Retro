# SoccerMaster — Tactical Intelligence Foundation v0.2

Research date: 13 October 2026. Audit revision: v0.2. Status: initial source review, proposed engine architecture and 40 authored scenario seeds. No match dataset has been ingested, no probabilities fitted, and no game code changed. This is not a completed ten-season statistical study.


## Audit authority and activation gate

This revision preserves the original research structure and corrects four
scenario statements. The full normative corrections are in
[ENGINE_CONTRACT.md](../contracts/ENGINE_CONTRACT.md); its requirements govern
where an older general statement is ambiguous.

All 40 seeds remain drafts with production activation disabled. Source support
is not statistical calibration. The ten-season coverage ledger records missing
research explicitly. The audit is of this specification, not unseen game code.
See [AUDIT.md](../audit/AUDIT.md) for all 24 findings and residual gates.

## 1. Objective and scope

Build players who perceive a situation, recognize opportunities, coordinate with teammates and respond to opponents. A catalog supplies tactical possibilities and test fixtures; live geometry, perception and execution determine what actually happens.

Use U11–U12 9v9 as the first implementation context, retaining transferable principles for later formats. Adult 11v11 evidence informs tactical ideas, not youth execution rates, running speeds or fixed positioning. This scope follows the existing project direction and remains configurable.

The quantitative target is ten completed European seasons, 2016/17–2025/26, with international tournaments analyzed separately. The 2015/16 season is an adjacent historical baseline. Earlier historical cases explain tactical mechanisms; do not pool them into modern estimates.

The initial review covers selected official reports and coach accounts across the period, not every season or every manager. Missing coverage must remain visible.

## 2. Coaching foundation

These are particular documented mechanisms, not permanent labels for a coach. Store coach, team, season, opponent and game phase together. The proposed engine translations are our design inferences.

| Coach / school | Evidence-supported topic | Proposed player behavior | Necessary counter or limitation |
|---|---|---|---|
| Cruyff → Guardiola | Cruyff's influence on Guardiola's football education and team identity [S1]; City's patience against zonal pressure [S2] | Occupy useful space; move opponents; accelerate when a gap appears | If the defense stays compact, carry or recycle rather than force a switch |
| Guardiola, City 2023–24 | Width, variable pressing and hybrid defender/midfielder roles [S2–S4] | Wide player holds an outlet; supporting players rotate with coverage | A rotation cannot erase recovery distance or expose the middle without consequence |
| Klopp / Lijnders | Counterpressing depends on attacking positions and compact support [S5] | Near players pressure after loss while others remove escape routes | Abort the press when beaten or unsupported; model fatigue |
| Sacchi | Collective positioning, zonal marking, high line and coordinated pressure [S6] | Defensive unit moves together according to ball and threats | An unpressured passer can exploit depth; one late defender can break the line |
| Mourinho, Inter 2010 | Opponent-specific treatment of Messi and attacking space behind full-backs [S7] | Deny a dangerous receiver; preserve an outlet into vacated space | Prevent a permanent man-marking chase from dismantling the block |
| Ancelotti, Madrid 2024 | Midfield adjustment and improved balance during the final [S8] | Change role priorities when the initial structure is failing | Adaptation needs evidence and player response time, not omniscient instant correction |
| Simeone, Atlético 2024–25 | Control of wide areas in mid/low blocks [S9] | Protect central access; coordinate wide pressure and box coverage | Over-shifting must expose the far side |
| Luis Enrique, PSG 2025 | Coordinated rotations disrupted marking; pressing and second balls mattered [S10] | Exchange responsibilities; attack vacated space; prepare for the next ball | Random movement is not coordination; retain width, depth and recovery cover |
| Benítez, Liverpool 2009 | Attacking full-backs supported by midfield balance on defensive transition [S11] | One player advances while others protect counterattack routes | Cover requires actual position and interception capacity |
| Xabi Alonso, playing-role account | Midfield responsibilities changed with teammates, coach and opponent [S12] | Role behavior depends on relationships, not just shirt number | This source concerns his playing roles; it does not establish his entire coaching methodology |
| De Zerbi, Brighton 2022 | Short buildup under pressure offered rewards and dangerous turnovers [S13] | Attract a presser only with an executable escape route | If opponents decline to press, advance; if the trap closes, use another outlet |

Next manager dossiers: Bielsa, Rangnick, Ferguson, Wenger, Conte, Inzaghi, Tuchel, Emery, Arteta, Flick, Scaloni, Diniz, Wiegman, Hayes and Giráldez. These are research priorities, not completed reviews. Add South American and women's football evidence deliberately rather than treating elite European men's football as universal.

For every dossier record: principle, observable cue, coordinated movements, countermeasure, failure case, training method, exact source and confidence. Manager names are research tags; runtime behaviors should have descriptive names.

## 3. Statistical evidence already checked

| Sample | Published observation | What it supports | What it does not establish |
|---|---|---|---|
| Champions League 2015/16 | 61 goals attributed to combinations; 63 to open-play crosses [S14] | Include central combinations and wide delivery families | Their probability of success per attempted action |
| Champions League 2019/20 | High turnovers led to 217 shots and 30 goals [S15] | Model where possession is recovered and the attack that follows | The chance of winning any individual press |
| Champions League 2021/22 | Crosses/cutbacks contributed 89 goals, reported as 23% of all goals [S16] | Distinguish several routes to creating chances | A 23% chance of scoring from a cross |
| World Cup 2022 | All four semifinalists predominantly defended in mid-blocks [S17] | Mid-blocks must be a capable defensive option | That mid-blocks caused those teams to reach the semifinals |
| World Cup 2022 | Winning teams produced 42 counterattacks ending in shots from 430 counters; losing teams 12 from 274 [S17] | Study transition quality, not speed alone | A causal benefit from copying winners; outcome grouping creates selection effects |
| Champions League 2024/25 | UEFA reports City converted 51% of goal kicks into final-third entries [S9] | Evaluate buildup by resulting access and progress | A transferable 51% default for other teams or youth players |

Do not combine these rows into one regression. Competition, definitions, sample selection, rules and denominators differ. Figures are published observations, not our newly computed dataset.

Evidence register fields: source URL, publication date, competition, season, population, match count, event count, numerator, denominator, metric definition, collection method, exclusions, confidence, applicability and unresolved caveats.

### Ten-season analysis protocol

1. Create a season-by-season coverage ledger for 2016/17 through 2025/26. Record missing fields and provider changes. Archive historical baselines separately.
2. Start with official UEFA/FIFA reports and explicitly available event datasets. StatsBomb's public repository contains selected competitions and selected 360 data; it is not a complete decade of global football [S18].
3. Check dataset terms for the intended game use before importing data. Public access alone does not establish product-use rights.
4. Normalize pitch direction and coordinates. Keep units explicit. Separate restarts, transitions, organized attacks, manpower imbalance and score states.
5. Count opportunities and failures as well as successes. Measure shots per counterattack, completion per pass type and chance quality per entry.
6. Adjust comparisons for team/opponent quality, game state, competition, home/away and time. Report association unless causal identification is available.
7. Split validation by match and season; never scatter the same possession across train/test. Check out-of-time and unfamiliar-team performance.
8. Report uncertainty and sample sizes. Sparse youth contexts remain explicitly uncalibrated rather than borrowing adult certainty.
9. Off-ball questions require tracking or suitable spatial observations. Event-only data cannot reveal every unchosen run. Selected event freeze frames are not continuous tracking.
10. Validate goals, shots, turnovers, transition durations and action diversity at team and role level. Matching one aggregate cannot validate the whole engine.

## 4. Engine architecture — proposed

**World state → individual perception → tactical opportunities → coordinated intentions → action selection → physical execution → new world state.**

The world tracks exact positions, velocities, ball trajectory, possession uncertainty, boundaries and rules. Individual players receive an imperfect view derived from orientation, scanning, occlusion, communication and memory. AI must not read a hidden user gesture or future random result.

Team policy sets block height, width, preferred progression, pressing triggers and risk posture. It is a preference, not a forced sequence. Unit coordination assigns pressing, covering, running and balancing responsibilities. Individual attributes govern recognition speed, technique, acceleration, fatigue and willingness to attempt an action.

The scenario matcher activates options only when spatial preconditions are satisfied. The selector evaluates feasible options against likely opponent responses. The executor resolves touches, passes, duels and shots with consistent physical and probabilistic rules. Every rebound, interception and deflection continues from the resulting state.

Use limited candidate sets and event-driven tactical updates for mobile performance; avoid trying to simulate every possible future on every display frame. Benchmark on the target iPhone before choosing final update frequencies.

### Decision quality versus execution

Assess a decision using information reasonably available before the action. A good choice may fail technically; a poor choice may score. Store these separately:

- Decision value and uncertainty.
- Execution difficulty and execution outcome.
- Tactical contribution, including useful off-ball actions.
- Resulting possession and chance quality.

Candidate utility should account for expected attacking value, turnover location/cost, defensive exposure, effort and game state. Use compatible scales and avoid double-counting progress already included in a possession-value estimate. Exact weights remain uncalibrated.

For human-controlled players, tactical advice can describe better options; the engine must execute the user's feasible intention rather than silently replace it. Gesture interpretation belongs outside tactical selection.

## 5. Scenario record

Each complete scenario must contain:

1. Stable ID, version and tactical principle.
2. Format, age/ability band, rules and team policy.
3. Phase, field region, score/time and numerical balance.
4. Ball state and all relevant positions, velocities and orientations.
5. What the focal player has perceived and when.
6. Entry conditions and disqualifying conditions.
7. Focal player's candidate actions, including hold/recycle when feasible.
8. Teammate responsibilities and defender alternatives.
9. Decision cues and a range of acceptable choices.
10. Timing windows, physical constraints and execution attributes.
11. Outcome branches and a continuous next state.
12. Evidence links, confidence and empirical calibration status.
13. Counterexample where the commonly preferred action is wrong.
14. Regression checks and exploitation risks.

Scenarios may overlap. Resolve conflicting responsibilities at unit level and retain commitments long enough to prevent players changing their mind every frame. Re-evaluate immediately when a significant cue changes.

## 6. Starter catalog — 40 authored seeds

These are design seeds, not 40 empirically validated cases. Each row needs spatial fixtures and calibration before becoming a production behavior. Roles refer to the 9v9 1-3-2-3 context; the behavior maps by responsibility in other shapes.

| ID | Focal role and situation | Cue / candidate response | Counter-response or reason to change |
|---|---|---|---|
| GK01 | GK, short buildup | First presser commits: find the freed defender | Cover shadow still blocks the pass |
| GK02 | GK, opponent overloads short options | Evaluate lofted outlet and second-ball support | Receiver isolated or delivery beyond kicking range |
| GK03 | GK, ball behind defense | Compare interception arrival against attacker | Drop and set if attacker arrives first |
| GK04 | GK, defending cross | Claim, punch or hold according to trajectory and traffic | Do not advance through bodies or unseen flight |
| CB01 | CB, unopposed possession | Carry while control and space permit; reassess as cues change | Protect ball if a second presser closes |
| CB02 | CB, striker screens pivot | Change passing angle or find outside defender | Avoid forcing a pass through the screen |
| CB03 | CB, opponent striker checks short | Hold, hand over or follow with cover | Runner threatens the space behind |
| CB04 | CB, defending counterattack | Delay and protect goal-side route | Step to tackle only when support or touch permits |
| OB01 | Outside back, winger holds width | Offer inside support or overlap | Do not occupy the same running lane |
| OB02 | Outside back, winger moves inside | Provide width when defensive cover exists | Hold if advancing leaves a direct counter route |
| OB03 | Outside back, wide 1v1 defending | Approach under control and protect dangerous route | Opponent's support changes the preferred direction |
| OB04 | Far outside back, opposite-side attack | Tuck and scan far-post runner | Adjust to observed switch cues while retaining central and far-post protection |
| SIX01 | 6, receiving under pressure | Scan and choose turn, bounce or shield | Blind-side opponent makes the turn unsafe |
| SIX02 | 6, buildup with marked teammates | Move beyond a cover shadow to offer an angle | Do not retreat into the defender's occupied space |
| SIX03 | 6, teammate attacks forward | Protect central counter route | Shift if opponent outlet changes sides |
| SIX04 | 6, winning possession | Play forward if a usable advantage exists | Secure first touch if control or support is poor |
| EIGHT01 | 8, between lines | Receive side-on and progress when space exists | Bounce pass if pressure arrives before control |
| EIGHT02 | 8, third-player combination | Move as the wall player receives | Delay if the wall pass is unavailable |
| EIGHT03 | 8, wide attack develops | Arrive late into a free finishing lane | Hold if another runner occupies it or cover is absent |
| EIGHT04 | 8, defending their pivot | Screen pass while supporting pressure | Hand over marking when another threat becomes urgent |
| WING01 | Winger, isolated defender | Attack space to attempt to provoke commitment | Recycle when cover converts 1v1 into 1v2 |
| WING02 | Winger, near-side overload | Draw pressure and release a switch route | Keep carrying if defenders refuse to commit |
| WING03 | Far winger, ball on opposite flank | Choose width, blind-side depth or far-post run | Narrowing too early can destroy switch access |
| WING04 | Winger, delivery near byline | Compare cutback, near-post pass, far-post delivery | Cancel delivery when every arrival lane is covered |
| NINE01 | 9, teammate carrying centrally | Pin a defender or threaten depth | Check short if midfield lacks a playable connection |
| NINE02 | 9, back to goal | Protect and lay off to a facing teammate | Turn if defender overcommits and space opens |
| NINE03 | 9, pass in behind possible | Curve run and time acceleration | Delay when passer is pressured or not ready |
| NINE04 | 9, opposition buildup | Curve press to remove a return or pivot lane | Recover if the first line is bypassed |
| AT01 | Ball winner, attacking transition | Exploit temporary numerical/positional advantage | Recycle when defenders recover or first touch fails |
| AT02 | Supporting runner, 3v2 break | Separate lanes and time support | Level support is valid when its angle and timing preserve useful access |
| DT01 | Nearest player, immediate loss | Counterpress when ball and support are accessible | Delay/recover if opponent escapes facing forward |
| DT02 | Cover player, immediate loss | Block the most dangerous outlet | Do not join the ball chase and open the center |
| DEF01 | First defender, poor opponent touch | Press on observable loss of control | Abandon tackle if opponent regains control first |
| DEF02 | Cover defender, teammate presses | Protect inside and depth at a useful distance | Shift as the attacker changes angle |
| DEF03 | Back line, unpressured passer | Prepare to defend depth and coordinate line | Do not step up blindly with a runner behind |
| DEF04 | Defender, loose clearance | Contest second ball or protect next pass | Avoid abandoning the box for a low-probability duel |
| SP01 | Throw-in receiver | Check away, return and offer a legal angle | Switch receiver if marker follows tightly |
| SP02 | Corner defender | Assign first-contact and second-ball responsibilities | Adapt to short corner and delayed runner |
| SP03 | Attacking free kick | Compare direct attempt and planned combination | Range, wall and rules can make direct shot poor |
| GM01 | Any role, protecting late lead | Prefer controllable progress and secure support | Do not reject a clear high-value attacking chance |

### Expanded example: WING02 — attack space, draw, release

**Initial context:** 9v9, organized attack, left winger controls the ball outside the opposing block. A defender can engage; another can cover. The 8 offers an inside route, the 6 protects support behind the attack, and the opposite winger retains a reachable outlet.

**Entry requirements:** controllable ball; a legal, physically reachable carry lane; at least one potential release path. The player must have observed the intended outlet recently enough to estimate its location.

**Branch A — defender delays:** carry into useful space while preserving the ball. Do not manufacture a defender commitment.

**Branch B — first defender presses, cover stays central:** evaluate beating the defender, playing support, or recycling. No automatic switch merely because one defender moved.

**Branch C — cover steps toward the ball and far-side space opens:** release through the 8/6 or switch directly if range, trajectory and interception risk allow it.

**Branch D — opponent anticipates the switch:** use the newly freed local option, continue the dribble, or secure possession.

**Branch E — ball is lost:** nearest viable player pressures or delays; the 6 protects the central route; others recover from actual locations.

**Far-winger coordination:** hold width while serving as the switch target. Narrow into a second-striker or far-post role when a different player supplies width or when the delivery cue justifies it. These are timed alternatives, not simultaneous instructions.

**Feedback:** credit recognition of commitment and the newly available space. Record pass execution separately. An interception may reflect a poor read, late release or poor technique; preserve that distinction.

**Required tests:** mirrored flanks; closed switch lane; defender refusing to engage; weak-foot receiver; unscanned outlet; delayed support; pass beyond range; early narrowing; turnover continuity.

## 7. Validation gates

- Every attacking pattern has at least one competent defensive answer.
- Defensive pressure must have a cost and a failure mode.
- No action succeeds by tactical label alone.
- Players cannot teleport, instantly turn at speed or receive an unreachable ball.
- Runs remain useful even when not selected for a pass.
- Weak-foot, body orientation and fatigue affect execution plausibly.
- Skill moves and double taps cannot reset defender reaction or grant invulnerability.
- Goalkeepers and defenders do not read hidden user input.
- A result never changes the recorded pre-action decision assessment.
- Goal kicks, offside and other youth rules are configurable by competition.
- Seeded replays reproduce failures; statistics are evaluated over many seeds.
- Compare styles against each other and across ability levels to identify dominant exploits.

## 8. Next concrete research/build units

1. Complete manager dossiers with primary explanations and at least one success and failure case each.
2. Fill the ten-season coverage ledger and select a usable dataset.
3. Expand the 40 seeds into spatially defined fixtures, beginning with receiving, support, pressure/cover and possession changes.
4. Implement one complete possession chain with both teams reacting continuously.
5. Calibrate and test before multiplying the scenario count.

No claim is made yet that this engine is implemented, statistically calibrated, or superior to commercial games.

## Sources

S1. Manchester City, From Cruyff to Pep: https://www.mancity.com/news/first-team/first-team-news/2016/november/pep-guardiola-johan-cruyff-man-city-v-barcelona

S2. UEFA, Copenhagen–City analysis, 2024: https://www.uefa.com/uefachampionsleague/news/028a-1a2e30961a09-bd3836744862-1000--in-the-zone-copenhagen-1-3-man-city-performance-analysis/

S3. UEFA, City–Bayern analysis, 2023: https://www.uefa.com/uefachampionsleague/news/0280-17c6b1ac9a53-0dc7fbd642da-1000--in-the-zone-man-city-3-0-bayern-performance-analysis/

S4. UEFA, City–Inter analysis, 2023: https://www.uefa.com/uefachampionsleague/news/0282-183fa8a707c0-4056c043e3d1-1000--in-the-zone-city-s-win-analysed/

S5. Liverpool FC, Lijnders press conference, 2023: https://www.liverpoolfc.com/news/pep-lijnders-leicester-cup-tie-youth-development-salah-nunez-and-more

S6. UEFA, Sacchi's coaching methods: https://www.uefa.com/news/0253-0d81cb410c87-4115a0f26160-1000--arrigo-sacchi-s-case-for-greatness/

S7. Coaches' Voice, Mourinho's Inter–Barcelona masterclass introduction: https://learning.coachesvoice.com/cv/jose-mourinho-inter-milan-barcelona-pep-guardiola/

S8. UEFA, 2023/24 final technical report overview: https://www.uefa.com/uefachampionsleague/news/028e-1b138f3cdd3d-cb211675d501-1000--uefa-champions-league-technical-report/

S9. UEFA, 2024/25 technical report findings: https://www.uefa.com/uefachampionsleague/news/029d-1ebab9db818d-b34c67444955-1000--now-available-2024-25-club-competition-technical-reports/

S10. UEFA, Paris rotations against Inter, 2025: https://www.uefa.com/uefachampionsleague/news/029a-1de59ec3c409-b73cdfba5169-1000--in-the-zone-how-paris-movement-bewildered-inter/

S11. Coaches' Voice, Benítez masterclass introduction: https://learning.coachesvoice.com/cv/rafa-benitez-liverpool-real-madrid-champions-league/

S12. Coaches' Voice, Alonso playing-role masterclass introduction: https://learning.coachesvoice.com/cv/xabi-alonso-real-madrid-liverpool-bayern-munich-guardiola/

S13. Premier League, original tactical analysis of De Zerbi's Brighton, 2022: https://www.premierleague.com/en/news/2975168

S14. UEFA, 2015/16 routes to goal: https://www.uefa.com/uefachampionsleague/news/0231-0e94e1cc6e38-b0751d4ca431-1000--champions-league-technical-report-4-how-the-goals-were-scored/

S15. UEFA, 2019/20 technical report findings: https://www.uefa.com/news-media/news/0262-10b3b2d87eb7-616ea3d0da42-1000--tactics-and-trends-dissected-in-new-champions-league-techni/

S16. UEFA, 2021/22 routes to goal: https://www.uefa.com/uefachampionsleague/news/0278-15f131fd2b39-b45da4340307-1000--uefa-champions-league-technical-report-life-after-the-away-/

S17. FIFA, final 2022 World Cup technical overview, May 2023: https://www.fifatrainingcentre.com/en/fwc2022/technical-and-tactical-analysis/technical-tactical-overview.php

S18. StatsBomb/Hudl public dataset repository: https://github.com/hudl/open-data

Video masterclass introductions were read as text; full video lessons were not reviewed. Statistical observations use the source's own category definitions. All engine translations, scenario records and validation proposals are authored design recommendations.
