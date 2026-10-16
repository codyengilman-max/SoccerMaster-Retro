// Browser-only procedural visual reference, extracted from owner-approved Sprite Lab.
// No physics, controls, save writes, networking or Phaser dependency.
// Original art: cached Canvas2D drawing, not an imagegen sprite sheet.
export const SPRITE_FRAME = Object.freeze({width:96,height:96,anchorX:48,anchorY:68,displayWidth:144,displayHeight:158.4});
export const HAIR_STYLES = Object.freeze(['short','curly','afro','mohawk','long','ponytail','shaggy']);
export const HAIR_COLORS = Object.freeze(['#211d25','#65402c','#b04d2f','#e6b94f','#f6df99']);
function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()}
function stroke(g,points,color,width){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()}
const atlas=new Map();
export function sprite(team,dir,frame,kind='run',girl=false,hairIndex=0,hairStyle=0){
if (![team,dir,frame,hairIndex,hairStyle].every(Number.isInteger) || team<0 || team>2 || dir<0 || dir>7 || frame<0 || frame>5 || hairIndex<0 || hairIndex>4 || hairStyle<0 || hairStyle>6 || typeof girl!=='boolean' || !['run','idle','kick','slide','dive'].includes(kind)) throw new RangeError('Unsupported cosmetic sprite parameters');
const key=[team,dir,frame,kind,girl,hairIndex,hairStyle].join('/');if(atlas.has(key))return atlas.get(key);const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');
const a=dir*Math.PI/4,dx=Math.cos(a),dy=Math.sin(a),s=Math.sin(frame/6*Math.PI*2),kit=team===0?'#ed813d':team===1?'#233f59':'#69ac91',skin='#e9bc94';
g.save();g.translate(48,68);if(kind==='slide'||kind==='dive'){g.rotate((dx<0?-1:1)*1.05);g.translate(0,8)}
let step=kind==='run'?s*5:0,foot=kind==='kick'?10:0;
stroke(g,[[-5,-13],[-5+dx*step,-6],[-5+dx*(step+foot),0+dy*step]],'#152b3e',7);
stroke(g,[[5,-13],[5-dx*step,-6],[5-dx*step,0-dy*step]],'#152b3e',7);
stroke(g,[[-5+dx*step,-5],[-5+dx*(step+foot),dy*step]],kit,4);stroke(g,[[5-dx*step,-5],[5-dx*step,-dy*step]],kit,4);
ellipse(g,-4+dx*(step+foot),1+dy*step,4,2,'#142332');ellipse(g,6-dx*step,1-dy*step,4,2,'#142332');
stroke(g,[[-9,-28],[-13-dx*step,-22],[-13-dx*step,-17]],skin,4);stroke(g,[[9,-28],[13+dx*step,-22],[13+dx*step,-17]],skin,4);
g.fillStyle='#102e42';g.fillRect(-8,-17,16,7);g.fillStyle=kit;g.beginPath();g.moveTo(-8,-33);g.lineTo(8,-33);g.lineTo(11,-18);g.lineTo(-11,-18);g.closePath();g.fill();
stroke(g,[[-8,-31],[-10,-25]],'#f6e5bd',2);stroke(g,[[8,-31],[10,-25]],'#f6e5bd',2);stroke(g,[[-3,-32],[0,-29],[3,-32]],'#f6e5bd',2);
stroke(g,[[6,-28],[8,-20]],team===0?'#ba582c':'#172e43',2);stroke(g,[[-5,-28],[-4,-23]],team===0?'#ffa75f':'#47647d',2);g.fillStyle='#f5e8cc';g.font='bold 8px sans-serif';g.textAlign='center';g.fillText(team===0?'10':team===1?'6':'1',0,-20);
stroke(g,[[0,-34],[0,-31]],skin,4);ellipse(g,dx*1.5,-39,6.2,7.3,skin);const hairColors=['#211d25','#65402c','#b04d2f','#e6b94f','#f6df99'];const hc=girl?'#f6df99':hairColors[hairIndex%5];const hs=girl?5:hairStyle;
if(hs===0){ellipse(g,dx,-44,7.5,4.5,hc)}
if(hs===1){for(let h=0;h<7;h++)ellipse(g,dx-7+h*2.4,-44-Math.sin(h/6*Math.PI)*3,3.3,3.5,hc)}
if(hs===2){ellipse(g,dx,-42,11,9,hc);for(let h=0;h<9;h++){const ha=Math.PI+h/8*Math.PI;ellipse(g,dx+Math.cos(ha)*9,-41+Math.sin(ha)*8,3,3,hc)}ellipse(g,dx*2,-37,4.5,3.8,skin)}
if(hs===3){ellipse(g,dx,-44,6.5,3,hc);g.fillStyle=hc;g.beginPath();g.moveTo(dx-2,-44);g.lineTo(dx-3,-50);g.lineTo(dx+1,-51);g.lineTo(dx+4,-49);g.lineTo(dx+3,-41);g.fill()}
if(hs===4){ellipse(g,dx,-43,8,5,hc);stroke(g,[[-7,-42],[-9,-34],[-7+Math.sin(frame)*2,-23]],hc,5);stroke(g,[[7,-42],[9,-34],[7+Math.sin(frame)*2,-23]],hc,5)}
if(hs===5){ellipse(g,dx,-43,8,5,hc);stroke(g,[[-dx*6,-42],[-dx*11,-35],[-dx*10+Math.sin(frame)*3,-23]],hc,6);ellipse(g,-dx*8,-39,2,2,'#f38756')}
if(hs===6){ellipse(g,dx,-44,9,6,hc);stroke(g,[[-7,-43],[-9,-36]],hc,4);stroke(g,[[7,-43],[9,-37]],hc,4)}
if(dy>=0){g.fillStyle='#22333c';g.fillRect(dx*3-2,-39,1.4,1.4);g.fillRect(dx*3+2,-39,1.4,1.4)}g.restore();if(atlas.size>=512)atlas.delete(atlas.keys().next().value);atlas.set(key,c);return c}

export function clearSpriteCache(){atlas.clear()}
