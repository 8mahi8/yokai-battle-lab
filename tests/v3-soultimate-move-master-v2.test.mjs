import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_EXECUTION_PROFILE_SCHEMA,
 BATTLE_EXECUTION_PROFILE_SCHEMA_V2,
 validateBattleExecutionProfile,compileBattleProfileCharacter}
 from '../engine/catalog-battle-profile.mjs';
import {createCombatCatalog,extendCombatCatalog,RENTAL_LAB_CATALOG,
 RENTAL_SCHOOL_CATALOG} from '../content/combat-catalog.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB}
 from '../content/rental-yokai-definitions.mjs';
import {RENTAL_MOVE_MASTER} from '../content/rental-move-master.mjs';
import {RENTAL_SOULTIMATE_MOVES}
 from '../content/rental-soultimate-moves.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';
import {validateSpecialSpec} from '../engine/special-effects.mjs';
import {compileSoultimateEffectPlan} from '../engine/soultimate-effect-plan.mjs';
import {compileCatalogTeamsForCombat}
 from '../engine/catalog-battle-roster.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const newId='v2-seventh';
const ids=()=>RENTAL_CHARACTER_MOVE_REFS.map(x=>x.id);
function profile(schema=BATTLE_EXECUTION_PROFILE_SCHEMA_V2,id=newId){
 return {schema,characterId:id,evidence:'fixture',sourceRefs:[],
  soultimateRank:1,soulCapacity:100,inspiritLevel:1,
  ...(schema===BATTLE_EXECUTION_PROFILE_SCHEMA?
   {special:clone(RENTAL_SOULTIMATE_MOVES[0].definition)}:{})};
}
function pack(){
 const character=clone(RENTAL_YOKAI_REFERENCES_LAB[0]);
 character.id=newId;character.name='しろねこ（V2試験）';
 character.moveIds.attack=newId+':attack';
 const move=clone(RENTAL_LAB_CATALOG.getMove('rental-01:attack'));
 move.id=newId+':attack';move.power=47;
 return extendCombatCatalog({baseCatalog:RENTAL_LAB_CATALOG,
  characters:[character],moveMaster:[move]});
}
function roster(catalog,schema){
 const one=[newId,...ids().slice(1)];
 return compileCatalogTeamsForCombat({
  catalog,teamCharacterIds:[one,[...one].reverse()],
  executionProfiles:{[newId]:profile(schema)}
 });
}

test('V3-4-4 all six Soultimate masters preserve original composite source with unknown hits',()=>{
 for(const catalog of [RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG]){
  for(let i=0;i<6;i++){
   const move=catalog.getMove('rental-'+String(i+1).padStart(2,'0')+
    ':soultimate');
   const raw=RENTAL_SOULTIMATE_MOVES[i].definition;
   assert.deepEqual(move.execution,raw);
   assert.ok(Object.isFrozen(move.execution));
   assert.notStrictEqual(move.execution,raw,
    'master is cloned, not a mutable alias into another source');
   const rule=validateSpecialSpec(move.execution);
   assert.equal(compileSoultimateEffectPlan(move,rule).ruleSignature,
    JSON.stringify(rule));
   assert.equal(move.hitPattern.type,i===2||i===4||i===5?
    'none':'unknown');
   assert.equal(move.evidence,'fixture');
  }
 }
});

test('V3-4-4 schema2 profile has no special field and V1 must still validate',()=>{
 assert.equal(validateBattleExecutionProfile(profile()),true);
 assert.equal(validateBattleExecutionProfile(
  profile(BATTLE_EXECUTION_PROFILE_SCHEMA)),true);
 assert.equal(Object.hasOwn(profile(),'special'),false);
 assert.throws(()=>validateBattleExecutionProfile({
  ...profile(),special:clone(RENTAL_SOULTIMATE_MOVES[0].definition)
 }),/explicit/);
 assert.throws(()=>validateBattleExecutionProfile({
  ...profile(),special:{kind:'damage'}
 }),/explicit/);
 assert.throws(()=>validateBattleExecutionProfile({
  ...profile(),schema:3
 }),/invalid execution profile/);
 const c=pack();
 assert.deepEqual(compileBattleProfileCharacter({catalog:c,
  characterId:newId,profile:profile()}),
  compileBattleProfileCharacter({catalog:c,
  characterId:newId,profile:profile(BATTLE_EXECUTION_PROFILE_SCHEMA)}));
});

test('V3-4-4 every built-in composite kind can execute from its move-owned definition',()=>{
 for(let i=0;i<6;i++){
  const ref=clone(RENTAL_YOKAI_REFERENCES_LAB[i]);
  ref.id='fixture-kind-'+i;ref.name='試験効果'+i;
  ref.moveIds.attack='fixture-kind-'+i+':attack';
  const attack=clone(RENTAL_LAB_CATALOG.getMove('rental-'+
   String(i+1).padStart(2,'0')+':attack'));
  attack.id=ref.moveIds.attack;
  const catalog=extendCombatCatalog({baseCatalog:RENTAL_LAB_CATALOG,
   characters:[ref],moveMaster:[attack]});
  const result=compileBattleProfileCharacter({catalog,
   characterId:ref.id,profile:profile(2,ref.id)});
  assert.deepEqual(result.special,
   validateSpecialSpec(RENTAL_SOULTIMATE_MOVES[i].definition));
  assert.equal(result.skill,RENTAL_YOKAI_REFERENCES_LAB[i].skill.id.slice(6));
 }
});

