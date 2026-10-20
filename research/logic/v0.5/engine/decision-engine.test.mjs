import test from 'node:test';
import assert from 'node:assert/strict';
import {createDecisionEngine} from './decision-engine.mjs';
import {fixture,mirror} from './fixtures.mjs';
const run=s=>createDecisionEngine().step(s);
test('all nine players receive finite bounded orders without world mutation',()=>{
  const s=fixture(),before=structuredClone(s),r=run(s);
  assert.equal(r.orders.length,9);assert.deepEqual(s,before);
  for(const o of r.orders) assert.ok(o.target.x>=0&&o.target.x<=80&&o.target.y>=0&&o.target.y<=55);
  assert.equal(r.orders.filter(o=>o.task==='rest-defense').length,2);
});
test('human carrier receives no AI commands',()=>{
  const s=fixture();s.teammates[5].human=true;
  assert.ok(run(s).orders.every(o=>o.actorId!=='A5'&&!o.action));
});
test('one presser, one cover, center preserved',()=>{
  const s=fixture();s.ball.ownerId='B5';const o=run(s).orders;
  assert.equal(o.filter(p=>['pressure','block-lane'].includes(p.task)).length,1);
  assert.equal(o.filter(p=>p.task==='cover').length,1);
  assert.ok(o.some(p=>p.task==='protect-center'));
});
test('loose ball is contested, never kicked as controlled',()=>{
  const s=fixture();s.ball.state='contested';const r=run(s);
  assert.equal(r.orders.filter(o=>o.task==='contest-ball').length,1);
  assert.ok(r.orders.every(o=>o.action===null));
});
test('stale ball falls back to shape',()=>{
  const s=fixture();s.time=2;assert.ok(run(s).orders.every(o=>o.task==='hold-shape'&&!o.action));
});
test('mirroring preserves intentions and target geometry',()=>{
  const s=fixture(),a=run(s),b=run(mirror(s));
  a.orders.forEach((o,i)=>{assert.equal(o.task,b.orders[i].task);
    assert.ok(Math.abs(o.target.x+b.orders[i].target.x-80)<1e-9);
    assert.equal(o.target.y,b.orders[i].target.y);});
});
test('roster ordering does not change decisions',()=>{
  const s=fixture(),a=run(s);s.teammates.reverse();assert.deepEqual(run(s),a);
});
test('duplicate ticks emit no duplicate actions; possession loss cancels',()=>{
  const s=fixture();s.ball.pos={x:68,y:27.5};s.teammates[5].pos={...s.ball.pos};s.opponents=[];
  const e=createDecisionEngine(),a=e.step(s);const kick=a.orders.find(o=>o.action).action;
  assert.equal(kick.type,'SHOOT');assert.equal(e.step(s).orders.length,0);
  s.tick++;s.time=.2;s.ball.seenAt=.2;s.possessionGeneration++;s.ball.ownerId='B5';
  const b=e.step(s);assert.ok(b.cancel.includes(kick.id));assert.ok(b.orders.every(o=>!o.action));
});
test('pending kick cannot repeat before executor acknowledgment',()=>{
  const s=fixture();s.ball.pos={x:68,y:27.5};s.teammates[5].pos={...s.ball.pos};s.opponents=[];
  const e=createDecisionEngine();assert.ok(e.step(s).orders.some(o=>o.action));
  s.tick++;s.time=.2;s.ball.seenAt=.2;assert.ok(e.step(s).orders.every(o=>!o.action));
});
test('pause cancels and reset permits a fresh timeline',()=>{
  const s=fixture(),e=createDecisionEngine();e.step(s);s.tick++;s.phase='paused';
  assert.equal(e.step(s).orders.length,0);e.reset();assert.equal(e.step(fixture()).orders.length,9);
});
test('invalid geometry, clocks, roster and options are rejected',()=>{
  assert.throws(()=>createDecisionEngine({length:NaN}));
  const s=fixture();s.teammates[1].pos.x=NaN;assert.throws(()=>run(s));
  assert.throws(()=>run({...fixture(),tick:1.5}));
  assert.throws(()=>run({...fixture(),teammates:[]}));
});
test('hidden state fields cannot influence choices',()=>{
  const s=fixture(),a=run(s);s.hiddenOpponentIntent='shoot';s.futureRng=.999;s.humanUnreleasedAim={x:0,y:0};
  assert.deepEqual(run(s),a);
});
test('open ground pass selected, receiver does not get ball ownership',()=>{
  const s=fixture();s.opponents=[];s.teammates[7].pos={x:55,y:33};
  const r=run(s),kick=r.orders.find(o=>o.actorId==='A5').action;
  assert.equal(kick.type,'PASS');assert.ok(kick.targetId);assert.equal(s.ball.ownerId,'A5');
});
test('ineligible receivers cannot be selected',()=>{
  const s=fixture();s.teammates.forEach(p=>p.passEligible=false);
  assert.ok(run(s).orders.every(o=>!o.action));
});
test('keeper sweeps loose safe ball; distributes controlled ball',()=>{
  const s=fixture();s.ball={pos:{x:5,y:27.5},state:'traveling',seenAt:0};s.opponents=[];
  assert.equal(run(s).orders.find(o=>o.actorId==='A0').task,'goalkeeper-sweep');
  s.ball.state='controlled';s.ball.ownerId='A0';
  assert.equal(run(s).orders.find(o=>o.actorId==='A0').action.type,'PASS');
});
test('two team instances support eighteen NPCs',()=>{
  const a=fixture(),b=mirror(fixture());b.teammates.forEach(p=>p.id=p.id.replace('A','B'));
  b.ball.ownerId='A5';assert.equal(run(a).orders.length+run(b).orders.length,18);
});
test('friendly flight preserves support and assigns receiver without a kick',()=>{
  const s=fixture();s.ball={pos:{x:45,y:33},state:'traveling',seenAt:0,fromId:'A5',receiverId:'A7',receivePoint:{x:57,y:29}};
  const r=run(s);assert.equal(r.orders.find(o=>o.actorId==='A7').task,'receive-pass');
  assert.deepEqual(r.orders.find(o=>o.actorId==='A7').target,{x:57,y:29});
  assert.ok(r.orders.every(o=>!o.action));assert.equal(r.orders.filter(o=>o.task==='rest-defense').length,2);
});
