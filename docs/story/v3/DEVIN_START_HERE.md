# Devin: Apply V3 and approved Week Five

Home art update: use the included home-screen-background.jpeg and follow HOME_BACKGROUND_INSTRUCTIONS.md. This is the approved home hub image; preserve its artwork and implement the menu as separate UI controls.

Implement this content and rules update in the actual current SoccerMaster project. Inspect the current repository, framework, story controller, activity adapters, save schema, progression ledger and previously uploaded engine before editing. Preserve unrelated work. Use a recoverable branch.

## Authority and scope
1. WEEK_05_APPROVED.md is the exact approved Week Five narrative. Preserve its dialogue and player-neutral wording. Do not restore the superseded saved-seat/Sam-passing-argument school scene.
2. SEASON_RULES_V3.json supersedes earlier cadence and home/Cloudy instructions from Week Five onward. Weeks 1–4 stay approved and unchanged.
3. WEEK_05_FLOW.json is a routing specification, NOT an executable v0.2 graph. Convert it into the actual game's dialogue/activity format. It contains a home hub with legitimate returns; do not insert a cycle into a runtime that forbids cycles.
4. Apply engine changes needed for this week and the new cadence. Do not generate all later dialogue now. Preserve the full season schedule and write later weeks individually.
5. Only one story controller may advance weeks. Disable competing legacy narrative fallbacks after checking dependencies. Keep recoverable history and existing gameplay systems.

## Week Five
Implement: school science-sub joke (Blake, Sam, player) -> existing recess minigame choice -> mandatory team training -> ambition conversation -> home menu -> League Game 3 -> result-specific aftermath and park intention.

School story weeks from Week Five: 5, 7, 9, 11, 13, 15, 17. Even weeks have no school story slot; keep the independent weekly school minigame. Do not remove Week Four's existing school content.

## Home menu and advancement
Home is a persistent activity hub. Show Training, Cloudy: Feed & Play, Cloudy: Talk, and Continue Week.
Training shows required tasks, completion and earned attributes. Include mandatory weekly juggling and assigned control/first-touch work using existing curricula. Any assigned home-learning component also appears.
Persist partial progress, completed tasks, activity receipts, conversation position and earned rewards.
Continue Week unlocks only when all required assignments are verified complete (including authorized adjusted assignments when recovery/health demands it).
Cloudy is entirely optional; the player can choose either mode or skip both. Return to the hub after either. A missing Cloudy adapter cannot block weekly advancement or force conversation. Show actual availability.
Do not require the player to consume both modes. Repeated optional visits must not duplicate story disclosure or rewards.
The feeding game must use the goal already present in the approved aquarium graphic; do not draw a second goal or replace its established rules.
The hub belongs to navigation/activity state, with bounded dialogue graphs underneath it.

## Training and attributes
Team training remains mandatory, tactical, and presented in the existing overhead half-field format.
Code teaches perception and decisions: scan, recognize space, attack space when useful, draw pressure, exploit openings, support teammates and switch play when available.
Use the existing soccer evaluator and combined training library. Never make “always dribble” or “always pass” a universal answer.
Select Code's feedback from actual decision and execution evidence. His pass-weight line applies to an actual pass; if the activity cannot support that feedback, leave that line unused and return for content review rather than inventing a failed pass.
Home work earns attributes through verified completion and applicable activity results. Team training earns attributes through actual performance. Keep existing numeric progression configuration; this package does not invent point amounts.
Namespace reward keys by player/save, season, week, scheduled assignment/session. Attribute updates and completion receipts must commit atomically. Retrying a receipt cannot award twice.
If the installed host has no configured rates for a required reward, surface the exact missing configuration in the delivery report; do not silently invent numbers or claim rewards work.
The recess minigame retains the established once-weekly performance adjustment.
Soccer ability never changes merely for a conversation choice, skipping Cloudy, family finances, or selecting rest/social time.

## Facts, choices and knowledge
Match dialogue must follow the confirmed League Game 3 result. Unknown result means reconcile the game ledger before selecting win/draw/loss; never default to a loss.
Ambition is one of state-best, team-reliable, explore. When sharing with Cloudy, reuse the player's selected ambition text. Mark Cloudy's knowledge only after disclosure is acknowledged.
Park intention is practice, hang-out, or rest. Record it without adding training credit or treating it as attendance.
School joke choices are immediate flavor, not tactical assessments or relationship penalties.
Goalkeeper/outfield selection must determine the actual training scenario. Resolve unknown role using the existing character setup rather than assuming outfield.
Preserve selected replies, exact line progress and pending activity requests through reload.

## Migration and release
v0.2's fixed schedule lacks this mandatory home hub and has a different Cloudy flow. Explicitly migrate slot ordering and completed records. Never silently reset the player, replay matches or award duplicate attributes.
Retain old release support for active scenes/activities. Transition at a safe boundary; map verified home completions when present. Do not retroactively block completed weeks or pretend missing historical tasks were completed.
Remove even-week future school story slots from Week Five onward while preserving actual completed history.
Compile approved content into the current runtime and register actual source hashes through the protected approval workflow. No demo/test approval files may enter production.
Run this package validator and the actual app checks in ACCEPTANCE_CHECKLIST.md. Report branch/commit, changed files, completed migrations, playable Week Five paths, test results and any missing adapters/configuration.