test('V3-4-4 V2 and legacy V1 agree through seeded full combat/Soul/Soultimate',()=>{
 const catalog=pack(),teamsV1=roster(catalog,1),
  teamsV2=roster(catalog,2);
 assert.deepEqual(teamsV2,teamsV1);
 for(const seed of [3,42,212,8192,20261030]){
  const opts={seed,enableRentalSkills:true,researchSpecialEffects:true,
   researchDamageModel:true,researchMultiHit:true};
  const a=createCombat({...opts,teams:teamsV1});
  const b=createCombat({...opts,teams:teamsV2});
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.equal(a.giveSoul('A1',100),b.giveSoul('A1',100));
  const ca=a.prepareSoultimate(0,'A1'),cb=b.prepareSoultimate(0,'A1');
  assert.deepEqual(cb,ca);
  assert.deepEqual(b.resolveSoultimate(0,cb.token,true),
   a.resolveSoultimate(0,ca.token,true));
  assert.deepEqual(b.snapshot(),a.snapshot());
  for(let k=0;k<75&&a.snapshot().winner===null;k++){
   assert.deepEqual(b.step(),a.step(),'action '+seed+'/'+k);
   assert.deepEqual(b.snapshot(),a.snapshot(),'state '+seed+'/'+k);
  }
 }
});

test('V3-4-4 V2 online replay/ACK preserves old V1 state without any new network fields',()=>{
 const catalog=pack(),v1=roster(catalog,1),v2=roster(catalog,2);
 for(const seed of [11,212,747]){
  const old=createMatchProtocol({battleOptions:{seed,teams:v1,
   researchSpecialEffects:true},hostNowMs:()=>10000});
  const modern=createMatchProtocol({battleOptions:{seed,teams:v2,
   researchSpecialEffects:true},hostNowMs:()=>10000});
  assert.deepEqual(modern.snapshot(),old.snapshot());
  for(const [side,seq,intent] of [
   [0,1,{type:'pin',targetId:'B1'}],
   [1,1,{type:'rotate',direction:1}],
   [0,2,{type:'watch',mode:'zero'}]
  ]){
   assert.deepEqual(modern.dispatch(side,seq,intent),
    old.dispatch(side,seq,intent));
  }
  for(let i=0;i<90;i++){
   assert.deepEqual(modern.advanceAuto(),old.advanceAuto());
   assert.deepEqual(modern.snapshot(),old.snapshot());
   if(old.snapshot().game.winner!==null)break;
  }
  assert.deepEqual(modern.exportJournal(),old.exportJournal());
  assert.equal(replayMatchJournal(modern.exportJournal()).ok,true);
 }
});

test('V3-4-4 moves with conflicting composite details are rejected on catalog intake',()=>{
 const base=RENTAL_LAB_CATALOG,original=clone(base.characters);
 const ref=clone(RENTAL_YOKAI_REFERENCES_LAB[0]);
 ref.id='test-mismatched-soultimate';ref.moveIds.attack=ref.id+':attack';
 ref.moveIds.soultimate=ref.id+':soultimate';
 const attack={...clone(base.getMove('rental-01:attack')),
  id:ref.moveIds.attack};
 const spec=clone(base.getMove('rental-01:soultimate'));
 spec.id=ref.moveIds.soultimate;
 const mutations=[
  x=>{x.execution.kind='drain';},
  x=>{x.execution.scope='one';},
  x=>{x.execution.power=123;},
  x=>{x.execution.damageKind='magic';},
  x=>{x.execution.level=3;},
  x=>{x.execution.unknownOriginalFrame=99;},
  x=>{x.hitPattern={type:'multi',count:3};}
 ];
 for(const mutate of mutations){
  const move=clone(spec);mutate(move);
  assert.throws(()=>extendCombatCatalog({baseCatalog:base,
   characters:[ref],moveMaster:[attack,move]}));
  assert.deepEqual(base.characters,original);
  assert.equal(base.getCharacter(ref.id),null);
 }
});

test('V3-4-4 legacy conflicting profile cannot overrule move-owned source',()=>{
 const catalog=pack();
 const forged={...profile(1),special:{
  ...profile(1).special,damageKind:'technique'}};
 assert.throws(()=>compileBattleProfileCharacter({
  catalog,characterId:newId,profile:forged
 }),/disagree/);
 const raw=clone(RENTAL_YOKAI_REFERENCES_LAB[0]);
 raw.id='test-no-execution';raw.moveIds.attack=raw.id+':attack';
 raw.moveIds.soultimate=raw.id+':soultimate';
 const special=clone(catalog.getMove('rental-01:soultimate'));
 special.id=raw.moveIds.soultimate;
 delete special.execution;
 const attack=clone(catalog.getMove('rental-01:attack'));
 attack.id=raw.moveIds.attack;
 const oldCatalog=extendCombatCatalog({
  baseCatalog:catalog,characters:[raw],moveMaster:[attack,special]
 });
 assert.throws(()=>compileBattleProfileCharacter({
  catalog:oldCatalog,characterId:raw.id,profile:profile(2,raw.id)
 }),/execution definition required/);
 assert.equal(compileBattleProfileCharacter({
  catalog:oldCatalog,characterId:raw.id,
  profile:profile(1,raw.id)
 }).special.damageKind,'attack');
});
