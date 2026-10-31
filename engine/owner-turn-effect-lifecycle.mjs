/**
 * V3-2: owner-turn HP statuses and global/owner-turn expiry lifecycle.
 *
 * Same legacy order:
 *  (1) at action end calculate + commit owner's opt-in HP Inspirit tick;
 *  (2) host emits action, applies Care and Soul effects;
 *  (3) only then decrement global/owner-turn Inspirit durations.
 *
 * DoT magnitude/netting and lethal/skill priority are research fixtures.
 * No new original-game mechanics are inferred by centralizing the boundary.
 */
import {calculateTurnInspirit} from './turn-inspirit.mjs';

export function createOwnerTurnEffectLifecycle({
 statuses,effects,syncEligibility,refreshPins
}={}){
 if(!statuses||typeof statuses.list!=='function'||
    typeof statuses.tick!=='function'||!effects||
    typeof effects.commitTimedHp!=='function'||
    typeof syncEligibility!=='function'||
    typeof refreshPins!=='function')
  throw new TypeError('owner-turn effects need canonical host dependencies');
 function applyHpTick(actor){
  if(!actor||typeof actor.id!=='string'||!actor.id||
     !Number.isSafeInteger(actor.hp)||!Number.isSafeInteger(actor.maxHp)||
     actor.hp<0||actor.maxHp<1||actor.hp>actor.maxHp)
   throw new TypeError('valid owner-turn combatant required');
  if(actor.hp===0)return null; // KO members do not take an owner action.
  const next=calculateTurnInspirit({
   statuses:statuses.list(actor.id),currentHp:actor.hp,maxHp:actor.maxHp
  });
  if(next.amount===0)return null;
  const committed=effects.commitTimedHp(actor,{
   kind:next.kind,amount:next.amount
  });
  if(committed.amount!==next.amount||committed.hpAfter!==next.hpAfter)
   throw new Error('timed HP research calculation and canonical commit disagree');
  if(actor.hp===0){syncEligibility(actor.id);refreshPins();}
  return {id:actor.id,...next};
 }
 function expireAfterAction(actorId){
  if(typeof actorId!=='string'||!actorId)
   throw new TypeError('action owner id required');
  const expired=statuses.tick({actorId});
  for(const entry of expired)syncEligibility(entry.id);
  return expired;
 }
 return Object.freeze({applyHpTick,expireAfterAction});
}
