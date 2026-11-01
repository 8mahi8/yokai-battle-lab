/**
 * Phase 1.6 - validated offensive/healing Technique adapter.
 * This identifies current built-in rental Technique moves and returns
 * reference-only simulation inputs. It never calculates damage or HP.
 * Elements and powers are provisional PLAYTEST fixtures.
 */
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_TECHNIQUE_MOVES}
 from '../content/rental-technique-moves.mjs';

const statFields=Object.freeze([
 ['hp','maxHp'],['strength','strength'],['spirit','spirit'],
 ['defense','defense'],['speed','speed']
]);
export function resolveRentalTechniqueSpec(member,index,{
 school=false,catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG
}={}){
 if(!member||!Number.isInteger(index)||index<0||index>=6)
  throw new TypeError('catalog Technique requires a valid rental slot');
 const expected=RENTAL_TECHNIQUE_MOVES[index];
 const id='rental-'+String(index+1).padStart(2,'0');
 const char=catalog.getCharacter(id),move=catalog.getMove(expected.id);
 const kind=move?.category==='heal'?'heal':
  move?.category==='technique_damage'?'damage':null;
 const hits=kind==='damage'?move.hitPattern?.count:null;
 if(!char||!move||char.name!==member.name||
    char.moves.technique.id!==move.id||
    !statFields.every(([from,to])=>char.stats[from]===member[to])||
    char.skill.id!=='skill:'+member.skill||
    kind===null||move.power!==expected.power||
    kind!==expected.kind||
    move.element!==expected.element||
    !Number.isSafeInteger(move.power)||move.power<0||
    member.techniquePower!==move.power||
    member.technique!==kind||
    (member.techniqueElement??'neutral')!==move.element||
    (member.techniqueHits??1)!==(expected.hits??1)||
    (kind==='heal'&&(move.hitPattern?.type!=='none'||
     move.hitPattern.count!==0||move.targetScope!=='single_ally'))||
    (kind==='damage'&&(!Number.isSafeInteger(hits)||hits<1||hits>9||
     !['single','multi'].includes(move.hitPattern.type)||
     (move.hitPattern.type==='single')!==(hits===1)||
     hits!==expected.hits||move.targetScope!=='single_enemy')))
   throw new TypeError('rental Technique catalog mismatch at slot '+(index+1));
 return Object.freeze({
  moveId:move.id,kind,power:move.power,element:move.element,
  hits,evidence:move.evidence
 });
}
