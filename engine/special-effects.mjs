/**
 * Research-only SOULTIMATE EFFECTS, explicitly NOT verified YW2 move data.
 * Categories (attack / team heal, single / all front) are source-grounded:
 * https://www.mtwildwood.net/soultimates.php
 * One-hit neutral damage uses documented YW2 base shapes:
 * https://mtwildwood.net/damage.php?g=yw2
 * This version intentionally omits multi-hit processing, misses/critical,
 * original per-move effects, elemental bonuses, skill stacks and animations.
 * "power", heal flat values and targets are test fixture values only.
 */
// Preserve the original attack/heal research API. Status types reuse the
// already-tested Inspirit ledger; they are role-inspired PLAYTEST effects,
// not an assertion of exact Yo-kai 2 character move/level data.
const SPECIAL_STATUS_EFFECTS=Object.freeze({
 buff:Object.freeze(['strength-up']),
 debuff:Object.freeze(['strength-down','defense-down','spirit-down','sleep','friendly-fire'])
});
export function validateSpecialSpec(spec) {
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw new TypeError('research special config required');
 if(!['damage','heal','buff','debuff','revive','revive-heal','drain','damage-status','dispel'].includes(spec.kind))throw new RangeError('unsupported special.kind');
 if(!['one','front','team'].includes(spec.scope))throw new RangeError('unsupported special.scope');
 if(spec.kind==='revive-heal'&&spec.scope!=='team')
  throw new RangeError('revive-heal must target whole team');
 if(spec.kind!=='revive-heal'&&spec.scope==='team')
  throw new RangeError('team scope is reserved for revive-heal');
 if(spec.kind==='dispel'){
  // This validator is also called on its own normalized result by the
  // Soultimate compiler; accept only the canonical metadata it emits.
  if(spec.scope!=='front'||
     Object.keys(spec).some(k=>!['kind','scope','power','damageKind'].includes(k))||
     (spec.power!==undefined&&spec.power!==1)||
     (spec.damageKind!==undefined&&spec.damageKind!==null))
   throw new RangeError('dispel requires front scope and no damage/status fixture');
  return Object.freeze({kind:'dispel',scope:'front',power:1,damageKind:null});
 }
 if(spec.kind==='buff'||spec.kind==='debuff'){
  if(!SPECIAL_STATUS_EFFECTS[spec.kind].includes(spec.effect))
   throw new RangeError('unsupported special status effect');
  if(!Number.isInteger(spec.level)||spec.level<1||spec.level>4)
   throw new RangeError('status level 1..4 required');
  if(spec.scope!=='front')
   throw new RangeError('status specials currently target the living front');
  return Object.freeze({kind:spec.kind,scope:spec.scope,power:1,
   damageKind:null,effect:spec.effect,level:spec.level});
 }
 if(!Number.isInteger(spec.power)||spec.power<1||spec.power>999)
  throw new RangeError('special.power 1..999 required');
 if(['damage','drain','damage-status'].includes(spec.kind)&&
  !['attack','technique'].includes(spec.damageKind))
  throw new RangeError('damageKind attack/technique required');
 if(spec.kind==='heal'&&spec.scope==='one')throw new RangeError('heal-one not researched yet');
 if(spec.kind==='revive'&&spec.scope!=='one')
  throw new RangeError('revive-one only until original targeting is verified');
 if(spec.kind==='damage-status'){
  if(!SPECIAL_STATUS_EFFECTS.debuff.includes(spec.effect))
   throw new RangeError('unsupported damage-status effect');
  if(!Number.isInteger(spec.level)||spec.level<1||spec.level>4)
   throw new RangeError('damage-status level 1..4 required');
 }
 return Object.freeze({kind:spec.kind,scope:spec.scope,power:spec.power,
  damageKind:['damage','drain','damage-status'].includes(spec.kind)?spec.damageKind:null,
  ...(spec.kind==='damage-status'?{effect:spec.effect,level:spec.level}:{})});
}
/**
 * Select ally candidates from the SAME resolved Soultimate definition that
 * planResearchSpecial will execute. Previously the host passed the catalog
 * definition for effects, but still used caster.special.kind (legacy data)
 * to decide whether KO reserves could be revived.
 *
 * This is a selection-only function; it never heals or revives anyone.
 */
