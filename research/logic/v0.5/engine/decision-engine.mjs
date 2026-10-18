// SoccerMaster v0.5. Tactical intentions only; the host owns all physics.
const roles = { GK: [.06,.5], LB: [.28,.18], CB: [.23,.5], RB: [.28,.82],
  '6': [.42,.40], '8': [.52,.60], LW: [.68,.12], '9': [.73,.5], RW: [.68,.88] };
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const order = (a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
function laneDistance(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1),0,1);
  return dist(p,{x:a.x+t*dx,y:a.y+t*dy});
}

/** One instance per team. Input is a delivered team observation, never world state. */
export function createDecisionEngine(options={}) {
  const cfg={length:80,width:55,interval:.15,maxAge:.6,expiry:.35,...options};
  for (const k of ['length','width','interval','maxAge','expiry'])
    if (!Number.isFinite(cfg[k]) || cfg[k]<=0) throw new Error(`Invalid ${k}`);
  let lastTick=-1,lastTime=-1,lastDecision=-Infinity,epoch=0,lastKey='',leader=null;
  let sequence=0;
  const pending=new Map();
  const bounded=p=>({x:clamp(p.x,0,cfg.length),y:clamp(p.y,0,cfg.width)});
  function reset() {
    lastTick=-1;lastTime=-1;lastDecision=-Infinity;lastKey='';leader=null;
    pending.clear();epoch++;
  }
  function step(s) {
    if (!Number.isInteger(s.tick)||s.tick<0||!Number.isFinite(s.time)||s.time<0)
      throw new Error('Invalid simulation clock');
    if (s.tick<lastTick || s.time<lastTime) throw new Error('Clock rewind requires reset');
    if (s.tick===lastTick) return {orders:[],cancel:[],duplicate:true};
    if (![1,-1].includes(s.direction)) throw new Error('direction must be 1 or -1');
    if (!['live','paused','stoppage'].includes(s.phase)) throw new Error('Invalid phase');
    if (!Number.isInteger(s.possessionGeneration)||!Number.isInteger(s.controlGeneration))
      throw new Error('Generation counters required');
    const team=[...s.teammates].sort(order), ids=new Set();
    if (team.length!==9) throw new Error('Exactly nine teammates required');
    for(const p of team) {
      if(typeof p.id!=='string'||ids.has(p.id)||!roles[p.role]||!point(p.pos)||
        !Number.isFinite(p.speed)||p.speed<=0||typeof p.human!=='boolean')
        throw new Error('Invalid teammate');
      ids.add(p.id);
    }
    if(team.filter(p=>p.role==='GK').length!==1) throw new Error('One goalkeeper required');
    const fresh=t=>Number.isFinite(t)&&s.time>=t&&s.time-t<=cfg.maxAge;
    const opponents=(s.opponents??[]).filter(p=>point(p.pos)&&fresh(p.seenAt));
    const ball=s.ball&&point(s.ball.pos)&&fresh(s.ball.seenAt)?s.ball:null;
    if(ball&&!['controlled','traveling','contested','dead'].includes(ball.state))
      throw new Error('Invalid ball state');
    const owner=ball?.state==='controlled'?ball.ownerId:null;
    const carrier=team.find(p=>p.id===owner);
    const ownFlight=ball?.state==='traveling'&&team.some(p=>p.id===ball.fromId);
    const mode=carrier||ownFlight?'attack':owner?'defend':'loose';
    const key=JSON.stringify([s.phase,s.direction,s.possessionGeneration,s.controlGeneration,mode,owner]);
    const changed=key!==lastKey;
    const cancel=[];
    if(changed) {for(const id of pending.values()) cancel.push(id);pending.clear();leader=null;epoch++;}
    for(const id of s.completedCommands??[]) for(const [actor,cmd] of pending)
      if(cmd===id) pending.delete(actor);
    lastTick=s.tick;lastTime=s.time;
    const previousMode=lastKey?JSON.parse(lastKey)[4]:null;
    lastKey=key;
    if(s.phase!=='live') return {orders:[],cancel,epoch};
    if(!changed&&s.time-lastDecision<cfg.interval) return {orders:[],cancel,epoch};
    lastDecision=s.time;
    const dir=s.direction;
    const forward=x=>dir===1?x:cfg.length-x;
    const world=(x,y)=>bounded({x:forward(x),y});
    const ownGoal=world(0,cfg.width/2),goal=world(cfg.length,cfg.width/2);
    const bx=ball?forward(ball.pos.x):cfg.length/2;
    const by=ball?.pos.y??cfg.width/2;
    const phase=previousMode==='attack'&&mode!=='attack'?'loss':
      previousMode&&previousMode!=='attack'&&mode==='attack'?'gain':mode;
    const npc=team.filter(p=>!p.human);
    const home=p=>{
      const [x,y]=roles[p.role];
      const shift=ball?clamp((bx/cfg.length-.5)*.24,-.12,.12):0;
      return world((x+(mode==='attack'?.06:-.08)+shift)*cfg.length,
        y*cfg.width+(by-cfg.width/2)*.12);
    };
    const arrival=p=>dist(p.pos,ball.pos)/p.speed+
      (forward(p.pos.x)>bx? .5:0)+(p.role==='CB'?.65:0)+(p.role==='6'?.3:0);
    let presser=null,cover=null;
    if(ball&&mode!=='attack'&&ball.state!=='dead') {
      const candidates=npc.filter(p=>p.role!=='GK').sort((a,b)=>arrival(a)-arrival(b)||order(a,b));
      presser=candidates[0];
      const incumbent=candidates.find(p=>p.id===leader);
      if(incumbent&&arrival(incumbent)<=arrival(presser)+.25) presser=incumbent;
      leader=presser?.id;
      cover=candidates.filter(p=>p.id!==leader).sort((a,b)=>
        dist(a.pos,ownGoal)-dist(b.pos,ownGoal)||order(a,b))[0];
    }
    const orders=[];
    const reserve=[];
    for(const p of npc) {
      let target=home(p),task='recover-shape',action=null;
      if(!ball || ball.state==='dead') {task='hold-shape';}
      else if(p.role==='GK'&&p.id!==owner) {
        task='goalkeeper-set';
        target=world(clamp(bx*.10,2,8),cfg.width/2+(by-cfg.width/2)*.2);
        const nearestOpponent=Math.min(Infinity,...opponents.map(o=>dist(o.pos,ball.pos)));
        if(mode==='loose'&&bx<12&&Math.abs(by-cfg.width/2)<12&&
          dist(p.pos,ball.pos)+3<nearestOpponent) {task='goalkeeper-sweep';target=ball.pos;}
      } else if(p.id===owner) {
        task=p.role==='GK'?'goalkeeper-distribute':'carry';
        target=world(bx+5,by);
        const pressure=Math.min(Infinity,...opponents.map(o=>dist(o.pos,p.pos)));
        const candidates=team.filter(t=>t.id!==p.id&&t.passEligible===true).map(t=>{
          const gap=Math.min(10,...opponents.map(o=>laneDistance(o.pos,p.pos,t.pos)));
          const progress=forward(t.pos.x)-bx;
          return {t,score:progress*.10+gap*.6-dist(p.pos,t.pos)*.035,
            gap,d:dist(p.pos,t.pos)};
        }).filter(c=>c.d>2&&c.d<30&&c.gap>1.5)
          .sort((a,b)=>b.score-a.score||order(a.t,b.t));
        const shooting=p.role!=='GK'&&dist(p.pos,goal)<20&&
          Math.abs(p.pos.y-cfg.width/2)<12&&pressure>1.2;
        if(p.ready===true&&!pending.has(p.id)) {
          if(shooting) action={type:'SHOOT',aim:goal,power:.7};
          else if(candidates.length&&(pressure<5||candidates[0].score>2||p.role==='GK')) {
            const t=candidates[0].t;
            action={type:'PASS',targetId:t.id,aim:{...t.pos},power:.25};
          }
        }
        if(pressure<2&&!action) {task='secure-ball';target=world(bx-2,by);}
      } else if(mode==='attack') {
        task='support';
        if(p.role==='CB'||p.role==='6') {task='rest-defense';target=world(Math.min(bx-9,p.role==='CB'?24:34),p.role==='CB'?cfg.width/2:cfg.width*.42);}
        else if(p.role==='LW'||p.role==='RW') {
          task='provide-width';target=world(Math.max(bx+7,cfg.length*.64),cfg.width*(p.role==='LW'?.12:.88));
        } else if(p.role==='9') {task='offer-depth';target=world(bx+12,cfg.width/2);}
        else if(p.role==='8') {task='support-triangle';target=world(bx-3,by<cfg.width/2?by+10:by-10);}
        else {task='support-behind-wing';target=world(bx-8,cfg.width*(p.role==='LB'?.23:.77));}
        // Host supplies legal run limit from configured rules, including no-offside profiles.
        if(Number.isFinite(s.runLimit)) target=world(Math.min(forward(target.x),s.runLimit),target.y);
        if(ownFlight&&ball.receiverId===p.id&&point(ball.receivePoint)) {
          task='receive-pass';target=ball.receivePoint;
        }
      } else if(p.id===presser?.id) {
        task=mode==='loose'?'contest-ball':'pressure';target=world(bx-1.5,by);
        if(mode==='defend'&&dist(p.pos,ball.pos)<2.5) task='block-lane';
      } else if(p.id===cover?.id) {
        task='cover';target=world(bx-6,by+(cfg.width/2-by)*.35);
      } else {
        task=p.role==='6'||p.role==='CB'?'protect-center':'balance';
        if(p.role==='6'||p.role==='CB') target=world(Math.min(bx-7,p.role==='CB'?24:34),cfg.width*(p.role==='CB'?.5:.42));
      }
      target=bounded(target);
      // Destinations are separated; physical avoidance remains the movement adapter's job.
      if(p.id!==owner&&p.role!=='GK') {
        for(let n=0;n<8&&reserve.some(t=>dist(t,target)<2);n++)
          target=bounded({x:target.x-dir*2,y:target.y+(target.y<cfg.width/2?2:-2)});
      }
      reserve.push(target);
      if(action) {
        action={...action,id:`${epoch}:${++sequence}:${p.id}`,actorId:p.id,tick:s.tick,
          possessionGeneration:s.possessionGeneration,controlGeneration:s.controlGeneration,
          expiresAt:s.time+cfg.expiry};
        pending.set(p.id,action.id);
      }
      orders.push({actorId:p.id,task,target,stance:task==='block-lane'?'BLOCK':'NORMAL',
        action,phase,epoch,expiresAt:s.time+cfg.expiry});
    }
    for(const o of orders) if(o.action?.type==='PASS') {
      const receiver=orders.find(r=>r.actorId===o.action.targetId);
      if(receiver) {receiver.task='receive-pass';receiver.target=bounded(o.action.aim);}
    }
    return {orders,cancel,epoch};
  }
  return {step,reset};
}
