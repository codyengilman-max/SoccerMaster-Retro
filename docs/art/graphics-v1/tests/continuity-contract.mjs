// Tests the disposable visual demo, never production persistence or gameplay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validateName,createSession}=require('../code/cutscene-demo-core.js');
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
for(const name of ['Alex','Jordan',"D’Angelo",'سامي','आरव','Zoë','e\u0301','⚽','<b>Alex</b>'])check(validateName(name).ok,'valid plain-text name: '+name);
check(validateName(' e\u0301 ').name==='é','NFC and trimming');
for(const name of ['',null,0,{},' '.repeat(5),'x'.repeat(25),'x'.repeat(100000),'Alex\n','\tAlex','A\u202eB','A\u2066B','{player.name}','\ud800','\udc00','A'+'\u0301'.repeat(12)])check(!validateName(name).ok,'invalid name rejected');
check(validateName('⚽'.repeat(24)).ok,'24 graphemes');
check(!validateName('⚽'.repeat(25)).ok,'25 graphemes rejected');
for(const look of ['unknown','__proto__',{},null])assert.throws(()=>createSession('Alex',look),RangeError);
const graph=JSON.parse(fs.readFileSync(new URL('../docs/reference/school-scenes-v07.json',import.meta.url))).scenes;
const source=new Map(graph.flatMap(s=>s.nodes.map(n=>[s.id+'/'+n.id,n])));
let paths=0;
for(const appearance of ['boy','girl'])for(const first of ['directions','introduce','quiet'])for(const second of ['accept','equal_attempts','shared_warmup','decline']){
 const s=createSession('Alex',appearance);let iterations=0;
 check(!s.view().text.includes('Alex'),'no knowledge before introduction');
 while(s.view().kind!=='boundary'){
  check(++iterations<30,'terminates');const v=s.view(),n=source.get(v.nodeId);
  check(!!n,'canonical node ID');
  if(v.kind==='line'){
   check(v.text===n.text.replace(/\{player\.name\}/g,'Alex'),'canonical dialogue');
   check(!s.advance(v.revision),'unrevealed line cannot advance');
   check(s.reveal(v.revision),'reveal');check(!s.reveal(v.revision),'duplicate reveal rejected');
   const ready=s.view();check(s.advance(ready.revision),'advance');check(!s.advance(ready.revision),'stale advance rejected');
  }else{
   const id=v.nodeId.startsWith('W1_SCHOOL_01/')?first:second;
   check(!s.choose('__proto__',v.revision),'forged choice rejected');
   check(!s.choose(id,v.revision-1),'stale choice rejected');
   check(s.choose(id,v.revision),'canonical choice');check(!s.choose(id,v.revision),'duplicate choice rejected');
  }
 }
 const history=s.history();
 check(history.some(x=>x.text.includes('Nice to meet'))===(first==='introduce'),'name knowledge follows introduction only');
 check(!history.some(x=>x.text==='Everybody gets one practice shot, then we start.')||second==='shared_warmup','hidden branch absent');
 check(!s.choose('accept',s.view().revision)&&!s.advance(s.view().revision),'handoff boundary cannot launch activity');
 const clone=s.history();clone[0].text='corrupt';check(s.history()[0].text!=='corrupt','history result is isolated');
 check(createSession('Alex',appearance).history().length===0,'new demo clears transcript');paths++;
}
const map=JSON.parse(fs.readFileSync(new URL('../assets/scene-visual-map.json',import.meta.url)));
const sourceIndex=JSON.parse(fs.readFileSync(new URL('../docs/reference/source-index.json',import.meta.url)));
assert.deepEqual(map.scenes.map(s=>s.sceneId),sourceIndex.story.sceneOrder);
check(map.scenes.length===18,'all canonical first-slice scene IDs mapped');
check(!map.scenes.some(s=>s.castRoles.includes('riley')||s.castRoles.includes('sam')),'no invented first-week attendance');
check(map.scenes.find(s=>s.sceneId==='W1_TRAINING_ARRIVAL').castRoles.join(',')==='player,coach,alex','authored training cast');
console.log(`PASS: ${checks} continuity assertions across ${paths} boy/girl school branch paths, Unicode names, stale/duplicate/forged inputs, transcript isolation and the 18-scene reference map.`);
console.log('No production story, save service, browser or physical-device testing is implied.');
