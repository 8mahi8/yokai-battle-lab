/**
 * Small original-inspired YW2 automatic Skill primitives.
 * Mechanics sources and original-vs-fixture boundaries:
 * docs/PHASE34_SKILL_PARITY_FIRST_20261026.md
 *
 * Skill means a PASSIVE automatic ability, never the same thing as a
 * Soultimate, Technique, Inspirit, or the motion visibility gate.
 */
import {PLAYTEST_SKILL_CATALOG} from '../content/skill-catalog.mjs';
// Descriptive names now have ONE source of truth in the content registry.
// Existing effect logic and experimental values below are unchanged.
export const RENTAL_SKILLS=Object.freeze(Object.fromEntries(
 PLAYTEST_SKILL_CATALOG.map(({legacyKey,displayName})=>[legacyKey,displayName])
));
export const SKILL_TRIAL=Object.freeze({
 momentumStages:2,          // YW1 detailed reference, YW2 exact stage count UNVERIFIED
 momentumOwnerTurns:5,      // YW1 detailed reference, YW2 exact lifetime UNVERIFIED
 careMaxHpFraction:.02,    // YW1 detailed reference; exact YW2 percentage UNVERIFIED
 sharpCritBonusUnits:5     // PROVISIONAL: exact skill crit-roll bonus unverified
});
export function validateRentalSkill(skill){
 if(skill===null||skill===undefined)return null;
 if(!Object.prototype.hasOwnProperty.call(RENTAL_SKILLS,skill))throw new RangeError('unknown rental skill');
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
 * be in reserve; no passive healing from KO owners. This computes one
 * recipient's share at a given action boundary (NOT their own turn only).
 */
export function careOnOwnerTurn({actor,team,skillOf=member=>member.skill}={}){
 if(typeof skillOf!=='function')throw new TypeError('skillOf must be a function');
 if(!actor||!Array.isArray(team)||team.length!==6||
  !team.every(u=>typeof u?.id==='string'&&Number.isFinite(u.hp)&&
    Number.isFinite(u.maxHp)))throw new TypeError('six ally members required');
 const position=team.findIndex(u=>u.id===actor.id);
 if(position<0)throw new RangeError('actor outside its own roster');
 if(actor.hp<=0||actor.hp>=actor.maxHp)return [];
 const sources=[team[(position+5)%6],team[(position+1)%6]]
   .filter(u=>u.hp>0&&skillOf(u)==='care');
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

/**
 * The original "どひょうぎわ" prevents a lethal blow once per battle.
 * The host records "spent" separately and must apply this after every
 * source-grounded direct damage category to avoid phantom KO/winner.
 *
 * On subsequent hits, including another hit in the same multi-hit attack,
 * protection is already spent. No additional RNG is involved.
 */
export function resolveLastStand({skill,enabled=true,spent=false,hp,amount}={}){
 if(!Number.isInteger(hp)||hp<0||!Number.isInteger(amount)||amount<0)
  throw new RangeError('nonnegative integer HP and incoming amount required');
 if(typeof spent!=='boolean'||typeof enabled!=='boolean')
  throw new TypeError('boolean spent/enabled required');
 const activate=enabled&&skill==='lastStand'&&!spent&&hp>0&&amount>=hp;
 const remaining=activate?1:Math.max(0,hp-amount);
 return Object.freeze({
  hpAfter:remaining,amount:hp-remaining,activated:activate
 });
}


/**
 * YW2 text says "once at the end of each turn" / "after each action".
 * Recompute for every living adjacent recipient at EVERY action boundary
 * of either team. The 2% value is a cross-version TRIAL, not confirmed YW2.
 * A single dead skill provider is inactive, even from the rear wheel.
 */
export function careAtActionBoundary({teams,skillOf=member=>member.skill}={}){
 if(!Array.isArray(teams)||teams.length!==2)
  throw new TypeError('two six-member teams required');
 const result=[];
 for(const team of teams){
  if(!Array.isArray(team)||team.length!==6)
   throw new TypeError('six-member team required');
  for(const actor of team)result.push(...careOnOwnerTurn({actor,team,skillOf}));
 }
 return result;
}
