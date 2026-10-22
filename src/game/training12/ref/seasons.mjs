import {catalog,families} from './catalog.mjs';
import {selectPractice,assignParticipants,createRun} from './engine.mjs';

// Every row authors three distinct football problems, not three copies of a drill.
// title, focuses, starts/problems A/B/C, transfer question
const seasonOne = [
 ['Find space and recognize pressure',['build','combine','defend'],
  'GK starts with two short outlets; nearest opponent chooses which outlet to press',
  'Receiver begins behind a defender and must create a visible passing angle',
  'Two defenders begin staggered; attack can choose either mini-goal',
  'Does the player look for useful space before moving toward the ball?'],
 ['Width, depth and a safe reset',['switch','build','combine'],
  'Ball starts near one touchline; far target is available but not automatically preferable',
  'First forward outlet is screened; GK and near back provide different reset angles',
  'Two attackers start on the same line and must create staggered support',
  'Are teammates offering different angles rather than clustering?'],
 ['Draw a defender and release',['wide','combine','finish'],
  'Wide carrier faces a defender who may hold position or step toward the ball',
  'Support player can check short or run beyond when the defender commits',
  'Two attackers face one defender and GK; carrier chooses pass or shot',
  'Does a pass exploit a defender movement rather than happen by habit?'],
 ['First defender and cover',['defend','transition','build'],
  'Ball carrier starts centrally; first defender must approach without opening the inside lane',
  'Begin with an ordinary opposed attack; on an actual loss, the closest player checks for cover',
  'Build-up unit faces one active presser and a second defender screening midfield',
  'Does the second defender cover instead of duplicating pressure?'],
 ['First touch opens the next action',['combine','build','finish'],
  'Receiver approaches at an angle while a defender closes from one side',
  'GK passes to a back whose forward route can be open or screened',
  'Attacker receives with back partly to goal and chooses turn, set or retain',
  'Does receiving position preserve a usable next option?'],
 ['Play around the first press',['build','keeper','switch'],
  'Striker curves the press toward one back; other defenders respond normally',
  'GK is offered a near return and a more distant outlet under live pressure',
  'Near target is defended; attack can reset centrally before accessing the opposite target',
  'Can the team escape pressure without forcing the first forward pass?'],
 ['Midfield support and third player',['combine','build','defend'],
  'Central receiver is followed; another attacker can become the third-player outlet',
  'Holding midfielder begins in a cover shadow and must find a usable angle',
  'Defenders protect a central receiver while maintaining access to the ball',
  'Can the supporting player make the next pass easier before receiving?'],
 ['Switch when the picture changes',['switch','wide','transition'],
  'Defending unit shifts toward the ball; far-side space changes as play continues',
  'Winger receives a switch with defender recovering; choose attack or secure possession',
  'A wide attack may break down; opposite players must protect central space',
  'Is the switch selected because it improves access?'],
 ['Midseason retention check',['build','defend','switch'],
  'Revisit the week-one build-up problem with mirrored starting positions and no cue overlay',
  'Revisit pressure-cover against a different pair of attackers without telling who presses',
  'Two-target game uses normal scoring and no switch bonus',
  'Do earlier behaviors appear without an instruction immediately beforehand?'],
 ['Wide partnerships',['wide','combine','defend'],
  'Winger holds width; supporting back chooses underneath support or a feasible outside run',
  'Winger checks inside while another player can maintain the wide outlet',
  'Outside defender faces a carrier and support runner; cover protects the inside route',
  'Are winger and back making complementary movements?'],
 ['Create chances together',['finish','wide','keeper'],
  'Carrier attacks centrally with one teammate available for a square pass',
  'Ball reaches a wide scoring area; near and deeper runners choose separate lanes',
  'GK faces an attacker with a passing option and adjusts to ball angle',
  'Does the attack preserve the better finish instead of forcing a shot?'],
 ['Recover after losing the ball',['transition','defend','build'],
  'Attacking team has players ahead of the ball when an opponent genuinely wins possession',
  'Defender begins outnumbered and must delay while support recovers',
  'After winning possession near goal, compare a safe outlet and an ambitious forward pass',
  'Does the team protect the middle when immediate pressure is unsupported?'],
 ['Goalkeeper as part of the team',['keeper','build','finish'],
  'Opposing carrier has space; GK chooses position from pressure and possible through-ball',
  'GK receives a reset while the first outlet is pressed and another angle develops',
  'A live attack can produce a rebound; attackers and GK continue until the ball is dead',
  'Do goalkeeper and back line support one another before and after the shot?'],
 ['Front line pressure',['defend','transition','combine'],
  'Front attacker curves pressure toward a chosen side while teammates protect exits',
  'High regain creates a brief opening; compare early attack and secure possession',
  'Opposition escapes the press; attackers practice finding a new support angle',
  'Does the front press guide play with support rather than chase alone?'],
 ['Counter or keep it',['transition','finish','switch'],
  'Regain occurs with a forward runner available but a defender able to intercept',
  'A recovering defender approaches the shooting lane; compare pass and finish',
  'Counter route closes and a far-side reset becomes available',
  'Can players recognize when the initial counterattack has ended?'],
 ['Connected units',['build','wide','defend'],
  'Back-line outlet connects to midfield, which must support a second forward action',
  'Wide penetration requires a covering teammate to remain behind the attack',
  'Defense shifts across two threats while protecting the route to goal',
  'Are the back, midfield and attack connected by reachable passing distances?'],
 ['Competition preparation',['switch','defend','keeper'],
  'Opponent protects central space; attack must compare wide access and patient circulation',
  'Short match scenario begins level late in the game; choose sensible pressing risk',
  'Keeper distribution begins after a save while teammates recover their structure',
  'Do decisions remain appropriate when score and time provide context?'],
 ['Season-one transfer and review',['combine','transition','finish'],
  'Remove coaching overlays and revisit a support problem with an unfamiliar starting side',
  'Play continuous turnovers with ordinary scoring and no speed bonus',
  'Finish in equal-number play at the highest individually supported level',
  'Which behaviors transfer into normal 9v9 and which need next-season practice?']
];

