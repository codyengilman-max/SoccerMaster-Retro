import test from 'node:test';
import assert from 'node:assert/strict';
import {sessions,planSession,validateCurriculum,scenarioDefinition,createScheduledRun} from './seasons.mjs';
import {catalog} from './catalog.mjs';
import {roster} from './test-fixtures.mjs';
function plan(sessionId,role,level=1,approvals) {
 const players=structuredClone(roster),humanId=role==='GK'?'p16':'p0';players.find(p=>p.id===humanId).role=role;
 const d=scenarioDefinition(sessionId,role,Math.min(level,sessions.find(s=>s.id===sessionId).maxLevel),'youth');
 return planSession({sessionId,role,earnedLevel:level,players,humanId,rulesProfile:'youth',practiceCapabilities:catalog.map(d=>d.id),scenarioCapabilities:approvals??[{key:d.key,verified:true,definition:d}]});
}
test('two complete seasons have exactly eighteen weeks and three slots each',()=>{
 assert.equal(validateCurriculum().scheduledSessions,108);
 for(let season=1;season<=2;season++) for(let week=1;week<=18;week++) assert.deepEqual(sessions.filter(s=>s.season===season&&s.week===week).map(s=>s.slot),['A','B','C']);
 assert.equal(new Set(sessions.map(s=>s.scenario)).size,108);
});
test('every supported role and level selects AND assigns exact actors with a present human',()=>{
 for(const s of sessions) for(const role of Object.keys(s.roleRoutes)) for(let level=1;level<=s.maxLevel;level++) {
  const p=plan(s.id,role,level);assert.equal(p.status,'selected');assert.equal(p.actors.length,p.practice.participants.total);
  assert.equal(new Set(p.actors.map(a=>a.playerId)).size,p.actors.length);
  const h=p.actors.find(a=>a.playerId===p.humanId);assert.ok(h.human);assert.equal(h.side.startsWith('GK'),role==='GK');
  for(const a of p.actors) assert.ok(a.x>=0&&a.x<=1&&a.y>=0&&a.y<=1);
  if(['W2','F2'].includes(p.practice.id)) assert.ok(p.definition.targets.filter(t=>t.scoresFor==='B').every(t=>t.type==='mini-goal'));
  assert.ok(p.actors.some(a=>a.slot===p.definition.ball.ownerSlot));
 }
});
test('base card availability cannot enable an unapproved scenario',()=>{assert.equal(plan('S1-W01-A','GK',1,[]).status,'unavailable');});
test('level-one capability does not authorize level three or changed layouts',()=>{
 const d=scenarioDefinition('S2-W04-B','RW',1,'youth');
 assert.equal(plan('S2-W04-B','RW',3,[{key:d.key,verified:true,definition:d}]).status,'unavailable');
 const changed=structuredClone(d);changed.actors[0].x=.9;
 assert.equal(plan('S2-W04-B','RW',1,[{key:d.key,verified:true,definition:changed}]).status,'unavailable');
});
test('season two does not grant unearned levels',()=>{assert.equal(plan('S2-W18-A','GK').level,1);});
test('scheduled factory binds both seasons and rejects a tampered practice',()=>{
 const p1=plan('S1-W01-A','GK'),p2=plan('S2-W01-A','GK');
 const a=createScheduledRun({plan:p1,careerId:'c',runId:'a',seed:1}),b=createScheduledRun({plan:p2,careerId:'c',runId:'b',seed:1});
 assert.notEqual(a.weekId,b.weekId);assert.notEqual(a.seasonId,b.seasonId);
 p1.practice.id='S1';assert.throws(()=>createScheduledRun({plan:p1,careerId:'c',runId:'c',seed:1}));
});
test('goalkeeper transitions use GK slots and keeper-specific feedback',()=>{
 for(const level of [1,2,3]) {const p=plan('S2-W18-B','GK',level);assert.equal(p.route.family,'keeper');assert.ok(p.actors.find(a=>a.human).side.startsWith('GK'));assert.match(p.session.coachQuestion,/Protect the goal/);}
});
test('complementary defender gets defensive instructions',()=>{
 const p=plan('S2-W18-C','CB');assert.equal(p.route.family,'defend');assert.match(p.session.objective,/Delay or regain/);assert.match(p.session.scenario,/CB:/);
});
test('overload places human ahead of recovering cover against two attackers',()=>{
 for(const id of ['S1-W12-B','S2-W07-A','S2-W12-B']) for(const level of [1,2,3]) {
  const p=plan(id,'CB',level),h=p.actors.find(a=>a.human);assert.equal(h.task,'delay-two-attackers');assert.equal(h.side,'B');
  const attackers=p.actors.filter(a=>a.side==='A');assert.ok(attackers.slice(0,2).every(a=>a.x<h.x));
  assert.ok(p.actors.filter(a=>a.side==='B'&&!a.human).every(a=>a.task==='recover-goalside'&&a.x<attackers[0].x));
 }
});
