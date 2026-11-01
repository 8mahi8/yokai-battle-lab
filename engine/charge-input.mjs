/**
 * Research implementation of four YW2 Soultimate charge touch challenges.
 * Modes are sourced from https://game8.jp/youkai-watch2/504498 .
 * Exact input thresholds, patterns and selection weights are UNVERIFIED UX fixtures.
 * Normalized coordinates [0,1] deliberately separate rendering and game state.
 */
export const CHARGE_KINDS = Object.freeze(['spin','tap','trace','align']);
const TWO_PI = Math.PI * 2;
function rngFor(seed) {
 if(!Number.isInteger(seed))throw new TypeError('integer seed required');
 // Avalanche adjacent integer seeds before the first draw. A raw xorshift
 // first output is correlated for nearby seeds and biased mode selection.
 let s=seed>>>0;
 s=Math.imul(s^(s>>>16),0x7feb352d);
 s=Math.imul(s^(s>>>15),0x846ca68b);
 s=(s^(s>>>16))>>>0;
 if(!s)s=1;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
}
export function chooseChargeKind(seed) {
 const rand=rngFor(seed);
 return CHARGE_KINDS[Math.floor(rand()*CHARGE_KINDS.length)];
}
const TAP_POINTS = Object.freeze([[.5,.19],[.76,.32],[.78,.65],[.5,.8],[.21,.66],[.23,.34]]);
const TRACE_PATHS = Object.freeze([
 [[.23,.27],[.76,.27],[.24,.73],[.77,.73]],
 [[.31,.23],[.31,.77],[.76,.77]],
 [[.22,.72],[.5,.25],[.79,.72],[.22,.72]]
]);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const close=(a,b,r)=>distance(a,b)<=r;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function point(event){
 if(!Number.isFinite(event.x)||!Number.isFinite(event.y)||
 event.x<0||event.x>1||event.y<0||event.y>1) return null;
 return [event.x,event.y];
}
function angle(p){return Math.atan2(p[1]-.5,p[0]-.5);}
function clockTarget(n){const a=-Math.PI/2+(n%12)*TWO_PI/12;return [.5+.32*Math.cos(a),.5+.32*Math.sin(a)];}
export function createChargeTrial({kind,seed=20261023}={}){
 if(!CHARGE_KINDS.includes(kind))throw new RangeError('unsupported charge kind');
 const rand=rngFor(seed);
 const targets=[...TAP_POINTS];
 for(let i=targets.length-1;i>0;i--){let j=Math.floor(rand()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
 const clocks=Array.from({length:3},()=>1+Math.floor(rand()*12));
 const tracePath=TRACE_PATHS[Math.floor(rand()*TRACE_PATHS.length)];
 let count=0,active=false,complete=false;
 let lastAngle=null,turnDirection=0,angularTravel=0,traceIndex=0;
 let handAngle=-Math.PI/2;
 const requirements={spin:2,tap:6,trace:3,align:3};
 const currentTarget=()=>kind==='tap'?targets[count]??null:kind==='align'?clockTarget(clocks[count]??0):null;
 function snapshot(){
  const total=requirements[kind];
  let progress=kind==='spin'?Math.min(1,angularTravel/(TWO_PI*total))
   :kind==='trace'?Math.min(1,(count+traceIndex/Math.max(1,tracePath.length))/total)
   :Math.min(1,count/total);
  return {kind,seed,completed:complete,active,progress,count,total,
    target:currentTarget()?.slice()??null,
    clockNumber:kind==='align'?clocks[count]??null:null,
    handAngle:kind==='align'?handAngle:null,
    path:kind==='trace'?tracePath.map(x=>[...x]):[],
    pathIndex:kind==='trace'?traceIndex:0};
 }
 function input(event){
  if(complete)return snapshot();
  if(!event||!['down','move','up','tap'].includes(event.type))throw new TypeError('touch input type must be down/move/up/tap');
  const p=event.type==='up'?null:point(event);
  if(event.type!=='up'&&!p)return snapshot();
  if(kind==='tap'){
   if(event.type==='tap'||event.type==='down'){
    if(close(p,targets[count],.13)){count++;if(count===requirements.tap)complete=true;}
   }
  }else if(kind==='spin'){
   if(event.type==='up'){active=false;lastAngle=null;turnDirection=0;}
   else {
    const radius=distance(p,[.5,.5]);
    if(event.type==='down'){active=radius>=.18&&radius<=.49;lastAngle=active?angle(p):null;turnDirection=0;}
    else if(event.type==='move'&&active&&radius>=.18&&radius<=.49){
      const a=angle(p),d=angleDiff(a,lastAngle);
      // Reject discontinuous samples/teleport jumps and backtracking.
      if(Math.abs(d)<=Math.PI/2){
       if(!turnDirection&&Math.abs(d)>.012)turnDirection=Math.sign(d);
       if(Math.sign(d)===turnDirection)angularTravel+=Math.abs(d);
      }
      lastAngle=a;
      if(angularTravel>=TWO_PI*requirements.spin)complete=true;
    }
   }
  }else if(kind==='trace'){
   const path=tracePath;
   if(event.type==='up'){active=false;traceIndex=0;}
   else if(event.type==='down'){
    active=close(p,path[0],.13);traceIndex=active?1:0;
   }else if(event.type==='move'&&active){
    if(close(p,path[traceIndex],.13)){
     traceIndex++;
     if(traceIndex===path.length){
      count++;active=false;traceIndex=0;
      if(count===requirements.trace)complete=true;
     }
    }
   }
  }else if(kind==='align'){
   if(event.type==='up'){
    if(active&&close([.5+.32*Math.cos(handAngle),.5+.32*Math.sin(handAngle)],currentTarget(),.11)){
      count++;if(count===requirements.align)complete=true;
      handAngle=-Math.PI/2;
    }
    active=false;
   }else if(event.type==='down'){
    active=close(p,[.5+.32*Math.cos(handAngle),.5+.32*Math.sin(handAngle)],.16);
   }else if(event.type==='move'&&active){
    if(distance(p,[.5,.5])>=.15)handAngle=angle(p);
   }
  }
  return snapshot();
 }
 return {input,snapshot};
}
