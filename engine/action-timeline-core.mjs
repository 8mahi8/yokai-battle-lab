/**
 * V3-1 — One authoritative logical action-point transition for actual turns
 * AND tentative next-turn previews.
 *
 * 3DS/YW2 action-point thresholds / tie precedence are not fully source-
 * verified. This extracts the EXISTING formula unchanged. It never consults
 * Date.now(), performance.now(), Firebase, a DOM timer, or visual animation.
 *
 * Mutation is limited to the caller-owned actor WAIT models in 'active'.
 * In a live match those models are authoritative; in preview they are
 * independent cloned values. The optional opening-priority policy is passed
 * explicitly; its caller creates a fork for a forecast.
 */
export function validateActionWait(actionWait){
 if(!Number.isInteger(actionWait)||actionWait<0||actionWait>10)
  throw new RangeError('actionWait must be 0..10');
 return actionWait;
}

export function advanceLogicalAction(active,{actionWait=3,openingPriority=null}={}){
 validateActionWait(actionWait);
 if(!Array.isArray(active)||!active.length)
  throw new Error('No eligible front-line actors; rotate to living reserves');
 // Stable active-array order is currently the existing tie convention:
 // front positions within team A, then team B. Do not silently change it.
 const delta=Math.min(...active.map(member=>member.wait));
 for(const member of active)member.wait=Math.max(0,member.wait-delta);
 const scheduled=active.find(member=>member.wait===0);
 const decision=openingPriority?.choose({
  frontIds:active.map(member=>member.id),
  waits:active.map(member=>member.wait),
  scheduledId:scheduled.id
 });
 const actor=decision?active.find(member=>member.id===decision.actorId):scheduled;
 // Research-only Flash policy: preserve both its original branch and order.
 if(decision?.skippedId&&decision.skippedTurnPolicy==='consume')
  scheduled.wait=scheduled.cost*actionWait/3;
 actor.wait=actor.cost*actionWait/3;
 if(decision)openingPriority.commit(decision);
 return {delta,scheduled,actor,decision};
}
