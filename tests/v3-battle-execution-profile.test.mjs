import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_EXECUTION_PROFILE_SCHEMA,validateBattleExecutionProfile,
 compileBattleProfileCharacter} from '../engine/catalog-battle-profile.mjs';
import {compileCatalogTeamsForCombat}
 from '../engine/catalog-battle-roster.mjs';
import {RENTAL_LAB_CATALOG,extendCombatCatalog}
 from '../content/combat-catalog.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB}
 from '../content/rental-yokai-definitions.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {RENTAL_SOULTIMATE_MOVES}
 from '../content/rental-soultimate-moves.mjs';
import {validateSpecialSpec} from '../engine/special-effects.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const originalIds=()=>RENTAL_CHARACTER_MOVE_REFS.map(x=>x.id);
const newId='new-playtest-character';
const profile=()=>({
 schema:BATTLE_EXECUTION_PROFILE_SCHEMA,characterId:newId,
 evidence:'fixture',sourceRefs:[],
 soultimateRank:1,soulCapacity:100,inspiritLevel:1,
 special:copy(RENTAL_SOULTIMATE_MOVES[0].definition)
});
function pack(){
 const character=copy(RENTAL_YOKAI_REFERENCES_LAB[0]);
 character.id=newId;
 character.name='うみねこ（試験用）';
 character.moveIds.attack=newId+':attack';
 const attack=copy(RENTAL_LAB_CATALOG.getMove('rental-01:attack'));
 attack.id=newId+':attack';attack.power=47;
 const catalog=extendCombatCatalog({
  baseCatalog:RENTAL_LAB_CATALOG,
  characters:[character],moveMaster:[attack]
 });
 return {character,attack,catalog};
}
function rows(catalog,executionProfiles={[newId]:profile()}){
 const one=[newId,...originalIds().slice(1)];
 return compileCatalogTeamsForCombat({catalog,
  teamCharacterIds:[one,[...one].reverse()],executionProfiles});
}
function handwritten(){
 const first={...RENTAL_SQUAD[0],name:'うみねこ（試験用）',
  attackPower:47,loafChance:0,soultimateRank:1,soulCapacity:100,
  special:validateSpecialSpec(RENTAL_SOULTIMATE_MOVES[0].definition)};
 const original=RENTAL_SQUAD.slice(1);
 return [[first,...original],[...original].reverse().concat(first)];
}

test('V3-4-3 explicit execution profile accepts only complete supported fields',()=>{
 assert.equal(validateBattleExecutionProfile(profile()),true);
 const variants=[
  {...profile(),characterId:'wrong'},
  {...profile(),evidence:'unknown'},
  {...profile(),sourceRefs:[''],evidence:'documented'},
  {...profile(),sourceRefs:[],evidence:'observed'},
  {...profile(),soulCapacity:250},
  {...profile(),soultimateRank:5},
  {...profile(),inspiritLevel:0},
  {...profile(),special:{...profile().special,damageKind:'unknown'}},
  {...profile(),unverifiedOriginalBonus:999},
  Object.fromEntries(Object.entries(profile()).filter(([k])=>k!=='special'))
 ];
 for(const x of variants){
  // The characterId is technically a valid *different* profile identity,
  // but passing it to a bound character must be rejected at compilation.
  if(x.characterId==='wrong')
   assert.throws(()=>compileBattleProfileCharacter({
    catalog:pack().catalog,characterId:newId,profile:x
   }),/explicit|bind/);
  else assert.throws(()=>validateBattleExecutionProfile(x));
 }
});

test('V3-4-3 seventh authored character compiles from shared move/skill IDs and one explicit profile',()=>{
 const {catalog}=pack();
 const seventh=compileBattleProfileCharacter({
  catalog,characterId:newId,profile:profile()
 });
 assert.deepEqual(seventh,handwritten()[0][0]);
 assert.equal(seventh.attackPower,47);
 assert.equal(seventh.soulCapacity,100);
 assert.equal(seventh.special.kind,'damage');
 assert.equal(seventh.skill,'momentum');
 assert.ok(Object.isFrozen(seventh));
 assert.ok(Object.isFrozen(seventh.weights));
 assert.ok(Object.isFrozen(seventh.special));
 const all=rows(catalog);
 assert.deepEqual(all[0],handwritten()[0]);
 assert.deepEqual(all[1],handwritten()[1]);
 assert.equal(RENTAL_LAB_CATALOG.characters.length,6);
 assert.equal(catalog.characters.length,7);
 assert.equal(catalog.moves.length,25);
});