const seasonTwo = [
 ['Return, reassess and reconnect',['build','defend','combine'],
  'New teammate pairings face the original outlet problem; no assumed mastery from last season',
  'Defensive pair faces an attacker who changes pace and direction within normal attributes',
  'Receiver and supporting player solve a mirrored third-player problem without a cue',
  'Which retained behaviors survive a different opponent and teammate pairing?'],
 ['Recognize different presses',['build','keeper','switch'],
  'Compare one pressing forward with an authored two-forward press in a supported card',
  'GK sees opponents screen short outlets and must identify a feasible remaining option',
  'Opponent blocks the return route, making same-side progression or a longer reset meaningful',
  'Does the team adapt to the actual press rather than repeat one exit?'],
 ['Invite pressure without losing control',['build','combine','transition'],
  'Back carries into free space while an opponent chooses when to engage',
  'Receiver sets back to a third player only if the forward turn is genuinely closed',
  'An invited press wins the ball occasionally; nearby players react without a scripted regain',
  'Can the team draw pressure while preserving a credible escape?'],
 ['Switch, then attack the new side',['switch','wide','finish'],
  'Far-side outlet becomes available as defense shifts, then closes if the pass is delayed',
  'Winger receives with a recovering outside defender and a teammate supporting underneath',
  'Attack reaches the box after a switch; compare cutback, carry and shot',
  'Does the receiver exploit the advantage before it disappears?'],
 ['Rotations with clear responsibility',['combine','wide','defend'],
  '9 checks toward the ball; winger or 8 can provide depth if the lane opens',
  'Winger enters an inside channel while a back retains width and another player covers',
  'Defenders hand over a crossing runner using visible movement instead of following indefinitely',
  'Does someone replace the space vacated by a teammate?'],
 ['Break a compact middle',['combine','switch','finish'],
  'Opposition protects the central lane; receive between lines only when reachable',
  'Central route remains blocked while wide targets can stretch the defending unit',
  'Attack faces defenders near goal; compare a blocked shot with a usable extra pass',
  'Does patience create a better route without becoming pointless circulation?'],
 ['Defend an overload',['defend','keeper','transition'],
  'Use a supported asymmetric game with the career defender in the underloaded unit',
  'GK supports a recovering defender against a carrier plus runner',
  'An outnumbered defense wins possession and needs a secure first outlet',
  'Do defenders delay and protect danger rather than all attack the ball?'],
 ['Pressing triggers and escape routes',['defend','build','transition'],
  'A genuine heavy touch or backward reception can trigger pressure when cover exists',
  'Build-up team responds to pressure triggered by its visible first touch',
  'Press is beaten; players abort the chase and recover into useful positions',
  'Can players start and stop a press for observable reasons?'],
 ['Midseason transfer under variation',['switch','combine','defend'],
  'Repeat a switching problem against a less ball-oriented defending unit',
  'Repeat support play with different teammate strengths using unchanged physics limits',
  'Observe cover and balance with no designated first defender shown',
  'Are useful choices robust to changes in opponents and teammate capability?'],
 ['Rest defense supports attack',['wide','transition','defend'],
  'Two attackers threaten the box while the supporting midfielder protects the central counter',
  'A wide loss creates a central counter opportunity; nearest and deeper players choose different jobs',
  'Central defender considers stepping while the holding midfielder may or may not cover',
  'Can the team attack without leaving every player ahead of the ball?'],
 ['Timing depth and the second striker',['combine','wide','finish'],
  '9 checks short and a second attacker times a run beyond the line under host offside rules',
  'Far winger narrows only when width is maintained and the ball can reach the scoring area',
  'Near and far runners respond to the carrier rather than entering the same finishing lane',
  'Are runs timed to the pass and supported by a clear width handover?'],
 ['Transitions with unequal recovery',['transition','defend','keeper'],
  'A real turnover finds one player behind play; others decide pressure versus recovery',
  'Defender protects central access until the recovering teammate can provide cover',
  'GK reads a through-ball while both attacker and defender approach under normal movement limits',
  'Do the unit’s choices change as the recovering player arrives?'],
 ['Solve different defensive shapes',['build','switch','combine'],
  'Opponent presents a narrow central screen with wide outlets initially available',
  'Opponent protects width more strongly, leaving a possible central progression',
  'Opposition tracks a receiver tightly; support player creates a new route without a forced pattern',
  'Does the attack exploit what the opponent leaves open?'],
 ['Manage match risk',['transition','build','finish'],
  'Late-game lead: a regain offers a risky counter and a reliable retention option',
  'Level game: back-line player chooses progression without needless own-goal exposure',
  'Late-game deficit: attacker accepts reasonable risk while still recognizing a better placed teammate',
  'Does score context change risk sensibly without predetermined outcomes?'],
 ['Restarts into open play',['build','keeper','defend'],
  'Begin from a legal host goal-kick setup, then release all players into normal play',
  'Begin after an actual keeper claim; compare the current approved distribution options',
  'Begin from a host-supported sideline restart and defend the next action',
  'Does the team organize for the second action after a restart?'],
 ['Execute with less help',['combine','switch','transition'],
  'No cue overlay; receiver and third player organize from the same visible information',
  'No target highlighting; carrier finds the more useful side through normal perception',
  'No pressure/cover labels; unit must coordinate after real possession changes',
  'Can the player perform without training-only hints?'],
 ['Competition rehearsal',['defend','wide','keeper'],
  'Short scenario against a dangerous central attacker with an available wide runner',
  'Attack begins against a balanced defense; no manufactured overload or success boost',
  'Keeper unit handles a sequence of normal play, save or out, and legal restart',
  'Do the team relationships remain stable under competition context?'],
 ['Season-two transfer and next steps',['build','transition','finish'],
  'Reassess build-up in free play against a different allowed press',
  'Reassess attack-to-defense and defense-to-attack without extra training rewards',
  'Assess finishing choices and enabling off-ball runs separately from goals scored',
  'Which skills show retained 9v9 evidence, and which should carry into the next development block?']
];

