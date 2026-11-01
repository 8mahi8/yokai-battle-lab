/**
 * Counter-Soultimate targeting research model for Yo-kai Watch 2.
 * Evidence (experienced players, not source-code disassembly):
 * https://note.com/tombow_yw/n/n1e4cf179d2d9
 *
 * Charge finished during the opponent's cut-in: targets are locked to the
 * opponent's currently presented frontline. Otherwise hit is described as
 * landing ~0.5s after cut-in ends, targeting the frontline then.
 * Two "endure" consumptions during the original attack can alter the latter.
 *
 * This is an isolated test-clock with configurable timings; no HP, damage,
 * input-latency, precise hit-frame or animation engine assumptions.
 */
const positiveSafe=(x,label,allowZero=false)=>{
 if(!Number.isSafeInteger(x)||x<0||(!allowZero&&x===0)||x>600000)
  throw new RangeError(label+' must be a valid positive millisecond integer');
 return x;
};
const clone=x=>JSON.parse(JSON.stringify(x));
const copyFront=ids=>{
 if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||
    ids.some(id=>typeof id!=='string'||!id))
  throw new TypeError('frontline needs three distinct, nonempty IDs');
 return [...ids];
};
export function createCounterWindow({fronts=[['A1','A2','A3'],['B1','B2','B3']],lateDelayMs=500,startMs=0}={}){
 if(!Array.isArray(fronts)||fronts.length!==2)throw new TypeError('two frontlines required');
 const current=fronts.map(copyFront);
 if(current.flat().length!==new Set(current.flat()).size)
  throw new TypeError('front member IDs must be unique across teams');
 positiveSafe(lateDelayMs,'lateDelayMs',true);
 positiveSafe(startMs,'startMs',true);
 let now=startMs, cutin=null, issued=0;
 const pending=[],hits=[];
 function sideOK(side){if(side!==0&&side!==1)throw new RangeError('side must be 0 or 1');}
 function snapshot(){return clone({now,lateDelayMs,fronts:current,cutin,pending,hits});}
 function beginCutin({attackerSide,durationMs,enduresSpent=0}={}){
  sideOK(attackerSide);positiveSafe(durationMs,'durationMs');
  if(!Number.isSafeInteger(enduresSpent)||enduresSpent<0||enduresSpent>6)
   throw new RangeError('enduresSpent must be 0..6');
  if(cutin&&(now<cutin.endsAt||pending.length||cutin.counterToken!==null))
   return {ok:false,reason:'cutin_or_hit_pending'};
  cutin={id:++issued,attackerSide,startedAt:now,endsAt:now+durationMs,
   frontAtStart:[...current[attackerSide]],enduresSpent,
   // The source only says "the face showing DURING the cut-in".
   // When that face changes in the window, a start-of-cutin freeze
   // is not an original-confirmed rule. Keep this ambiguity explicit.
   frontChangedDuringCutin:false,
   // Research timestamps ONLY: preserve visible faces for comparing
   // actual captured 3DS frames without guessing the lock instant.
   cutinFrontlineTimeline:[{at:now,frontIds:[...current[attackerSide]]}],
   historyTruncated:false,
   counterToken:null,counterStartedAt:null};
  return {ok:true,cutin:clone(cutin)};
 }
 function beginCharge({side,token}={}){
  sideOK(side);positiveSafe(token,'token');
  if(!cutin||now>=cutin.endsAt||side===cutin.attackerSide)
   return {ok:false,reason:'not_opponent_cutin'};
  if(cutin.counterToken!==null)return {ok:false,reason:'charge_already_tracked'};
  cutin.counterToken=token;cutin.counterStartedAt=now;
  return {ok:true,cutinId:cutin.id};
 }
 function cancelCharge({side,token}={}){
  sideOK(side);positiveSafe(token,'token');
  if(!cutin||side===cutin.attackerSide||cutin.counterToken!==token)
   return {ok:false,reason:'no_matching_counter_charge'};
  cutin.counterToken=null;cutin.counterStartedAt=null;
  return {ok:true,cancelled:true};
 }
 function completeCharge({side,token}={}){
  sideOK(side);positiveSafe(token,'token');
  if(!cutin||side===cutin.attackerSide||cutin.counterToken!==token)
   return {ok:false,reason:'no_matching_counter_charge'};
  if(pending.some(x=>x.cutinId===cutin.id))
   return {ok:false,reason:'counter_hit_already_pending'};
  const completedDuringCutin=now<cutin.endsAt;
  const lock=completedDuringCutin||cutin.enduresSpent>=2;
  const ambiguousEndureFront=!completedDuringCutin&&cutin.enduresSpent>=2&&
    cutin.frontChangedDuringCutin;
  const uncertainty=ambiguousEndureFront?
    {code:'two-endures-cutin-front-lock-time-unverified',
     explanation:'The opponent changed its front during the cut-in; the source does not identify the freeze frame.',
     // Time offsets are virtual lab units, not measured original 3DS frames.
     cutinFrontlineTimeline:clone(cutin.cutinFrontlineTimeline),
     historyTruncated:cutin.historyTruncated}:null;
  // Keep frontAtStart ONLY as a plausible research candidate, never as a
  // verified damage target if the opponent rotated during the cut-in.
  const targetIds=lock?(completedDuringCutin?[...current[cutin.attackerSide]]:[...cutin.frontAtStart]):null;
  // Original exact timing for completed-during-cutin hits is UNKNOWN.
  // Cut-in end is an explicit, non-authoritative staging timestamp.
  const hitAt=completedDuringCutin?cutin.endsAt:Math.max(now,cutin.endsAt+lateDelayMs);
  const event={id:++issued,cutinId:cutin.id,side,token,attackerSide:cutin.attackerSide,
   chargeCompletedAt:now,hitAt,completedDuringCutin,frontLock:
    completedDuringCutin?'completion':lock?'endure-exception':'impact',
   targetIds,uncertainty,staging:'research-only'};
  pending.push(event);
  cutin.counterToken=null;
  return {ok:true,...clone(event)};
 }
 function flush(){
  const ready=[];
  for(let i=0;i<pending.length;){
   const p=pending[i];
   if(p.hitAt>now){i++;continue;}
   pending.splice(i,1);
   const targets=p.targetIds?[...p.targetIds]:[...current[p.attackerSide]];
   const hit={...p,targetIds:targets,resolvedAt:p.hitAt};
   hits.push(hit);ready.push(hit);
  }
  if(hits.length>100)hits.splice(0,hits.length-100);
  return ready.map(clone);
 }
 /** Experimental correction when two rotations in one no-auto-action window
  * supersede the first. Only a still-pending completion-locked hit can be revised;
  * resolving an attack in the past is never permitted.
  */
 function revisePendingTarget({hitId,targetIds,reason='wheel-pair'}={}){
  positiveSafe(hitId,'hitId');
  const ids=copyFront(targetIds);
  if(typeof reason!=='string'||!reason||reason.length>100)
   throw new TypeError('invalid correction reason');
  const p=pending.find(item=>item.id===hitId);
  if(!p)return {ok:false,reason:'hit_not_pending'};
  if(p.hitAt<=now)return {ok:false,reason:'hit_due_or_elapsed'};
  if(p.frontLock!=='completion')return {ok:false,reason:'target_not_completion_locked'};
  if(p.targetCorrection)return {ok:false,reason:'already_corrected'};
  p.targetCorrection={reason,at:now,previous:[...p.targetIds]};
  p.targetIds=ids;
  return {ok:true,id:hitId,targetIds:[...ids],previous:[...p.targetCorrection.previous]};
 }
 function advance(ms){
  positiveSafe(ms,'advance',true);
  now+=ms;return flush();
 }
 function setFront({side,ids}={}){
  sideOK(side);
  const next=copyFront(ids);
  const other=current[1-side];
  if(next.some(id=>other.includes(id)))
   throw new TypeError('a unit cannot appear on two teams');
  // A due hit must be explicitly drained via advance(0) FIRST. Silently
  // calling flush() here discards HP effects in the combat integration because
  // only advance() dispatches its returned hit records to the damage engine.
  if(pending.some(item=>item.hitAt<=now))
   return {ok:false,reason:'hit_due_resolve_first'};
  if(cutin&&side===cutin.attackerSide&&now>=cutin.startedAt&&now<cutin.endsAt&&
     next.some((id,i)=>id!==current[side][i])){
    cutin.frontChangedDuringCutin=true;
    if(cutin.cutinFrontlineTimeline.length<64)
      cutin.cutinFrontlineTimeline.push({at:now,frontIds:[...next]});
    else cutin.historyTruncated=true;
  }
  current[side]=next;
  return {ok:true,side,frontIds:[...next],at:now};
 }
 return {snapshot,beginCutin,beginCharge,cancelCharge,completeCharge,revisePendingTarget,advance,setFront};
}
