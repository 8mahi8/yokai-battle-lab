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
export function validateSpecialSpec(spec) {
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw new TypeError('research special config required');
 if(!['damage','heal'].includes(spec.kind))throw new RangeError('special.kind damage/heal required');
 if(!['one','front'].includes(spec.scope))throw new RangeError('special.scope one/front required');
 if(!Number.isInteger(spec.power)||spec.power<1||spec.power>999)throw new RangeError('special.power 1..999 required');
 if(spec.kind==='damage'&&!['attack','technique'].includes(spec.damageKind))throw new RangeError('damageKind attack/technique required');
 if(spec.kind==='heal'&&spec.scope==='one')throw new RangeError('heal-one not researched yet');
 return Object.freeze({kind:spec.kind,scope:spec.scope,power:spec.power,
  damageKind:spec.kind==='damage'?spec.damageKind:null});
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
 const living=rule.kind==='heal'?allies.filter(x=>x.hp>0):enemies.filter(x=>x.hp>0);
 const targets=rule.scope==='front'?living:
  [(living.find(x=>x.id===pinnedId)||living[0])].filter(Boolean);
 return targets.map(target=>{
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
   predictedKO:rule.kind==='damage'&&target.hp<=amount,
   model:'one-hit-research-fixture'};
 });
}
