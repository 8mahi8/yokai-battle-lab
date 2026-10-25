/**
 * Small original-inspired YW2 automatic Skill primitives.
 * Mechanics sources and original-vs-fixture boundaries:
 * docs/PHASE34_SKILL_PARITY_FIRST_20261026.md
 *
 * Skill means a PASSIVE automatic ability, never the same thing as a
 * Soultimate, Technique, Inspirit, or the motion visibility gate.
 */
export const RENTAL_SKILLS=Object.freeze({
 momentum:'まえのめり型',
 care:'おせわ型',
 sharpCrit:'いっせん型'
});
export const SKILL_TRIAL=Object.freeze({
 momentumStages:2,          // sourced: STR and SPR +2 stages (×1.2)
 momentumOwnerTurns:5,      // sourced: for five subsequent owner actions
 careMaxHpFraction:.02,    // sourced: 2% after each adjacent owner's action
 sharpCritBonusUnits:5     // PROVISIONAL: exact skill crit-roll bonus unverified
});
export function validateRentalSkill(skill){
 if(skill===null||skill===undefined)return null;
 if(!Object.hasOwn(RENTAL_SKILLS,skill))throw new RangeError('unknown rental skill');
 return skill;
}
export function critSkillBonus(skill){
 return validateRentalSkill(skill)==='sharpCrit'?SKILL_TRIAL.sharpCritBonusUnits:0;
}
export function skillMomentumStage(boost){
 if(boost===null||boost===undefined)return 0;
 if(!Number.isInteger(boost.remainingTurns)||boost.remainingTurns<1||
  boost.remainingTurns>SKILL_TRIAL.momentumOwnerTurns)throw new RangeError('skill duration');
 return SKILL_TRIAL.momentumStages;
}
/**
 * Original-style six-medal circular adjacency. An adjacent skill owner may
 * be in reserve; no passive healing from KO owners. Only when the affected
 * actor acts, and only to that living actor, never to everyone each turn.
 */
export function careOnOwnerTurn({actor,team}={}){
 if(!actor||!Array.isArray(team)||team.length!==6||
  !team.every(u=>typeof u?.id==='string'&&Number.isFinite(u.hp)&&
    Number.isFinite(u.maxHp)))throw new TypeError('six ally members required');
 const position=team.findIndex(u=>u.id===actor.id);
 if(position<0)throw new RangeError('actor outside its own roster');
 if(actor.hp<=0||actor.hp>=actor.maxHp)return [];
 const sources=[team[(position+5)%6],team[(position+1)%6]]
   .filter(u=>u.hp>0&&u.skill==='care');
 let remaining=actor.maxHp-actor.hp;
 const heals=[];
 for(const source of sources){
  if(remaining<=0)break;
  const amount=Math.min(remaining,
    Math.max(1,Math.floor(actor.maxHp*SKILL_TRIAL.careMaxHpFraction)));
  if(amount<=0)continue;
  heals.push({actor:source.id,targetId:actor.id,skill:'care',amount});
  remaining-=amount;
 }
 return heals;
}
