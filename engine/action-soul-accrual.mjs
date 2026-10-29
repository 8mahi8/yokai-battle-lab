/**
 * V3-2: the three currently supported Soul accrual research policies.
 *
 * This is an ACTION-BOUNDARY commit, NOT a declaration of the original YW2
 * gain rate. No random consumption, screen animation, charge preparation,
 * interruption or Soul capacity formula belongs in this module.
 *
 * Host order preserved: action -> Care & skill cleanup -> view event ->
 * accrue Soul -> expire Inspirits. HP-over-time has already been applied.
 */
import {PLAYTEST_SOUL_TUNING} from './playtest-soul-tuning.mjs';

export function createActionSoulAccrual({
 soul,teams,statuses,loafingActors,
 researchSoulGainPerAction=0,playtestSoulTuning=false,
 researchSoulRecoveryMode='none'
}={}){
 if(!soul||typeof soul.snapshot!=='function'||typeof soul.addSoul!=='function'||
    !Array.isArray(teams)||teams.length!==2||
    !teams.every(t=>Array.isArray(t)&&t.length===6)||
    !statuses||typeof statuses.list!=='function'||
    !(loafingActors instanceof Set)||
    !Number.isSafeInteger(researchSoulGainPerAction)||researchSoulGainPerAction<0||
    typeof playtestSoulTuning!=='boolean'||
    !['none','owner-nonattack'].includes(researchSoulRecoveryMode))
  throw new TypeError('canonical Soul accrual dependencies and mode required');

 function afterAction({actor,kind,techniqueKind,hit,target,action}={}){
  if(!actor||typeof actor.id!=='string'||!actor.id||
    ![0,1].includes(actor.side)||typeof kind!=='string'||
    typeof hit!=='boolean'||!action||typeof action!=='object')
   throw new TypeError('valid resolved action required');

  // Existing explicit research mode accrues to ALL living units, including
  // bench. It does not imply that YW2 uses this exact mechanic.
  if(researchSoulGainPerAction>0){
   for(const member of teams.flat())
    if(member.hp>0)soul.addSoul(member.id,researchSoulGainPerAction);
  }
  if(playtestSoulTuning){
   const didDamageAction=kind==='attack'||
    (kind==='technique'&&techniqueKind==='damage');
   const vulnerableHit=didDamageAction&&hit&&target!==null&&
    (loafingActors.has(target.id)||
     statuses.list(target.id).some(x=>x.sign==='negative'));
   const plannedGain=didDamageAction
    ?(kind==='attack'?PLAYTEST_SOUL_TUNING.attackGain:
      PLAYTEST_SOUL_TUNING.techniqueGain)+
      (vulnerableHit?PLAYTEST_SOUL_TUNING.vulnerableHitBonus:0)
    :PLAYTEST_SOUL_TUNING.nonAttackGain;
   if(actor.hp>0){
    const before=soul.snapshot().teams[actor.side].find(x=>x.id===actor.id).soul;
    const after=soul.addSoul(actor.id,plannedGain);
    action.soulPlaytest={model:'playtest-estimate',
     gained:after-before,vulnerableHit,plannedGain};
   }
  }else if(researchSoulRecoveryMode==='owner-nonattack'){
   const didNotAttack=kind==='guard'||kind==='loaf'||kind==='inspirit'||
    (kind==='technique'&&techniqueKind==='heal');
   if(didNotAttack&&actor.hp>0)soul.addSoul(actor.id,5);
  }
 }
 return Object.freeze({afterAction});
}
