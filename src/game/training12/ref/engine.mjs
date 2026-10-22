import {catalog,families} from './catalog.mjs';
const clone=x=>structuredClone(x);
const finite=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=160;

// Selection is deterministic. The host owns scheduled focus and progression policy.
export function selectPractice({focus,role,level=1,availablePlayers,availableKeepers,players,humanId,capabilities=[],recent=[]}) {
 if(players) {
  validateRoster(players);
  const human=players.find(p=>p.id===humanId);
  if(!human||human.role!==role) throw Error('Human role mismatch');
  availablePlayers=players.length;availableKeepers=players.filter(p=>p.keeper).length;
 }
 if(!families[focus]||!Number.isInteger(level)||level<1||level>3||
   !Number.isInteger(availablePlayers)||availablePlayers<1||!Number.isInteger(availableKeepers)||availableKeepers<0)
   throw Error('Invalid selection context');
 const options=catalog.filter(d=>d.family===focus&&d.level===level&&d.roles.includes(role)&&
   d.participants.total<=availablePlayers&&d.participants.gkA+d.participants.gkB<=availableKeepers&&
   d.participants.outfieldA+d.participants.outfieldB+d.participants.neutrals<=availablePlayers-availableKeepers&&
   (role!=='GK'||d.participants.gkA+d.participants.gkB>0)&&
   capabilities.includes(d.id));
 options.sort((a,b)=>Number(recent.includes(a.id))-Number(recent.includes(b.id))||a.id.localeCompare(b.id));
 return options.length?{status:'selected',practice:clone(options[0])}:
  {status:'unavailable',reason:'No enabled drill fits the locked focus, role, level and roster'};
}

export function validateRoster(players) {
 if(!Array.isArray(players)||new Set(players.map(p=>p.id)).size!==players.length||
   players.some(p=>!validId(p.id)||typeof p.keeper!=='boolean'||
    !['GK','CB','LB','RB','6','8','LW','RW','9'].includes(p.role)||p.keeper!==(p.role==='GK'))) throw Error('Invalid roster');
}
export function assignParticipants(practice,players,humanId,round=0,humanSlot=null) {
 if(!Number.isInteger(round)||round<0) throw Error('Invalid round');
 validateRoster(players);
 const human=players.find(p=>p.id===humanId);
 if(!human||!practice.roles.includes(human.role)) throw Error('Unsupported human role');
 const keepers=players.filter(p=>p.keeper).sort((a,b)=>a.id.localeCompare(b.id));
 const outfield=players.filter(p=>!p.keeper).sort((a,b)=>a.id.localeCompare(b.id));
 const rotate=list=>list.length?[...list.slice(round%list.length),...list.slice(0,round%list.length)]:[];
 const prioritize=list=>[...list.filter(p=>p.id===humanId),...list.filter(p=>p.id!==humanId)];
 const k=prioritize(rotate(keepers)),o=prioritize(rotate(outfield));
 const p=practice.participants;
 if(k.length<p.gkA+p.gkB||o.length<p.outfieldA+p.outfieldB+p.neutrals) throw Error('Insufficient eligible players');
 const slots=[...Array(p.gkA).fill('GK_A'),...Array(p.gkB).fill('GK_B')].map(slot=>({slot,playerId:k.shift().id}));
 for(const [slot,count] of [['A',p.outfieldA],['B',p.outfieldB],['N',p.neutrals]])
   for(let i=0;i<count;i++) slots.push({slot,playerId:o.shift().id});
 if(!slots.some(s=>s.playerId===humanId)) throw Error('Human excluded by drill format');
 // Alternate sides only for symmetric formats; asymmetric roles need explicit setup variants.
 if(round%2===1&&p.outfieldA===p.outfieldB&&p.gkA===p.gkB)
   slots.forEach(s=>s.slot=({A:'B',B:'A',GK_A:'GK_B',GK_B:'GK_A',N:'N'})[s.slot]);
 if(humanSlot) {
  const current=slots.find(s=>s.playerId===humanId),target=slots.find(s=>s.slot===humanSlot);
  if(!target||humanSlot.startsWith('GK')!==human.keeper||humanSlot==='N') throw Error('Invalid human slot');
  [current.playerId,target.playerId]=[target.playerId,current.playerId];
 }
 return {slots,bench:players.filter(p=>!slots.some(s=>s.playerId===p.id)).map(p=>p.id)};
}

