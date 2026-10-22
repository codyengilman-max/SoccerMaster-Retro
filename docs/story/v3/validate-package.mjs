import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url);
const read=name=>readFile(new URL(name,base),'utf8');
const r=JSON.parse(await read('SEASON_RULES_V3.json'));
const f=JSON.parse(await read('WEEK_05_FLOW.json'));
const script=await read(f.script);
assert.deepEqual(r.schoolStoryWeeks,[5,7,9,11,13,15,17]);
assert.deepEqual(r.preserveApprovedWeeks,[1,2,3,4]);
assert.equal(r.competitions.leagueWeeks.length,12);
assert.equal(new Set(r.competitions.leagueWeeks).size,12);
assert.equal(r.competitions.leagueWeeks.indexOf(5)+1,3);
assert.deepEqual(r.competitions.tournaments.map(t=>t.week),[9,12]);
assert.equal(r.home.required,true);assert.equal(r.teamTraining.required,true);
assert.equal(r.home.cloudy.required,false);assert.equal(r.home.cloudy.skipBothAllowed,true);
assert.equal(r.home.cloudy.missingAdapterBlocksWeek,false);
assert.equal(r.attributes.conversationChoicesAward,false);
assert.equal(r.attributes.duplicateReceiptsAwardAgain,false);
assert.equal(f.runtimeSchema,false);
assert.equal(new Set(f.orderedBeats.map(b=>b.id)).size,f.orderedBeats.length);
for(const b of f.orderedBeats){assert.ok(script.includes('## '+b.section),b.section);if(b.next&&b.next!=='week-complete')assert.ok(f.orderedBeats.some(x=>x.id===b.next));}
const hub=f.orderedBeats.find(b=>b.type==='navigation-hub');
assert.equal(hub.actions.find(a=>a.id==='continue-week').requires,r.home.continueGate);
for(const id of ['cloudy-feed-play','cloudy-talk']){const a=hub.actions.find(a=>a.id===id);assert.equal(a.required,false);assert.equal(a.returnsTo,hub.id);}
assert.equal(f.orderedBeats.find(b=>b.id==='w05.match').activity,'league-03');
assert.ok(script.includes('It was a screenshot.'));assert.ok(script.includes('I drew him a play button. Trying to help.'));
assert.ok(!script.includes('Sam’s backpack'));assert.ok(!script.includes('pass to Alex'));
const files={};
for(const name of (await readdir(base)).sort())if(!['MANIFEST.json'].includes(name)){const bytes=await readFile(new URL(name,base));files[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
if(process.argv.includes('--manifest'))await writeFile(new URL('MANIFEST.json',base),JSON.stringify({version:'3.0.0',kind:'content-and-integration-handoff',files},null,2)+'\n');
else{const m=JSON.parse(await read('MANIFEST.json'));assert.deepEqual(m.files,files,'Files differ from delivered manifest');}
console.log('PASS: V3 cadence, Week Five routing, home/Cloudy rules, competition counts, approved school lines and package integrity.');
console.log('This validates the handoff only; live app integration is not tested here.');
