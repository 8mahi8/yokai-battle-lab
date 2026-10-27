/**
 * Read-only bridge from the EXISTING six rental playtest records to schema V1.
 * Deliberately not consumed by combat/transport yet. No mechanics changes.
 * Every move value is a fixture; rank, tribe, faction and equipment unknown.
 */
import {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES} from './rental-roster.mjs';
import {YOKAI_DEFINITION_SCHEMA,defineYokai}
 from './yokai-definition.mjs';

const baseId=i=>'rental-'+String(i+1).padStart(2,'0');
const hitPattern=count=>count>1?{type:'multi',count}:{type:'single',count:1};
function makeMove(id,slot,{category,power=null,element=null,targetScope='unknown',
 hitPattern:pattern={type:'unknown',count:null},statusEffect=null}){
 return {id:id+':'+slot,slot,displayName:null,category,power,element,
  targetScope,hitPattern:pattern,statusEffect,evidence:'fixture'};
}
function specialOf(x){
 // Same exact fallback as engine/combat.mjs, but explicitly marked a fixture.
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
function moveSet(id,x){
 const special=specialOf(x);
 const nonDamage=new Set(['heal','buff','debuff','revive','revive-heal']);
 const inspiritPositive=String(x.inspirit).endsWith('-up');
 return {
  attack:makeMove(id,'attack',{category:'physical_damage',power:x.attackPower,
   targetScope:'single_enemy',hitPattern:hitPattern(x.attackHits??1)}),
  technique:makeMove(id,'technique',{category:x.technique==='heal'?'heal':'technique_damage',
   power:x.techniquePower,targetScope:x.technique==='heal'?'single_ally':'single_enemy',
   hitPattern:x.technique==='heal'?{type:'none',count:0}:hitPattern(x.techniqueHits??1)}),
  inspirit:makeMove(id,'inspirit',{
   category:inspiritPositive?'status_positive':'status_negative',
   targetScope:inspiritPositive?'single_ally':'single_enemy',
   statusEffect:x.inspirit,hitPattern:{type:'none',count:0}}),
  soultimate:makeMove(id,'soultimate',{category:special.kind,
   power:special.power??null,targetScope:specialTarget(special),
   statusEffect:special.effect??null,
   // An AoE impact list is NOT a multi-hit. Original hit count is unknown.
   hitPattern:nonDamage.has(special.kind)?
    {type:'none',count:0}:{type:'unknown',count:null}})
 };
}
function build(index,mode){
 const x=RENTAL_SQUAD[index],school=SCHOOL_RENTAL_PERSONALITIES[index];
 const id=baseId(index);
 const behavior=mode==='school'?school:x;
 return defineYokai({
  schema:YOKAI_DEFINITION_SCHEMA,id,name:x.name,
  tribe:null,rank:null,faction:null,
  stats:{hp:x.maxHp,strength:x.strength,spirit:x.spirit,
   defense:x.defense,speed:x.speed},
  resistances:null,equipment:null,
  personality:{seriousnessTier:null,attitude:behavior.attitude,
   actionWeights:[...behavior.weights],
   loafChancePercent:mode==='school'?school.loafChance:(x.loafChance??0)},
  moves:moveSet(id,x),
  skill:{id:'skill:'+x.skill,displayName:null,trigger:null,effect:null,evidence:'fixture'},
  provenance:{identity:'fixture',stats:'fixture',moves:'fixture',
   skill:'fixture',personality:'fixture',tribe:'unknown',rank:'unknown',
   faction:'unknown',resistances:'unknown',equipment:'unknown'}
 });
}
export const RENTAL_YOKAI_LAB=Object.freeze(
 RENTAL_SQUAD.map((_,i)=>build(i,'lab')));
export const RENTAL_YOKAI_SCHOOL=Object.freeze(
 RENTAL_SQUAD.map((_,i)=>build(i,'school')));
