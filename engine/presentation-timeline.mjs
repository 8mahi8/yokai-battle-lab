/**
 * Research-only presentation clock, INDEPENDENT of the combat scheduler.
 * During another move's animation, wheel and charge inputs are accepted but
 * the opponent sees their results only when that animation finishes.
 * This reproduces the observed *visibility mechanism*, not original timing.
 * Source: https://note.com/tombow_yw/n/n1e4cf179d2d9
 * Actual 3DS animation durations, action priority, frame rules, latency:
 * UNKNOWN. All integer milliseconds here are configurable fixtures.
 */
const KINDS=new Set(['chargeStart','chargeComplete','chargeCancel','rotate','action','watchMode']);
function validInt(n,label,max=600000){
 if(!Number.isSafeInteger(n)||n<0||n>max)throw new RangeError(label+' must be an integer 0..'+max);
 return n;
}
const clone=x=>JSON.parse(JSON.stringify(x));
export function createPresentationTimeline({startMs=0,maxLog=256,coalesceRotations=false}={}){
 validInt(startMs,'startMs');
 validInt(maxLog,'maxLog',4096);
 if(maxLog<1)throw new RangeError('maxLog must be >= 1');
 if(typeof coalesceRotations!=='boolean')throw new TypeError('coalesceRotations must be boolean');
 let now=startMs,blockUntil=now,motionIndex=0,serial=0;
 const motions=[],buffered=[],visible=[],charging=[null,null];
 const blocked=()=>now<blockUntil;
 function reveal(events,shownAt){
  const matched=new Map(),fresh=[];
  const suppressed=new Set(),lastRotate=new Map(),merged=new Map();
  // During the same opponent-visibility block, collapse wheel updates with
  // no auto-action in between. Preserve the FINAL rotate's chronological slot.
  // An actual ordinary Yo-kai action separates the paired rotations.
  if(coalesceRotations){
   for(let i=0;i<events.length;i++){
    const e=events[i];
    if(e.kind==='action'){lastRotate.clear();continue;}
    if(e.kind!=='rotate')continue;
    if(lastRotate.has(e.side)){
     const j=lastRotate.get(e.side);
     suppressed.add(j);
     merged.set(i,(merged.get(j)||0)+1);
    }
    lastRotate.set(e.side,i);
   }
  }
  for(let i=0;i<events.length;i++){
   const e=events[i];
   if(e.kind!=='chargeStart')continue;
   const j=events.findIndex((next,n)=>n>i&&next.side===e.side&&next.token===e.token&&
    (next.kind==='chargeComplete'||next.kind==='chargeCancel'));
   if(j>=0){matched.set(i,j);matched.set(j,i);}
  }
  for(let i=0;i<events.length;i++){
   const e=events[i];
   if(e.kind==='chargeStart'&&matched.has(i))continue;
   if(e.kind==='chargeCancel'&&matched.has(i))continue;
   if(suppressed.has(i))continue;
   const item={...e,visibleAt:shownAt,delayed:shownAt>e.at};
   if(e.kind==='rotate'&&merged.has(i))item.collapsedRotations=merged.get(i);
   if(e.kind==='chargeComplete'){
    item.kind='specialRelease';
    item.hiddenCharge=matched.has(i);
    if(matched.has(i))item.chargeStartedAt=events[matched.get(i)].at;
   }
   fresh.push(item);
  }
  for(const x of fresh)visible.push(x);
  if(visible.length>maxLog)visible.splice(0,visible.length-maxLog);
  return fresh.map(clone);
 }
 function flush(){
  if(blockUntil<=now&&buffered.length)return reveal(buffered.splice(0),blockUntil);
  return [];
 }
 function beginMotion({durationMs,kind='action',actorId=null}={}){
  validInt(durationMs,'durationMs',60000);
  if(durationMs===0)throw new RangeError('motion duration must be positive');
  if(typeof kind!=='string'||kind.length>64)throw new TypeError('invalid motion kind');
  if(actorId!==null&&(typeof actorId!=='string'||!actorId))throw new TypeError('invalid actorId');
  flush();
  const motion={id:++motionIndex,kind,actorId,startedAt:now,endsAt:now+durationMs};
  motions.push(motion);
  blockUntil=Math.max(blockUntil,motion.endsAt);
  if(motions.length>maxLog)motions.shift();
  return {...motion,opponentViewBlockedUntil:blockUntil};
 }
 function record({side,kind,token=null,memberId=null,detail=null,frontIds=null}={}){
  if(side!==0&&side!==1)throw new RangeError('side must be 0 or 1');
  if(!KINDS.has(kind))throw new RangeError('unsupported presentation action');
  if(memberId!==null&&(typeof memberId!=='string'||!memberId||memberId.length>100))
   throw new TypeError('invalid memberId');
  if(detail!==null&&(typeof detail!=='string'||detail.length>200))
   throw new TypeError('detail must be a short string');
  if(frontIds!==null){
   if(kind!=='rotate'||!Array.isArray(frontIds)||frontIds.length!==3||
      new Set(frontIds).size!==3||frontIds.some(id=>typeof id!=='string'||!id))
     throw new TypeError('frontIds valid only for rotate and exactly 3 distinct IDs');
  }
  if(kind.startsWith('charge')){
   if(!Number.isSafeInteger(token)||token<1)throw new RangeError('positive charge token required');
   if(kind==='chargeStart'){
    if(charging[side]!==null)throw new Error('existing charge must finish first');
    charging[side]=token;
   }else{
    if(charging[side]!==token)throw new Error('charge token is not active');
    charging[side]=null;
   }
  }
  const event={sequence:++serial,at:now,side,kind,token,memberId,detail,
    frontIds:frontIds===null?null:[...frontIds]};
  if(blocked())buffered.push(event);
  else reveal([event],now);
  return {sequence:event.sequence,queued:blocked(),visibleAt:blocked()?blockUntil:now};
 }
 function advance(ms){
  validInt(ms,'ms');
  now+=ms;
  return flush();
 }
 function snapshot(){
  return clone({now,blockUntil,isBlocked:blocked(),motions,buffered,visible,
   activeCharges:[...charging]});
 }
 return {beginMotion,record,advance,snapshot};
}
