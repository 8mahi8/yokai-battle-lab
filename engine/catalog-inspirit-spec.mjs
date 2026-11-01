/**
 * Validate a built-in rental's Inspirit move before authoritative use.
 * Rule engine continues to own target choice, RNG, application, duration.
 * All current moves are trial fixtures; a status name is not original proof.
 */
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_INSPIRIT_MOVES} from '../content/rental-inspirit-moves.mjs';
import {inspiritEffectById} from '../content/inspirit-effect-master.mjs';
const statFields=Object.freeze([
 ['hp','maxHp'],['strength','strength'],['spirit','spirit'],
 ['defense','defense'],['speed','speed']
]);
export function resolveRentalInspiritSpec(member,index,{
 school=false,catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG
}={}){
 if(!member||!Number.isInteger(index)||index<0||index>=6)
  throw new TypeError('catalog Inspirit requires valid rental slot');
 const expected=RENTAL_INSPIRIT_MOVES[index];
 const character=catalog.getCharacter('rental-'+String(index+1).padStart(2,'0'));
 const move=catalog.getMove(expected.id);
 const effect=inspiritEffectById(expected.effect);
 if(!character||!move||!effect||character.name!==member.name||
    !statFields.every(([field,legacy])=>character.stats[field]===member[legacy])||
    character.moves.inspirit.id!==move.id||
    character.skill.id!=='skill:'+member.skill||
    move.statusEffect!==expected.effect||
    move.targetScope!==expected.targetScope||
    move.category!==(expected.sign==='positive'?'status_positive':'status_negative')||
    move.hitPattern?.type!=='none'||move.hitPattern.count!==0||
    expected.sign!==effect.sign||
    expected.targetScope!==(effect.sign==='positive'?'single_ally':'single_enemy')||
    !Number.isSafeInteger(expected.level)||expected.level<1||expected.level>4||
    member.inspirit!==expected.effect||
    (member.inspiritLevel??1)!==expected.level||
    expected.duration!==null)
  throw new TypeError('rental Inspirit catalog mismatch at slot '+(index+1));
 return Object.freeze({
  moveId:move.id,effect:move.statusEffect,sign:expected.sign,
  targetScope:move.targetScope,level:expected.level,
  duration:expected.duration,evidence:move.evidence
 });
}
