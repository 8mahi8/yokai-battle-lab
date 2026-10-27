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
import {YOKAI_ACTION_SLOTS} from './yokai-definition.mjs';

const idFor=index=>'rental-'+String(index+1).padStart(2,'0');
const hitPattern=count=>count>1?{type:'multi',count}:{type:'single',count:1};
const freeze=x=>Object.freeze({...x,hitPattern:Object.freeze({...x.hitPattern}),
 sourceRefs:Object.freeze([...x.sourceRefs])});
function makeMove(id,slot,{category,power=null,element=null,targetScope='unknown',
 hitPattern:pattern={type:'unknown',count:null},statusEffect=null}){
 return freeze({id:id+':'+slot,slot,displayName:null,category,power,
  element,targetScope,hitPattern:pattern,statusEffect,
  evidence:'fixture',sourceRefs:[]});
}
function specialOf(x){
 return x.special??(x.technique==='heal'?
  {kind:'heal',scope:'front',power:75}:
  {kind:'damage',scope:'front',power:100,damageKind:'attack'});
}
function specialTarget(spec){
 if(spec.kind==='revive-heal')return 'ally_team';
 if(spec.kind==='revive')return 'single_ally';
 if(spec.kind==='heal'||spec.kind==='buff')return 'ally_front';
 return spec.scope==='one'?'single_enemy':'enemy_front';
}
function buildMoves(i){
 const x=RENTAL_SQUAD[i],id=idFor(i),attack=RENTAL_ATTACK_MOVES[i],
  technique=RENTAL_TECHNIQUE_MOVES[i],inspirit=RENTAL_INSPIRIT_MOVES[i];
 if(attack.id!==id+':attack')
  throw new TypeError('rental attack master mismatch');
 const special=specialOf(x),nonDamage=
  new Set(['heal','buff','debuff','revive','revive-heal']);
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
   hitPattern:{type:'none',count:0}}),
  soultimate:makeMove(id,'soultimate',{category:special.kind,
   power:special.power??null,targetScope:specialTarget(special),
   statusEffect:special.effect??null,
   // Multiple targets are not multiple hits. Original count still unknown.
   hitPattern:nonDamage.has(special.kind)?
    {type:'none',count:0}:{type:'unknown',count:null}})
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
