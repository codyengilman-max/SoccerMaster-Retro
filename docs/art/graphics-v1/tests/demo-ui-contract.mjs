// Mock DOM event checks only. Not a browser, visual layout or physical device test.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.hidden=false;this.checked=false;this.value='';this.textContent='';const set=new Set();this.classList={toggle:(k,on)=>on?set.add(k):set.delete(k),remove:(...ks)=>ks.forEach(k=>set.delete(k)),contains:k=>set.has(k)};}
 set innerHTML(value){throw new Error('HTML insertion forbidden in demo');}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 emit(type,values={}){const e={preventDefault(){},isPrimary:true,pointerId:1,clientX:10,clientY:10,detail:1,...values};for(const fn of [...this.listeners[type]||[]])fn(e);if(this['on'+type])this['on'+type](e);}
 append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[...items];}
 setAttribute(k,v){this[k]=v;}setPointerCapture(){}getBoundingClientRect(){return {left:0,right:100,top:0,bottom:50};}
}
const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
const doc=new Element();doc.getElementById=get;doc.createElement=tag=>new Element(tag);doc.createTextNode=text=>({textContent:text});doc.querySelectorAll=()=>['hero','jordan','blake'].map(get);doc.hidden=false;
const win=new Element();let interval=0;const forbidden=()=>{throw new Error('Network/storage access forbidden');};
const ctx=vm.createContext({document:doc,window:win,Intl,TextEncoder,matchMedia:()=>({matches:true}),setInterval:()=>++interval,clearInterval(){},fetch:forbidden,localStorage:new Proxy({},{get:forbidden}),sessionStorage:new Proxy({},{get:forbidden}),console});
vm.runInContext(fs.readFileSync(new URL('../code/cutscene-demo-core.js',import.meta.url),'utf8'),ctx);
const html=fs.readFileSync(new URL('../preview/cutscene.html',import.meta.url),'utf8');const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).at(-1);vm.runInContext(script,ctx);
const view=()=>JSON.parse(vm.runInContext('JSON.stringify(session.view())',ctx));
const button=label=>get('actions').children.find(b=>b.textContent===label);
const start=(name='Alex',look='boy')=>{get('name').value=name;get('look').value=look;get('startForm').emit('submit');};
const tap=b=>{assert.ok(b,'button exists');b.emit('pointerdown');b.emit('pointerup');};
let count=0;const check=(yes,message)=>{assert.ok(yes,message);count++;};
start();check(view().kind==='line'&&view().revealed,'instant line revealed');const stale=button('Continue →');tap(stale);check(view().kind==='choice','continue opens choice');
const before=view().revision;stale.emit('pointerup');stale.emit('click',{detail:0});check(view().revision===before,'old pointer/compatibility click cannot choose');
const directions=button('Directions');directions.emit('pointerdown');directions.emit('pointercancel');directions.emit('pointerup');check(view().revision===before,'cancel does not select');
directions.emit('pointerdown');directions.emit('pointerup',{pointerId:2});directions.emit('pointerup');check(view().kind==='line','extra pointer does not steal owner');
const next=button('Continue →');next.emit('keydown',{key:'Enter',repeat:false});next.emit('keydown',{key:'Enter',repeat:true});next.emit('keyup',{key:'Enter'});const after=view().revision;next.emit('click',{detail:0});check(view().revision===after,'held key/compatibility click cannot double advance');
const pending=button('Continue →');pending.emit('pointerdown');win.emit('resize');const resizeRevision=view().revision;pending.emit('pointerup');check(view().revision===resizeRevision,'resize cancels pointer');
const hidden=button('Continue →');hidden.emit('pointerdown');doc.hidden=true;doc.emit('visibilitychange');hidden.emit('pointerup');check(view().revision===resizeRevision,'hidden tab cancels pointer');doc.hidden=false;doc.emit('visibilitychange');
get('restart').emit('click');check(get('setup').hidden===false&&get('transcript').children.length===0,'restart clears run');
start('<b>Alex</b>','girl');tap(button('Continue →'));tap(button('Introduce'));check(get('line').textContent.includes('<b>Alex</b>'),'name rendered as literal text');check(get('hero').src==='../assets/cutscenes/girl.png','allowlisted girl portrait');
const prior=view().revision;get('hero').emit('error');check(view().revision===prior,'image error cannot advance scene');
get('restart').emit('click');start('Alex\n');check(get('setup').hidden===false&&!!get('nameError').textContent,'invalid name has recovery');
console.log(`PASS: ${count} mock DOM input/render checks: stale pointer, multi-touch, cancel, held key, resize, visibility, restart, literal name rendering, image failure and invalid-name recovery.`);
console.log('Layout, Safari event behavior and physical iPhone testing remain NOT RUN.');
