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
import {careAtActionBoundary,SKILL_TRIAL} from './skill-effects.mjs';

export const SKILL_HOOK_CATALOG=Object.freeze({
 momentum:Object.freeze(['afterEnemyKO','afterOwnerAction']),
 care:Object.freeze(['afterAnyAction']),
 lastStand:Object.freeze(['beforeLethalDamage']),
 critImmune:Object.freeze(['beforeCriticalRoll']),
 sharpCrit:Object.freeze(['beforeCriticalRoll']),
 guardBreak:Object.freeze(['beforeGuard'])
});

export function createSkillHookPipeline({enabled,skillOf,teams,boosts,byId,emit,commitHeal}={}){
 if(typeof enabled!=='boolean'||typeof skillOf!=='function'||
    !Array.isArray(teams)||teams.length!==2||
    !(boosts instanceof Map)||!(byId instanceof Map)||
    typeof emit!=='function'||typeof commitHeal!=='function')
  throw new TypeError('skill hook pipeline requires canonical host dependencies');

 const onEnemyKO=Object.freeze({
  momentum(caster,target){
   boosts.set(caster.id,{remainingTurns:SKILL_TRIAL.momentumOwnerTurns});
   emit({type:'skill',actor:caster.id,targetId:target.id,skill:'momentum',
    label:'まえのめり型',kind:'発動',remainingTurns:SKILL_TRIAL.momentumOwnerTurns});
  }
 });
 function afterEnemyKO(caster,target){
  if(!enabled||caster.side===target.side)return;
  const handler=onEnemyKO[skillOf(caster)];
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
 return Object.freeze({afterEnemyKO,afterAnyAction});
}
