# SoccerMaster decision engine v0.5 — Devin handoff

Executable reference module for 9v9, one goalkeeper plus eight outfield players per team. This is the first implementation in this research repository, not an integrated or gameplay-validated release. No original source files were supplied from the game. No new UI controls, physics loop or automatic human input is added.

## Run

Requires a modern ES-module JavaScript runtime. Verified with Node 24.19.0; no dependencies.

```sh
node --test engine/decision-engine.test.mjs
node engine/example.mjs
```

Import `createDecisionEngine` from `engine/decision-engine.mjs`. Create one instance for each team. Call `step(observation)` from the existing simulation tick. See `fixtures.mjs` for the complete input shape. Units are metres and seconds; x spans pitch length, y spans width. Direction is +1 or -1. Default pitch 80 × 55 is an editable game configuration, not a universal 9v9 regulation.

## Player interactions

| Player situation | Implemented intention | Interaction |
|---|---|---|
| Ball carrier | Carry, secure, ground pass or standard shot | Scores observed passing lanes; receiver reserves the selected receiving point |
| Left/right winger | Width | Distinct wide channels give carrier two lateral options |
| Striker | Depth | Offers forward outlet while midfield supports behind |
| Number 8 | Support triangle | Staggers position relative to ball |
| Number 6 + central back | Rest defense / protect center | Maintain central protection while others advance |
| Outside backs | Support behind wing | Avoid occupying the winger's forward destination |
| First defender | Pressure / block lane | Arrival cost with central-protection penalty; small hysteresis stabilizes selection |
| Second defender | Cover | Provides goal-side cover behind pressure |
| Other defenders | Balance / recover | Recover role-dependent shape rather than all chase |
| Goalkeeper | Set, sweep, distribute | Sweeps a nearby loose ball if observed opponent distance permits |
| Human-controlled player | No engine orders | Position and pass eligibility still affect teammate decisions |
| Ball in flight | Receive / support | Delivered pass provenance preserves attacking support without awarding possession |

## Adapter contract — required before gameplay integration

1. **Perception:** supply only legally delivered team observations. This prototype uses a shared team observation, not an implemented per-player vision or radio-delay simulation. The host must gate opponent/ball observations and apply communication delays upstream; do not pass authoritative hidden positions. `seenAt` uses simulation time. Opponent and ball observations older than 0.6 s are ignored. Teammate positions must be current permitted team information. Missing opponents mean unknown space, not certified safety; utility is heuristic.
2. **Roster:** exactly nine teammates, one GK. Roles are GK/LB/CB/RB/6/8/LW/9/RW; canonical formation is 1-3-2-3. Human has `human:true`; `speed` is a positive movement capability used for arrival estimates. `ready:true` must come from the existing action state machine. Do not fabricate readiness during charging, contact, recovery or incapacity. Opponent roles are not required.
3. **Rules:** derive `passEligible` for each receiver from the host's configured rules and current availability; absent/false disables selection. `runLimit`, if present, is a team-relative x ceiling for supporting runs. This is not a complete offside evaluator. Restart/dead-ball phases produce no kicks. Existing restart and GK systems retain authority. Reduced-player matches are deliberately rejected in this version.
4. **Possession:** controlled ball requires a physical owner. Traveling/contested balls never grant kicking ownership. A friendly pass in flight may carry `fromId`, `receiverId`, and a legally observed/predicted `receivePoint`; this coordinates a receiver without a magnet or guaranteed catch. Clear this provenance on deflection or disputed flight. Actual reception belongs to collision/first-touch logic.
5. **Movement:** consume each `target` as a desired destination. Apply acceleration, turn limits, fatigue, obstacle avoidance and collision in the existing movement system. No teleporting. Orders expire after 0.35 s; retain unexpired movement intentions between tactical decisions. Local destination separation is heuristic, not collision avoidance or a global reservation guarantee.
6. **Actions:** PASS/SHOOT requests go through the SAME kick executor and attribute limits as human input. `aim` is a world point; `power` is normalized provisional charge intent, not a ball-speed override. Use the existing distance-aware ground-pass/shot executor. No homing, outcome roll, sprint boost or forced score. BLOCK is a stance request, never a movement override. Automatic slides are intentionally not emitted until the host supplies legal tackle/contact windows.
7. **Lifecycle:** discard commands listed in `cancel`. Revalidate owner, generations, readiness, rules, contact reach and expiry at execution. Deduplicate command IDs. Return every completed, rejected or expired command ID through `completedCommands`; until acknowledgment the actor cannot issue another kick. Increment `possessionGeneration` on every control change including loss/regain between calls, and `controlGeneration` on reassignment/cancellation. Pause and stoppage cancel pending actions. Before `reset()`, flush the host command queue; reset invalidates local state and increments the ID epoch.
8. **Time:** call on increasing integer simulation ticks; time cannot rewind without reset. Duplicate ticks return no orders. Decisions run at most every 0.15 s except phase/generation changes. Paused simulation time must not advance. Deterministic ordering uses stable player IDs. Do not independently call this from render frames.

## Integration sketch

```js
const tactical = createDecisionEngine({ length: pitch.length, width: pitch.width });
// In the game's existing simulation update:
const result = tactical.step(perception.deliverTeamObservation(teamId));
executor.cancel(result.cancel);
for (const order of result.orders) {
  movement.setIntention(order); // same acceleration/collision rules as human
  if (order.action) executor.request(order.action); // revalidate at contact
}
```

The adapter names above are illustrative, not claimed existing APIs. Never replace the career player's joystick or four buttons: PASS, SHOOT, SLIDE TACKLE, BLOCK. No call-for-pass or team switching is introduced.

## Acceptance and remaining work

Automated tests validate isolated decisions, not soccer match quality. The module is heuristic and has not been calibrated against a ten-year dataset or tested inside EA FC Mobile. Historical tactical research remains reference material. Manager styles, advanced rotations, overlapping runs, marking handovers, realistic individual perception, keeper catching, set pieces, slide timing, animation/physics and actual match telemetry require host integration and further work. No claim of complete tactical or security audit is made.

Before release: run actual 9v9 matches for both attack directions; validate turnovers and deflected passes, human career lock, rest-defense coverage, receiver run cancellation, physical pass interception, GK races, action recovery and 30/60/120 Hz rendering equivalence. Record seed, observations, rules, config and accepted commands. Tune only after these checks and report distributions rather than fabricated accuracy percentages.
