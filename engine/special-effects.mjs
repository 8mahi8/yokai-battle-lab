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
 debuff:Object.freeze(['strength-down','defense-down','spirit-down','sleep'])
});
export function validateSpecialSpec(spec) {
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw new TypeError('research special config required');
 if(!['damage','heal','buff','debuff','revive','drain','damage-status'].includes(spec.kind))throw new RangeError('unsupported special.kind');
 if(!['one','front'].includes(spec.scope))throw new RangeError('special.scope one/front required');
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
 // A revived ally can be a KO reserve. The caller supplies all six allies
 // for revive, not only the current living front; a single KO is restored.
 if(rule.kind==='revive'){
  const target=allies.find(x=>x.hp===0);
  if(!target)return [];
  const amount=Math.min(target.maxHp,Math.floor(power));
  return [{targetId:target.id,kind:'revive',amount,deltaHp:amount,
   hpBefore:0,hpAfter:amount,predictedKO:false,revived:true,
   model:'revival-playtest-fixture'}];
 }
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
