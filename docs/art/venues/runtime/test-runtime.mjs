import assert from 'node:assert/strict';
import {buildGroundMesh,SidelineReactions} from './venue-runtime.mjs';
for(const project of [(x,y)=>({x:x*26.4,y:y*13.2}),(x,y)=>({x:y*17,y:(75-x)*17})]){
 const m=buildGroundMesh(project);
 assert.equal(m.vertices.length,315);assert.equal(m.indices.length,1680);
 assert.deepEqual(m.vertices[0],{...project(0,0),u:0,v:0});
 assert.deepEqual(m.vertices.at(-1),{...project(75,50),u:1,v:1});
 assert(m.indices.every(i=>i>=0&&i<m.vertices.length));
}
const r=new SidelineReactions();const actors=[{id:'home',team:'h',clips:{cheer:1}},{id:'away',team:'a',clips:{disappointed:1}}];
r.onEvent({id:'goal1',type:'goal',team:'h'},actors,0);r.onEvent({id:'goal1',type:'goal',team:'h'},actors,0);
assert.equal(r.queue.length,2);const events=[];r.update(1000,(a,s)=>events.push([a.id,s]));
assert.deepEqual(events,[['home','cheer'],['away','disappointed']]);assert.equal(r.queue.length,0);
console.log('PASS: mesh coverage/orientation/index bounds and event deduplication/team reactions');
