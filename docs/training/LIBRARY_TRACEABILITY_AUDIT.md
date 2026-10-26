# Team Training library traceability audit (PR #49)

Status: **audit only, nothing approved**. Generated from the repository on branch `devin/1793043141-tt-18`.

## 1. Library files found

| File in repo | Origin (owner upload) | SHA-256 | Version / status | What it contains |
|---|---|---|---|---|
| `research/logic/v0.5/data/scenario_catalog.json` | `SoccerMaster_Engine_v0.5_Devin.zip` (the v0.2 copy from `SoccerMaster_Logic_Audited_Repository_v0.2.zip` is byte-identical) | `ea3b615fcd506b84cc10c1206a92e105e35f9d1bcf94b0399c15d72e87e691f6` | schema 0.2, `authoring_seed_catalog`, `runtime_ready: false`; all 40 `draft_seed`, `production_enabled: false`, `not_calibrated`, `source_ids: []` | 40 seeds. Each has only 3 sentences: focal role + situation, a cue response, a counter response. 4 seeds have an audit override of the two responses. |
| `docs/training/v1.2/references/selected_tactical_seeds.json` | `SoccerMaster_Training_Schoolyard_Revision_v1.2.zip` | `7a22d27ffa11bf0fa6736e3b2c7139619048849180d2e3aad0c6b5c7df2535fe` | `runtime_ready: false`; "unmodified draft seeds … Do not enable by flipping flags" | 17 of the 40 seeds above, unchanged. |
| `docs/training/v1.2/SoccerMaster_Team_Training_Fixed_v1.2.zip` → `catalog.json`, `season-sessions.json`, `scenario-layouts.json` | `SoccerMaster_Team_Training_Fixed_v1.2.zip` | `5695c88c85c9b053302ed7a636fd3719b7e777519c0d4ffa3c64e863cf115c03` (zip) | 24 practice cards B1–K3, all `reference-prototype` | 108 scheduled sessions (theme, objective, coach question, family per role). The 24 cards are small-sided games (3v2 + GK, gates, 30 × 24 m) that the Team Training package told us to stop using. |
| `docs/training/v1.2/references/SoccerMaster_9v9_Roles_Interactions_Review_v0.3.md` | v1.2 package | `5cae5e2ddc32349435e24461a5c8d4876f99d62948bd34910f4c70cd4b4e7287` | review v0.3 | Role responsibilities in the 1-3-2-3; no scenarios or answer keys. |
| `research/training/v1.1/SoccerMaster_Training_Library_v1.md` | `SoccerMaster_Training_Coaching_Reviewed_Draft.zip` | `44634be5…af651a6` (zip) | 1.1.0, all `draft` | Home/individual exercises (juggling, first touch …). Not team tactical situations. |

No file named "Soccer Tactical Library" (or any team tactical library with positions, answer keys or explanations) was found in the repository or in the 30 uploaded packages on this machine.

## 2. What the 40 situations take from the source

