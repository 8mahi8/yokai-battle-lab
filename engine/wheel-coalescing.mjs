/**
 * Experimental YW2 wheel-rotation pairing model, opt-in only.
 *
 * Source: https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c
 * If two wheel turns happen with no automatic Yo-kai action between them,
 * the first is not reflected in some attack-target snapshots.
 *
 * This implementation only corrects PENDING target locks for the observed
 * exactly-two-rotation case. 3+ rotations generate explicit UNCERTAINTY records
 * rather than unverified guessed target rules. Side-by-side testing is needed.
 * No claim is made about exact frame window or 3DS network semantics.
 */
const clone=x=>JSON.parse(JSON.stringify(x));
const validateFront=(ids)=>{
 if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||
    ids.some(id=>typeof id!=='string'||!id))throw new TypeError('invalid frontline');
 return [...ids];
};
export function createWheelCoalescing({fronts}={}){
 if(!Array.isArray(fronts)||fronts.length!==2)throw new TypeError('two teams required');
 const physical=fronts.map(validateFront);
 if(physical[0].some(id=>physical[1].includes(id)))throw new TypeError('overlapping teams');
 const groups=[null,null], history=[],uncertainties=[];
 let serial=0,epoch=0;
 function checkSide(side){if(side!==0&&side!==1)throw new RangeError('side must be 0 or 1');}
 function rotate({side,frontIds}={}){
  checkSide(side);
  const next=validateFront(frontIds);
  if(next.some(id=>physical[1-side].includes(id)))throw new TypeError('member on both sides');
  const old=[...physical[side]];
  // Identical front is not a meaningful wheel movement.
  if(next.every((id,i)=>old[i]===id))return {changed:false,corrections:[]};
  physical[side]=next;
  const group=groups[side];
  const corrections=[];
  if(!group){
   groups[side]={before:old,first:[...next],rotations:1,
     firstSequence:++serial,locks:[]};
  }else{
   group.rotations++;
   ++serial;
   if(group.rotations===2){
    for(const lock of group.locks){
     corrections.push({hitId:lock.hitId,frontIds:[...group.before],
       supersededFront:[...group.first],reason:'second-rotation-before-auto-action'});
    }
    group.locks.length=0;
   }
  }
  history.push({sequence:serial,side,physical:[...next],epoch,rotations:groups[side].rotations});
  if(history.length>100)history.shift();
  let uncertainty=null;
  if(groups[side].rotations>=3){
   // There is a sourced TWO-turn observation, but no grounded rule for 3+.
   // Do not silently generalize pair cancellation to arbitrary sequences.
   uncertainty={code:'three-plus-rotations-unverified',side,epoch,
     rotations:groups[side].rotations,frontIds:[...next]};
   uncertainties.push(clone(uncertainty));
   if(uncertainties.length>100)uncertainties.shift();
  }
  return {changed:true,side,frontIds:[...next],epoch,groupRotations:groups[side].rotations,
    corrections:clone(corrections),uncertainty:clone(uncertainty)};
 }
 function trackLockedHit({targetSide,hitId}={}){
  checkSide(targetSide);
  if(!Number.isSafeInteger(hitId)||hitId<=0)throw new RangeError('positive hit id required');
  const g=groups[targetSide];
  if(!g||g.rotations!==1)return {tracked:false};
  if(g.locks.some(x=>x.hitId===hitId))return {tracked:false,reason:'already_tracked'};
  g.locks.push({hitId});
  return {tracked:true,hitId,provisional:[...physical[targetSide]],
    beforeFirstRotation:[...g.before],epoch};
 }
 function actionBoundary(){
  epoch++;groups[0]=null;groups[1]=null;
  return {epoch};
 }
 function finalizeHit(hitId){
  if(!Number.isSafeInteger(hitId)||hitId<=0)throw new RangeError('positive hit id required');
  for(const group of groups)if(group)group.locks=group.locks.filter(x=>x.hitId!==hitId);
 }
 function snapshot(){return clone({physical,groups,history,uncertainties,epoch,serial});}
 return {rotate,trackLockedHit,actionBoundary,finalizeHit,snapshot};
}
