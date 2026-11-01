/**
 * Phase1.9: fail-closed bridge for the six built-in rental passive skills.
 * A catalogue entry describes the passive; existing skill-effects.mjs and
 * combat.mjs STILL OWN timing, calculations, RNG, and resolved host events.
 * Source values are trial fixtures, not verified YW2 skill power/durations.
 */
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {PLAYTEST_SKILL_CATALOG,findSkill,validateSkillEntry}
 from '../content/skill-catalog.mjs';

const statFields=Object.freeze([
 ['hp','maxHp'],['strength','strength'],['spirit','spirit'],
 ['defense','defense'],['speed','speed']
]);
const validPair=Object.freeze({
 momentum:['after_ko','temporary_strength_stage'],
 care:['after_any_action','adjacent_ally_heal'],
 sharpCrit:['on_critical_roll','bonus_critical_units'],
 critImmune:['on_defender_critical_roll','prevent_critical'],
 lastStand:['before_lethal_damage','survive_at_one_hp_once'],
 guardBreak:['on_guarded_physical_hit','ignore_physical_guard']
});
const has=Object.prototype.hasOwnProperty;
export function resolveRentalSkillSpec(member,index,{
 school=false,catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG,
 skills=PLAYTEST_SKILL_CATALOG
}={}){
 if(!member||!Number.isInteger(index)||index<0||index>=6)
  throw new TypeError('catalog skill requires a valid rental slot');
 const id='rental-'+String(index+1).padStart(2,'0');
 const character=catalog.getCharacter(id);
 const raw=findSkill(skills,'skill:'+member.skill);
 if(!raw)throw new TypeError('rental skill catalog mismatch at slot '+(index+1));
 validateSkillEntry(raw);
 const expected=has.call(validPair,raw.legacyKey)?validPair[raw.legacyKey]:null;
 if(!character||!expected||
    member.name!==character.name||
    !statFields.every(([from,to])=>character.stats[from]===member[to])||
    character.skill.id!==raw.id||
    character.skill.trigger!==raw.trigger||
    character.skill.effect!==raw.effect||
    character.skill.evidence!==raw.evidence||
    character.skill.displayName!==raw.displayName||
    raw.id!=='skill:'+raw.legacyKey||
    raw.legacyKey!==member.skill||
    raw.trigger!==expected[0]||raw.effect!==expected[1])
  throw new TypeError('rental skill catalog mismatch at slot '+(index+1));
 return Object.freeze({
  characterId:id,skillId:raw.id,legacyKey:raw.legacyKey,
  trigger:raw.trigger,effect:raw.effect,
  evidence:raw.evidence
 });
}
