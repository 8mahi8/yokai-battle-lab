/**
 * Versioned, authoring-only move + skill registry. No combat resolution,
 * browser clock, transport, RNG, AI, or animation code belongs here.
 *
 * An author can add a Yo-kai whose four move IDs refer to reusable move
 * records. An ID conflict with different rules must fail during catalog
 * construction, never be overwritten by last-write-wins.
 */
import {YOKAI_ACTION_SLOTS,defineYokai}
 from './yokai-definition.mjs';
import {validateSkillEntry,PLAYTEST_SKILL_CATALOG}
 from './skill-catalog.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB,RENTAL_YOKAI_REFERENCES_SCHOOL}
 from './rental-yokai-definitions.mjs';
import {RENTAL_MOVE_MASTER} from './rental-move-master.mjs';

export const COMBAT_CATALOG_SCHEMA=1;
const clone=x=>JSON.parse(JSON.stringify(x));
const frozenSkill=s=>Object.freeze({...s,
 parameters:Object.freeze({...s.parameters}),
 sourceRefs:Object.freeze([...s.sourceRefs])});

/**
 * Public query methods ONLY return deeply frozen source data. No maps are
 * exposed to clients, so no caller can mutate catalog entries mid-match.
 * A duplicate moveId is allowed ONLY when its full definition is identical.
 */
export function createCombatCatalog({characters,skills=PLAYTEST_SKILL_CATALOG,
 moveMaster=null}={}){
 if(!Array.isArray(characters)||characters.length===0||
   !Array.isArray(skills)||skills.length===0)
  throw new TypeError('catalog requires nonempty characters and skills');
 const skillById=new Map();
 for(const candidate of skills){
  validateSkillEntry(candidate);
  if(skillById.has(candidate.id))throw new TypeError('duplicate skill ID: '+candidate.id);
  skillById.set(candidate.id,frozenSkill(candidate));
 }
 const characterById=new Map(),moveById=new Map();
 const masterById=new Map();
 if(moveMaster!==null){
  if(!Array.isArray(moveMaster)||!moveMaster.length)
   throw new TypeError('moveMaster must be a nonempty array');
  for(const move of moveMaster){
   if(!move||typeof move.id!=='string'||masterById.has(move.id))
    throw new TypeError('duplicate or invalid move ID in master');
   masterById.set(move.id,move);
  }
 }
 for(const raw of characters){
  // Reference-only authoring definitions get expanded for V1 compatibility,
  // but never own copies of move power, hit count or other effects.
  let expanded=raw;
  if(raw?.moveIds!==undefined){
   if(raw.moves!==undefined||!moveMaster)
    throw new TypeError('reference-only characters require a move master');
   if(!raw.moveIds||Object.keys(raw.moveIds).length!==4)
    throw new TypeError('four move ID references required');
   const resolved={};
   for(const slot of YOKAI_ACTION_SLOTS){
    const moveId=raw.moveIds[slot],move=masterById.get(moveId);
    if(!move||move.slot!==slot)
     throw new TypeError('missing or wrong-slot move reference: '+slot);
    resolved[slot]=move;
   }
   const {moveIds,...rest}=raw;
   expanded={...rest,moves:resolved};
  }
  // Validate the full character and all its references before using it.
  const character=defineYokai(expanded);
  if(characterById.has(character.id))
   throw new TypeError('duplicate character ID: '+character.id);
  if(!skillById.has(character.skill.id))
   throw new TypeError('missing skill reference: '+character.skill.id);
  const passive=skillById.get(character.skill.id);
  if(character.skill.trigger!==null&&character.skill.trigger!==passive.trigger)
   throw new TypeError('skill trigger disagreement: '+character.skill.id);
  if(character.skill.effect!==null&&character.skill.effect!==passive.effect)
   throw new TypeError('skill effect disagreement: '+character.skill.id);
  characterById.set(character.id,character);
  for(const slot of YOKAI_ACTION_SLOTS){
   const move=character.moves[slot],existing=moveById.get(move.id);
   if(existing&&JSON.stringify(existing)!==JSON.stringify(move))
    throw new TypeError('move ID collision with conflicting data: '+move.id);
   if(!existing)moveById.set(move.id,move);
  }
 }
 const characterList=Object.freeze([...characterById.values()]);
 const moveList=Object.freeze([...moveById.values()]);
 const skillList=Object.freeze([...skillById.values()]);
 return Object.freeze({
  schema:COMBAT_CATALOG_SCHEMA,
  characters:characterList,moves:moveList,skills:skillList,
  getCharacter:id=>characterById.get(id)??null,
  getMove:id=>moveById.get(id)??null,
  getSkill:id=>skillById.get(id)??null
 });
}
/** Explicit authoring catalog for the frozen six rentals in both modes. */
export const RENTAL_LAB_CATALOG=createCombatCatalog({
 characters:RENTAL_YOKAI_REFERENCES_LAB,moveMaster:RENTAL_MOVE_MASTER
});
export const RENTAL_SCHOOL_CATALOG=createCombatCatalog({
 characters:RENTAL_YOKAI_REFERENCES_SCHOOL,moveMaster:RENTAL_MOVE_MASTER
});