const roles=['GK','CB','LB','RB','6','8','LW','RW','9'];
// Explicit curriculum routes for roles outside a primary drill family.
const complementary={
 build:{LW:'transition',RW:'transition','9':'defend'},
 switch:{GK:'keeper',CB:'defend','9':'combine'},
 combine:{GK:'keeper',CB:'build',LB:'build',RB:'build'},
 wide:{GK:'keeper',CB:'defend','6':'transition'},
 defend:{GK:'keeper'},
 transition:{GK:'keeper'},
 finish:{CB:'defend',LB:'defend',RB:'defend','6':'transition'},
 keeper:{'8':'combine',LW:'defend',RW:'defend','9':'defend'}
};
export const sessions=[seasonOne,seasonTwo].flatMap((weeks,si)=>weeks.flatMap((row,wi)=>{
 const [theme,focuses,...rest]=row;
 return focuses.map((focus,i)=>({
  id:`S${si+1}-W${String(wi+1).padStart(2,'0')}-${'ABC'[i]}`,
  season:si+1,week:wi+1,slot:'ABC'[i],theme,focus,
  scenario:rest[i],transferQuestion:rest[3],
  objective:families[focus].evidence,coachQuestion:families[focus].cue,
  maxLevel:si===0?(wi<6?1:wi<12?2:3):3,
  roleRoutes:Object.fromEntries(roles.map(role=>[role,{
   family:complementary[focus][role]??focus,
   relationship:!complementary[focus][role]?'primary':
    `Complementary ${role} contribution to ${families[focus].name.toLowerCase()}; explicitly labeled role practice`,
   variantId:`S${si+1}-W${String(wi+1).padStart(2,'0')}-${'ABC'[i]}-${role}`
  }])),
  matchTransfer:{required:true,separateFromTrainingScore:true,question:rest[3]},
  state:'authored-requires-host-scenario-adapter'
 }));
}));

