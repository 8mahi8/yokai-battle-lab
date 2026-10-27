/**
 * Read-only bridge from the EXISTING six rental playtest records to schema V1.
 * Deliberately not consumed by combat/transport yet. No mechanics changes.
 * Every move value is a fixture; rank, tribe, faction and equipment unknown.
 */
import {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES} from './rental-roster.mjs';
import {YOKAI_DEFINITION_SCHEMA,defineYokai}
 from './yokai-definition.mjs';
import {PLAYTEST_SKILL_CATALOG,findSkill} from './skill-catalog.mjs';
import {RENTAL_CHARACTER_MOVE_REFS} from './rental-character-move-refs.mjs';
import {rentalMoveById} from './rental-move-master.mjs';

// Schema V1 expansion is compatibility only. The authoring source is
// (character -> move IDs), and each full move lives in one move master.
function moveSetFromIds(reference){
 const moves={};
 for(const [slot,id] of Object.entries(reference.moveIds)){
  const move=rentalMoveById(id);
  if(!move||move.slot!==slot)
   throw new TypeError('missing or mismatched rental move '+id);
  moves[slot]=move;
 }
 return moves;
}
function build(index,mode){
 const x=RENTAL_SQUAD[index],school=SCHOOL_RENTAL_PERSONALITIES[index];
 const ref=RENTAL_CHARACTER_MOVE_REFS[index];
 if(ref.name!==x.name||ref.skillId!=='skill:'+x.skill)
  throw new TypeError('rental character identity/skill reference mismatch');
 const id=ref.id;
 const behavior=mode==='school'?school:x;
 const passive=findSkill(PLAYTEST_SKILL_CATALOG,'skill:'+x.skill);
 if(!passive)throw new TypeError('missing rental skill catalog entry: '+x.skill);
 return defineYokai({
  schema:YOKAI_DEFINITION_SCHEMA,id,name:x.name,
  tribe:null,rank:null,faction:null,
  stats:{hp:x.maxHp,strength:x.strength,spirit:x.spirit,
   defense:x.defense,speed:x.speed},
  resistances:null,equipment:null,
  personality:{seriousnessTier:null,attitude:behavior.attitude,
   actionWeights:[...behavior.weights],
   loafChancePercent:mode==='school'?school.loafChance:(x.loafChance??0)},
  moves:moveSetFromIds(ref),
  skill:{id:passive.id,displayName:passive.displayName,
   trigger:passive.trigger,effect:passive.effect,
   evidence:passive.evidence,sourceRefs:[...passive.sourceRefs]},
  provenance:{identity:'fixture',stats:'fixture',moves:'fixture',
   skill:'fixture',personality:'fixture',tribe:'unknown',rank:'unknown',
   faction:'unknown',resistances:'unknown',equipment:'unknown'},
  fieldSourceRefs:Object.fromEntries(['identity','stats','moves','skill',
   'personality','tribe','rank','faction','resistances','equipment']
   .map(field=>[field,[]]))
 });
}
export const RENTAL_YOKAI_LAB=Object.freeze(
 RENTAL_SQUAD.map((_,i)=>build(i,'lab')));
export const RENTAL_YOKAI_SCHOOL=Object.freeze(
 RENTAL_SQUAD.map((_,i)=>build(i,'school')));