// Rubrics are supplied from observable pre-action snapshots by the host evaluator.
// No result/goals field participates in decision quality. null = insufficient evidence.
export function evaluateEvidence(events) {
 const seen=new Set(),byPlayer=Object.create(null);
 for(const e of events) {
   if(!validId(e.id)||!validId(e.actorId)||!validId(e.opportunityId)) throw Error('Invalid evidence identity');
   const key=JSON.stringify([e.actorId,e.opportunityId,e.dimension]);
   if(seen.has(key)) continue;
   if(e.observable!==true||e.eligible!==true) continue;
   if(!['decision','support','defense','execution'].includes(e.dimension)||!finite(e.quality,0,1)) throw Error('Invalid evidence quality');
   seen.add(key);
   const row=byPlayer[e.actorId]??=Object.create(null);
   const stat=row[e.dimension]??={sum:0,n:0};stat.sum+=e.quality;stat.n++;
 }
 return Object.fromEntries(Object.entries(byPlayer).map(([id,stats])=>[id,
   Object.fromEntries(Object.entries(stats).map(([dim,s])=>[dim,{opportunities:s.n,score:s.n>=5?s.sum/s.n:null}]))]));
}

export function recommendNext({level,score,opportunities,successfulSessions,load,task='unknown'}) {
 if(!Number.isInteger(level)||level<1||level>3||!finite(load,0,1)||
   !Number.isInteger(opportunities)||opportunities<0||!Number.isInteger(successfulSessions)||successfulSessions<0||
   (score!==null&&!finite(score,0,1))) throw Error('Invalid adaptation context');
 if(!['attack','defend','keeper','unknown'].includes(task)) throw Error('Invalid task');
 if(load>=.75) return {level,change:'reduce-bout-duration',reason:'host load signal',requiresNewRunConfig:true};
 if(opportunities<5||score===null) return {level,change:'repeat-with-variety',reason:'insufficient evidence'};
 if(score<.4) return {level,change:({attack:'increase-width-10-percent',defend:'reduce-target-width-10-percent',keeper:'increase-attacker-start-distance-10-percent',unknown:'coach-review'})[task],reason:'task-specific single-variable regression',requiresVerifiedLayout:true};
 if(score>=.75&&successfulSessions>=2&&level<3) return {level,proposedLevel:level+1,change:'review-next-format',reason:'repeated success; verify new format before promotion'};
 return {level,change:'retain',reason:'consolidate'};
}

export function createRun({careerId,seasonId,weekId,slotId,sessionId,variantId,layoutKey,rulesProfile,
 curriculumVersion,scenarioVersion,runId,practiceId,seed,humanId,players,boutSeconds=90}) {
 const practice=catalog.find(d=>d.id===practiceId);
 validateRoster(players);
 const human=players.find(p=>p.id===humanId);
 if(!practice||!human||!practice.roles.includes(human.role)||
 ![careerId,weekId,slotId,runId,humanId,sessionId,variantId,layoutKey,rulesProfile].every(validId)||
 ![1,2].includes(seasonId)||!new RegExp(`^S${seasonId}-W(0[1-9]|1[0-8])$`).test(weekId)||
 !['A','B','C'].includes(slotId)||sessionId!==`${weekId}-${slotId}`||variantId!==`${sessionId}-${human.role}`||
 curriculumVersion!==2||scenarioVersion!==1||!Number.isSafeInteger(seed)||!finite(boutSeconds,30,90)) throw Error('Invalid run context');
 return {version:2,careerId,seasonId,weekId,slotId,sessionId,variantId,layoutKey,rulesProfile,curriculumVersion,scenarioVersion,
 runId,practiceId,contentVersion:practice.version,seed,humanId,actorIds:players.map(p=>p.id),boutSeconds,
   status:'ready',round:0,elapsed:0,totalPlayed:0,seen:[],events:[],participation:[],activeSeconds:0,
   telemetry:'unknown',capacityWarning:false,generation:0,lastTick:-1};
}

