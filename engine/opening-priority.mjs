/**
 * Phase 6 experimental opening-action rights, OFF by default.
 *
 * Sources:
 * https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c
 * https://note.com/tombow_yw/n/n1e4cf179d2d9
 * https://www.mtwildwood.net/turn-order.php
 *
 * Verified qualitative observations:
 * - Matching-time original front identity matters, even after prebattle wheel changes.
 * - First front advantage is WEAKER than an already earned ordinary action right.
 * - Flash Soul/Flash skill can once replace the actor due to move next.
 * - The Flash ability is consumed on an ACTUAL action; swapping off without
 *   an action should not silently consume it.
 *
 * NOT established: exact action-point mutation after Flash interception;
 * multi-Flash simultaneous comparator; inherited opening credits after swap.
 * Only two alternative skipped-turn rules are exposed as experimental fixtures.
 */
const copy=x=>JSON.parse(JSON.stringify(x));
function checkIds(ids,label){
 if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||
   ids.some(x=>typeof x!=='string'||!/^[AB][1-6]$/.test(x)))
   throw new TypeError(label+' must have three distinct valid unit IDs');
 return [...ids];
}
export function createOpeningPriority({
 registeredFront=[['A1','A2','A3'],['B1','B2','B3']],
 flashIds=[],
 skippedTurnPolicy='consume'
}={}){
 if(!Array.isArray(registeredFront)||registeredFront.length!==2)
  throw new TypeError('two matching-time teams required');
 const first=registeredFront.map((a,i)=>{
  const ids=checkIds(a,'registeredFront');
  if(ids.some(id=>id[0] !== (i===0?'A':'B')))
   throw new TypeError('registeredFront must belong to its own side');
  return ids;
 });
 if(!Array.isArray(flashIds)||new Set(flashIds).size!==flashIds.length||
   flashIds.some(id=>typeof id!=='string'||!/^[AB][1-6]$/.test(id)))
   throw new TypeError('flashIds must contain unique known unit IDs');
 if(skippedTurnPolicy!=='consume'&&skippedTurnPolicy!=='preserve')
  throw new RangeError('skippedTurnPolicy consume/preserve required');
 const originally=new Set(first.flat()),flashReady=new Set(flashIds);
 const openingPending=new Set(first.flat()),events=[];
 let chosenTurns=0;
 function choose({frontIds,waits,scheduledId}={}){
  if(!Array.isArray(frontIds)||!Array.isArray(waits)||frontIds.length!==waits.length||
    !frontIds.includes(scheduledId)||new Set(frontIds).size!==frontIds.length)
    throw new TypeError('frontIds/waits must contain the scheduled actor');
  if(frontIds.some(id=>typeof id!=='string'||!/^[AB][1-6]$/.test(id))||
    waits.some(w=>!Number.isFinite(w)||w<0))
    throw new RangeError('invalid available wait');
  // Among several active Flash holders, choose least wait debt;
  // stable wheel iteration resolves a tie (UNVERIFIED original tiebreak).
  const candidates=frontIds.map((id,index)=>({id,wait:waits[index],index}))
   .filter(x=>flashReady.has(x.id))
   .sort((a,b)=>a.wait-b.wait||a.index-b.index);
  const choice=candidates[0]?.id??scheduledId;
  return {actorId:choice,scheduledId,
   kind:candidates.length?'flash-intercept':(openingPending.has(choice)?'opening-initial':'normal'),
   skippedId:choice!==scheduledId?scheduledId:null,
   consumedFlash:candidates.length>0&&flashReady.has(choice),
   registeredFront:originally.has(choice),registeredUnspent:openingPending.has(choice),
   skippedTurnPolicy,confidence:'research-fixture'};
 }
 function commit(decision){
  if(!decision||typeof decision!=='object'||typeof decision.actorId!=='string'||
    typeof decision.scheduledId!=='string')
   throw new TypeError('invalid action decision');
  if(decision.consumedFlash&&!flashReady.has(decision.actorId))
   throw new Error('Flash flag already consumed');
  // A retained Flash ready flag is never removed merely on a wheel rotation.
  if(decision.consumedFlash)flashReady.delete(decision.actorId);
  openingPending.delete(decision.actorId);
  chosenTurns++;
  const entry={turn:chosenTurns,actorId:decision.actorId,
   originalNext:decision.scheduledId,kind:decision.kind,skippedId:decision.skippedId,
   consumedFlash:decision.consumedFlash,registeredFront:decision.registeredFront,
   confidence:'research-fixture'};
  events.push(entry);
  if(events.length>60)events.shift();
  return {...entry};
 }
 function snapshot(){
  return copy({registeredFront:first,flashReady:[...flashReady],flashConsumed:flashIds.filter(x=>!flashReady.has(x)),
   openingPending:[...openingPending],skippedTurnPolicy,chosenTurns,recent:events});
 }
 function fork(){
  const other=createOpeningPriority({registeredFront:first,flashIds:[...flashReady],skippedTurnPolicy});
  // Preview needs only the current flags and no mutation of the source.
  // Prior opening rights spent, but Flash consumed are absent from the fork.
  for(const id of first.flat())if(!openingPending.has(id))other.consumeOpeningForPreview(id);
  return other;
 }
 function consumeOpeningForPreview(id){openingPending.delete(id);}
 return {choose,commit,snapshot,fork,consumeOpeningForPreview};
}
