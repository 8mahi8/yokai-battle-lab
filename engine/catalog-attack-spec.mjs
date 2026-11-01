/**
 * Phase 1.4: a narrow, verified bridge from immutable original-rental move
 * definitions to the EXISTING host physical attack resolver.
 *
 * Attack power and hit count originate from content rather than the legacy
 * actor fields when the caller explicitly enables this research mode.
 * Formula, targeting, RNG, statuses, skills, HP, and time remain in combat.
 * The six supplied rental definitions are playtest fixtures, NOT official
 * Yo-kai Watch 2 power or hit values.
 */
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';

const statKeys=Object.freeze([
 ['hp','maxHp'],['strength','strength'],['spirit','spirit'],
 ['defense','defense'],['speed','speed']
]);

export function resolveRentalAttackSpec(member,index,{
 school=false,catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG
}={}){
 if(!member||!Number.isInteger(index)||index<0||index>5)
  throw new TypeError('catalog attack requires a valid rental and slot');
 const id='rental-'+String(index+1).padStart(2,'0');
 const character=catalog.getCharacter(id);
 const move=character?.moves?.attack;
 const hits=move?.hitPattern?.count;
 if(!character||character.name!==member.name||
   !statKeys.every(([key,legacy])=>character.stats[key]===member[legacy])||
   move?.category!=='physical_damage'||move?.targetScope!=='single_enemy'||
   !Number.isSafeInteger(move.power)||move.power<0||
   !Number.isSafeInteger(hits)||hits<1||hits>9||
   !['single','multi'].includes(move.hitPattern.type)||
   (move.hitPattern.type==='single')!==(hits===1)||
   member.attackPower!==move.power||
   (member.attackHits??1)!==hits||
   character.skill.id!=='skill:'+member.skill)
  throw new TypeError('original rental and verified attack catalog disagree at slot '+(index+1));
 return Object.freeze({
  moveId:move.id,power:move.power,hits,
  evidence:move.evidence
 });
}