// Pure reducer: persist returned state through host transaction before exposing effects.
export function reduceRun(state,event) {
 const s=clone(state),d=catalog.find(x=>x.id===s.practiceId);
 if(s.version!==2||!d||s.contentVersion!==d.version) throw Error('Unsupported saved content version');
 if(!validId(event.id)||event.runId!==s.runId) throw Error('Stale event');
 const eventKey=JSON.stringify([event.generation,event.id]);
 if(s.seen.includes(eventKey)) return s;
 if(event.generation!==s.generation) throw Error('Stale event');
 if(event.type==='tick') {
   if(!Number.isSafeInteger(event.tick)||event.tick<0) throw Error('Invalid tick');
   if(event.tick<=s.lastTick) return s;
 }
 if(event.type==='start'&&s.status==='ready') s.status='playing';
 else if(event.type==='tick'&&s.status==='playing') {
   if(!finite(event.dt,0,.25)) throw Error('Invalid fixed-step delta');
   s.lastTick=event.tick;
   const advance=Math.min(event.dt,s.boutSeconds-s.elapsed);
   s.elapsed+=advance;s.totalPlayed+=advance;
   if(s.elapsed>=s.boutSeconds) {s.elapsed=s.boutSeconds;s.status='reflection';s.generation++;}
 } else if(event.type==='evidence'&&s.status==='playing') {
   evaluateEvidence([event.evidence]);
   const e=event.evidence;
   if(!s.actorIds.includes(e.actorId)) throw Error('Evidence actor outside roster');
   if(e.observable!==true||e.eligible!==true) return s;
   if(s.events.some(x=>x.actorId===e.actorId&&x.opportunityId===e.opportunityId&&x.dimension===e.dimension)) return s;
   if(s.events.length>=512) {s.capacityWarning=true;s.telemetry='degraded';return s;}
   s.events.push(clone(e));
 } else if(event.type==='participation'&&s.status==='playing') {
   if(event.actorId!==s.humanId||!validId(event.windowId)||!['active-play','off-ball-support'].includes(event.kind)||
    !finite(event.start,0,s.totalPlayed)||!finite(event.end,event.start,s.totalPlayed)||event.end-event.start>5||
    event.end===event.start||event.observable!==true) throw Error('Invalid participation window');
   if(s.participation.some(w=>w.id===event.windowId||(event.start<w.end&&event.end>w.start))) return s;
   if(s.participation.length>=512) {s.capacityWarning=true;s.telemetry='degraded';return s;}
   s.participation.push({id:event.windowId,start:event.start,end:event.end});s.activeSeconds+=event.end-event.start;
 } else if(event.type==='telemetry'&&s.status==='playing') {
   if(!['healthy','degraded'].includes(event.health)) throw Error('Invalid telemetry');
   s.telemetry=s.capacityWarning?'degraded':event.health;
 } else if(event.type==='continue'&&s.status==='reflection') {
   s.round++;s.elapsed=0;s.generation++;
   s.status=s.round===d.rounds?'complete':'ready';
 } else if(event.type==='pause'&&s.status==='playing') {s.status='paused';s.generation++;}
 else if(event.type==='resume'&&s.status==='paused') {s.status='playing';s.generation++;}
 else if(event.type==='abort'&&!['complete','aborted'].includes(s.status)) {s.status='aborted';s.generation++;}
 else throw Error('Illegal training transition');
 if(event.type!=='tick') s.seen=[...s.seen.slice(-255),eventKey];return s;
}

export function completionRequest(state,current) {
 if(state.version!==2||state.status!=='complete'||state.round!==3||
 ['careerId','seasonId','weekId','slotId','sessionId','variantId','layoutKey','rulesProfile','curriculumVersion','scenarioVersion','humanId','practiceId','contentVersion'].some(k=>state[k]!==current[k])) throw Error('Ineligible completion');
 return {entitlementTuple:[state.careerId,state.seasonId,state.weekId,state.slotId],runId:state.runId,
   practiceId:state.practiceId,contentVersion:state.contentVersion,
   attendanceComplete:true,participation:state.activeSeconds>=30?'observed':'insufficient',
   telemetry:state.telemetry,creditEligible:state.activeSeconds>=30&&state.telemetry==='healthy'&&!state.capacityWarning,
   masteryGranted:false,
   evidence:evaluateEvidence(state.events),namespace:'team-training',attributeDelta:null};
}
