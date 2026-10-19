# SoccerMaster — Team Training, My Training, Crossbar Challenge
Version 1.2 • 19 October 2026 • Owner: Cody Engilman
Target: codyengilman-max/SoccerMaster-Retro
Production: https://soccermaster-retro.pages.dev

## Assignment to Devin
Implement three connected corrections in the existing Phaser/TypeScript/Vite game:
1. Dedicated half-field team training, with a closer view and tactical objectives from the existing soccer library.
2. A concise My Training screen.
3. One grounded schoolyard goal whose visible crossbar is the actual challenge target.

This is an implementation brief and a new art/layout handoff. The author reviewed the three supplied phone screenshots and named research files, but did not inspect current game source, run the game, or modify/deploy the repository. Identify actual source modules and current main/active-branch commits before editing. Preserve completed gameplay improvements, existing saves, character identities, club/story continuity, and pending unrelated work. Implement on a focused branch; do not reset the project.

The user's newer joystick + PASS / SHOOT / SLIDE TACKLE / BLOCK contract supersedes the old gesture-only proposals. Keep the current validated pass weight, shot aim, ball contact, movement, and player-lock behavior. This task does not reopen match controls or the global match camera.

## Required companion contracts and precedence
Read 05_RUNTIME_INTEGRITY_CONTRACT.md for durable attempts, atomic weekly completion and the defined crossbar arc fallback. Read 06_DRILL_RELEASE_COVERAGE.md and training-coverage-plan.json for role/focus coverage. Read 08_SOURCE_AND_DEPENDENCY_MANIFEST.md before using references. These revision 1.2 contracts clarify this brief and take precedence over its older general wording in their scoped areas. Historical references are source context, not separate instructions to rebuild or deploy the game. The audit closure is in 07_AUDIT_RESOLUTION_AND_ACCEPTANCE.md.

## 1. What the screenshots establish
- Team Training currently displays the normal Home–Away / SANDBOX header, a generic percentage/distance/loss message, and a large post-attempt text overlay over the pitch.
- My Training presents eight competing full-width actions and three bottom navigation buttons. The weekly focus and next action do not lead the page.
- Crossbar Challenge shows a goal baked into the right side of its schoolyard picture plus a separate white goal outline above the school roof. A large dialogue/result panel consumes the lower screen.
- Screenshots alone cannot establish collision behavior, current reward code, or which commits are deployed. Do not call those bugs proven without inspection.

## 2. Team Training: a real tactical session

### Venue appearance — owner direction retained in revision 1.2
Use Bell94 Sports Complex as the primary visual reference, with Scottsdale Sports Complex as the acceptable alternate. Read 04_TEAM_TRAINING_VENUE.md and assets/team_training_bell94_environment_reference.png. Carry the grass fields, tall floodlights, paths, shade facilities and desert-edge character into live training while retaining the existing gameplay camera and world geometry. The generated image is an art-direction reference, not a collision-calibrated pitch texture.

### Field and player scale
Use one real half of the configured match pitch, from the halfway line to one goal line. This is a simulation boundary, not merely a crop of an active full match. Reuse configured pitch units/dimensions; do not invent universal youth field measurements.
- Keep one regulation-profile goal, existing penalty-area markings, and the relevant half-way boundary. Reset/outlet gates are drill equipment, visually distinct from full goals.
- Use a camera fitted to the active drill area. Players should read larger than in the normal full-field overview, without inflating player bodies or hitboxes. Start around 1.25–1.40 times the current overview magnification, then prioritize visible ball, pressure, useful outlets and objective over an exact zoom multiplier.
- Preserve approved sprite proportions, feet anchors, ball scale, animations, hair/identity and world collision radii. No training-only inflated heads, reach, speed, kick strength or invisible enlarged tackles.
- Portrait and landscape must both be playable. Use a wider look-ahead or bounded camera movement when necessary; do not hide the only useful passing option behind controls. Show a rotate hint once in Help/onboarding, not permanently on the pitch.
- The user's career player stays the controlled player in their appropriate role. No silent switches to a striker. Retain current role-specific supported controls, including keeper behavior where available.

