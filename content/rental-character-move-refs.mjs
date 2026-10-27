/**
 * Character authoring references: one identity + four move IDs and a skill ID.
 * The authoring shape does not duplicate attack power, hit count, technique
 * strength, effects, or other move records.
 */
import {RENTAL_SQUAD} from './rental-roster.mjs';
import {YOKAI_ACTION_SLOTS} from './yokai-definition.mjs';

export const RENTAL_CHARACTER_MOVE_REFS=Object.freeze(RENTAL_SQUAD.map((x,i)=>{
 const id='rental-'+String(i+1).padStart(2,'0');
 return Object.freeze({
  id,name:x.name,skillId:'skill:'+x.skill,
  moveIds:Object.freeze(Object.fromEntries(
   YOKAI_ACTION_SLOTS.map(slot=>[slot,id+':'+slot])))
 });
}));
