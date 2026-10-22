import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,reduceRun,completionRequest,selectPractice,recommendNext} from './engine.mjs';
import {testContext as ctx} from './test-fixtures.mjs';
const ev=(s,type,id,extra={})=>({type,id,runId:s.runId,generation:s.generation,...extra});
const evidence={id:'e',actorId:'p0',opportunityId:'o',dimension:'support',quality:1,observable:true,eligible:true};
function finish(input,active=false) {
 let s=createRun(input),tick=0;
 for(let r=0;r<3;r++) {
  s=reduceRun(s,ev(s,'start',`s${r}`));s=reduceRun(s,ev(s,'telemetry',`health${r}`,{health:'healthy'}));
  while(s.status==='playing') {
   s=reduceRun(s,ev(s,'tick',`t${tick}`,{tick:tick++,dt:.25}));
   if(active&&s.status==='playing'&&s.totalPlayed%5===0) s=reduceRun(s,ev(s,'participation',`p${tick}`,{actorId:'p0',windowId:`w${tick}`,kind:'off-ball-support',start:s.totalPlayed-5,end:s.totalPlayed,observable:true}));
  }
  s=reduceRun(s,ev(s,'continue',`c${r}`));
 }return s;
}
test('bare week and missing season cannot create a scheduled run',()=>{assert.throws(()=>createRun({...ctx,weekId:'4'}));assert.throws(()=>createRun({...ctx,seasonId:undefined}));});
test('completed same-number weeks in two seasons never share entitlement',()=>{
 const c2={...ctx,seasonId:2,weekId:'S2-W02',sessionId:'S2-W02-A',variantId:'S2-W02-A-LW'};
 const a=finish(ctx),b=finish(c2);assert.notDeepEqual(completionRequest(a,ctx).entitlementTuple,completionRequest(b,c2).entitlementTuple);
 assert.throws(()=>completionRequest(a,{...ctx,variantId:'wrong'}));assert.throws(()=>completionRequest(a,{...ctx,rulesProfile:'other'}));
});
test('pause/resume rejects prior queued evidence and ticks',()=>{
 let s=createRun(ctx);s=reduceRun(s,ev(s,'start','s'));
 const stale=ev(s,'evidence','late',{evidence}),tick=ev(s,'tick','late-t',{tick:1,dt:.25});
 s=reduceRun(s,ev(s,'pause','p'));s=reduceRun(s,ev(s,'resume','r'));assert.throws(()=>reduceRun(s,stale));assert.throws(()=>reduceRun(s,tick));
});
test('ten thousand repeated opportunities stay bounded and abort works',()=>{
 let s=createRun(ctx);s=reduceRun(s,ev(s,'start','s'));
 for(let i=0;i<10000;i++) s=reduceRun(s,ev(s,'evidence',`e${i}`,{evidence}));
 assert.equal(s.events.length,1);assert.ok(s.seen.length<=2);assert.equal(reduceRun(s,ev(s,'abort','a')).status,'aborted');
});
test('unique evidence capacity degrades telemetry but allows recovery',()=>{
 let s=createRun(ctx);s=reduceRun(s,ev(s,'start','s'));
 for(let i=0;i<520;i++) s=reduceRun(s,ev(s,'evidence',`e${i}`,{evidence:{...evidence,id:`e${i}`,opportunityId:`o${i}`}}));
 assert.equal(s.events.length,512);assert.equal(s.telemetry,'degraded');s=reduceRun(s,ev(s,'pause','p'));assert.equal(reduceRun(s,ev(s,'abort','a')).status,'aborted');
});
test('actual roster shortage is rejected before assignment',()=>{
 const players=[...ctx.players.slice(0,4),...ctx.players.slice(16)];assert.equal(selectPractice({focus:'switch',role:'LW',level:1,players,humanId:'p0',capabilities:['S1']}).status,'unavailable');
});
test('regression is task-specific and format promotion requires review',()=>{
 const c={level:1,score:.2,opportunities:8,successfulSessions:2,load:.1};
 assert.equal(recommendNext({...c,task:'defend'}).change,'reduce-target-width-10-percent');assert.equal(recommendNext({...c,task:'attack'}).change,'increase-width-10-percent');assert.equal(recommendNext({...c,task:'keeper'}).change,'increase-attacker-start-distance-10-percent');assert.equal(recommendNext({...c,score:.9}).level,1);
});
test('idle completion cannot qualify; observed off-ball play can',()=>{
 assert.equal(completionRequest(finish(ctx),ctx).creditEligible,false);const active=completionRequest(finish(ctx,true),ctx);
 assert.equal(active.creditEligible,true);assert.equal(active.masteryGranted,false);assert.deepEqual(active.evidence,{});
});
test('participation cannot overlap or name another actor',()=>{
 let s=createRun(ctx);s=reduceRun(s,ev(s,'start','s'));for(let tick=0;tick<20;tick++) s=reduceRun(s,ev(s,'tick',`t${tick}`,{tick,dt:.25}));
 const p={actorId:'p0',windowId:'w',kind:'active-play',start:0,end:5,observable:true};
 s=reduceRun(s,ev(s,'participation','p',p));s=reduceRun(s,ev(s,'participation','p2',{...p,windowId:'other'}));assert.equal(s.activeSeconds,5);
 assert.throws(()=>reduceRun(s,ev(s,'participation','bad',{...p,actorId:'outsider'})));
});
test('evidence cannot name an actor outside the bound roster',()=>{
 let s=createRun(ctx);s=reduceRun(s,ev(s,'start','s'));assert.throws(()=>reduceRun(s,ev(s,'evidence','bad',{evidence:{...evidence,actorId:'outsider'}})));
});
test('old saves rejected and shorter configured bouts run correctly',()=>{
 assert.throws(()=>reduceRun({...createRun(ctx),version:1},{id:'a'}));assert.equal(finish({...ctx,boutSeconds:30}).totalPlayed,90);
});