### Runtime architecture
Reuse the current simulation, ball physics, action executor and tactical principles. A training session is not a second match engine.
Important: the supplied v0.5 reference decision module rejects reduced rosters and assumes nine teammates including a GK. Do NOT feed it 3v2 data as if it already supports that, pad rosters with invisible players, or shrink a full 9v9 into the drill.
Inspect the game's actual current AI. Use an explicit small-sided training adapter or narrowly generalize participant validation and role responsibilities, with normal 9v9 validation preserved. Each real participant has one stable actor ID and feasible responsibility; omitted roles are explicitly absent or reassigned. Boundary/rules overrides are session scoped and cleared on exit.
Use current formation/role mappings. Tactical opponent behavior has the same movement and contact limits as the player. Do not read unreleased touch input, forced score outcomes, hidden future ball paths or unobserved positions.

### Session loop — implementation starting defaults
- Weekly focus selects an eligible role-appropriate drill family. The existing weekly-focus service remains its sole writer; no new global calendar.
- Brief: one tactical objective and optional demonstration diagram.
- Default three short attempts, approximately 20–40 simulation seconds each. These are provisional game pacing values, not a real-world training prescription. Tune without shortening learning cues to an unreadable flash.
- Each attempt starts from a valid staged soccer situation. AI and ball continue physically after Start.
- End on the authored objective, defined turnover/end condition, out-of-bounds or time. Losing possession need not end a drill that explicitly practices transition.
- Reset only after an attempt ends, never teleport actors or ball during live play. No auto-end just because a forward-yard count changed.
- Show a compact result with one observed success and one next cue, plus Retry / Continue / Finish.
- Retry is useful practice; it does not create additional weekly entitlements or match statistics. Use the existing entitlement identity, distinct run/attempt IDs and atomic finalization defined in 05_RUNTIME_INTEGRITY_CONTRACT.md. Commit completion before labeling it Complete; failed saves remain recoverable.
- On completion, return to My Training with the focus/session state preserved.

### Initial drill coverage and source mapping
The rows below are authored adaptations of existing seeds, not claims that these ready-to-play drills already exist. Preserve original seed IDs, text and audit overrides. The role/focus assignments, compatible fallback rules and required release inventory are defined in 06_DRILL_RELEASE_COVERAGE.md. Every family must be accounted for as implemented, deferred or unavailable; an absent implementation cannot be represented as complete. The JSON coverage plan is non-runtime authoring data with unbound runtime IDs and disabled activation flags.

| Local drill family | Suggested participants | Existing seeds / interactions | Context-sensitive teaching target |
|---|---|---|---|
| TT01 Receive under pressure | receiver + 2 supports vs 1 presser, progressing to a cover defender | SIX01, EIGHT01; I08 | Take first touch into available space; bounce/reset when turning is closed. Do not always demand a forward touch. |
| TT02 Show a passing angle | 3 attackers vs 2 defenders, with reachable outlet gates | CB02, SIX02; I02, I08 | Move beyond a cover shadow and create a usable angle. A pass into a still-blocked lane is not success. |
| TT03 Use the overload | 2 attackers vs 1 defender + GK | WING01, OB01; I04, I08 | Compare carry, release and recycle from actual defender/cover behavior. Do not force a pass if dribbling remains best. |
| TT04 Find the other side | 4 attackers vs 3 defenders, including a reset option and far outlet | WING02, WING03; I06, I08 | Switch only while the far side is accessible; keep a valid local advantage. |
| TT05 Pressure and cover | 2 defenders + GK vs 3 attackers | CB04, DEF01, DEF02; I10, I11 | Best-placed defender delays/pressures while the other protects the dangerous route. A successful delay need not end in a tackle. |
| TT06 React after loss | 3 vs 3; separate safe outlet targets | DT01, DT02, AT01; I19, I20 | Distinguish controlled turnover from deflection. Pressure, cover or recover according to reach and danger. |
| TT07 Choose the finish | 3 attackers vs 2 defenders + GK | EIGHT03, WING04; I17 | Compare shot, ground cutback, carry and reset. Arrival timing and blockers matter; a goal alone does not establish good judgment. |
| TT08 Build from the keeper | GK + 3 outfield supports vs 2 pressers | GK01, CB02; I01, I02 | Find a playable outlet or wait/reposition; no forced central pass. Keep role-appropriate tasks for a keeper career. |

