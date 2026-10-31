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
/**
 * The three CURRENT host policies, not claims about exact original YW2
 * intra-frame timing. A KO cause owns its skill-eligibility ordering, pin
 * refresh and actor credit; callers must not invent local combinations.
 */
export const KO_CAUSE_POLICY=Object.freeze({
 ordinary:Object.freeze({eligibilityPhase:'before-skill',refreshPin:true,creditCaster:true}),
 special:Object.freeze({eligibilityPhase:'after-skill',refreshPin:false,creditCaster:true}),
 poke:Object.freeze({eligibilityPhase:'before-skill',refreshPin:true,creditCaster:false}),
 // Confused ally hits can KO, but do not credit an enemy KO skill.
 'friendly-fire':Object.freeze({eligibilityPhase:'before-skill',refreshPin:true,creditCaster:false})
});

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
 function commitForCause({cause,caster=null,target}={}){
  if(!Object.hasOwn(KO_CAUSE_POLICY,cause))
   throw new RangeError('unknown KO cause');
  const policy=KO_CAUSE_POLICY[cause];
  if(policy.creditCaster&&caster===null)
   throw new TypeError('KO cause requires credited actor');
  if(!policy.creditCaster&&caster!==null)
   throw new TypeError('KO cause does not credit an actor');
  return commit({target,caster,eligibilityPhase:policy.eligibilityPhase,
   refreshPin:policy.refreshPin});
 }
 return Object.freeze({commit,commitForCause});
}