test('V3-4-3 seventh can fight, charge Soultimate, and resolve real research HP via existing battle engine',()=>{
 const {catalog}=pack(),team=rows(catalog);
 const game=createCombat({seed:212,teams:team,
  researchDamageModel:true,researchMultiHit:true,
  researchSpecialEffects:true,enableRentalSkills:true});
 assert.equal(game.snapshot().squads[0][0].name,'うみねこ（試験用）');
 assert.equal(game.snapshot().squads[0][0].hp,225);
 assert.equal(game.giveSoul('A1',100),100);
 const prepared=game.prepareSoultimate(0,'A1');
 assert.equal(prepared.ok,true);
 const result=game.resolveSoultimate(0,prepared.token,true);
 assert.equal(result.ok,true);
 assert.equal(result.effectStatus,'research-fixture');
 assert.ok(result.impacts.some(x=>x.kind==='damage'&&x.amount>0));
 assert.ok(game.snapshot().squads[1].some(x=>x.hp<x.maxHp));
 assert.equal(game.snapshot().soul.teams[0][0].soul,0);
 for(let i=0;i<25;i++){
  const action=game.step();
  assert.equal(action.type,'action');
  assert.ok(game.snapshot().squads.flat().every(m=>
   m.hp>=0&&m.hp<=m.maxHp));
 }
});

test('V3-4-3 seeded custom 7th versus handwritten input preserves full battle output, RNG, HP and events',()=>{
 const {catalog}=pack(),compiled=rows(catalog),written=handwritten();
 for(const seed of [3,42,212,8192]){
  const options={seed,researchDamageModel:true,researchMultiHit:true,
   researchSpecialEffects:true,enableRentalSkills:true,
   researchStatInspirits:true};
  const a=createCombat({...options,teams:compiled});
  const b=createCombat({...options,teams:written});
  assert.deepEqual(a.snapshot(),b.snapshot());
  for(let i=0;i<90;i++){
   assert.deepEqual(a.step(),b.step(),seed+'/action '+i);
   assert.deepEqual(a.snapshot(),b.snapshot(),seed+'/state '+i);
   if(a.snapshot().winner!==null)break;
  }
 }
});

test('V3-4-3 real online MatchProtocol accepts 7th and preserves deterministic replay',()=>{
 const {catalog}=pack(),teams=rows(catalog);
 for(const seed of [12,212]){
  const match=createMatchProtocol({battleOptions:{seed,teams,
   researchSpecialEffects:true},hostNowMs:()=>5000});
  const command=match.dispatch(0,1,{type:'pin',targetId:'B1'});
  assert.equal(command.accepted,true);
  assert.equal(match.dispatch(0,1,{type:'pin',targetId:'B1'}).duplicate,true);
  for(let i=0;i<65&&match.snapshot().game.winner===null;i++)
   assert.equal(match.advanceAuto().ok,true);
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
  const snap=match.snapshot();
  assert.equal(snap.game.squads[0][0].name,'うみねこ（試験用）');
  assert.equal(snap.game.squads[1][5].name,'うみねこ（試験用）');
  assert.ok(snap.revision>30);
 }
});

test('V3-4-3 fail closed on missing profile, spoofed move effect and unimplemented passive',()=>{
 const {catalog}=pack();
 assert.throws(()=>rows(catalog,null),/uncertified/);
 assert.throws(()=>rows(catalog,{[newId]:{...profile(),special:{
  ...profile().special,power:999}}}),/disagree/);
 assert.throws(()=>rows(catalog,{[newId]:{
  ...profile(),soultimateRank:2,soulCapacity:100
 }}),/Soul/);
 const character=copy(RENTAL_YOKAI_REFERENCES_LAB[0]);
 character.id='custom-unsupported-skill';
 character.name='未知スキル持ち';
 character.skill={...character.skill,id:'skill:practice7',displayName:'新能力',
  trigger:'after_ko',effect:'temporary_strength_stage'};
 character.moveIds.attack='custom-unsupported-skill:attack';
 const attack={...copy(catalog.getMove(newId+':attack')),
  id:'custom-unsupported-skill:attack'};
 const unsupported={...copy(catalog.getSkill('skill:momentum')),
  id:'skill:practice7',legacyKey:'practice7',displayName:'新能力'};
 const modified=extendCombatCatalog({baseCatalog:catalog,
  characters:[character],moveMaster:[attack],skills:[unsupported]});
 assert.throws(()=>compileBattleProfileCharacter({catalog:modified,
  characterId:character.id,profile:{...profile(),
   characterId:character.id}
 }),/does not implement/);
 // Even an authoring master with a valid seventh has no silent live rollout.
 assert.deepEqual(RENTAL_LAB_CATALOG.characters.map(x=>x.id),originalIds());
});

test('V3-4-3 custom authoring remains opt-in: certified six legacy teams unchanged',()=>{
 const {catalog}=pack();
 assert.deepEqual(compileCatalogTeamsForCombat({
  catalog,teamCharacterIds:[originalIds(),originalIds()]
 })[0],RENTAL_SQUAD);
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog,teamCharacterIds:[originalIds(),originalIds()],
  executionProfiles:{'rental-01':{...profile(),characterId:'rental-01'}}
 }),/cannot override/);
 const original=createCombat({seed:12});
 const after=createCombat({seed:12});
 for(let i=0;i<55;i++){
  assert.deepEqual(original.step(),after.step());
  assert.deepEqual(original.snapshot(),after.snapshot());
 }
});