Progression of challenge changes one main constraint at a time: open space / readable pressure / realistic active pressure. Vary starting side, pressure angle, receiver readiness and accessible outlet with deterministic seeds. Do not add speed cheats or a universally correct scripted pass. Mirroring preserves each player's foot preference and actual capabilities.

Each activated drill requires: versioned local ID, source IDs, focus and role mapping, participant assignments, spawn geometry, entry/abort conditions, legal boundaries, real evidence predicates, valid alternatives, feedback text, time/attempt limits, and an exit path. Add fixtures where the initially preferred answer becomes unavailable.
The research package contains 40 draft seeds, not a verified 500-item production catalog. Do not change all production flags to true or rename repeated variations as new research. Implement and test selected adaptations, keeping prototype/coaching-review status honest.

### Feedback and progression
Replace a generic “11%” and forward-yard grade with objective evidence:
- “Your first touch took you away from the defender.”
- “The passing lane was blocked; the reset option was open.”
- “You delayed the attack while cover recovered.”
These are conditional templates, only shown when recorded evidence supports them. Missing evidence means neutral feedback, not an invented reason.
Keep decision quality, execution quality and final outcome separate. A sensible pass can be mishit; a risky shot can score. Record only events the current evaluator actually detects. Do not claim to measure scanning from camera movement or animation alone.
Preserve the current centralized progression policy. This task does not authorize creating or removing stat gains. Training cannot impersonate a 9v9 match, issue match achievements, or bypass existing caps. Remove “no attribute change” from the playfield; if a progression explanation is needed, put it in Progress/Help, accurately reflecting the inspected implementation.
Keep ordinary match Coach Moment frequency at its existing 4–6 scope. These short drills do not inherit four-to-six interruptions each.

### Training HUD
Top: Back | Team Training | Pause.
Below: concise focus/objective; attempt count; time only for a timed objective.
Playfield: player marker, ball, contextual teaching aid when useful.
Bottom: existing controls, outside the useful decision area where feasible.
Remove Home/Away match score, SANDBOX label, permanent rotate message and permanent control paragraphs from this mode. Help remains available in Pause. Result panels pause the attempt and release all active input.

## 3. My Training: one clear next action
Use the existing cream/navy/orange visual identity, readable type, selected name and current career week.

Primary screen:
- Header: Back, “My Training”, compact Help/menu.
- One focus card: “This week: Directional first touch” (example, bind live focus), one sentence explaining it, a small “View focus” action. Editing obeys the existing current-week lock.
- Primary action: “Team Training” with status Not started / In progress / Complete and a short objective.
- Secondary action: “Home Practice” with Optional clearly stated.
- One smaller “Progress” row.
That is three destinations, not eight competing large buttons. Do not delete underlying activity or career data.

| Old entry | New home |
|---|---|
| Weekly Focus | Focus card; locked weeks show View, eligible future plans offer Change |
| My Home Sessions | Home Practice |
| Training Library | Browse exercises inside Home Practice |
| Practice Journal | Journal inside Home Practice |
| Team Training (this week) | Team Training primary card |
| Play a 9v9 match | Existing season / next-fixture screen, preserving eligibility and unfinished-match routing |
| Weekly Review | Progress |
| Character Development | Progress, with separate skill and story/relationship sections |
| Back / Training Home / Menu | One consistent Back action; game menu in header |

