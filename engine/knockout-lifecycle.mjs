/**
 * V3-2 shared KO commit hook. All three damage paths ultimately use it:
 * ordinary/multihit, special effects, and Poke.
 *
 * The source engine currently differs in whether eligibility is synchronized
 * immediately before or just after the on-KO passive-skill hook. Preserve
 * that order as explicit policy until original YW2 evidence resolves it.
 * Poke does not currently give the player an actor KO counter/skill trigger.
 *
 * Only call after a real HP transition to zero (not a predicted hit or a
 * survived lethal blow). This coordinator does NOT determine winner or
 * interrupt a charging target; the existing resolver controls those.
 */
export function createKnockoutLifecycle({
 syncEligibility,afterEnemyKO,refreshPins
}={}){
 for(const [name,fn] of Object.entries({syncEligibility,afterEnemyKO,refreshPins}))
  if(typeof fn!=='function')throw new TypeError(name+' callback required');
 function commit({target,caster=null,eligibilityPhase='before-skill',refreshPin=false}={}){
  if(!target||typeof target.id!=='string'||target.hp!==0)
   throw new RangeError('KO hook requires a zero-HP target');
  if(!['before-skill','after-skill'].includes(eligibilityPhase))
   throw new RangeError('invalid eligibility synchronization phase');
  if(typeof refreshPin!=='boolean')throw new TypeError('refreshPin must be boolean');
  if(caster!==null&&
     (!Number.isSafeInteger(caster.knockouts)||caster.knockouts<0))
   throw new TypeError('knockout actor requires nonnegative counter');
  if(eligibilityPhase==='before-skill')syncEligibility(target.id);
  if(caster){
   caster.knockouts++;
   afterEnemyKO(caster,target);
  }
  if(eligibilityPhase==='after-skill')syncEligibility(target.id);
  if(refreshPin)refreshPins();
 }
 return Object.freeze({commit});
}
