/**
 * Engine V3-4-17: a shared OWNER-TURN decision for YW2 friendly-fire
 * Inspirits. Sources distinguish the described effect/level/chance from
 * the still unverified exact ally-target distribution and priority.
 *
 * IMPORTANT: the same source reports Lv1=10% and Lv5=50% per affected
 * owner's action. We use the existing seeded host RNG, never Math.random.
 * Uniform choice from OTHER living front-line allies is an explicitly
 * RESEARCH-ONLY target fixture, not an asserted original YW2 targeting rule.
 *
 * https://www.mtwildwood.net/yw2/yokai/wazzat
 * https://www.mtwildwood.net/yw2/yokai/houzzat
 * https://www.mtwildwood.net/inspirits.php?g=yw2
 * https://game8.jp/youkai-watch2/496843
 */
export const YW2_FRIENDLY_FIRE=Object.freeze({
 effect:'friendly-fire',chancePerLevelPercent:10,maxLevel:5,
 originalTargetSelection:'unknown',
 researchTargetSelection:'uniform-living-front-allies-except-actor',
 sourceRefs:Object.freeze([
  'https://www.mtwildwood.net/yw2/yokai/wazzat',
  'https://www.mtwildwood.net/yw2/yokai/houzzat',
  'https://www.mtwildwood.net/inspirits.php?g=yw2'
 ])
});
const validRoll=(roll)=>{
 if(typeof roll!=='number'||!Number.isFinite(roll)||roll<0||roll>=1)
  throw new RangeError('confusion RNG must return a number in [0,1)');
 return roll;
};
/**
 * Return null if no friendly-fire status exists, consuming no RNG.
 * Otherwise a frozen turn resolution. The status's persistence and
 * purification belong to the existing InspiritLedger (not a second store).
 * In this research version, multiple applied statuses sum their levels up
 * to 5; original same-effect stacking order has not been frame-verified.
 */
export function planYw2FriendlyFire({actor,statuses,allies,random}={}){
 if(!actor||typeof actor.id!=='string'||!actor.id||
    ![0,1].includes(actor.side)||!Number.isSafeInteger(actor.hp)||actor.hp<=0||
    !Array.isArray(statuses)||!Array.isArray(allies)||
    typeof random!=='function')
  throw new TypeError('valid YW2 confusion owner/status/front/RNG required');
 const affected=statuses.filter(s=>s?.effect==='friendly-fire');
 if(!affected.length)return null;
 if(affected.some(s=>s.sign!=='negative'||!Number.isSafeInteger(s.level)||
   s.level<1||s.level>4))
  throw new TypeError('invalid negative friendly-fire Inspirit ledger entry');
 const level=Math.min(YW2_FRIENDLY_FIRE.maxLevel,
  affected.reduce((sum,s)=>sum+s.level,0));
 const chancePercent=level*YW2_FRIENDLY_FIRE.chancePerLevelPercent;
 const candidates=allies.filter(m=>m&&m.id!==actor.id&&m.side===actor.side&&
  Number.isSafeInteger(m.hp)&&m.hp>0);
 if(!candidates.length)return Object.freeze({
  active:true,triggered:false,level,chancePercent,targetId:null,
  reason:'no_other_living_front_ally',targetModel:'research-unverified'
 });
 const triggered=validRoll(random())*100<chancePercent;
 const target=triggered?candidates[
  Math.floor(validRoll(random())*candidates.length)]:null;
 return Object.freeze({active:true,triggered,level,chancePercent,
  targetId:target?.id??null,reason:triggered?'friendly_fire':'chance_not_triggered',
  targetModel:'research-unverified'});
}