Home Practice opens with one eligible recommended activity or a clear empty state; offer Browse and Journal as secondary controls. Show setup, space/equipment needs and actual reviewed demo/instructions before practice. Move lengthy policy explanations to “How practice works,” but do not hide essential setup, eligibility or stop guidance merely to declutter.
Use the newest approved home-library release already integrated. The 1.1 library read for this handoff has 20 families/100 variants and requires review; it is not evidence that every item is currently approved. Keep genuine approval/eligibility gates, ball-only substitutions, both-foot semantics, optionality, save claims and accessibility. Do not publish drafts or claim video/coach verification by changing flags.
Home self-report stays distinct from game evidence. No penalty for skipped practice, no required three-session checklist, no fake mastery or skill bonus for opening a card. Existing voluntary journal counts can appear in Progress.
One scroll container, no overlapping fixed bars, controls at least 44 CSS px high, safe-area support, text wrapping for long names and large text. Reuse the existing safe plain-text identity renderer. No browser HTML injection for player names, journal strings or content.

## 4. Crossbar Challenge: one scene, one physical target

### New background and single goal
Use assets/schoolyard_crossbar_background_v2.png as an additive, challenge-specific backdrop. It deliberately contains NO goal, crossbar, ball, marker, character or UI.
Keep the general schoolyard story artwork for unrelated cutscenes. Do not overwrite all school backgrounds.
Place ONE complete goal in the playable scene: both upright bases visibly meet the grass, the crossbar joins their tops, and the net/shadow recede behind. Keep the goal away from the roofline and put the ball/shooter in front of it.
Remove both the old floating outline and the old goal-bearing image from this challenge. There must not be a decorative second goal competing with the target.

The included goal SVG and scene-layout.json demonstrate a coherent composition. They are a presentation reference, not calibrated physics or mandatory field measurements. Use the current engine's goal dimensions. In production derive the visible mesh/lines and hit geometry from the same goal model and world-to-screen projection.
No separate pixel rectangle hand-tuned to “look close.” Goal highlight follows the actual crossbar. Shadows and net are not scoring targets. Ball ground shadow stays on the ground while visible height changes.

### State and scoring
Inspect the existing challenge mechanic before changing it. Preserve its attempt count, rival identity, story outcome rules and difficulty unless demonstrably broken; no automatic hardcoded five-shot rewrite. Implement the durable state/identity contract in 05_RUNTIME_INTEGRITY_CONTRACT.md: commit one immutable launch and attempt consumption before revealing flight; resolve score/turn exactly once; deliver story effects idempotently. Reload, exit and rival turns cannot reroll a committed attempt. Handle save rejection and older content versions explicitly.
A real crossbar hit requires contact with the horizontal bar within the legal goal span and height, using ball radius and bar thickness. A ball under the bar, over it, on a post, into the net, behind the goal or visually above a roof does not score. Score no more than once per released shot, even after multiple contacts.
Use continuous/swept contact or existing equivalent to avoid fast-ball tunneling. Resolve first time of contact and define corner-junction classification deterministically so one touch cannot produce two points.
If the minigame already has a ball-height model, reuse and align it. If the main match engine has only ground shots, do not fake a crossbar result using ground-plane overlap or add aerial physics to every match. Add an isolated, documented height/arc adapter for THIS minigame, reusing input lifecycle and timing, with its own focused tests. Any such addition is explicit work, not a cosmetic fix. The exact fallback is the challenge-only horizontal-aim, fixed-loft, variable-strength mapping in 05_RUNTIME_INTEGRITY_CONTRACT.md. Record calibrated configuration and prove reachable bar hits and nearby misses using ordinary input; no debug-only proof, hidden boost or unbounded flight. Preserve a current working challenge height/input model instead when it passes those checks.
Aim/charge feedback must represent the actual launch request. No extra boost or hidden automatic hit correction. Retain the established challenge input when appropriate; do not reintroduce old drag-only controls into team training or matches.
Use real actor name and the existing opponent (Blake in the supplied image). Do not rename Blake to Casey or create another story rival through this UI revision. Support the selected boy/girl identity consistently.

