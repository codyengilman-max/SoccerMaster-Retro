# Audited Library v1.2: source-by-source review sheet

For Coach Cody's approval. **Nothing here is approved.** All 48 cards are `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` in `docs/training/library-v1.2/scenarios.json` (v1.2, SHA-256 `2c8802c468215ef0826497c5b7ed1fb7dc431598c7bf9bc5817d58f4697df708`), from `SoccerMaster_9v9_Audited_v1.2.zip` (SHA-256 `8dd4684a09e089efdd97e565b1ba6172caf0c94b13242f0adee9035f0df7202f`). Rules profile (pitch + rosters) SHA-256 `10bb337ae1864c9d81d60347dcbf958f3486b577411fc513d5357bc9cc498d82`. v1.2 supersedes v1.0; GK01–GK03 are retired.

Each card needs your approval of (1) the card and (2) the numeric scene built from it. A card can only score once both are signed and the local rules are verified. The pitch profile is 75 x 50 **yards** and `local_rules_verified` is false in the package.

## Sources resolved (15; S2 retired)

| ID | Origin | Cited section | Found in fetched page | SHA-256 served | Supports | Boundary |
|---|---|---|---|---|---|---|
| [S1](https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/zonal-defending/developing-defensive-coordination-in-small-groups.php) | small_group_practice | Key coaching points; Exercise 1 coaching points | yes | `6e869bb6cd42fa427fb0b7f252834e4cabc12161b3145868f263028f57b892a4` | Pressure, cover and role exchange. | Do not copy exercise pitch size, rotations or touch limits. |
| [S3](https://www.fifatrainingcentre.com/media/native/test/FIFA_Session_Plan_Abdallah.pdf) | reduced_game_with_four_back_assumption | Session overview; Parts 3 and 4 | yes | `ea20cdf176a78e2becb92da26fdbb58e10373b88ca7691a978f7b11922ff7ac6` | Defensive reorganization after possession loss. | Source mentions four defenders. Replace with named back three; do not import 6v6+GK drill structure. |
| [S4](https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/press-and-regain/6v6-plus-2-team-game-initiating-the-press-from-a-compact-block.php) | reduced_game_with_neutrals | Methodology: intention/scale; key coaching points | yes | `93f5b4fe340e8166ef03dafa81b302db7412bb23be841e04f4c01f2af977ce1d` | Connected pressure and inside protection. | Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. |
| [S5](https://www.fifatrainingcentre.com/en/practice/grassroots/8-to-12/from-fundamentals-to-free-flowing-football.php) | grassroots_micro_practice | Skill development: 1v1 to 1v2 with support players | yes | `fa8c2e6bb658269ab41dfc84832d062475e2cf1dff8f4296712287239434da0c` | Support, receiving space and combining. | Support players become existing roster members. No permanent safe neutrals or pass-count scoring. |
| [S6](https://www.theifab.com/laws/latest/offside/) | law | Law 11.1–11.3; 11.2 contact footnote | yes | `c66b2292d31bdc8d5cffc420af150a2186236a1703fd59b5b0e1835b19263e10` | Eligibility and involvement in offside. | Confirm competition edition. A rule reference is not evidence for a tactical preference. |
| [S7](https://www.fifatrainingcentre.com/en/game/game-analysis/out-of-possession/high-press.php) | 11v11_analysis_background | Team structure | yes | `ec4146c4443ed92af35493ea8edc76981273a7ccd16ee8f16d783ccd47949d27` | Coordinated press context. | Background only; no adult line height, fitness requirement or roster import. |
| [S8](https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/build-and-progress/progressing-through-the-thirds.php) | reduced_game_with_neutral | Methodology; Key coaching points 1–5 | yes | `252c594ed61f6ab91a39b7d1a89ef2668fe1dd15b49dd0a2882367292a64141d` | Passing connections and space between lines. | Remove second-CB dependency, neutral player, artificial offside lines and all-players-in-half scoring. |
| [S9](https://www.fifatrainingcentre.com/en/game/game-analysis/in-possession/third-player-combinations.php) | 11v11_analysis_background | Article explanation of third-player combinations | yes | `8f318c2887962998d941fdb53d1ef330475155e92b48c9030870c201656ad5d7` | Pass-layoff-run relationship. | Background principle, not a verified youth scene or compulsory pass sequence. |
| [S10](https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/gygax-attacking-in-wide-areas.php) | mixed_10v1_and_9v9 | Part 3 variations 2–3; Part 4 organization and variation | yes | `8e855d655c079c02dc94ca73d1e62ca9faf5ec2c3f5fc1de61cad544aada0d6d` | Complementary wide movement and target separation. | Part 3 is not 9v9. Part 4 is 9v9 including GKs but uses an octagon and restricted defenders. Do not import protected wide zones, extra box runners or score multipliers. |
| [S11](https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/sessions/attacking-the-cross.php) | mixed_circuit_and_reduced_games | Key coaching points; Part 3 | yes | `eb99bbaed98cfc97883cc5de0e4bbdf3ee0ba868ad87ce33e5c5de08606d91d7` | Delivery and arrival timing. | No 6v6+3 neutrals, mandatory first-time cross or aerial finish imported. |
| [S12](https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/boothroyd-breaking-down-a-low-block.php) | mixed_reduced_and_11v11 | Part 3 explanation and coaching points ONLY | yes | `9cd3173ae89facca88dfd34e840d811584e87fcf23f2f2df0ea9ef4e2c08c4d4` | Select delivery based on receiver and route. | Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. |
| [S13](https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/build-and-progress/passing-circuit-receiving-between-the-lines.php) | unopposed_circuit | Methodology: practice type; Key coaching points | yes | `26a5332779e67167d7c1b349df07d716858e25f39f9f6983ebdc51af22ebb04f` | Technique and receiving orientation. | Cannot certify an opposed answer. CB05 now also references S8 and explicitly requires interception/receiving checks. |
| [S14](https://www.fifatrainingcentre.com/en/fwc2022/technical-and-tactical-analysis/use-of-wide-areas.php) | 11v11_analysis_background | Types of crosses | yes | `70e1801010e71301838b421e09c028302f376a9b022641709545fc53367ae588` | Cutback terminology and illustrative elite context. | No elite success rates, player counts or distances. S12 is added to relevant cards for coaching guidance. |
| [S15](https://www.epysa.org/u-s-soccer-player-development-initiatives/) | 9v9_youth_guidance | 9v9 Formations: U11 & U12 | yes | `f12ed3085a36b8ab74a99c5dd73b8cc6a7193b091892ad67129d31e5ae67fd54` | 1-3-2-3 / 1-3-3-2 and connected youth roles. | Formation guidance only; not endorsement of these authored answers. |
| [S16](https://www.usyouthsoccer.org/wp-content/uploads/sites/160/2023/09/Player-Development-Initiatives-2017.pdf) | historical_9v9_standards | PDF pages 45 and 47 (printed pages 44 and 46): field and players | yes | `7c109816133384dcb4197bb5be76dfc49c643fd5b407fcee04f7c44e93077692` | Nine including goalkeeper; field dimension reference. | 2017 publication, not proof of current Arizona competition rules. Used only for a provisional design profile. |

## Summary

- **Ready to build a scene for review:** 39 cards.
- **Needs tactical authoring/review:** 9 cards (law/background/unopposed-only sources, or a setup the cited source does not contain).
- **Approved:** 0. **Scored:** 0. **Retired:** GK01, GK02, GK03.

## Cards

### CB01 — Cover the defender who steps (CB, defend)

Card SHA-256 `e1eea2eda6b07291ba072320a24bea37c16e0258ddd5487286806e070de5bb1e` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S1** (small_group_practice), Key coaching points; Exercise 1 coaching points: Exercise 1: 2v2 pressure and cover on a 30 x 20 m pitch with goals and goalkeepers; Exercises 2–3 build to 3v2 and 3v3. Press first as the defender closest to the ball, stopping the pass inside; “provide close cover as the second defender, denying through balls”; screen passing angles and protect the space behind the press. *Boundary:* Do not copy exercise pitch size, rotations or touch limits. | **Ball at freeze:** A_RW · **You:** H_CB<br>**Must be visible:** H_LB, H_CB, H_RB, H_DM, A_RW, A_ST<br>**Cue:** LB engages a winger; an inside runner threatens behind LB.<br>**Coordination:** H_LB pressures A_RW; H_CB covers inside and tracks A_ST; H_RB narrows; H_DM screens the backward-central outlet. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** give inside/deeper cover while monitoring the runner.<br>**Valid alternative:** engage only after responsibility transfers and cover exists.<br>**Misconception:** join LB at the ball.<br>**Changes the answer:** LB is beaten; CB must now reassess becoming first defender.<br>**Coach Code (success branch only):** “One pressed; you protected what was behind.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. One centre-back only; cover cannot abandon A_ST to double-team A_RW.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CB02 — Support a coordinated press (CB, press)

Card SHA-256 `c6317e4ea0b71b1a2418b5eaf7ce9e892fbbf294c40aa51b187548340663965a` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3.<br>**S7** (11v11_analysis_background), Team structure: 11v11 game analysis of the high press, “Team structure”. A solid shape from goalkeeper to forwards with suitable distances between units; triggers for when and how to press. *Boundary:* Background only; no adult line height, fitness requirement or roster import. | **Ball at freeze:** A_CB · **You:** H_CB<br>**Must be visible:** H_ST, H_LW, H_RW, H_CM, H_DM, H_CB, H_LB, H_RB, A_CB, A_LB, A_RB, A_DM, A_CM, A_ST<br>**Cue:** front line presses a back-facing receiver; midfield follows; CB is detached.<br>**Coordination:** H_ST pressures A_CB; wings restrict respective outside backs; H_CM screens A_DM; H_DM monitors A_CM; back three track depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** advance with the connected unit while tracking depth threats.<br>**Valid alternative:** hold/drop if the ball carrier can release behind or cover is absent.<br>**Misconception:** advance regardless of pressure.<br>**Changes the answer:** opponent turns freely; automatic stepping becomes unsafe.<br>**Coach Code (success branch only):** “Your line supported the press because pressure limited the next pass.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Step only while pressure restricts the forward ball; opponent's turn reverses the recommendation.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CB03 — Protect the centre on turnover (CB, transition)

Card SHA-256 `98dee47874a92a182291c3e2e339d2d6949e133b0cf25364b88a5c7d5afde48e` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S3** (reduced_game_with_four_back_assumption), Session overview; Parts 3 and 4: Defensive transition session (PDF, 7 pages); Parts 3–4 are reduced games that assume a back four. After a loss the closest player pressures, teammates recover to form a compact block and restrict space; decide quickly between press and cover. *Boundary:* Source mentions four defenders. Replace with named back three; do not import 6v6+GK drill structure. | **Ball at freeze:** A_CM · **You:** H_CB<br>**Must be visible:** H_CM, H_CB, H_DM, H_LB, H_RB, A_CM, A_ST<br>**Cue:** 8 loses possession; CB faces ball carrier and a separate runner.<br>**Coordination:** H_CM has lost possession; H_CB delays A_CM and protects A_ST's route; H_DM recovers goal-side; outside backs recover. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** delay and protect the central route until support returns.<br>**Valid alternative:** intercept a clearly exposed pass.<br>**Misconception:** chase wide and open the route to goal.<br>**Changes the answer:** support arrives; assess whether pressure can increase.<br>**Coach Code (success branch only):** “You bought time while keeping the dangerous route closed.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Specify which runner is dangerous; do not prescribe an automatic tackle or chase.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CB04 — Find the dropping midfielder (CB, build)

Card SHA-256 `3d09e79a9b85da8593fec9b8f149c6e493c8a4c8901a3c0f0b1beca629c0fc47` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S8** (reduced_game_with_neutral), Methodology; Key coaching points 1–5: Talent coach session “Progressing through the thirds”: reduced game with a neutral and artificial lines. Against a press that blocks passing lines, break lines by playing around; use gaps between lines; connect through players who drop or move into space. *Boundary:* Remove second-CB dependency, neutral player, artificial offside lines and all-players-in-half scoring. | **Ball at freeze:** H_CB · **You:** H_CB<br>**Must be visible:** H_CB, H_DM, H_CM, H_LB, H_RB, H_ST, A_ST, A_CM<br>**Cue:** 6 drops into a clear lane; forward pressure prevents a safe direct ball to 9.<br>**Coordination:** A_ST obstructs H_CB to H_ST; H_DM offers a reachable outlet beyond pressure; H_CM stays separate; outside backs provide alternatives. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** connect through 6.<br>**Valid alternative:** use the wide outlet if 6 is followed.<br>**Misconception:** force the blocked forward pass.<br>**Changes the answer:** mark 6 tightly.<br>**Coach Code (success branch only):** “Find the available connection.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Replace source's two centre-backs with this back-three map; no neutral receiver.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CB05 — Pass into a receiving window (CB, build)

Card SHA-256 `10364851f73ecd60394d8ca312f82d24a76d73aaf4ec84c4fb77fb3b49ef7062` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S13** (unopposed_circuit), Methodology: practice type; Key coaching points: Unopposed passing circuit: receiving between the lines. Players drop to receive between the lines from various angles; centre-backs can disguise passes; body orientation and first touch. *Boundary:* Cannot certify an opposed answer. CB05 now also references S8 and explicitly requires interception/receiving checks.<br>**S8** (reduced_game_with_neutral), Methodology; Key coaching points 1–5: Talent coach session “Progressing through the thirds”: reduced game with a neutral and artificial lines. Against a press that blocks passing lines, break lines by playing around; use gaps between lines; connect through players who drop or move into space. *Boundary:* Remove second-CB dependency, neutral player, artificial offside lines and all-players-in-half scoring. | **Ball at freeze:** H_CB · **You:** H_CB<br>**Must be visible:** H_CB, H_CM, H_DM, H_RB, A_ST, A_DM, A_CB<br>**Cue:** 8 drifts between lines into a visible passing window.<br>**Coordination:** H_CM drifts into the gap between A_DM and A_CB; H_DM and H_RB remain other outlets; A_ST threatens the passing window. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** deliver while the window is open.<br>**Valid alternative:** retain if an opponent closes it.<br>**Misconception:** pass to where 8 stood earlier.<br>**Changes the answer:** close the window before the passer's first contact. Limitation: the source is unopposed; opposed answer validity needs separate review.<br>**Coach Code (success branch only):** “Recognize the window.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Add S8 opposed guidance to S13 technique; require a viable receiver first touch, not just an apparently clear line.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CB06 — Take over when cover becomes pressure (CB, defend)

Card SHA-256 `61dda8945fbc8931471240074f128f83e593b0e349f1ef574e22e5325dc83570` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S1** (small_group_practice), Key coaching points; Exercise 1 coaching points: Exercise 1: 2v2 pressure and cover on a 30 x 20 m pitch with goals and goalkeepers; Exercises 2–3 build to 3v2 and 3v3. Press first as the defender closest to the ball, stopping the pass inside; “provide close cover as the second defender, denying through balls”; screen passing angles and protect the space behind the press. *Boundary:* Do not copy exercise pitch size, rotations or touch limits. | **Ball at freeze:** A_RW · **You:** H_CB<br>**Must be visible:** H_LB, H_CB, H_RB, H_DM, A_RW, A_ST<br>**Cue:** LB is beaten; CB can confront the carrier while RB covers depth.<br>**Coordination:** A_RW has beaten H_LB; H_CB takes over delay; H_RB covers A_ST; H_DM protects the inside lane; H_LB recovers. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** take over pressure with controlled approach.<br>**Valid alternative:** delay centrally when the runner prevents safe engagement.<br>**Misconception:** remain passive solely because the original job was cover.<br>**Changes the answer:** remove RB cover.<br>**Coach Code (success branch only):** “Your responsibility changed when the first defender was beaten.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Switch pressure/cover only after role transfer; remove H_RB cover in counterfactual.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LB01 — Escape a touchline trap (LB, build)

Card SHA-256 `aadc821c0fe944ee44d5ff5991ffe7eb96e2fe56fe02deb033a948691fff2a28` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_LB · **You:** H_LB<br>**Must be visible:** H_LB, H_DM, H_CB, H_LW, A_RW, A_CM<br>**Cue:** receiving left, forward route blocked, 6 visible inside.<br>**Coordination:** A_RW presses H_LB and A_CM closes forward play; H_DM offers inside; H_CB offers recycle; H_LW offers depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** combine inside.<br>**Valid alternative:** recycle to CB if 6 is screened.<br>**Misconception:** carry into two closing opponents.<br>**Changes the answer:** mark 6 and open the line pass instead.<br>**Coach Code (success branch only):** “Your support gave you another direction.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Pass inside only if H_DM has a usable next action; touchline is a real boundary.
- **Devin's read:** S5 is a central circle/square keep-ball with outside supports; it has no touchline, no left-back and no 6. The trap and the inside/recycle ranking are authored.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LB02 — Decide whether to jump (LB, defend)

Card SHA-256 `567981f9864bbc2c213460449031aeb85bece5cd21359838fbef1634851250e4` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. | **Ball at freeze:** A_RW · **You:** H_LB<br>**Must be visible:** H_LB, H_CB, H_RB, H_DM, H_LW, A_RW, A_RB, A_ST<br>**Cue:** opponent receives left with back turned; CB covers and LW screens return.<br>**Coordination:** H_LB approaches back-facing A_RW; H_LW limits return to A_RB; H_CB covers A_ST; H_RB narrows; H_DM screens inside. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** press under that support.<br>**Valid alternative:** delay if CB is occupied by a runner.<br>**Misconception:** leave the line without cover.<br>**Changes the answer:** remove cover.<br>**Coach Code (success branch only):** “The support behind you made that press possible.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Back turned alone is insufficient; approach must arrive before receiver can exploit behind.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LB03 — Recover inside first (LB, transition)

Card SHA-256 `be336da379b058dd9d1962bf7afcc9b532fb996db0c6755b32bf4f090fb8c966` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S3** (reduced_game_with_four_back_assumption), Session overview; Parts 3 and 4: Defensive transition session (PDF, 7 pages); Parts 3–4 are reduced games that assume a back four. After a loss the closest player pressures, teammates recover to form a compact block and restrict space; decide quickly between press and cover. *Boundary:* Source mentions four defenders. Replace with named back three; do not import 6v6+GK drill structure. | **Ball at freeze:** A_LW · **You:** H_LB<br>**Must be visible:** H_LB, H_CB, H_RB, H_DM, A_LW, A_ST, A_RW<br>**Cue:** ball lost on the opposite flank; a central runner is more dangerous than a distant wide player.<br>**Coordination:** A_LW carries on home right; H_RB delays; H_CB is drawn across; H_LB protects A_ST centrally while checking A_RW. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** recover toward the central threat while scanning wide.<br>**Valid alternative:** track the wide runner if the central zone is already covered.<br>**Misconception:** stay wide by habit.<br>**Changes the answer:** switch the immediate threat wide.<br>**Coach Code (success branch only):** “Recover toward the danger, not just your starting spot.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Home left and opponent right are not screen-left labels; threat changes determine recovery.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LB04 — Overlap when width opens (LB, wide)

Card SHA-256 `1d0340035b6946b408d2891073df6b50a73d5c4e54b0a385efb0bba05e0cf52c` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S10** (mixed_10v1_and_9v9), Part 3 variations 2–3; Part 4 organization and variation: Elite session (Gygax) attacking in wide areas: Part 3 is 10v1, Part 4 is 9v9 in an octagon with conditions. Advance from central possession to wide areas, create overloads on the wings, make coordinated runs into space and find targets. *Boundary:* Part 3 is not 9v9. Part 4 is 9v9 including GKs but uses an octagon and restricted defenders. Do not import protected wide zones, extra box runners or score multipliers. | **Ball at freeze:** H_LW · **You:** H_LB<br>**Must be visible:** H_LB, H_LW, H_CB, H_RB, H_DM, H_CM, A_RB, A_CB, A_ST<br>**Cue:** LW moves inside; outside lane and defensive balance are available.<br>**Coordination:** H_LB overlaps outside H_LW; H_CB shifts left; H_RB tucks; H_DM remains underneath; H_CM does not also vacate balance. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** time an overlap.<br>**Valid alternative:** support behind if the lane is closed.<br>**Misconception:** run into LW's occupied lane.<br>**Changes the answer:** opponent tracks the overlap.<br>**Coach Code (success branch only):** “Use complementary movement.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Replace four-back assumptions. If H_RB is already advanced or H_DM cannot screen A_ST, hold instead.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LB05 — Deliver to the available receiver (LB, cross)

Card SHA-256 `8bcf18452f7ba4b43b78701d367f824e9fcf257f7811621839034cff803aecd0` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S12** (mixed_reduced_and_11v11), Part 3 explanation and coaching points ONLY: Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded). Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route. *Boundary:* Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. | **Ball at freeze:** H_LB · **You:** H_LB<br>**Must be visible:** H_LB, H_LW, H_ST, H_CM, H_CB, H_RB, H_DM, A_RB, A_CB, A_GK<br>**Cue:** wide possession; an early delivery lane and arriving teammate are visible.<br>**Coordination:** H_LB delivers from left; H_ST is arriving; H_LW is inside but separate; H_CM supports cutback; H_CB H_RB H_DM protect transition. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** serve that arrival.<br>**Valid alternative:** advance for a cutback if early delivery is blocked.<br>**Misconception:** cross without identifying a receiver.<br>**Changes the answer:** remove the receiver.<br>**Coach Code (success branch only):** “Match the delivery to support.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. No neutral wide player or cross-only scoring. Show receiver, delivery path and opponent goalkeeper.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LB06 — Do not follow a broken press blindly (LB, transition)

Card SHA-256 `1804ecc40ceb3cb73a9f1df5fe016ee4d684186aa05f195b17abf4611e1e9d4a` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. | **Ball at freeze:** A_RW · **You:** H_LB<br>**Must be visible:** H_LB, H_LW, H_CB, H_RB, H_DM, A_RW, A_RB, A_ST<br>**Cue:** opponents bypass the first press; teammate cannot cover LB stepping forward.<br>**Coordination:** H_LW's press has been bypassed to A_RW; H_CB is occupied by A_ST; H_LB recovers rather than jumping alone. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** recover into a connected defensive position.<br>**Valid alternative:** press if the next receiver is trapped and cover returns.<br>**Misconception:** chase alone.<br>**Changes the answer:** restore pressure and cover.<br>**Coach Code (success branch only):** “Reconnect before committing again.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Define broken press as an actual completed bypass, not a generic animation cue.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RB01 — Escape a touchline trap (RB, build)

Card SHA-256 `c6082da26f4397e9c2a3f49c2545041270465edd7f3f7857cb510c0557a4175c` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_RB · **You:** H_RB<br>**Must be visible:** H_RB, H_DM, H_CB, H_RW, A_LW, A_CM<br>**Cue:** receiving right, line blocked, 6 visible inside.<br>**Coordination:** A_LW presses H_RB; A_CM closes forward play; H_DM supports inside; H_CB recycles; H_RW offers depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** combine inside.<br>**Valid alternative:** recycle to CB if screened.<br>**Misconception:** dribble into the trap.<br>**Changes the answer:** mark 6 and open RW. Mirror LB01 spatially, not by swapping text alone.<br>**Coach Code (success branch only):** “You found support before the touchline trapped you.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Mirror LB01 coordinates and facing; verify inside receiver is not facing an immediate trap.
- **Devin's read:** Same as LB01 on the right: S5 has no touchline trap.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RB02 — Decide whether to jump (RB, defend)

Card SHA-256 `4f12c9c1aadeb614d6e66d6dc3e760c38c3e6c99cde9436b12330ec6ec6e6ffd` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. | **Ball at freeze:** A_LW · **You:** H_RB<br>**Must be visible:** H_RB, H_CB, H_LB, H_DM, H_RW, A_LW, A_LB, A_ST<br>**Cue:** right-side receiver faces backward; CB covers, RW screens return.<br>**Coordination:** H_RB approaches back-facing A_LW; H_RW limits return to A_LB; H_CB covers A_ST; H_LB narrows; H_DM screens. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** press.<br>**Valid alternative:** hold if a runner removes CB cover.<br>**Misconception:** jump without support.<br>**Changes the answer:** receiver opens toward goal. Mirror LB02 with body orientation preserved.<br>**Coach Code (success branch only):** “Pressure works when the next defender protects you.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Mirror pressure timing and cover, not merely left/right labels.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RB03 — Recover inside first (RB, transition)

Card SHA-256 `159070e400d7c80a1378da1d51332e88d1e53a16e5b0a011745420124d1dab10` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S3** (reduced_game_with_four_back_assumption), Session overview; Parts 3 and 4: Defensive transition session (PDF, 7 pages); Parts 3–4 are reduced games that assume a back four. After a loss the closest player pressures, teammates recover to form a compact block and restrict space; decide quickly between press and cover. *Boundary:* Source mentions four defenders. Replace with named back three; do not import 6v6+GK drill structure. | **Ball at freeze:** A_RW · **You:** H_RB<br>**Must be visible:** H_RB, H_CB, H_LB, H_DM, A_RW, A_ST, A_LW<br>**Cue:** loss on the left; an uncovered central runner threatens.<br>**Coordination:** A_RW carries on home left; H_LB delays; H_CB shifts across; H_RB protects A_ST while checking A_LW. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** narrow and recover to protect that route.<br>**Valid alternative:** stay with a wide threat when centre is secure.<br>**Misconception:** remain on the touchline regardless.<br>**Changes the answer:** central cover arrives. Mirror LB03.<br>**Coach Code (success branch only):** “You protected the route the opponent could exploit next.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Recovery route is threat-led; do not glue the outside back to the touchline.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RB04 — Support the inside-moving winger (RB, wide)

Card SHA-256 `92bf6405afe4a5d69659f5d1c685eb116aeefa3a6a95b8fe3d7c5374187d1fde` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S10** (mixed_10v1_and_9v9), Part 3 variations 2–3; Part 4 organization and variation: Elite session (Gygax) attacking in wide areas: Part 3 is 10v1, Part 4 is 9v9 in an octagon with conditions. Advance from central possession to wide areas, create overloads on the wings, make coordinated runs into space and find targets. *Boundary:* Part 3 is not 9v9. Part 4 is 9v9 including GKs but uses an octagon and restricted defenders. Do not import protected wide zones, extra box runners or score multipliers. | **Ball at freeze:** H_RW · **You:** H_RB<br>**Must be visible:** H_RB, H_RW, H_CB, H_LB, H_DM, H_CM, A_LB, A_CB, A_ST<br>**Cue:** RW narrows and outside space is free; teammates protect transition.<br>**Coordination:** H_RB overlaps H_RW; H_CB shifts right; H_LB tucks; H_DM stays underneath; H_CM preserves support. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** overlap with usable timing.<br>**Valid alternative:** remain underneath if RW stays wide.<br>**Misconception:** occupy the same corridor.<br>**Changes the answer:** RW holds the touchline. Mirror-family LB04; not a new principle.<br>**Coach Code (success branch only):** “Your movement offered another route.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Only one outside back overlaps in this authored scene; absence of balance makes holding valid.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RB05 — Early service or byline (RB, cross)

Card SHA-256 `47731e600c65f450b84e75621af66931cf06f902a109183f49a352053018d6ba` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S12** (mixed_reduced_and_11v11), Part 3 explanation and coaching points ONLY: Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded). Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route. *Boundary:* Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. | **Ball at freeze:** H_RB · **You:** H_RB<br>**Must be visible:** H_RB, H_RW, H_ST, H_CM, H_CB, H_LB, H_DM, A_LB, A_CB, A_DM, A_GK<br>**Cue:** early cross is blocked but byline space and a cutback receiver are available.<br>**Coordination:** A_LB blocks early service; H_RB can carry to byline; H_CM arrives behind H_ST; H_CB H_LB H_DM provide balance. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** advance for the cutback.<br>**Valid alternative:** recycle if the route closes.<br>**Misconception:** deliver into the blocking defender.<br>**Changes the answer:** defender closes byline but opens early service.<br>**Coach Code (success branch only):** “The open route changed the delivery.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Byline path must be genuinely reachable; if A_LB can close it, recycling is acceptable.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RB06 — Balance the opposite-side press (RB, press)

Card SHA-256 `5547c9bcf8760ec6012aa131a3b976a88aae0400fe5d14a58dc8b18bedfb1785` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. | **Ball at freeze:** A_RB · **You:** H_RB<br>**Must be visible:** H_RB, H_CB, H_LB, H_DM, H_LW, H_RW, A_RB, A_LB, A_LW, A_ST<br>**Cue:** team presses left; RB is detached on the far touchline and central spacing is stretched.<br>**Coordination:** H_LW pressures A_RB on home left; H_RB narrows with H_CB while monitoring A_LW; H_RW can recover toward A_LB. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** shift with the unit while monitoring the wide threat.<br>**Valid alternative:** retain width if the immediate switch requires it and central cover is secure.<br>**Misconception:** shift without scanning.<br>**Changes the answer:** show an imminent unpressured switch.<br>**Coach Code (success branch only):** “Stay connected without losing the far threat.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Do not screen a fast weak-side switch out of view; re-evaluate if passer gains time.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### DM01 — Become available behind pressure (DM, build)

Card SHA-256 `9ca35e62964119c95c08cbaaf6adb4be98534bc54204e42a9815c669c7b26c95` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_CB · **You:** H_DM<br>**Must be visible:** H_DM, H_CB, H_CM, H_RB, A_ST, A_CM<br>**Cue:** CB has possession; 6 is directly behind an opponent from the ball's perspective.<br>**Coordination:** A_ST hides H_DM from H_CB; H_DM moves laterally; H_CM stays in a different lane; H_RB is a fallback. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** move laterally into a usable passing angle, scanning before receiving.<br>**Valid alternative:** clear the lane for 8 when followed.<br>**Misconception:** demand the pass while screened.<br>**Changes the answer:** marker follows tightly.<br>**Coach Code (success branch only):** “A small movement made you visible.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Being visible is not enough: ensure reception space; followed movement can clear H_CM instead.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### DM02 — Cover rather than duplicate pressure (DM, defend)

Card SHA-256 `0c0ceefb1051bfc76cda48f10b5446f7470d915d2ef1cb0bb3aefb1c522c6c05` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S1** (small_group_practice), Key coaching points; Exercise 1 coaching points: Exercise 1: 2v2 pressure and cover on a 30 x 20 m pitch with goals and goalkeepers; Exercises 2–3 build to 3v2 and 3v3. Press first as the defender closest to the ball, stopping the pass inside; “provide close cover as the second defender, denying through balls”; screen passing angles and protect the space behind the press. *Boundary:* Do not copy exercise pitch size, rotations or touch limits. | **Ball at freeze:** A_CM · **You:** H_DM<br>**Must be visible:** H_DM, H_CM, H_CB, A_CM, A_ST<br>**Cue:** 8 presses ball; pass into striker remains open behind.<br>**Coordination:** H_CM pressures A_CM; H_DM blocks the pass to A_ST; H_CB protects depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** screen the striker route.<br>**Valid alternative:** take over pressure if 8 is beaten and cover transfers.<br>**Misconception:** rush next to 8.<br>**Changes the answer:** 8 loses the duel.<br>**Coach Code (success branch only):** “Your job was the next pass, not the same opponent.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. H_DM screens one named route, not every possible central pass.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### DM03 — Reconnect on regain (DM, transition)

Card SHA-256 `d45041f224113ca89467fe8cce985910993a4f218b1efd29289b9215c0a609e2` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S3** (reduced_game_with_four_back_assumption), Session overview; Parts 3 and 4: Defensive transition session (PDF, 7 pages); Parts 3–4 are reduced games that assume a back four. After a loss the closest player pressures, teammates recover to form a compact block and restrict space; decide quickly between press and cover. *Boundary:* Source mentions four defenders. Replace with named back three; do not import 6v6+GK drill structure.<br>**S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_DM · **You:** H_DM<br>**Must be visible:** H_DM, H_CB, H_CM, H_LW, H_RW, A_CM, A_ST<br>**Cue:** regain facing own goal with immediate pressure and a free supporting CB.<br>**Coordination:** H_DM regains back to goal under A_CM pressure; H_CB supports with a safe lane; H_CM and wings spread. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** secure possession through support.<br>**Valid alternative:** turn forward if scan confirms space.<br>**Misconception:** force a blind forward ball.<br>**Changes the answer:** remove pressure and reveal a progressive lane.<br>**Coach Code (success branch only):** “Winning it did not mean the forward pass was ready.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. S3 only supports transition context; S5 supports combining. Do not infer always-pass-back.
- **Devin's read:** S3 covers losing the ball, not regaining it; S5 covers combining. When a forward turn after a regain is safe is not in either source.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### DM04 — Drop at the right moment (DM, build)

Card SHA-256 `f4eaea4738c0d518b65e466df722ce981a2c7047195754e0ff8142918c45a696` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S8** (reduced_game_with_neutral), Methodology; Key coaching points 1–5: Talent coach session “Progressing through the thirds”: reduced game with a neutral and artificial lines. Against a press that blocks passing lines, break lines by playing around; use gaps between lines; connect through players who drop or move into space. *Boundary:* Remove second-CB dependency, neutral player, artificial offside lines and all-players-in-half scoring. | **Ball at freeze:** H_CB · **You:** H_DM<br>**Must be visible:** H_DM, H_CB, H_CM, H_RB, A_ST, A_CM<br>**Cue:** CB needs a connection; 6 can drop beyond the presser's reach.<br>**Coordination:** H_DM drops to a new angle outside A_CM reach; H_CM stays higher; H_RB offers another direction. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** offer the timed passing angle.<br>**Valid alternative:** stay higher if dropping only duplicates another receiver.<br>**Misconception:** arrive alongside CB without creating a new lane.<br>**Changes the answer:** another midfielder already occupies it.<br>**Coach Code (success branch only):** “Offer a useful connection.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. No imported neutral player, second centre-back or artificial third-line offside boundary.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### DM05 — Release the third player (DM, combine)

Card SHA-256 `7f4470535dc04cb828c7dba5ab1437e17a28d585ad958e4c707a4fb8659141b1` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S9** (11v11_analysis_background), Article explanation of third-player combinations: 11v11 game-analysis article on third-player combinations. A third player unlocks an organised defence; the pass–layoff–run is hard to anticipate when the runner moves as the ball is laid off. *Boundary:* Background principle, not a verified youth scene or compulsory pass sequence. | **Ball at freeze:** H_DM · **You:** H_DM<br>**Must be visible:** H_DM, H_ST, H_CM, H_CB, H_LB, H_RB, A_CB, A_DM, A_CM<br>**Cue:** 6 receives a layoff; 8's forward run opens the next pass.<br>**Coordination:** H_ST has laid off to H_DM; H_CM runs beyond A_DM; H_CB and outside backs protect behind H_DM. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** release 8 while the lane is available.<br>**Valid alternative:** secure possession if the runner is covered.<br>**Misconception:** force the rehearsed sequence.<br>**Changes the answer:** defender follows 8.<br>**Coach Code (success branch only):** “The third player was the forward option.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. At the freeze the ball is with H_DM, not simultaneously with H_ST; defender reach determines release.
- **Devin's read:** Only 11v11_analysis_background source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### DM06 — Screen the next threat after regain is lost (DM, transition)

Card SHA-256 `7ccce5d2ec10a405d392da2c0d3f38a0f086cb02cceec76281f770b5519959f6` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S3** (reduced_game_with_four_back_assumption), Session overview; Parts 3 and 4: Defensive transition session (PDF, 7 pages); Parts 3–4 are reduced games that assume a back four. After a loss the closest player pressures, teammates recover to form a compact block and restrict space; decide quickly between press and cover. *Boundary:* Source mentions four defenders. Replace with named back three; do not import 6v6+GK drill structure. | **Ball at freeze:** A_DM · **You:** H_DM<br>**Must be visible:** H_DM, H_CM, H_CB, H_LB, H_RB, A_DM, A_ST<br>**Cue:** immediate re-loss; 8 pressures the ball, central receiver behind 8 is free.<br>**Coordination:** A_DM wins the ball immediately after home regain; H_CM pressures; H_DM screens A_ST; H_CB protects depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** recover to disrupt that forward connection.<br>**Valid alternative:** challenge the loose ball if clearly reachable first and cover exists.<br>**Misconception:** duplicate 8's chase.<br>**Changes the answer:** ball becomes uncontested.<br>**Coach Code (success branch only):** “Protect the pass that would break the recovery.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Keep two possession changes in event order; no free teleport of recovery players.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CM01 — Receive or bounce (CM, receive)

Card SHA-256 `bf6ac447ebe78f7168928f04e79d8a70fed9a4e2ccf217201c88313ef0164a9a` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_CM · **You:** H_CM<br>**Must be visible:** H_CM, H_DM, H_ST, A_DM, A_CB<br>**Cue:** pass arrives between opponents; pressure is tight behind and a support player is free.<br>**Coordination:** H_CM receives under A_DM pressure; H_DM is the bounce outlet; H_ST occupies A_CB. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** lay off and move.<br>**Valid alternative:** turn if pressure has withdrawn and space is confirmed.<br>**Misconception:** turn blindly into the marker.<br>**Changes the answer:** withdraw the marker.<br>**Coach Code (success branch only):** “Your scan decided whether the turn was available.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Only prefer a bounce when its lane and first-touch timing are viable; turn remains valid if pressure leaves.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CM02 — Support the front press (CM, press)

Card SHA-256 `60d19454d2b0ec1a375dcef377a72d5dc6738552eeb69335358078e3a514a5dd` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3.<br>**S7** (11v11_analysis_background), Team structure: 11v11 game analysis of the high press, “Team structure”. A solid shape from goalkeeper to forwards with suitable distances between units; triggers for when and how to press. *Boundary:* Background only; no adult line height, fitness requirement or roster import. | **Ball at freeze:** A_CB · **You:** H_CM<br>**Must be visible:** H_CM, H_ST, H_LW, H_RW, H_DM, H_CB, A_CB, A_DM, A_CM, A_LB, A_RB, A_ST<br>**Cue:** 9 presses a backward-facing CB; opposing 6 offers the inside escape.<br>**Coordination:** H_ST pressures A_CB; H_CM screens A_DM; H_DM monitors A_CM; wings restrict outside outlets; H_CB protects depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** close that receiving lane while staying connected.<br>**Valid alternative:** hold deeper if the frontline press is unsupported.<br>**Misconception:** chase the same CB as 9.<br>**Changes the answer:** opposing 6 moves to create a different lane.<br>**Coach Code (success branch only):** “You helped the press by removing the exit.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Two home midfielders, not a hidden midfield three; H_CM cannot press CB and mark DM simultaneously.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CM03 — Choose a supporting lane (CM, support)

Card SHA-256 `a83b1b37a0ce2fc4ac34d95ac972e935ea07bc0dcfe39a5ecf49a17ea2625d1b` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_RW · **You:** H_CM<br>**Must be visible:** H_CM, H_RW, H_ST, H_DM, H_LW, A_LB, A_DM<br>**Cue:** RW has ball, 9 occupies the direct forward lane, underneath support is missing.<br>**Coordination:** H_RW carries against A_LB; H_ST occupies the direct forward lane; H_CM offers underneath outside A_DM cover; H_DM balances. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** offer a separate backward-diagonal angle.<br>**Valid alternative:** run beyond if support already exists and space opens.<br>**Misconception:** stand in the striker's lane.<br>**Changes the answer:** add underneath support and open depth.<br>**Coach Code (success branch only):** “Different angles gave the winger different choices.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. New support must create a distinct passing angle; don't reward standing on H_ST's line.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CM04 — Progress when the line holds (CM, build)

Card SHA-256 `692d6963da10af186aadc701718514251d92a10fc14ebe5558aa593430c3f2df` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S8** (reduced_game_with_neutral), Methodology; Key coaching points 1–5: Talent coach session “Progressing through the thirds”: reduced game with a neutral and artificial lines. Against a press that blocks passing lines, break lines by playing around; use gaps between lines; connect through players who drop or move into space. *Boundary:* Remove second-CB dependency, neutral player, artificial offside lines and all-players-in-half scoring. | **Ball at freeze:** H_CM · **You:** H_CM<br>**Must be visible:** H_CM, H_ST, H_LW, H_RW, H_DM, A_DM, A_CB, A_LB, A_RB<br>**Cue:** 8 receives facing forward between lines; defenders hold and carrying space is clear.<br>**Coordination:** H_CM has received facing forward beyond A_DM; A_CB holds; H_ST and wings occupy distinct lanes; H_DM supports. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** advance to engage them.<br>**Valid alternative:** pass when a defender steps and frees a teammate.<br>**Misconception:** run into pressure after the picture changes.<br>**Changes the answer:** defender steps early.<br>**Coach Code (success branch only):** “Use space, then reassess.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Carrying is conditional on available space and controllable ball, not a universal forward command.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CM05 — Be the third-player runner (CM, combine)

Card SHA-256 `a6290ed9e8ddf7d06c7fa68db9716418d68a531e03923b45ee3659f9b281b2bb` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S9** (11v11_analysis_background), Article explanation of third-player combinations: 11v11 game-analysis article on third-player combinations. A third player unlocks an organised defence; the pass–layoff–run is hard to anticipate when the runner moves as the ball is laid off. *Boundary:* Background principle, not a verified youth scene or compulsory pass sequence. | **Ball at freeze:** H_ST · **You:** H_CM<br>**Must be visible:** H_CM, H_ST, H_DM, H_CB, H_LB, H_RB, A_CB, A_DM, A_CM<br>**Cue:** 9 can bounce the ball to 6; a separate forward lane opens for 8.<br>**Coordination:** H_ST can lay off to H_DM; H_CM begins a legal run beyond A_DM; back three remain behind H_DM. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** time a run for the next pass.<br>**Valid alternative:** support underneath if that lane closes.<br>**Misconception:** stand beside 9.<br>**Changes the answer:** block the running lane.<br>**Coach Code (success branch only):** “Your movement completed the connection.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Freeze precedes layoff; this is a different decision instant from DM05 and ST04, not three simultaneous balls.
- **Devin's read:** Only 11v11_analysis_background source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### CM06 — Arrive for the cutback (CM, cross)

Card SHA-256 `67fbfe3410970d4c80c4c7191718256b95bd9693ff8b9a811d2e125474131adb` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S14** (11v11_analysis_background), Types of crosses: FIFA World Cup 2022 analysis, “Use of wide areas”, types of crosses. Six cross types including the cut-back; describes elite trends only. *Boundary:* No elite success rates, player counts or distances. S12 is added to relevant cards for coaching guidance.<br>**S12** (mixed_reduced_and_11v11), Part 3 explanation and coaching points ONLY: Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded). Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route. *Boundary:* Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. | **Ball at freeze:** H_RW · **You:** H_CM<br>**Must be visible:** H_CM, H_RW, H_ST, H_LW, H_DM, H_CB, H_LB, H_RB, A_LB, A_CB, A_DM, A_GK<br>**Cue:** winger reaches byline; defenders protect the goalmouth, leaving a backward lane to 8.<br>**Coordination:** H_RW reaches byline; H_ST is nearer goal; H_CM offers the backward lane; H_LW stays separate; H_DM holds balance. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** offer that lane without crowding 9.<br>**Valid alternative:** hold balance when another teammate occupies it.<br>**Misconception:** join every attacker at the near post.<br>**Changes the answer:** opponent screens the cutback.<br>**Coach Code (success branch only):** “Offer a different finishing angle.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Only one central midfielder joins the box here; no added number 10 or second number 8.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LW01 — Combine against a second defender (LW, wide)

Card SHA-256 `c107bcd2f5a17c42735f0813741fcc308f53c25be862144e4d39b0cf2da05508` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_LW · **You:** H_LW<br>**Must be visible:** H_LW, H_LB, H_CM, H_ST, A_RB, A_DM<br>**Cue:** receiving left, second opponent closes, LB support remains open.<br>**Coordination:** A_RB engages H_LW; A_DM closes as cover; H_LB offers support; H_CM and H_ST stay distinct. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** combine with support.<br>**Valid alternative:** beat the first defender if the second is too far to cover.<br>**Misconception:** dribble into both automatically.<br>**Changes the answer:** withdraw cover.<br>**Coach Code (success branch only):** “The second defender changed the decision.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Show whether the second defender arrives in time; do not penalize a feasible 1v1 solely by headcount.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LW02 — Close the outlet in the press (LW, press)

Card SHA-256 `fb97593c38c771f2b9a0cdbd40ee23d784cb590c05464b6fa2af94fff18e15e3` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. | **Ball at freeze:** A_CB · **You:** H_LW<br>**Must be visible:** H_LW, H_ST, H_CM, H_DM, H_LB, H_CB, A_CB, A_RB, A_DM, A_RW, A_ST<br>**Cue:** 9 pressures CB and opposing RB becomes the available escape.<br>**Coordination:** H_ST pressures A_CB; H_LW restricts A_RB; H_CM screens A_DM; H_LB monitors A_RW with H_CB cover. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** position to restrict that outlet while retaining team connection.<br>**Valid alternative:** recover inside if the press is broken.<br>**Misconception:** sprint at the ball and free RB.<br>**Changes the answer:** ball bypasses the first line.<br>**Coach Code (success branch only):** “You pressed the passing option as well as the ball.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Restrict outlet by angle and timing; no assumption that all passes are automatically closed.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LW03 — Time the run (LW, offside)

Card SHA-256 `c6d9e58f9256c410c7d1b85fe23bab0f37734d4b2fb23d7b008810e053ee455c` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S6** (law), Law 11.1–11.3; 11.2 contact footnote: IFAB Law 11 (Offside), 11.1–11.3 and the contact footnote. Not an offence to be in an offside position; position judged when the ball is played or touched by a team-mate, using the first point of contact (last contact for a goalkeeper throw); level is not offside; offence needs involvement; no offence in own half. *Boundary:* Confirm competition edition. A rule reference is not evidence for a tactical preference. | **Ball at freeze:** H_CM · **You:** H_LW<br>**Must be visible:** H_LW, H_CM, H_ST, A_GK, A_LB, A_CB, A_RB<br>**Cue:** in opponent half, passer preparing release, winger near the second-last-opponent line.<br>**Coordination:** H_CM prepares a ground pass to H_LW; H_ST offers another lane; show the defensive line and ball at contact. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** delay/curve to remain legally positioned at the relevant contact.<br>**Valid alternative:** check short.<br>**Misconception:** leave early and become involved from offside.<br>**Changes the answer:** defender drops or ball is ahead of winger.<br>**Coach Code (success branch only):** “Your starting position mattered when the ball was played.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Offside depends on ball AND second-last opponent; level is eligible; own half uses real pitch halfway.
- **Devin's read:** Only law source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LW04 — Make space for the overlap (LW, wide)

Card SHA-256 `f620cff59a2ce1fc79d995713457768ad74d62171f6c4698e5b383535d42c100` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S10** (mixed_10v1_and_9v9), Part 3 variations 2–3; Part 4 organization and variation: Elite session (Gygax) attacking in wide areas: Part 3 is 10v1, Part 4 is 9v9 in an octagon with conditions. Advance from central possession to wide areas, create overloads on the wings, make coordinated runs into space and find targets. *Boundary:* Part 3 is not 9v9. Part 4 is 9v9 including GKs but uses an octagon and restricted defenders. Do not import protected wide zones, extra box runners or score multipliers. | **Ball at freeze:** H_LW · **You:** H_LW<br>**Must be visible:** H_LW, H_LB, H_CM, H_DM, H_CB, H_RB, A_RB, A_CB, A_ST<br>**Cue:** LB overlaps; LW can draw a defender inside without obstructing a teammate.<br>**Coordination:** H_LB overlaps; H_LW moves inside only into free space; H_CM avoids that pocket; H_DM H_CB H_RB balance. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** move inside and assess the release.<br>**Valid alternative:** stay wide if LB remains behind.<br>**Misconception:** both demand the same space.<br>**Changes the answer:** LB's run is cancelled.<br>**Coach Code (success branch only):** “Your movement helped the overlap.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Show the overlap and its cover, not a compulsory winger-inside script.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LW05 — Reach the delivery, not the position early (LW, cross)

Card SHA-256 `7f47b6b9226ebf6abfdce32fcad73acdeb913300e521c18af81dfd1d9bfe8bf9` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S11** (mixed_circuit_and_reduced_games), Key coaching points; Part 3: Talent coach session “Attacking the cross”: Part 3 is a 3v1 rondo and cross to finish; Part 4 is 6v6 plus 3. Well-timed runs and correctly weighted passes; deliveries into space behind the back line; central players time arrivals. *Boundary:* No 6v6+3 neutrals, mandatory first-time cross or aerial finish imported. | **Ball at freeze:** H_RW · **You:** H_LW<br>**Must be visible:** H_LW, H_RW, H_ST, H_CM, H_DM, A_GK, A_LB, A_CB, A_RB<br>**Cue:** ball travels to RW for a cross; far-side space is available.<br>**Coordination:** H_RW prepares delivery; H_ST uses near-side route; H_LW times far-side arrival; H_CM supports edge and H_DM stays behind. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** time an arrival into that space.<br>**Valid alternative:** hold/reposition if delivery is delayed.<br>**Misconception:** arrive too early and become static or offside.<br>**Changes the answer:** RW is forced backward.<br>**Coach Code (success branch only):** “Arrive with the delivery.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Do not use head-height delivery by default; offside checked on the crosser's relevant contact.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### LW06 — Select the cutback target (LW, cross)

Card SHA-256 `ef6fd5352bacdca21ada5cada9fe74530d7479e20e3847e9c76a111a10d36a8e` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S14** (11v11_analysis_background), Types of crosses: FIFA World Cup 2022 analysis, “Use of wide areas”, types of crosses. Six cross types including the cut-back; describes elite trends only. *Boundary:* No elite success rates, player counts or distances. S12 is added to relevant cards for coaching guidance.<br>**S12** (mixed_reduced_and_11v11), Part 3 explanation and coaching points ONLY: Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded). Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route. *Boundary:* Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. | **Ball at freeze:** H_LW · **You:** H_LW<br>**Must be visible:** H_LW, H_CM, H_ST, H_RW, H_DM, H_CB, H_RB, A_RB, A_CB, A_DM, A_GK<br>**Cue:** byline possession; near-goal lane blocked, trailing 8 available.<br>**Coordination:** H_LW at byline sees H_CM arriving behind H_ST; H_RW is separate; H_DM H_CB H_RB balance. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** pass backward toward 8's usable space.<br>**Valid alternative:** recycle if that lane closes.<br>**Misconception:** hit a blind ball across defenders.<br>**Changes the answer:** a recovering defender covers 8.<br>**Coach Code (success branch only):** “Find the teammate the defence left.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Cutback is not always best: receiver readiness and A_DM interception reach must be visible.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RW01 — Combine against a second defender (RW, wide)

Card SHA-256 `2e5e86c902c11e885ca9fb23ca95d8a8f5fa3e47ad6b6099d539f10b84d5f197` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_RW · **You:** H_RW<br>**Must be visible:** H_RW, H_RB, H_CM, H_ST, A_LB, A_DM<br>**Cue:** on right, second defender closes, RB offers support.<br>**Coordination:** A_LB engages H_RW; A_DM covers; H_RB supports; H_CM and H_ST keep separate options. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** combine.<br>**Valid alternative:** attack isolated first defender if cover is absent.<br>**Misconception:** force the same dribble despite cover.<br>**Changes the answer:** remove cover. Mirror LW01.<br>**Coach Code (success branch only):** “Read the covering defender before committing.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Mirror LW01 with preserved pressure and foot orientation.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RW02 — Close the outlet in the press (RW, press)

Card SHA-256 `211da1c9076b19fbfe0219943e509f0eaaa4f7ab5832076f5ff17ab30f84674c` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3. | **Ball at freeze:** A_CB · **You:** H_RW<br>**Must be visible:** H_RW, H_ST, H_CM, H_DM, H_RB, H_CB, A_CB, A_LB, A_DM, A_LW, A_ST<br>**Cue:** 9 presses CB; opposing LB offers escape.<br>**Coordination:** H_ST pressures A_CB; H_RW restricts A_LB; H_CM screens A_DM; H_RB monitors A_LW with H_CB cover. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** restrict that outlet in connection with teammates.<br>**Valid alternative:** recover inside once bypassed.<br>**Misconception:** duplicate 9's pressure.<br>**Changes the answer:** bypass the press. Mirror LW02.<br>**Coach Code (success branch only):** “Your position made their next pass harder.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Use opponent's left back on home right; never confuse jersey number with role.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RW03 — Time the run (RW, offside)

Card SHA-256 `96faa4cad197cb3c7066a2c87ab99cb26c8e731aa30c2ad9daaf77def7183c6c` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S6** (law), Law 11.1–11.3; 11.2 contact footnote: IFAB Law 11 (Offside), 11.1–11.3 and the contact footnote. Not an offence to be in an offside position; position judged when the ball is played or touched by a team-mate, using the first point of contact (last contact for a goalkeeper throw); level is not offside; offence needs involvement; no offence in own half. *Boundary:* Confirm competition edition. A rule reference is not evidence for a tactical preference. | **Ball at freeze:** H_CM · **You:** H_RW<br>**Must be visible:** H_RW, H_CM, H_ST, A_GK, A_LB, A_CB, A_RB<br>**Cue:** right winger near offside line in opposing half as teammate prepares pass.<br>**Coordination:** H_CM prepares a ground pass to H_RW; H_ST occupies another lane; show ball and defensive line. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** time/curve the run from a legal position.<br>**Valid alternative:** offer short support.<br>**Misconception:** be early and interfere.<br>**Changes the answer:** defender drops; recalculate rather than reuse answer. Mirror LW03.<br>**Coach Code (success branch only):** “The run and the pass had to work together.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Mirror LW03 legally and spatially; include omitted opponents in second-last-opponent calculation.
- **Devin's read:** Only law source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RW04 — Keep width until it serves a purpose (RW, wide)

Card SHA-256 `24a37c57283761107092411c3de9136f02c8dc352c825a43959b7043a2882013` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S12** (mixed_reduced_and_11v11), Part 3 explanation and coaching points ONLY: Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded). Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route. *Boundary:* Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. | **Ball at freeze:** H_CM · **You:** H_RW<br>**Must be visible:** H_RW, H_CM, H_RB, H_ST, H_DM, A_LB, A_DM, A_CB<br>**Cue:** central route congested; RW provides an accessible wide outlet.<br>**Coordination:** H_CM has no viable central penetration; H_RW offers width outside A_LB; H_RB remains underneath; H_DM balances. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** retain useful width to receive.<br>**Valid alternative:** move inside when a fullback supplies width and the inside lane opens.<br>**Misconception:** narrow into an occupied pocket.<br>**Changes the answer:** touchline reception becomes trapped.<br>**Coach Code (success branch only):** “Your width offered a route around.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Source is mixed-format; use only Part 3 delivery/support concepts, not Part 4 11v11 organization.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RW05 — Attack the far-side delivery (RW, cross)

Card SHA-256 `82ba86267e36341d944816cb4e55118fea08fb354fda1c35c118bc126126dbdb` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S11** (mixed_circuit_and_reduced_games), Key coaching points; Part 3: Talent coach session “Attacking the cross”: Part 3 is a 3v1 rondo and cross to finish; Part 4 is 6v6 plus 3. Well-timed runs and correctly weighted passes; deliveries into space behind the back line; central players time arrivals. *Boundary:* No 6v6+3 neutrals, mandatory first-time cross or aerial finish imported. | **Ball at freeze:** H_LW · **You:** H_RW<br>**Must be visible:** H_RW, H_LW, H_ST, H_CM, H_DM, A_GK, A_LB, A_CB, A_RB<br>**Cue:** LW prepares a cross; 9 attacks a different zone.<br>**Coordination:** H_LW prepares delivery; H_ST chooses near-side route; H_RW offers far side; H_CM supports edge, H_DM holds. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** time a run into the free far-side zone.<br>**Valid alternative:** adjust if delivery is delayed.<br>**Misconception:** follow 9 into the same space.<br>**Changes the answer:** a defender closes that zone. Mirror-family LW05.<br>**Coach Code (success branch only):** “Give the passer distinct targets.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Mirror LW05; forbid copying two winger cards into one scene as extra players.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### RW06 — Do not cross just because you are wide (RW, wide)

Card SHA-256 `4ce654b3e535855bf0613790fad8681a9162f6018839cf37447405b7b29e0934` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S14** (11v11_analysis_background), Types of crosses: FIFA World Cup 2022 analysis, “Use of wide areas”, types of crosses. Six cross types including the cut-back; describes elite trends only. *Boundary:* No elite success rates, player counts or distances. S12 is added to relevant cards for coaching guidance.<br>**S12** (mixed_reduced_and_11v11), Part 3 explanation and coaching points ONLY: Elite session (Boothroyd) breaking down a low block: Part 3 is 4v4 plus support players with crosses, cutbacks, whipped and clipped balls. Part 4 is 11v11 (excluded). Switch side to side to penetrate; get into wide areas and around the back of defenders; choose the delivery that suits the receiver and route. *Boundary:* Part 4 is 11v11 and excluded. No neutral support or cross-only goal rule. | **Ball at freeze:** H_RW · **You:** H_RW<br>**Must be visible:** H_RW, H_RB, H_CM, H_ST, H_LW, H_DM, A_LB, A_CB, A_RB, A_DM, A_GK<br>**Cue:** wide possession; both forward receivers covered, backward support free.<br>**Coordination:** A_CB and A_RB cover H_ST and H_LW; A_LB pressures H_RW; H_RB is safe support; H_DM holds. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** recycle and reset the attack.<br>**Valid alternative:** deliver when a receiver separates and the lane opens.<br>**Misconception:** force service into a crowded area.<br>**Changes the answer:** show a clear arriving receiver.<br>**Coach Code (success branch only):** “Wait for a usable target.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Reject blind service, but do not reject a newly opened dribble or shot; S12 strengthens receiver-selection evidence.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### ST01 — Hold, lay off or turn (ST, receive)

Card SHA-256 `6d6e79d405e8d065be670a7e17f99f1f25511e536abaeea8f946a2b9a25a53e7` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S5** (grassroots_micro_practice), Skill development: 1v1 to 1v2 with support players: Grassroots 8–12: 1v1 to 1v2 in a circle/square with support players on the outside, keep the ball. Combine with support players to keep and circulate the ball; find space, open body shape, turn only when the situation permits. *Boundary:* Support players become existing roster members. No permanent safe neutrals or pass-count scoring. | **Ball at freeze:** H_ST · **You:** H_ST<br>**Must be visible:** H_ST, H_CM, H_LW, H_RW, A_CB, A_DM<br>**Cue:** receiving back to goal with tight pressure and 8 available.<br>**Coordination:** H_ST receives back to goal under A_CB pressure; H_CM is free of A_DM; wingers maintain depth. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** protect and lay off.<br>**Valid alternative:** turn if the defender's position and available space genuinely allow it.<br>**Misconception:** assume proximity alone makes turning correct.<br>**Changes the answer:** defender backs away and a turning lane opens.<br>**Coach Code (success branch only):** “You kept the next action available for the team.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Close defender does not automatically permit turning; show actual escape side and ball control.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### ST02 — Initiate only a supported press (ST, press)

Card SHA-256 `aaab61d23b63b6393bdfb6825c0eaca9717a587f443001487432f86f738b5fc9` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S4** (reduced_game_with_neutrals), Methodology: intention/scale; key coaching points: 6v6 plus 2 team game with neutrals: initiating the press from a compact block. Close spaces inside the defensive structure; ball-far players prioritise closing the inside; act together on pressing triggers; the next unit closes space behind the press. *Boundary:* Source models two CBs, two fullbacks and midfield three using neutrals. None are added to our 3-2-3.<br>**S7** (11v11_analysis_background), Team structure: 11v11 game analysis of the high press, “Team structure”. A solid shape from goalkeeper to forwards with suitable distances between units; triggers for when and how to press. *Boundary:* Background only; no adult line height, fitness requirement or roster import. | **Ball at freeze:** A_CB · **You:** H_ST<br>**Must be visible:** H_ST, H_LW, H_RW, H_CM, H_DM, H_CB, H_LB, H_RB, A_CB, A_LB, A_RB, A_DM, A_CM, A_ST<br>**Cue:** backward reception, winger and 8 ready to close exits.<br>**Coordination:** A_CB receives facing own goal; H_ST can arrive; wings restrict outside backs; H_CM screens A_DM; H_DM covers A_CM. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** initiate coordinated pressure.<br>**Valid alternative:** screen and wait if teammates are detached.<br>**Misconception:** sprint alone and allow an easy bypass.<br>**Changes the answer:** detach midfield.<br>**Coach Code (success branch only):** “The trigger mattered because your teammates could support it.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. No four-back opponent or extra midfielder imported. Abandon press if arrival/support condition fails.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### ST03 — Adjust rather than wait offside (ST, offside)

Card SHA-256 `3492e300cf50043477a4ba6dc4769a3662b0ccc5f1294ea0587b11ca30d2ea00` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID carried from v1 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S6** (law), Law 11.1–11.3; 11.2 contact footnote: IFAB Law 11 (Offside), 11.1–11.3 and the contact footnote. Not an offence to be in an offside position; position judged when the ball is played or touched by a team-mate, using the first point of contact (last contact for a goalkeeper throw); level is not offside; offence needs involvement; no offence in own half. *Boundary:* Confirm competition edition. A rule reference is not evidence for a tactical preference. | **Ball at freeze:** H_CM · **You:** H_ST<br>**Must be visible:** H_ST, H_CM, H_LW, A_GK, A_CB, A_LB, A_RB<br>**Cue:** striker in the opposing half, beyond both the ball and second-last opponent, teammate not yet playing the ball.<br>**Coordination:** H_ST is beyond ball and second-last opponent in opponent half before H_CM plays; H_LW offers another route. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** return to an eligible position before the relevant pass contact or offer a different run.<br>**Valid alternative:** remain uninvolved while another teammate plays, without interfering.<br>**Misconception:** receive after merely stepping back following release and assume legality is restored.<br>**Changes the answer:** begin in own half; apply the correct rule.<br>**Coach Code (success branch only):** “Coming back after the pass did not erase the earlier position.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Add missing ball condition. Returning after contact does not cure that phase; a later phase requires fresh assessment.
- **Devin's read:** Only law source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### ST04 — Bounce for the third-player route (ST, combine)

Card SHA-256 `179aab0883bfab01636ef691b1a1b550c246051d630cbebd6f82afb682ec12e2` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Needs tactical authoring/review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S9** (11v11_analysis_background), Article explanation of third-player combinations: 11v11 game-analysis article on third-player combinations. A third player unlocks an organised defence; the pass–layoff–run is hard to anticipate when the runner moves as the ball is laid off. *Boundary:* Background principle, not a verified youth scene or compulsory pass sequence. | **Ball at freeze:** H_ST · **You:** H_ST<br>**Must be visible:** H_ST, H_DM, H_CM, H_CB, H_LB, H_RB, A_CB, A_DM, A_CM<br>**Cue:** 9 receives under pressure; 6 supports and 8 runs beyond.<br>**Coordination:** H_ST receives against A_CB; H_DM supports; H_CM runs beyond A_DM; home back three retain balance. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** lay off to enable 6's forward pass.<br>**Valid alternative:** turn if pressure withdraws and space is confirmed.<br>**Misconception:** insist on turning into the marker.<br>**Changes the answer:** cover 8 and open a turn.<br>**Coach Code (success branch only):** “Your pass opened someone else's route.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. A third-player pattern is an option, not an enforced three-pass reward; compare direct turn when available.
- **Devin's read:** Only 11v11_analysis_background source(s): they explain the principle or the legal rule, but cannot establish which choice is better in an opposed youth scene.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### ST05 — Match the cross with the run (ST, cross)

Card SHA-256 `c26f1f5e3df455cf2c5fda60cc4944214f779e89a4f8a3b335f7a950f15767c4` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S11** (mixed_circuit_and_reduced_games), Key coaching points; Part 3: Talent coach session “Attacking the cross”: Part 3 is a 3v1 rondo and cross to finish; Part 4 is 6v6 plus 3. Well-timed runs and correctly weighted passes; deliveries into space behind the back line; central players time arrivals. *Boundary:* No 6v6+3 neutrals, mandatory first-time cross or aerial finish imported. | **Ball at freeze:** H_RW · **You:** H_ST<br>**Must be visible:** H_ST, H_RW, H_LW, H_CM, H_DM, A_GK, A_CB, A_LB, A_RB<br>**Cue:** early wide delivery is available behind the defensive line.<br>**Coordination:** H_RW can deliver early behind A_CB; H_ST runs onside into reachable space; H_LW offers a distinct route. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** time an onside run into its reachable path.<br>**Valid alternative:** delay when the crosser is blocked.<br>**Misconception:** run without reading the delivery.<br>**Changes the answer:** delay the ball; reassess offside at the passer's first contact.<br>**Coach Code (success branch only):** “Synchronize the run and service.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. Validate actual low-ball travel and arrival; avoid adult crossing distance or automatic heading.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.

### ST06 — Separate from the other box target (ST, cross)

Card SHA-256 `e328de77333db53e0d76c89aee421794c2a56aae623d8851f8f3fcfeb378862a` · `DRAFT_BLOCKED_FOR_PLAYER_TRAINING` · ID new in v1.1/v1.2 · **proposal: Ready to build a scene for review**

| Source setup and guidance (cited section) | Proposed 9v9 situation (card text, verbatim) |
|---|---|
| **S10** (mixed_10v1_and_9v9), Part 3 variations 2–3; Part 4 organization and variation: Elite session (Gygax) attacking in wide areas: Part 3 is 10v1, Part 4 is 9v9 in an octagon with conditions. Advance from central possession to wide areas, create overloads on the wings, make coordinated runs into space and find targets. *Boundary:* Part 3 is not 9v9. Part 4 is 9v9 including GKs but uses an octagon and restricted defenders. Do not import protected wide zones, extra box runners or score multipliers. | **Ball at freeze:** H_LW · **You:** H_ST<br>**Must be visible:** H_ST, H_LW, H_RW, H_CM, H_DM, H_CB, H_LB, H_RB, A_GK, A_CB, A_LB, A_RB<br>**Cue:** teammate occupies near-post space; a reachable central zone remains open.<br>**Coordination:** H_LW delivers; H_RW occupies near-post space in this scene; H_ST uses central space; H_CM stays at edge; H_DM balances. |
| **9v9 framework:** S15/S16 (formation and roster only, not answer evidence) | **Preferred (conditional):** offer the distinct central target.<br>**Valid alternative:** change route if a defender closes it.<br>**Misconception:** converge on the teammate.<br>**Changes the answer:** central zone becomes marked.<br>**Coach Code (success branch only):** “Different runs gave different options.” |

- **Adapted (package):** authored_9v9_role_mapping_not_source_exact. No requirement to fill all four box zones with four runners; only named teammates occupy them.
- **Devin's read:** The principle is in an opposed practice source; the 9v9 setup, actors and answer ranking are authored and need your review.
- **Missing before scoring:** numeric scene (positions, velocities, facing, ball, events, omitted actors), verified local rules, branch-specific Coach Code critique for each wrong/alternative answer, your sign-off.
