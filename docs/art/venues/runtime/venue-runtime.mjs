// Repository-independent adapter. The host supplies its existing world projection.
export function buildGroundMesh(project, nx=20, ny=14) {
  if (!Number.isInteger(nx)||!Number.isInteger(ny)||nx<1||ny<1) throw new Error('Invalid mesh resolution');
  const vertices=[],indices=[];
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx,v=j/ny,p=project(u*75,v*50);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw new Error('Invalid projection');
    vertices.push({x:p.x,y:p.y,u,v});
  }
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
    indices.push(a,b,d,a,d,c);
  }
  return {vertices,indices};
}

// Phaser-compatible API: call after atlas textures have loaded.
export function registerClips(scene, id, spec) {
  for(const [action,clip] of Object.entries(spec.clips)) {
    const key=`venue:${id}:${action}`;
    if(!scene.anims.exists(key))scene.anims.create({key,frames:clip.frames.map(frame=>({key:id,frame})),frameRate:clip.frameRate,repeat:clip.repeat});
  }
}

export function positionBillboard(sprite, asset, layout, project, depthScaleAt) {
  const p=project(asset.x,asset.y),factor=depthScaleAt(layout,p.y);
  const scale=asset.bodyHeightPx ? asset.displayBodyHeight/asset.bodyHeightPx*factor : asset.baseScale*factor;
  sprite.setOrigin(asset.anchor[0]/asset.width,asset.anchor[1]/asset.height);
  sprite.setPosition(p.x,p.y).setScale(scale).setDepth(100+p.y);
}

// Uses real event IDs and cosmetic-only deterministic scheduling; never simulation RNG.
export class SidelineReactions {
  constructor(){this.seen=new Set();this.queue=[];this.cooldowns=new Map();}
  onEvent(event,actors,now){
    if(!event.id||this.seen.has(event.id))return;
    this.seen.add(event.id);
    if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
    actors.forEach((a,i)=>{
      if((this.cooldowns.get(a.id)||0)>now)return;
      let action;
      if(event.type==='goal')action=a.team===event.team?'cheer':'disappointed';
      else if(event.type==='save')action=a.team===event.team?'clap':'disappointed';
      else if(event.type==='miss')action=a.team===event.team?'disappointed':null;
      if(!action||!a.clips[action])return;
      if(a.seated){action=a.clips.seated_clap?'seated_clap':null;if(!action)return;}
      this.queue.push({at:now+120+(i*97)%650,actor:a,action});
      this.cooldowns.set(a.id,now+3500);
    });
  }
  update(now,play){const pending=[];for(const q of this.queue){if(q.at<=now)play(q.actor,q.action);else pending.push(q);}this.queue=pending;}
  reset(){this.seen.clear();this.queue=[];this.cooldowns.clear();}
}