### Screen layout
Use a compact challenge header with Back / Pause.
Show player and rival score plus attempt number in one short HUD row.
Give most available space to the grounded goal, ball and current attempt.
Use a compact aim/power hint and existing action control below/alongside the stage.
Show “Crossbar!”, “Too high”, “Post” or another supported physical result briefly; do not keep a giant empty dialogue box open during play.
Move Log, text-size settings and Help to Pause/Settings. Relationship dialogue stays in cutscenes before/after the playable challenge; preserve the player's actual choices.
Leave pauses play first and offers Return or Leave. Leaving cannot manufacture a win/loss, consume multiple attempts or grant rewards. Resume restores committed state, never a half-held Shoot input.
Result/cutscene transitions release all pointers and held inputs. Pause, tab blur, orientation change, loss of possession where relevant, or scene destruction cancels uncommitted gestures and stale input commands. It never erases a durably released challenge launch; resume follows its committed state, as defined in 05_RUNTIME_INTEGRITY_CONTRACT.md.

### Common geometry and responsive layout
Scene-layout.json uses a 1000x650 reference plane. Front left/right post x: 250/750; crossbar y: 274; ground y: 440. Net and shadow sit behind the goal. These are layout coordinates only.
Both landscape and portrait use one common transform for background stage, goal, ball and target aids. Background decoration may crop with cover; the complete interactive goal must remain visible. Never resize the goal image independently of the collider/aim projection.
On resize cancel held input, recalculate the viewport transform, keep underlying world state/attempt count, and resume without a spontaneous shot. Device pixel ratio changes sharpness, not game coordinates.

## 5. Integrity requirements and focused acceptance
These are requirements for Devin to execute; this handoff does not claim they already pass.

| ID | Check | Required behavior |
|---|---|---|
| T01 | Half-field boundary | Active participants, objectives and reset logic stay in the configured half; no hidden other-half match continues. |
| T02 | Scale comparison | Same player's world radius, speed, reach and sprite proportions remain unchanged across training/match; training camera alone brings action closer. |
| T03 | Small-sided roster | Every selected drill has supported real participants/roles; no padded phantom players or broken nine-player prototype call. |
| T04 | Tactical alternatives | Paired fixtures open/close the nominal option; feedback respects both valid choices and their context. |
| T05 | Loss and loose ball | Deflection is not awarded possession; transition drills continue under actual state. |
| T06 | Weekly focus | Active focus selects the right family; locked focus is unchanged by retries/navigation. Missing focus has an explicitly compatible role/focus fallback or a clear unavailable state; no forced role switch, focus unlock or false completion. |
| T07 | Reward duplication | Retry, double-tap Continue, reload, two tabs and return from result cannot duplicate completion or mint match events. Execute W01–W04 in the runtime contract. |
| T08 | Coverage and isolation | Execute D01–D05 in the coverage contract; every shipped family and role/focus mapping is accounted for; all supported match formations/directions remain correct after exit. |
| U01 | My Training routes | Three main destinations; all old content still accessible in its mapped location. Next-fixture routing does not simulate/skip a match. |
| U02 | Home eligibility | Empty/unreviewed/unavailable activities remain correctly unavailable; no hidden automatic approval. |
| U03 | Display and navigation | Long names, large text, keyboard focus, both orientations and safe areas remain usable; Back cannot trap/erase progress. |
| C01 | Visual alignment | One goal, grounded posts, no baked side goal; visible bar and diagnostic hit geometry coincide in both orientations. |
| C02 | Positive/negative scoring | Genuine crossbar strike counts once; under/over/post/net/behind/outside span miss; joint case deterministic. |
| C03 | Speed and timing | Fast shots do not tunnel; outcome independent of 30/60/120 Hz render rate at the same simulation input. |
| C04 | Lifecycle | Pause, blur, resize, interrupted touch, double release, reload and exit cannot create extra shots or results. |
| C05 | Story/identity | Saved name/appearance/rival and committed outcomes preserved; skipping dialogue does not choose a branch or forge a result. |
| C06 | Durable challenge | Execute X01–X07: launch/result/story crash boundaries, two tabs, save failures and content-version recovery preserve one canonical result. |
| C07 | Controllable arc | Execute A01–A05: ordinary-input hit/miss reachability, frame-rate independence, bounded resolution and no match-physics leakage. |
| R01 | Existing match regression | Current dribble/pass/shot/defensive controls, normal camera, formation, save and next-match flow remain correct. |
| R02 | Production validation | Built commit identified; Cloudflare serves that commit and new assets; no console errors/missing assets. |

