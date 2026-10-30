/**
 * V3-2: one source-aware host coordinator for the phases AFTER an HP hit.
 *
 * Legacy battle behavior deliberately uses DIFFERENT policies:
 * - Ordinary: hit -> charge interruption -> KO and pin refresh.
 * - Special per-hit research: interrupt each hit, but KO is handled after
 *   the whole impact (no new mid-combo KO hook).
 * - Special aggregate: interrupt once unless per-hit, then KO using
 *   legacy 'after-skill' eligibility ordering, else revive eligibility.
 *
 * This module changes no hit damage, RNG, timing, Soul or passive effect
 * formula. Source-backed charge cancellation is distinct from the still-
 * unverified original YW2 intra-frame KO/skill hook ordering.
 */
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const magnitude=x=>Number.isSafeInteger(x)&&x>=0;
const boolean=x=>typeof x==='boolean';
const damageKinds=new Set(['damage','drain','damage-status']);

export function createHitAftermath({interrupt,knockout,syncRevived}={}){
 if(typeof interrupt!=='function'||!object(knockout)||
    typeof knockout.commitForCause!=='function'||typeof syncRevived!=='function')
  throw new TypeError('hit aftermath needs canonical host callbacks');
 function checkHit(target,damage,critical){
  if(!object(target)||typeof target.id!=='string'||!target.id||
     !Number.isSafeInteger(target.hp)||target.hp<0||
     !magnitude(damage)||!boolean(critical))
   throw new TypeError('valid resolved target/damage/critical required');
 }
 function checkCaster(caster){
  if(!object(caster)||typeof caster.id!=='string'||!caster.id)
   throw new TypeError('valid canonical caster required');
 }
 function afterOrdinaryHit({caster,target,damage,critical=false,friendlyFire=false}={}){
  checkCaster(caster);checkHit(target,damage,critical);
  if(typeof friendlyFire!=='boolean'||
     (friendlyFire&&caster.side!==target.side))
    throw new TypeError('friendly-fire KO requires a same-side attack');
  const interrupted=interrupt(target,damage,critical);
  if(target.hp===0)knockout.commitForCause(friendlyFire
    ?{cause:'friendly-fire',target}:{cause:'ordinary',caster,target});
  return interrupted;
 }
 function afterSpecialStrike({target,damage,critical=false}={}){
  checkHit(target,damage,critical);
  // Research multihit special performs its interrupt for EACH real hit
  // and defers its KO hook until the whole impacted target is resolved.
  return interrupt(target,damage,critical);
 }
 function afterSpecialImpact({
  caster,target,impact,perHit=false,onInterrupt=()=>{}
 }={}){
  checkCaster(caster);
  if(!object(impact)||typeof impact.kind!=='string'||
     typeof impact.predictedKO!=='boolean'||!boolean(perHit)||
     typeof onInterrupt!=='function')
   throw new TypeError('valid resolved special impact required');
  checkHit(target,damageKinds.has(impact.kind)?impact.amount??0:0,false);
  // The legacy special uses a single aggregate interruption roll for
  // damage/drain/damage-status, but never repeats that roll for multihit.
  if(!(perHit&&impact.kind==='damage')&&damageKinds.has(impact.kind)){
   const changed=interrupt(target,impact.amount,false);
   if(changed)onInterrupt(changed);
  }
  if(impact.predictedKO){
   knockout.commitForCause({cause:'special',caster,target});
  }else if(impact.kind==='revive'&&impact.revived){
   syncRevived(target.id);
  }
 }
 return Object.freeze({afterOrdinaryHit,afterSpecialStrike,afterSpecialImpact});
}