| Seed | In selected 17 | Source text (verbatim) | Implemented as | Source text quoted in game | Authored by Devin (not in any source) | Status |
|---|---|---|---|---|---|---|
| GK01 | yes | **GK, short buildup** · cue: First presser commits: find the freed defender · counter: Cover shadow still blocks the pass | Short build-out against the first presser (GK) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| GK02 | no | **GK, opponent overloads short options** · cue: Evaluate lofted outlet and second-ball support · counter: Receiver isolated or delivery beyond kicking range | They mark every short option (GK) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| GK03 | no | **GK, ball behind defense** · cue: Compare interception arrival against attacker · counter: Drop and set if attacker arrives first | Ball played in behind our back line (GK) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| GK04 | no | **GK, defending cross** · cue: Claim, punch or hold according to trajectory and traffic · counter: Do not advance through bodies or unseen flight | Cross into our box (GK) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| CB01 | no | **CB, unopposed possession** · cue: Carry forward until a defender must choose · counter: Protect ball if a second presser closes · *audit override:* Carry into useful space while control, support and risk permit; reassess on pressure, shooting access or loss of control / The defender may keep delaying; no forced commitment | Carry out of the back with no one pressing (CB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| CB02 | yes | **CB, striker screens pivot** · cue: Change passing angle or find outside defender · counter: Avoid forcing a pass through the screen | Their 9 screens our 6 (CB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| CB03 | no | **CB, opponent striker checks short** · cue: Hold, hand over or follow with cover · counter: Runner threatens the space behind | Their 9 drops short (CB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| CB04 | yes | **CB, defending counterattack** · cue: Delay and protect goal-side route · counter: Step to tackle only when support or touch permits | Their counterattack runs at you (CB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| OB01 | yes | **Outside back, winger holds width** · cue: Offer inside support or overlap · counter: Do not occupy the same running lane | Our winger holds the width (LB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| OB02 | no | **Outside back, winger moves inside** · cue: Provide width when defensive cover exists · counter: Hold if advancing leaves a direct counter route | Our winger moves inside (LB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| OB03 | no | **Outside back, wide 1v1 defending** · cue: Approach under control and protect dangerous route · counter: Opponent's support changes the preferred direction | 1v1 against their winger (LB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| OB04 | no | **Far outside back, opposite-side attack** · cue: Tuck and scan far-post runner · counter: Re-expand if a switch travels across · *audit override:* Tuck and scan far-post threats; adjust as observed switch cues and ball travel develop / Balance new-side pressure against central and far-post threats; no automatic full expansion | Attack on the far side (LB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SIX01 | yes | **6, receiving under pressure** · cue: Scan and choose turn, bounce or shield · counter: Blind-side opponent makes the turn unsafe | Receiving with your back to play (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SIX02 | yes | **6, buildup with marked teammates** · cue: Move beyond a cover shadow to offer an angle · counter: Do not retreat into the defender's occupied space | Get out of the cover shadow (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SIX03 | no | **6, teammate attacks forward** · cue: Protect central counter route · counter: Shift if opponent outlet changes sides | Our 8 carries forward (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SIX04 | no | **6, winning possession** · cue: Play forward if a usable advantage exists · counter: Secure first touch if control or support is poor | You win the ball in midfield (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| EIGHT01 | yes | **8, between lines** · cue: Receive side-on and progress when space exists · counter: Bounce pass if pressure arrives before control | Receiving between their lines (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| EIGHT02 | no | **8, third-player combination** · cue: Move as the wall player receives · counter: Delay if the wall pass is unavailable | Third-player run off the 9 (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| EIGHT03 | yes | **8, wide attack develops** · cue: Arrive late into a free finishing lane · counter: Hold if another runner occupies it or cover is absent | Arriving for the cutback (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| EIGHT04 | no | **8, defending their pivot** · cue: Screen pass while supporting pressure · counter: Hand over marking when another threat becomes urgent | Screening their pivot (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| WING01 | yes | **Winger, isolated defender** · cue: Attack space and force commitment · counter: Recycle when cover converts 1v1 into 1v2 · *audit override:* Attack available space to attempt to provoke commitment; compare dribble, support and shot opportunities / Keep defender autonomy; cover, angle and execution can favor recycling | 1v1 against their right back (LW) | PARTIAL: game drops "; compare dribble, support and shot opportunities" from the audit-override cue | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| WING02 | yes | **Winger, near-side overload** · cue: Draw pressure and release a switch route · counter: Keep carrying if defenders refuse to commit | Overload on our left (LW) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| WING03 | yes | **Far winger, ball on opposite flank** · cue: Choose width, blind-side depth or far-post run · counter: Narrowing too early can destroy switch access | Far winger, ball on the other side (RW) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| WING04 | yes | **Winger, delivery near byline** · cue: Compare cutback, near-post pass, far-post delivery · counter: Cancel delivery when every arrival lane is covered | At the byline: which delivery? (LW) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| NINE01 | no | **9, teammate carrying centrally** · cue: Pin a defender or threaten depth · counter: Check short if midfield lacks a playable connection | Our 8 carries through the middle (9) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| NINE02 | no | **9, back to goal** · cue: Protect and lay off to a facing teammate · counter: Turn if defender overcommits and space opens | Back to goal (9) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| NINE03 | no | **9, pass in behind possible** · cue: Curve run and time acceleration · counter: Delay when passer is pressured or not ready | Run in behind (9) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| NINE04 | no | **9, opposition buildup** · cue: Curve press to remove a return or pivot lane · counter: Recover if the first line is bypassed | Pressing their build-up (9) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| AT01 | yes | **Ball winner, attacking transition** · cue: Exploit temporary numerical/positional advantage · counter: Recycle when defenders recover or first touch fails | You win it: break or recycle? (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| AT02 | no | **Supporting runner, 3v2 break** · cue: Separate lanes and time support · counter: Avoid becoming level with the carrier too early · *audit override:* Separate useful passing lanes and coordinate arrival with the carrier / Level support can be valid; reject only spacing/timing that removes a useful option | 3v2 break: the supporting runner (RW) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| DT01 | yes | **Nearest player, immediate loss** · cue: Counterpress when ball and support are accessible · counter: Delay/recover if opponent escapes facing forward | We have just lost it (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| DT02 | yes | **Cover player, immediate loss** · cue: Block the most dangerous outlet · counter: Do not join the ball chase and open the center | We lost it on the left: where does the cover go? (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| DEF01 | yes | **First defender, poor opponent touch** · cue: Press on observable loss of control · counter: Abandon tackle if opponent regains control first | Their winger takes a heavy touch (LB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| DEF02 | yes | **Cover defender, teammate presses** · cue: Protect inside and depth at a useful distance · counter: Shift as the attacker changes angle | Covering the pressing defender (CB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| DEF03 | no | **Back line, unpressured passer** · cue: Prepare to defend depth and coordinate line · counter: Do not step up blindly with a runner behind | Their 8 has time on the ball (CB) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| DEF04 | no | **Defender, loose clearance** · cue: Contest second ball or protect next pass · counter: Avoid abandoning the box for a low-probability duel | A loose clearance (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SP01 | no | **Throw-in receiver** · cue: Check away, return and offer a legal angle · counter: Switch receiver if marker follows tightly | Throw-in receiver (LW) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SP02 | no | **Corner defender** · cue: Assign first-contact and second-ball responsibilities · counter: Adapt to short corner and delayed runner | Defending a corner (6) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| SP03 | no | **Attacking free kick** · cue: Compare direct attempt and planned combination · counter: Range, wall and rules can make direct shot poor | Attacking free kick (8) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |
| GM01 | no | **Any role, protecting late lead** · cue: Prefer controllable progress and secure support · counter: Do not reject a clear high-value attacking chance | Protecting a late lead (LW) | yes | positions, player count, trigger, 4 answer options, every grade, every outcome, cue lines, Coach Code feedback, 18-player shape | Needs tactical authoring/review |

Seed text quoted in the game: 39/40 in full; WING01's cue is shortened, which drops part of its meaning. Answer options, grades, outcomes and feedback sourced: **0/40**.

## 3. How sessions pick situations

- Session topic, objective, coach question and the family per role come from `season-sessions.json` (source).
- The family tags on each seed (`SEED_FAMILIES` in `src/game/training12/situations/index.ts`) and the per-role pools are **authored by Devin**. The source never links a session to a seed.
- So every one of the 108 × 9 role routes (972 routes, 2,916 moments) points at Devin-authored content. Current per-session map: `docs/training/TACTICAL_SITUATIONS_MAPPING.md`.

## 4. Count

| Category | Situations | Session moments (108 sessions × 9 roles × 3) |
|---|---|---|
| Directly sourced | 0 | 0 |
| Approved adaptation | 0 | 0 |
| Blocked: needs tactical authoring/review | 40 | 2,916 |

## 5. Side-by-side examples

### SIX01

**Library entry** (`scenario_catalog.json`, sha256 `ea3b615f…`):

```json
{
 "id": "SIX01",
 "status": "draft_seed",
 "original": {
  "focal_role_and_situation": "6, receiving under pressure",
  "cue_candidate_response": "Scan and choose turn, bounce or shield",
  "counter_response": "Blind-side opponent makes the turn unsafe"
 },
 "audit_override": null,
 "source_ids": []
}
```

**Implemented situation, answers, assessment and Coach Code feedback** (all authored by Devin):

```ts
const SIX01: Fixture = {
  id: 'SIX01', seed: 'SIX01', version: 1, goal: 'ours', phase: 'build', focal: '6', human: 'six',
  title: 'Receiving with your back to play',
  objective: 'Scan before deciding: turn only when no one is coming from your blind side; otherwise bounce it or shield.',
  trigger: 'You have just received from the CB, facing our goal.',
  why: 'Our CB and LB are your safe options behind; their 8 and 9 are the pressers who decide whether you can turn. The rest are not involved.',
  actors: [
    us('six', '6', CX, 17, 'Has just received, facing our goal'),
    us('cb', 'CB', CX, 26, 'Bounce option behind'),
    us('lb', 'LB', 37, 24, 'Wide option'),
    them('o8', '8', 31, 8, 'Midfielder', p(29.5, 10)),
    them('o9', '9', 14, 21, 'Near our RB side'),
  ],
  ball: { owner: 'six' }, passageSeconds: 1, playSeconds: 2.6,
  options: [
    opt('turn', 'carry', 'Turn and carry forward', p(CX, 8)),
    opt('bounce', 'pass', 'Play it back to the CB', p(CX, 26), 'cb'),
    opt('lb', 'pass', 'Pass to the LB', p(37, 24), 'lb'),
    opt('shield', 'hold', 'Shield it', p(CX, 17)),
  ],
  cue: {
    teaches: 'Scan and choose turn, bounce or shield',
    question: 'You have it with your back to play. What did your scan show?',
    cues: ['No one is behind you.', 'Their 8 is more than ten metres away.'],
    grades: {
      turn: grade('good', 'progressed', ['Nobody was behind you, so turning was safe and moved us forward.']),
      bounce: grade('ok', 'kept', ['Safe, but you had time to turn.']),
      lb: grade('ok', 'kept', ['Safe, but you had time to turn.']),
      shield: grade('poor', 'kept', ['There was no one to shield from: the space was yours.']),
    },
  },
  counter: {
    teaches: 'Blind-side opponent makes the turn unsafe',
    moves: { o9: p(19, 10) },
    passage: { o9: p(21.5, 15.3) },
    question: 'You have it with your back to play. What did your scan show?',
    cues: ['Their 9 is coming from behind you on your blind side.'],
    grades: {
      turn: grade('poor', 'lost', ['Their 9 was arriving on your blind side: turning took you into him.'], { tackle: ['o9'], responses: { o9: p(CX, 13) } }),
      bounce: grade('good', 'kept', ['With someone on your blind side, the bounce back to the CB kept it.']),
      lb: grade('ok', 'kept', ['It kept the ball, but the CB was the simpler option.']),
      shield: grade('ok', 'kept', ['Shielding kept it for now while he closed.']),
    },
  },
};
```

### EIGHT01

**Library entry** (`scenario_catalog.json`, sha256 `ea3b615f…`):

```json
{
 "id": "EIGHT01",
 "status": "draft_seed",
 "original": {
  "focal_role_and_situation": "8, between lines",
  "cue_candidate_response": "Receive side-on and progress when space exists",
  "counter_response": "Bounce pass if pressure arrives before control"
 },
 "audit_override": null,
 "source_ids": []
}
```

**Implemented situation, answers, assessment and Coach Code feedback** (all authored by Devin):

```ts
const EIGHT01: Fixture = {
  id: 'EIGHT01', seed: 'EIGHT01', version: 1, goal: 'theirs', phase: 'attack', focal: '8', human: 'eight',
  title: 'Receiving between their lines',
  objective: 'Turn and go forward when there is space; play it straight back if pressure arrives first.',
  trigger: 'You have just received between their midfield and defence.',
  why: 'Our 6 is your bounce option; their 6 and 8 are the pressers; their CB marks our 9. Players on the far side are not involved.',
  actors: [
    us('eight', '8', 27, 19, 'Has just received between the lines'),
    us('six', '6', 22, 10, 'Bounce option'),
    us('nine', '9', 22, 28, 'Central forward'),
    them('o6', '6', 26, 27, 'Holding midfielder'),
    them('o8', '8', 33, 13, 'Midfielder'),
    them('ocb', 'CB', 21, 30, 'Marks our 9'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 0.8, playSeconds: 2.6,
  options: [
    opt('turn', 'carry', 'Turn and carry forward', p(27, 27.5)),
    opt('bounce', 'pass', 'Play it back to the 6', p(22, 10), 'six'),
    opt('nine', 'pass', 'Pass into the 9', p(22, 28), 'nine'),
    opt('hold', 'hold', 'Hold it up', p(27, 19)),
  ],
  cue: {
    teaches: 'Receive side-on and progress when space exists',
    question: 'You are between their lines. What do you do?',
    cues: ['Their 6 is eight metres away.', 'Their 8 is behind you and not closing.'],
    grades: {
      turn: grade('good', 'progressed', ['There was space in front and no one close: turning moved us forward.']),
      bounce: grade('ok', 'kept', ['Safe, but you had room to turn.']),
      nine: grade('poor', 'lost', ['Their CB was tight on the 9.'], { stoppedBy: 'ocb' }),
      hold: grade('poor', 'kept', ['Waiting let their 6 close the space.']),
    },
  },
  counter: {
    teaches: 'Bounce pass if pressure arrives before control',
    moves: { o6: p(26.5, 24), o8: p(31, 16) },
    passage: { o6: p(26.8, 20.7), o8: p(29, 18.2) },
    question: 'You are between their lines. What do you do?',
    cues: ['Their 6 and 8 are both arriving.'],
    grades: {
      turn: grade('poor', 'lost', ['Two of them arrived: turning took you into pressure.'], { tackle: ['o6', 'o8'], responses: { o6: p(27, 21) } }),
      bounce: grade('good', 'kept', ['Pressure came first, so the bounce back to the 6 kept the ball.']),
      nine: grade('poor', 'lost', ['Their CB was tight on the 9.'], { stoppedBy: 'ocb' }),
      hold: grade('ok', 'kept', ['You kept it for now, but two were closing.']),
    },
  },
};
```

### OB04

**Library entry** (`scenario_catalog.json`, sha256 `ea3b615f…`):

```json
{
 "id": "OB04",
 "status": "draft_seed",
 "original": {
  "focal_role_and_situation": "Far outside back, opposite-side attack",
  "cue_candidate_response": "Tuck and scan far-post runner",
  "counter_response": "Re-expand if a switch travels across"
 },
 "audit_override": {
  "cue_candidate_response": "Tuck and scan far-post threats; adjust as observed switch cues and ball travel develop",
  "counter_response": "Balance new-side pressure against central and far-post threats; no automatic full expansion"
 },
 "source_ids": []
}
```

**Implemented situation, answers, assessment and Coach Code feedback** (all authored by Devin):

```ts
const OB04: Fixture = {
  id: 'OB04', seed: 'OB04', version: 1, goal: 'ours', phase: 'defend', focal: 'LB', human: 'lb',
  title: 'Attack on the far side',
  objective: 'Tuck in and scan for the far-post runner; re-expand only if a switch actually travels across.',
  trigger: 'They attack down our right; you are the far outside back.',
  why: 'Their LW has the ball on our right with our RB on him; our CB marks their 9; their RW is the far-post threat you must see. The rest are not involved.',
  actors: [
    us('lb', 'LB', 37, 21, 'Far outside back'),
    us('cb', 'CB', 22, 28, 'Marks their 9'),
    us('rb', 'RB', 9, 24, 'Faces their LW'),
    them('olw', 'LW', 6, 25, 'Has the ball, looks to cross'),
    them('o9', '9', 22.5, 26.5, 'Attacks the near post'),
    them('orw', 'RW', 40, 17, 'Far-post runner', p(36, 22)),
  ],
  ball: { owner: 'olw' }, passageSeconds: 1, playSeconds: 6.5,
  options: [
    opt('tuck', 'cover', 'Tuck in toward the far post', p(29, 28.5)),
    opt('wide', 'hold', 'Stay wide with their winger', p(39, 21)),
    opt('press', 'press', 'Go to their winger', p(40, 17), 'orw'),
  ],
  cue: {
    teaches: 'Tuck and scan far-post threats; adjust as observed switch cues and ball travel develop (audit override)',
    question: 'The ball is on the far side. Where should you be?',
    cues: ['Their LW is about to cross.', 'Their RW is running toward the far post.'],
    grades: {
      tuck: grade('good', 'regained', ['Tucking in put you between the far-post runner and goal.'], { responses: { orw: p(30, 28.5) }, then: [{ at: 0.4, from: 'olw', kind: 'pass', point: p(29.5, 29), lofted: true }] }),
      wide: grade('poor', 'conceded', ['Staying wide left the far post open.'], { responses: { orw: p(29.5, 29) }, then: [{ at: 0.4, from: 'olw', kind: 'pass', point: p(29.5, 29), lofted: true }, { at: 0.5, from: 'orw', kind: 'shoot', point: p(22, 35) }] }),
      press: grade('poor', 'conceded', ['Going to him left the far post open as he ran in.'], { noTackle: true, responses: { orw: p(29.5, 29) }, then: [{ at: 0.4, from: 'olw', kind: 'pass', point: p(29.5, 29), lofted: true }, { at: 0.5, from: 'orw', kind: 'shoot', point: p(22, 35) }] }),
    },
  },
  counter: {
    teaches: 'Re-expand if a switch travels across (audit counter: balance new-side pressure against central and far-post threats; no automatic full expansion)',
    moves: { orw: p(40, 14) },
    passage: { lb: p(31, 25), orw: p(40, 14.5) },
    passageBall: { at: 0.2, from: 'olw', kind: 'pass', to: 'orw', lofted: true },
    question: 'They have switched it to your side. What now?',
    cues: ['The ball is travelling across to their right winger.', 'You are tucked in; he is out wide.'],
    grades: {
      tuck: grade('poor', 'beaten', ['The switch came across and he had room to run at goal.'], { then: [{ at: 0, from: 'orw', kind: 'carry', point: p(31, 28) }] }),
      wide: grade('ok', 'delayed', ['Going back out is right, but holding off let him settle.'], { responses: { orw: p(40, 16) } }),
      press: grade('good', 'regained', ['The switch was travelling: closing him as it arrived won it.'], { tackle: ['lb'] }),
    },
  },
};
```
