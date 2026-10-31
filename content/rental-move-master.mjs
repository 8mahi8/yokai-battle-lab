/**
 * Phase 1.5: one compiled master for each of the 6 x 4 rental move slots.
 * The physical move's authoring source is rental-attack-moves.mjs; remaining
 * slot values are imported from legacy rental-roster until their migration.
 * Immutable data-only records, not gameplay behavior or original rule proof.
 */
import {RENTAL_SQUAD} from './rental-roster.mjs';
import {RENTAL_ATTACK_MOVES} from './rental-attack-moves.mjs';
import {RENTAL_TECHNIQUE_MOVES} from './rental-technique-moves.mjs';
import {RENTAL_INSPIRIT_MOVES} from './rental-inspirit-moves.mjs';
import {RENTAL_SOULTIMATE_MOVES} from './rental-soultimate-moves.mjs';
import {YOKAI_ACTION_SLOTS} from './yokai-definition.mjs';

const idFor=index=>'rental-'+String(index+1).padStart(2,'0');
const hitPattern=count=>count>1?{type:'multi',count}:{type:'single',count:1};
const freeze=x=>Object.freeze({...x,hitPattern:Object.freeze({...x.hitPattern}),
 sourceRefs:Object.freeze([...x.sourceRefs]),
 ...(x.execution?{execution:Object.freeze({...x.execution})}:{})});
function makeMove(id,slot,{category,power=null,element=null,targetScope='unknown',
 hitPattern:pattern={type:'unknown',count:null},statusEffect=null,
 level=undefined,execution=undefined}){
 return freeze({id:id+':'+slot,slot,displayName:null,category,power,
  element,targetScope,hitPattern:pattern,statusEffect,
  ...(level===undefined?{}:{level}),
  ...(execution?{execution}:{}),
  evidence:'fixture',sourceRefs:[]});
}
function buildMoves(i){
 const id=idFor(i),attack=RENTAL_ATTACK_MOVES[i],
  technique=RENTAL_TECHNIQUE_MOVES[i],inspirit=RENTAL_INSPIRIT_MOVES[i],
  soultimate=RENTAL_SOULTIMATE_MOVES[i];
 if(attack.id!==id+':attack'||soultimate.id!==id+':soultimate')
  throw new TypeError('rental move master mismatch');
 return Object.freeze({
  attack:makeMove(id,'attack',{category:'physical_damage',
   power:attack.power,targetScope:'single_enemy',hitPattern:hitPattern(attack.hits)}),
  technique:makeMove(id,'technique',{
   category:technique.kind==='heal'?'heal':'technique_damage',
   power:technique.power,element:technique.element,
   targetScope:technique.kind==='heal'?'single_ally':'single_enemy',
   hitPattern:technique.kind==='heal'?{type:'none',count:0}:hitPattern(technique.hits)}),
  inspirit:makeMove(id,'inspirit',{
   category:inspirit.sign==='positive'?'status_positive':'status_negative',
   targetScope:inspirit.targetScope,statusEffect:inspirit.effect,
   level:inspirit.level,
   hitPattern:{type:'none',count:0}}),
  soultimate:makeMove(id,'soultimate',{category:soultimate.kind,
   power:soultimate.power,targetScope:soultimate.targetScope,
   statusEffect:soultimate.statusEffect,
   // The only source of composite Soultimate parameters is the already
   // authored rental definition; do not re-author damageKind/status levels.
   execution:soultimate.definition,
   // This may target a whole front WITHOUT implying multi-hit.
   hitPattern:soultimate.hitPattern})
 });
}
const moveById=new Map();
for(let i=0;i<RENTAL_SQUAD.length;i++){
 const moves=buildMoves(i);
 for(const slot of YOKAI_ACTION_SLOTS){
  const move=moves[slot];
  if(moveById.has(move.id))throw new TypeError('duplicate move '+move.id);
  moveById.set(move.id,move);
 }
}
export const RENTAL_MOVE_MASTER=Object.freeze([...moveById.values()]);
export function rentalMoveById(id){return moveById.get(id)??null;}