export function researchSpecialAllies(spec,wholeTeam,livingFront){
 const resolved=validateSpecialSpec(spec);
 if(!Array.isArray(wholeTeam)||!Array.isArray(livingFront))
  throw new TypeError('special ally candidate arrays required');
 return ['revive','revive-heal'].includes(resolved.kind)?wholeTeam:livingFront;
}
function checkCombatant(member) {
 if(!member||!Number.isInteger(member.hp)||!Number.isInteger(member.maxHp)||
  !Number.isFinite(member.defense)||member.hp<0||member.maxHp<1||member.hp>member.maxHp)
  throw new TypeError('invalid snapshot combatant');
}
export function planResearchSpecial({spec,caster,allies,enemies,powerMultiplier=1,pinnedId=null}={}) {
 const rule=validateSpecialSpec(spec);
 if(!caster||!Number.isFinite(caster.strength)||!Number.isFinite(caster.spirit))
  throw new TypeError('valid caster stats required');
 if(!Array.isArray(allies)||!Array.isArray(enemies))
  throw new TypeError('allies and enemies arrays required');
 // A side may temporarily have zero living front-line targets while reserves
 // are still alive. A finished special then has no valid target, not a crash.
 for(const member of [...allies,...enemies])checkCombatant(member);
 if(!Number.isFinite(powerMultiplier)||powerMultiplier<1||powerMultiplier>10)
  throw new RangeError('invalid G power multiplier');
 const power=rule.power*powerMultiplier;
 // Only the combined recovery (Hanasaka-jii / Shino-baa archetype)
 // restores the entire six-member roster, with living members healed and
 // KO members revived in the same effect. HP numbers remain a playtest guess.
 // The caller must pass ALL six same-side allies, including KO reserves.
 if(rule.kind==='revive-heal'){
  return allies.map(target=>{
   const amount=Math.min(target.maxHp-target.hp,Math.floor(power));
   const revived=target.hp===0;
   return {targetId:target.id,kind:revived?'revive':'heal',
    amount,deltaHp:amount,hpBefore:target.hp,hpAfter:target.hp+amount,
    predictedKO:false,...(revived?{revived:true}:{}),
    linkedReviveHeal:true,model:'team-revive-heal-playtest-fixture'};
  });
 }
 // Odenjin-style single-unit revival remains separately supported.
 if(rule.kind==='revive'){
  const target=allies.find(x=>x.hp===0);
  if(!target)return [];
  const amount=Math.min(target.maxHp,Math.floor(power));
  return [{targetId:target.id,kind:'revive',amount,deltaHp:amount,
   hpBefore:0,hpAfter:amount,predictedKO:false,revived:true,
   model:'revival-playtest-fixture'}];
 }
 // Original YW2 Wazzat: remove positive Inspirits from the living enemy
 // front; the canonical ledger determines what actually existed/was removed.
 if(rule.kind==='dispel')return enemies.filter(x=>x.hp>0).map(target=>({
  targetId:target.id,kind:'dispel',amount:0,deltaHp:0,
  hpBefore:target.hp,hpAfter:target.hp,predictedKO:false,
  removeSign:'positive',model:'source-yw2-positive-inspirit-dispel'
 }));
 const friendly=rule.kind==='heal'||rule.kind==='buff';
 const living=(friendly?allies:enemies).filter(x=>x.hp>0);
 const targets=rule.scope==='front'?living:
  [(living.find(x=>x.id===pinnedId)||living[0])].filter(Boolean);
 const impacts=targets.map(target=>{
  if(rule.kind==='buff'||rule.kind==='debuff'){
   return {targetId:target.id,kind:rule.kind,amount:0,deltaHp:0,
    hpBefore:target.hp,hpAfter:target.hp,predictedKO:false,
    statusEffect:rule.effect,statusSign:rule.kind==='buff'?'positive':'negative',
    statusLevel:Math.min(4,Math.max(1,Math.floor(rule.level*powerMultiplier))),
    model:'status-playtest-fixture'};
  }
  let amount;
  if(rule.kind==='heal') {
   // Placeholder flat healing; an original healing equation is NOT established.
   amount=Math.min(target.maxHp-target.hp,Math.floor(power));
  }else {
   const x=power+(rule.damageKind==='attack'?caster.strength:caster.spirit);
   const initial=rule.damageKind==='attack'?x/2-target.defense/4:
    x/10+x/3-target.defense/7;
   const unguarded=Math.max(1,Math.min(999,Math.floor(initial)));
   // Guard reduction is sourced, but detailed on-hit modifiers aren't present.
   const damage=target.guard?Math.max(1,Math.floor(unguarded/2)):unguarded;
   amount=Math.min(target.hp,damage);
  }
  return {targetId:target.id,kind:rule.kind,amount,
   deltaHp:rule.kind==='heal'?amount:-amount,
   hpBefore:target.hp,hpAfter:target.hp+(rule.kind==='heal'?amount:-amount),
   predictedKO:rule.kind!=='heal'&&target.hp<=amount,
   ...(rule.kind==='damage-status'?{
     statusEffect:rule.effect,statusSign:'negative',
     statusLevel:Math.min(4,Math.max(1,Math.floor(rule.level*powerMultiplier)))
   }:{}),
   model:'one-hit-research-fixture'};
 });
 if(rule.kind==='drain'){
  // Provisional: half of REAL drained HP is shared over the living ally
  // front. No benefit from overkill, and no HP duplication or resurrection.
  let budget=Math.floor(impacts.reduce((sum,x)=>sum+x.amount,0)/2);
  if(budget<=0)return impacts; // no enemy HP drained means no healing at all
  const recipients=allies.filter(x=>x.hp>0&&x.hp<x.maxHp);
  for(let i=0;i<recipients.length;i++){
   const target=recipients[i],share=Math.ceil(budget/(recipients.length-i));
   const healed=Math.min(target.maxHp-target.hp,share);
   impacts.push({targetId:target.id,kind:'heal',amount:healed,deltaHp:healed,
     hpBefore:target.hp,hpAfter:target.hp+healed,predictedKO:false,
     linkedDrain:true,model:'drain-team-heal-playtest-fixture'});
   budget-=healed;
  }
 }
 return impacts;
}
