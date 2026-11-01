/**
 * YW2 bench purification input trial — research gesture geometry only.
 * Sourced TYPES: pop bubbles, rapid tap, rub, spin and slash chain.
 * https://game8.jp/youkai-watch2/505163
 * https://toragame.com/youkai2/kihon/battle.php
 *
 * All numeric thresholds, target positions, mode assignment and difficulty
 * below are fictional fixture choices until hardware-side validation.
 * No status mutations occur in this module.
 */
export const PURIFY_KINDS=Object.freeze(['pop','mash','rub','spin','slash']);
const TAU=Math.PI*2;
const POP_POINTS=Object.freeze([[.29,.27],[.70,.26],[.51,.53],[.29,.75],[.73,.73]]);
function point(e){
 if(!Number.isFinite(e?.x)||!Number.isFinite(e?.y)||
   e.x<0||e.x>1||e.y<0||e.y>1)return null;
 return [e.x,e.y];
}
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function angle(p){return Math.atan2(p[1]-.5,p[0]-.5);}
function deltaAngle(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
function validateSeed(seed){if(!Number.isSafeInteger(seed))throw new TypeError('seed must be integer');}
export function choosePurifyKind(seed){
 validateSeed(seed);
 // Fixed, reproducible rotation through all five modes for QA.
 const index=((seed%PURIFY_KINDS.length)+PURIFY_KINDS.length)%PURIFY_KINDS.length;
 return PURIFY_KINDS[index];
}
export function createPurifyTrial({kind,seed=0}={}){
 if(!PURIFY_KINDS.includes(kind))throw new RangeError('unknown purification type');
 validateSeed(seed);
 let count=0,active=false,completed=false,last=null,travel=0,spinTravel=0,
  spinDirection=0,lastAngle=null,segmentStart=null;
 const popped=new Set();
 // Rotated targets to diversify distinct lab seeds, without claiming 3DS RNG.
 const points=POP_POINTS.map((_,i)=>[...POP_POINTS[(i+(seed%5+5)%5)%5]]);
 const total={pop:5,mash:14,rub:4,spin:2,slash:3}[kind];
 // Slash each chain requires a left-to-right diagonal gesture within a band;
 // a new pointer down is required for the next link.
 const slashEnds=[[[.2,.25],[.8,.37]],[[.2,.47],[.8,.59]],[[.2,.69],[.8,.81]]];
 function progress(){
  if(kind==='pop')return popped.size/total;
  if(kind==='rub')return Math.min(1,travel/(total*.55));
  if(kind==='spin')return Math.min(1,spinTravel/(TAU*total));
  return count/total;
 }
 function snapshot(){
  return {kind,seed,total,count:kind==='pop'?popped.size:count,active,
   completed,progress:progress(),popped:[...popped].sort((a,b)=>a-b),
   popPoints:points.map(p=>[...p]),
   slashPoints:slashEnds.map(pair=>pair.map(p=>[...p])),
   targetSlash:kind==='slash'?Math.min(count,2):null,
   model:'research-gesture'};
 }
 function input(event){
  if(completed)return snapshot();
  if(!event||!['down','move','up','tap'].includes(event.type))
   throw new TypeError('purification accepts down/move/up/tap');
  if(event.type==='up'){
   active=false;last=null;lastAngle=null;spinDirection=0;segmentStart=null;
   return snapshot();
  }
  const p=point(event);
  if(!p)return snapshot();
  if(kind==='pop'){
   if(event.type==='tap'||event.type==='down'){
    for(let i=0;i<points.length;i++){
     if(!popped.has(i)&&dist(points[i],p)<=.13){popped.add(i);break;}
    }
    if(popped.size===total)completed=true;
   }
  }else if(kind==='mash'){
   if((event.type==='down'||event.type==='tap')&&dist(p,[.5,.5])<=.34){
    count++;if(count>=total)completed=true;
   }
  }else if(kind==='rub'){
   if(event.type==='down'){active=dist(p,[.5,.5])<=.43;last=active?p:null;}
   else if(event.type==='move'&&active&&last){
    const d=dist(last,p);
    // Sparse browser/old-iPad frames remain viable, but prohibit jumps
    // across the entire pad from counting as rubbing.
    if(d>.008&&d<=.24&&dist(p,[.5,.5])<=.45)travel+=d;
    last=p;
    if(progress()>=1){count=total;completed=true;}
   }
  }else if(kind==='spin'){
   const radius=dist(p,[.5,.5]);
   if(event.type==='down'){
    active=radius>=.18&&radius<=.47;
    lastAngle=active?angle(p):null;spinDirection=0;
   }else if(event.type==='move'&&active&&radius>=.18&&radius<=.47){
    const a=angle(p),d=deltaAngle(a,lastAngle);
    if(Math.abs(d)<=Math.PI/2){
     if(!spinDirection&&Math.abs(d)>.012)spinDirection=Math.sign(d);
     if(Math.sign(d)===spinDirection)spinTravel+=Math.abs(d);
    }
    lastAngle=a;
    if(progress()>=1){count=total;completed=true;}
   }
  }else if(kind==='slash'){
   const pair=slashEnds[count];
   if(event.type==='down'){
    active=dist(p,pair[0])<=.14;segmentStart=active?p:null;
   }else if(event.type==='move'&&active&&segmentStart){
    // A horizontal diagonal swipe, not single-point tapping.
    if(dist(p,pair[1])<=.14&&p[0]-segmentStart[0]>=.35){
     count++;active=false;segmentStart=null;
     if(count===total)completed=true;
    }
   }
  }
  return snapshot();
 }
 return {input,snapshot};
}
