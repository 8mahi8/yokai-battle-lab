/**
 * Phase1.8 rental-only immutable Soultimate bridge. The DATA chooses the
 * existing research effect (kind, target set, power, linked effects), while
 * special-effects.mjs keeps its old math and exactly its old RNG outcomes.
 * Neither these values nor an unknown hit count prove source-game fidelity.
 */
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_SOULTIMATE_MOVES}
 from '../content/rental-soultimate-moves.mjs';
import {validateSpecialSpec} from './special-effects.mjs';
const stats=Object.freeze([
 ['hp','maxHp'],['strength','strength'],['spirit','spirit'],
 ['defense','defense'],['speed','speed']
]);
const json=x=>JSON.stringify(x);
export function resolveRentalSoultimateSpec(member,index,{
 school=false,catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG
}={}){
 if(!member||!Number.isInteger(index)||index<0||index>=6)
  throw new TypeError('catalog Soultimate requires valid rental slot');
 const authored=RENTAL_SOULTIMATE_MOVES[index];
 const character=catalog.getCharacter('rental-'+String(index+1).padStart(2,'0'));
 const move=catalog.getMove(authored.id);
 const definition=validateSpecialSpec(authored.definition);
 if(!character||!move||character.name!==member.name||
   !stats.every(([field,legacy])=>character.stats[field]===member[legacy])||
   character.skill.id!=='skill:'+member.skill||
   character.moves.soultimate.id!==authored.id||
   move.category!==authored.kind||
   move.targetScope!==authored.targetScope||
   move.power!==authored.power||
   move.statusEffect!==authored.statusEffect||
   json(move.hitPattern)!==json(authored.hitPattern)||
   !['fixture','unknown'].includes(move.evidence)||
   json(member.special)!==json(definition))
  throw new TypeError('rental Soultimate catalog mismatch at slot '+(index+1));
 return Object.freeze({
  moveId:authored.id,kind:definition.kind,scope:definition.scope,
  targetScope:move.targetScope,
  // validateSpecialSpec returned a frozen copy including old default fields.
  definition,evidence:move.evidence,
  hitPattern:move.hitPattern
 });
}
