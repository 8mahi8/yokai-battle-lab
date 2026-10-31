/**
 * V3-2: shared authoritative effect COMMIT boundary, not a source of
 * unverified YW2 damage/crit/resistance formulae.
 *
 * It commits ALREADY-resolved effects in the existing event order:
 *  damage -> survival hook -> (caller handles interruption, KO, Soul)
 *  heal -> bounded HP mutation
 *  inspirit -> ledger write -> canAct sync
 *
 * Hit/crit/resistance, random rolls, accuracy, target choice, skill priority
 * and winner timing remain with the source-aware combat resolver while those
 * uncertainties are researched. Do not move RNG or change original rules.
 */
export function createEffectCommitter({
 resolveDirectDamage,onSurvival,applyStatus,onStatus
}={}){
 for(const [name,callback] of Object.entries({
  resolveDirectDamage,onSurvival,applyStatus,onStatus
 })){
  if(typeof callback!=='function')throw new TypeError(name+' function required');
 }
 const hpTarget=target=>{
  if(!target||typeof target.id!=='string'||
     !Number.isInteger(target.hp)||target.hp<0||
     !Number.isInteger(target.maxHp)||target.maxHp<1||
     target.hp>target.maxHp)throw new TypeError('valid canonical HP target required');
 };
 const amountValid=amount=>{
  if(!Number.isSafeInteger(amount)||amount<0)
   throw new RangeError('nonnegative integer effect magnitude required');
 };
 function commitDamage(target,amount){
  hpTarget(target);amountValid(amount);
  const outcome=resolveDirectDamage(target,amount);
  if(!outcome||!Number.isInteger(outcome.hpAfter)||
     !Number.isInteger(outcome.amount)||typeof outcome.activated!=='boolean'||
     outcome.hpAfter<0||outcome.hpAfter>target.maxHp)
   throw new TypeError('invalid resolved damage outcome');
  target.hp=outcome.hpAfter;
  if(outcome.activated)onSurvival(target,outcome);
  return outcome;
 }
 function commitHeal(target,amount){
  hpTarget(target);amountValid(amount);
  const before=target.hp;
  target.hp=Math.min(target.maxHp,before+amount);
  return {amount:target.hp-before,hpAfter:target.hp};
 }
 /**
  * Opt-in owner's-turn HP-over-time research uses a DISTINCT effect channel.
  * The legacy YW2 research fixture does not trigger direct-hit Last Stand,
  * charge interruption or a KO passive from such ticks. The source game
  * priority is NOT verified yet; preserve that separation explicitly.
  */
 function commitTimedHp(target,{kind,amount}={}){
  hpTarget(target);amountValid(amount);
  if(kind!=='loss'&&kind!=='regen')
   throw new RangeError('timed HP must be loss or regen');
  const before=target.hp;
  if(kind==='loss')target.hp=Math.max(0,before-amount);
  else target.hp=Math.min(target.maxHp,before+amount);
  return {kind,amount:Math.abs(target.hp-before),hpAfter:target.hp};
 }
 function commitStatus(spec){
  if(!spec||typeof spec.id!=='string'||!spec.id)
   throw new TypeError('status target ID required');
  const result=applyStatus(spec);
  onStatus(spec.id,result);
  return result;
 }
 return Object.freeze({commitDamage,commitHeal,commitTimedHp,commitStatus});
}
