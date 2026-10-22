import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,families} from './catalog.mjs';
import {selectPractice,assignParticipants,evaluateEvidence,recommendNext,createRun,reduceRun,completionRequest} from './engine.mjs';
import {testContext as context} from './test-fixtures.mjs';
const selection={focus:'switch',role:'LW',level:1,availablePlayers:18,availableKeepers:2,capabilities:catalog.map(d=>d.id)};
const players=Array.from({length:18},(_,i)=>({id:`p${i}`,keeper:i>=16,role:i>=16?'GK':'LW'}));
const ev=(s,type,extra={})=>({id:`${type}-${s.round}-${s.elapsed}-${s.seen.length}`,runId:s.runId,generation:s.generation,type,...extra});
test('24 unique original practice cards, eight families, three levels',()=>{
 assert.equal(catalog.length,24);assert.equal(new Set(catalog.map(d=>d.id)).size,24);
 for(const f of Object.keys(families)) assert.deepEqual(catalog.filter(d=>d.family===f).map(d=>d.level),[1,2,3]);
 for(const d of catalog) {const p=d.participants;assert.equal(p.total,p.outfieldA+p.outfieldB+p.neutrals+p.gkA+p.gkB);assert.ok(d.pitch.length>0&&d.pitch.width>0);}
});
test('unimplemented drills are unavailable by default',()=>{
 assert.equal(selectPractice({...selection,capabilities:[]}).status,'unavailable');
 assert.equal(selectPractice(selection).practice.id,'S1');
});
test('selection preserves focus and role rather than silently substituting',()=>{
 assert.equal(selectPractice({...selection,role:'GK'}).status,'unavailable');
 assert.equal(selectPractice({...selection,availablePlayers:4}).status,'unavailable');
});
test('every listed role/level can select with sufficient roster and explicit capability',()=>{
 for(const d of catalog) for(const role of d.roles) assert.equal(selectPractice({...selection,role,focus:d.family,level:d.level}).status,'selected');
});
test('assignments contain exact actors and no phantom nine-player padding',()=>{
 const r=assignParticipants(catalog.find(d=>d.id==='S1'),players,'p0');
 assert.equal(r.slots.length,6);assert.equal(r.bench.length,12);assert.equal(new Set(r.slots.map(s=>s.playerId)).size,6);
 assert.ok(r.slots.some(s=>s.playerId==='p0'));
});
test('keeper career stays keeper and present',()=>{
 const d=catalog.find(d=>d.id==='K1');const r=assignParticipants(d,players,'p16');
 assert.equal(r.slots.find(s=>s.playerId==='p16').slot,'GK_A');
});
test('symmetric rounds change human team without changing character',()=>{
 const d=catalog.find(d=>d.id==='S1');
 assert.equal(assignParticipants(d,players,'p0',0).slots.find(s=>s.playerId==='p0').slot,'A');
 assert.equal(assignParticipants(d,players,'p0',1).slots.find(s=>s.playerId==='p0').slot,'B');
});
test('evidence counts opportunities, separates execution and ignores goals',()=>{
 const rows=Array.from({length:5},(_,i)=>({id:`e${i}`,actorId:'p0',opportunityId:`o${i}`,dimension:'decision',quality:.8,observable:true,eligible:true}));
 const a=evaluateEvidence(rows);assert.equal(a.p0.decision.score,.8);
 assert.deepEqual(evaluateEvidence([...rows,...rows.map(r=>({...r,id:r.id+'retry',goals:50}))]),a);
 assert.equal(evaluateEvidence([{...rows[0],dimension:'execution',quality:0},...rows]).p0.execution.score,null);
});
test('insufficient and unseen evidence cannot create mastery',()=>{
 assert.deepEqual(evaluateEvidence([{id:'e',actorId:'p',opportunityId:'o',observable:false}]),{});
 assert.equal(recommendNext({level:1,score:null,opportunities:0,successfulSessions:99,load:0}).level,1);
});
test('special actor IDs do not mutate object prototypes',()=>{
 const e={id:'e',actorId:'__proto__',opportunityId:'o',dimension:'defense',quality:1,observable:true,eligible:true};
 assert.equal(evaluateEvidence([e]).__proto__.defense.opportunities,1);
 assert.equal({}.defense,undefined);
});
test('adapt only after repeated success; load takes precedence',()=>{
 const a={level:1,score:.9,opportunities:8,successfulSessions:2,load:.2};
 assert.equal(recommendNext(a).proposedLevel,2);assert.equal(recommendNext({...a,load:.9}).change,'reduce-bout-duration');
 assert.equal(recommendNext({...a,successfulSessions:1}).level,1);
});
test('duplicate simulation tick cannot advance time twice',()=>{
 let s=createRun(context);s=reduceRun(s,ev(s,'start'));const e=ev(s,'tick',{tick:1,dt:.1});
 s=reduceRun(s,e);assert.deepEqual(reduceRun(s,{...e,id:'different'}),s);
 assert.equal(s.elapsed,.1);assert.equal(s.seen.length,1);
});
test('paused time cannot progress and stale generation is rejected',()=>{
 let s=createRun(context);s=reduceRun(s,ev(s,'start'));s=reduceRun(s,ev(s,'pause'));
 assert.throws(()=>reduceRun(s,ev(s,'tick',{tick:1,dt:.1})));
 assert.throws(()=>reduceRun(s,{...ev(s,'resume'),generation:99}));
});
test('full run completes with bounded state and no attribute mutation',()=>{
 let s=createRun(context),tick=0;
 for(let round=0;round<3;round++) {
   s=reduceRun(s,ev(s,'start'));
   while(s.status==='playing') s=reduceRun(s,ev(s,'tick',{tick:tick++,dt:.25}));
   s=reduceRun(s,ev(s,'continue'));
 }
 assert.equal(s.status,'complete');assert.equal(s.seen.length,6);
 const r=completionRequest(s,context);assert.equal(r.attributeDelta,null);
 assert.deepEqual(r.entitlementTuple,['career',1,'S1-W02','A']);
 assert.throws(()=>completionRequest(s,{...context,weekId:'6'}));
});
test('abort does not qualify for weekly completion',()=>{
 const s=reduceRun(createRun(context),ev(createRun(context),'abort'));
 assert.throws(()=>completionRequest(s,context));
});
test('invalid values and duplicated roster are rejected',()=>{
 assert.throws(()=>selectPractice({...selection,level:NaN}));
 assert.throws(()=>assignParticipants(catalog[0],[players[0],players[0]],'p0'));
 assert.throws(()=>evaluateEvidence([{id:'e',actorId:'p',opportunityId:'o',observable:true,eligible:true,dimension:'decision',quality:Infinity}]));
});
