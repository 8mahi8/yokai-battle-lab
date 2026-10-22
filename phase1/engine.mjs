// Phase 1: six-slot wheel + action wait simulator. Not yet a complete game.
const LIMITS=[1,...Array.from({length:55},(_,i)=>5+i*3),170,175,180,185,190,195,200,...Array.from({length:30},(_,i)=>210+i*10),999];
const WEIGHTS=[123,...Array.from({length:55},(_,i)=>122-i),67,66,65,64,63,62,61,...Array.from({length:30},(_,i)=>60-i),30];
export function weight(speed){if(!Number.isInteger(speed)||speed<1)throw new RangeError('invalid speed');const i=LIMITS.findIndex(n=>speed<=n);return WEIGHTS[i<0?WEIGHTS.length-1:i];}
export function makeBattle(teams,seed=1){
 if(teams.length!==2||teams.some(t=>t.length!==6))throw new Error('two teams of six required');
 let x=seed>>>0;const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 const sides=teams.map((team,side)=>({offset:0,units:team.map((u,slot)=>({id:u.id??side+'-'+slot,speed:u.speed,wait:0,slot,side}))}));
 for(const s of sides)for(let i=0;i<6;i++){const u=s.units[i],w=weight(u.speed);u.wait=i<3?Math.round(w*1.5+random()*w*.3):null;}
 return {sides,tick:0,history:[],seed};
}
export function active(b,side){const s=b.sides[side];return [0,1,2].map(i=>s.units[(s.offset+i)%6]);}
export function rotate(b,side,steps=1){
 if(!Number.isInteger(steps))throw new Error('integer steps only');
 const s=b.sides[side],before=new Set(active(b,side));s.offset=((s.offset+steps)%6+6)%6;
 const after=active(b,side);for(const u of after)if(!before.has(u))u.wait=3*weight(u.speed);
 for(const u of before)if(!after.includes(u))u.wait=null;
 return after.map(u=>u.id);
}
export function nextAction(b){
 const candidates=[...active(b,0),...active(b,1)].filter(u=>u.wait!==null);
 if(!candidates.length)return null;
 const minimum=Math.min(...candidates.map(u=>u.wait));const actor=candidates.find(u=>u.wait===minimum);
 for(const u of candidates)u.wait-=minimum;b.tick+=minimum;actor.wait=3*weight(actor.speed);
 const entry={tick:b.tick,side:actor.side,id:actor.id,waitAfter:actor.wait};b.history.push(entry);return entry;
}