export function scenarioDefinition(sessionId,role,level,rulesProfile) {
 const s=sessions.find(x=>x.id===sessionId),route=s?.roleRoutes[role];
 if(!route||!Number.isInteger(level)||level<1||level>s.maxLevel||
 typeof rulesProfile!=='string'||!/^[a-zA-Z0-9_-]{1,32}$/.test(rulesProfile)) throw Error('Invalid scenario definition');
 const d=catalog.find(d=>d.family===route.family&&d.level===level);
 const p=d.participants;
 const task=role==='GK'?'keeper':route.family==='defend'?'defend':'attack';
 const humanSide=role==='GK'?(p.gkA?'GK_A':'GK_B'):task==='defend'?'B':'A';
 const actors=[];
 for(const [side,count] of [['A',p.outfieldA],['B',p.outfieldB],['N',p.neutrals],['GK_A',p.gkA],['GK_B',p.gkB]]) {
  for(let i=0;i<count;i++) actors.push({slot:`${side}${i+1}`,side,
   x:side==='GK_A'?.04:side==='GK_B'?.96:side==='A'?.30+(i%2)*.10:side==='B'?.65+(i%2)*.10:.5,
   y:(i+1)/(count+1),task:side.startsWith('GK')?'protect-goal-and-offer-outlet':
    side==='A'?(i===0?'carry-and-choose-outlet':'offer-distinct-support'):side==='B'?(i===0?'pressure-or-delay':i===1?'cover-inside':'balance-second-threat'):'support-secure-possessor'});
 }
 const humanActor=actors.find(a=>a.side===humanSide);
 if(!humanActor) throw Error('No human slot');
 humanActor.human=true;
 const localOverload=['S1-W12-B','S2-W07-A','S2-W12-B'].includes(sessionId)&&task==='defend';
 if(localOverload) {
  const carrier=actors.find(a=>a.slot==='A1'),support=actors.find(a=>a.slot==='A2');
  carrier.x=.56;carrier.y=.42;support.x=.60;support.y=.67;
  actors.filter(a=>a.side==='B').forEach((a,i)=>{a.x=i===0?.72:.20;a.y=i===0?.52:(i+1)/(p.outfieldB+1);a.task=i===0?'delay-two-attackers':'recover-goalside';});
 }
 const cue=role==='GK'?families.keeper.cue:families[route.family].cue;
 const objective=role==='GK'?families.keeper.evidence:families[route.family].evidence;
 const targets=[];
 const goal=(x,team)=>targets.push({type:'goal',x,y:.5,width:'host-goal-width',scoresFor:team});
 const pair=(x,team,type='mini-goal')=>[.25,.75].forEach(y=>targets.push({type,x,y,widthMeters:type==='gate'?3:2,scoresFor:team}));
 if(['B1','B2','K1'].includes(d.id)) {pair(1,'A','gate');goal(0,'B');}
 else if(['W1','W2','F1','F2'].includes(d.id)) {goal(1,'A');pair(0,'B',['W1','F1'].includes(d.id)?'gate':'mini-goal');}
 else if(['C1','T2'].includes(d.id)) {targets.push({type:'end-zone',x:1,depthMeters:3,scoresFor:'A'},{type:'end-zone',x:0,depthMeters:3,scoresFor:'B'});}
 else if(['S1','S2','D1','D2','T1','C2'].includes(d.id)) {pair(1,'A');pair(0,'B');}
 else {goal(1,'A');goal(0,'B');}
 if(d.id==='S1') targets.forEach(t=>t.shotOriginWithinEndMeters=5);
 const ownerSlot=['build','keeper'].includes(route.family)&&p.gkA?'GK_A1':'A1';
 return {key:`${route.variantId}:${d.id}:c2:s1:${rulesProfile}:layout2`,variantId:route.variantId,
 practiceId:d.id,level,curriculumVersion:2,scenarioVersion:1,layoutRevision:2,rulesProfile,
 humanSide,task,actors,ball:{ownerSlot},targets,pitch:{...d.pitch},
 localOverload,release:'All actors active at time zero; recovery uses ordinary movement; no scripted regain',
 objective,coachQuestion:cue,
 roleSituation:route.relationship==='primary'?s.scenario:
  `${role}: ${objective}. Shared team problem: ${s.theme}. Start from the supplied ${route.family} layout.`,
 matchContext:s.scenario};
}

