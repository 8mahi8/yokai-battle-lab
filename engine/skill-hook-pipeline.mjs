/**
 * Engine V3-2: one host-side passive skill event dispatcher.
 *
 * Original YW2 skill TRIGGER descriptions have sources, but exact magnitudes
 * and ordering are not fully verified. This extracts CURRENT host behavior
 * verbatim; it does not claim to establish the original's frame ordering.
 *
 * Calls are from the authoritative combat owner, never the browser. The
 * handler registry can grow without adding skill-specific branches to the
 * ordinary physical/special/poke move resolvers.
 */
import {careAtActionBoundary,SKILL_TRIAL,critSkillBonus,resolveLastStand} from './skill-effects.mjs';
import {PLAYTEST_SKILL_CATALOG} from '../content/skill-catalog.mjs';

// No second list of skill trigger definitions. The existing immutable
// content catalog is the authoring source of truth for each skill's phase
// and effect kind; only the executable handlers live in the engine.
export const SKILL_HOOK_CATALOG=Object.freeze(Object.fromEntries(
 PLAYTEST_SKILL_CATALOG.map(({legacyKey,trigger,effect})=>[
  legacyKey,Object.freeze({trigger,effect})
 ])
));

export function createSkillHookPipeline({enabled,skillOf,teams,boosts,byId,emit,commitHeal}={}){
 if(typeof enabled!=='boolean'||typeof skillOf!=='function'||
    !Array.isArray(teams)||teams.length!==2||
    !(boosts instanceof Map)||!(byId instanceof Map)||
    typeof emit!=='function'||typeof commitHeal!=='function')
  throw new TypeError('skill hook pipeline requires canonical host dependencies');

 // The catalog declares *when* each passive fires. Keep the existing
 // mathematical primitives intact until YW2-specific numbers are verified.
 // These methods are pure: none may draw RNG or mutate canonical state.
 function hasTrigger(member,trigger){
  return enabled&&SKILL_HOOK_CATALOG[skillOf(member)]?.trigger===trigger;
 }
 function beforeCriticalRoll(actor,baseBonus){
  if(!Number.isSafeInteger(baseBonus)||baseBonus<0||baseBonus>98)
   throw new RangeError('base critical bonus must be 0..98');
  return Math.min(98,baseBonus+
   (hasTrigger(actor,'on_critical_roll')?critSkillBonus(skillOf(actor)):0));
 }
 function beforeDefenderCriticalRoll(defender,baseImmune=false){
  if(typeof baseImmune!=='boolean')
   throw new TypeError('base critical immunity must be boolean');
  return baseImmune||hasTrigger(defender,'on_defender_critical_roll');
 }
 function beforeGuardedPhysicalHit(attacker,baseGuardBreak=false){
  if(typeof baseGuardBreak!=='boolean')
   throw new TypeError('base guard break must be boolean');
  return baseGuardBreak||hasTrigger(attacker,'on_guarded_physical_hit');
 }
 function beforeLethalDamage(target,amount,spent=false){
  return resolveLastStand({
   skill:hasTrigger(target,'before_lethal_damage')?'lastStand':null,
   hp:target.hp,amount,spent
  });
 }
 const onEnemyKO=Object.freeze({
  momentum(caster,target){
   boosts.set(caster.id,{remainingTurns:SKILL_TRIAL.momentumOwnerTurns});
   emit({type:'skill',actor:caster.id,targetId:target.id,skill:'momentum',
    label:'まえのめり型',kind:'発動',remainingTurns:SKILL_TRIAL.momentumOwnerTurns});
  }
 });
 function afterEnemyKO(caster,target){
  if(!enabled||caster.side===target.side)return;
  const skill=skillOf(caster);
  if(SKILL_HOOK_CATALOG[skill]?.trigger!=='after_ko')return;
  const handler=onEnemyKO[skill];
  if(handler)handler(caster,target);
 }
 function afterAnyAction(actor,existingBoost){
  if(!enabled)return;
  // The order of Care messages and the owner-boost tick is a legacy
  // rule. The actual YW2 intra-frame priority is NOT established.
  for(const healed of careAtActionBoundary({teams,skillOf})){
   const recipient=byId.get(healed.targetId);
   commitHeal(recipient,healed.amount);
   emit({type:'skill',...healed,label:'おせわ型',kind:'回復'});
  }
  // A boost activated by a KO in this same action must not consume one of
  // its five FUTURE owner turns. Object identity makes that explicit.
  const active=boosts.get(actor.id);
  if(existingBoost&&active===existingBoost){
   existingBoost.remainingTurns--;
   if(existingBoost.remainingTurns===0){
    boosts.delete(actor.id);
    emit({type:'skill',actor:actor.id,skill:'momentum',
     label:'まえのめり型',kind:'終了',remainingTurns:0});
   }
  }
 }
 return Object.freeze({afterEnemyKO,afterAnyAction,beforeCriticalRoll,
  beforeDefenderCriticalRoll,beforeGuardedPhysicalHit,beforeLethalDamage});
}