All numeric UI/scene defaults here are proposed design values. Test against the inspected runtime before treating them as production tuning.
Use the existing test tools. Add tests for real regressions and state boundaries, not tests that merely repeat implementation constants. Do not expand into unrelated full-game redesign.

## 6. Delivery
1. Record the source commit, relevant current implementation and baseline.
2. Implement the concise Training hub and dedicated half-field lifecycle.
3. Implement and exercise the eight planned tactical families where their inspected prerequisites are available. Record every implemented, deferred or unavailable family and every unsupported role/focus combination in TRAINING_RELEASE_COVERAGE.md; do not call a partial release the complete library.
4. Integrate the new schoolyard layer and shared goal rendering/scoring geometry.
5. Run targeted tests, normal-match regression and available browser checks; fix findings. Include the failure-boundary cases in 05_RUNTIME_INTEGRITY_CONTRACT.md and coverage/isolation cases in 06_DRILL_RELEASE_COVERAGE.md. Reuse current test tooling; archived reference commands are not runnable from this handoff.
6. Follow Cody's standing authorization to merge relevant completed updates and deploy through the existing Cloudflare project after required checks. Preserve branch protections and unrelated/unready PRs. Do not force-push or delete repositories.
7. Verify the production URL actually serves the final main commit; merely seeing a successful build is insufficient. Reuse inspected build settings; known Pages setup is npm run build, lowercase dist, repo root when app is there.
8. Return PR, merged/deployed SHA, playable link, actual PASS/FAIL/NOT RUN matrix, TRAINING_RELEASE_COVERAGE.md, final crossbar tuning/launch mapping, save/version recovery approach, known limits and a short iPhone test list. Stop feature expansion so Cody can playtest.

Physical iPhone testing is NOT RUN by this handoff. Browser emulation must be labeled as emulation. Do not describe design review, isolated reference tests or npm audit as proof of a secure or enjoyable finished game.

## 7. Sources used for this revision
- User screenshots IMG_8209.jpeg, IMG_8208.png, IMG_8207.jpeg, received 19 Oct 2026. Reviewed visually; not copied into this package.
- SoccerMaster_Engine_v0.5_Devin.zip: README, engine/README.md, data/scenario_catalog.json, docs/COVERAGE_GAPS.md. Research prototype plus 40 draft seeds; not assumed integrated.
- SoccerMaster_9v9_Roles_Interactions_Review_v0.3.md, 17 Oct 2026: all nine roles and I01–I24 interactions. Copy included as reference.
- SoccerMaster_Devin_Passing_Shooting_v1.1.md, 17 Oct 2026: current four-button/input/physics requirements. Copy included as reference.
- SoccerMaster_Training_Library_v1.md, content revision 1.1.0, 14 Oct 2026: sections through integration instructions reviewed, including eligibility, demos, home self-report and rewards. No claim of having inspected all 100 detailed variants this turn.