export function planSession({sessionId,role,earnedLevel,players,humanId,rulesProfile,
 practiceCapabilities=[],scenarioCapabilities=[]}) {
 const s=sessions.find(s=>s.id===sessionId),route=s?.roleRoutes[role];
 if(!s||!route||!Number.isInteger(earnedLevel)||earnedLevel<1||earnedLevel>3)
  throw Error('Invalid curriculum selection');
 const level=Math.min(earnedLevel,s.maxLevel);
 const definition=scenarioDefinition(sessionId,role,level,rulesProfile);
 const approval=scenarioCapabilities.find(x=>x&&x.verified===true&&x.key===definition.key&&JSON.stringify(x.definition)===JSON.stringify(definition));
 if(!approval) return {status:'unavailable',reason:'Exact scenario level, rules and layout not verified',sessionId,variantId:route.variantId};
 const chosen=selectPractice({focus:route.family,role,level,players,humanId,capabilities:practiceCapabilities});
 if(chosen.status!=='selected') return chosen;
 const assignment=assignParticipants(chosen.practice,players,humanId,0,definition.humanSide);
 const pools={};for(const a of assignment.slots) (pools[a.slot]??=[]).push(a.playerId);
 // Prioritize human within the declared side, matching the human-marked layout actor.
 pools[definition.humanSide].sort((a,b)=>a===humanId?-1:b===humanId?1:0);
 const actors=definition.actors.map(a=>({...a,playerId:pools[a.side].shift(),
  position:{x:a.x*definition.pitch.length,y:a.y*definition.pitch.width}}));
 return {...chosen,session:{...structuredClone(s),objective:definition.objective,coachQuestion:definition.coachQuestion,scenario:definition.roleSituation},
 route:structuredClone(route),level,definition,actors,assignment,humanId,
  entitlementContext:{season:s.season,week:s.week,slot:s.slot}};
}

export function createScheduledRun({plan,careerId,runId,seed,boutSeconds=90}) {
 if(plan?.status!=='selected') throw Error('A verified plan is required');
 const s=plan.session,d=plan.definition;
 const expected=scenarioDefinition(s.id,plan.actors.find(a=>a.playerId===plan.humanId)?.human?plan.route.variantId.split('-').at(-1):'',plan.level,d.rulesProfile);
 if(JSON.stringify(d)!==JSON.stringify(expected)||plan.practice.id!==d.practiceId) throw Error('Plan context mismatch');
 const role=plan.route.variantId.split('-').at(-1);
 const players=plan.actors.map(a=>({id:a.playerId,keeper:a.side.startsWith('GK'),role:a.playerId===plan.humanId?role:a.side.startsWith('GK')?'GK':'8'}));
 return createRun({careerId,seasonId:s.season,weekId:`S${s.season}-W${String(s.week).padStart(2,'0')}`,slotId:s.slot,
 sessionId:s.id,variantId:d.variantId,layoutKey:d.key,rulesProfile:d.rulesProfile,curriculumVersion:2,scenarioVersion:1,
 runId,practiceId:d.practiceId,seed,humanId:plan.humanId,players,boutSeconds});
}

export function validateCurriculum() {
 if(sessions.length!==108||new Set(sessions.map(s=>s.id)).size!==108) throw Error('Invalid session inventory');
 for(const s of sessions) for(const [role,r] of Object.entries(s.roleRoutes)) {
  if(!families[r.family]?.roles.includes(role)) throw Error(`Unmapped role ${s.id} ${role}`);
  for(let level=1;level<=s.maxLevel;level++) if(!catalog.some(d=>d.family===r.family&&d.level===level&&d.roles.includes(role)))
    throw Error('Missing practice level');
 }
 return {seasons:2,weeksPerSeason:18,sessionsPerWeek:3,scheduledSessions:108,
  basePracticeCards:catalog.length,roleMappings:sessions.length*roles.length};
}
