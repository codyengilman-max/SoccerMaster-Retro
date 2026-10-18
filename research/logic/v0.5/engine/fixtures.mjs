export function fixture() {
  const names=['GK','LB','CB','RB','6','8','LW','9','RW'];
  const positions=[[4,27.5],[22,10],[18,27.5],[22,45],[32,22],[40,33],[54,7],[58,27.5],[54,48]];
  return {tick:1,time:0,direction:1,phase:'live',possessionGeneration:1,controlGeneration:1,
    teammates:names.map((role,i)=>({id:`A${i}`,role,pos:{x:positions[i][0],y:positions[i][1]},
      human:false,speed:6,ready:true,passEligible:true})),
    opponents:positions.map(([x,y],i)=>({id:`B${i}`,pos:{x:80-x,y},seenAt:0})),
    ball:{pos:{x:40,y:33},state:'controlled',ownerId:'A5',seenAt:0},runLimit:70};
}
export function mirror(s) {
  const r=structuredClone(s);r.direction=-s.direction;
  r.teammates.forEach(p=>p.pos.x=80-p.pos.x);
  r.opponents.forEach(p=>p.pos.x=80-p.pos.x);r.ball.pos.x=80-r.ball.pos.x;
  return r;
}
