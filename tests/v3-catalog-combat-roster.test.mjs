import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCatalogTeamsForCombat}
 from '../engine/catalog-battle-roster.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG,
 extendCombatCatalog,createCombatCatalog} from '../content/combat-catalog.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB}
 from '../content/rental-yokai-definitions.mjs';
import {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES}
 from '../content/rental-roster.mjs';
import {RENTAL_MOVE_MASTER}
 from '../content/rental-move-master.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const all=()=>RENTAL_CHARACTER_MOVE_REFS.map(x=>x.id);
const teams=()=>[all(),all()];
const clone=x=>JSON.parse(JSON.stringify(x));
const schoolLegacy=RENTAL_SQUAD.map((unit,i)=>({...unit,
 attitude:SCHOOL_RENTAL_PERSONALITIES[i].attitude,
 weights:[...SCHOOL_RENTAL_PERSONALITIES[i].weights],
 loafChance:SCHOOL_RENTAL_PERSONALITIES[i].loafChance
}));

test('V3-4-2: every certified character ID generates exact original six battle inputs in both modes',()=>{
 for(const [school,catalog,expected] of [
  [false,RENTAL_LAB_CATALOG,RENTAL_SQUAD],
  [true,RENTAL_SCHOOL_CATALOG,schoolLegacy]
 ]){
  const result=compileCatalogTeamsForCombat({
   catalog,teamCharacterIds:teams(),school
  });
  assert.equal(result.length,2);
  assert.deepEqual(result[0],expected);
  assert.deepEqual(result[1],expected);
  assert.ok(Object.isFrozen(result));
  assert.ok(result.every(Object.isFrozen));
  assert.ok(result.flat().every(m=>
   Object.isFrozen(m)&&Object.isFrozen(m.weights)&&
   (m.special===undefined||Object.isFrozen(m.special))));
 }
});

test('V3-4-2: differing seat orders stay explicit and use the chosen registered ID',()=>{
 const ids=all(),left=ids.slice().reverse(),right=ids.slice(2).concat(ids.slice(0,2));
 const source=compileCatalogTeamsForCombat({
  catalog:RENTAL_SCHOOL_CATALOG,school:true,
  teamCharacterIds:[left,right]
 });
 assert.deepEqual(source[0],left.map(id=>schoolLegacy[ids.indexOf(id)]));
 assert.deepEqual(source[1],right.map(id=>schoolLegacy[ids.indexOf(id)]));
 const battle=createCombat({
  seed:8192,teams:source,playtestSoulTuning:true
 });
 assert.deepEqual(battle.snapshot().squads[0].map(x=>x.name),
  source[0].map(x=>x.name));
 assert.deepEqual(battle.snapshot().squads[1].map(x=>x.name),
  source[1].map(x=>x.name));
 for(let i=0;i<35;i++)assert.equal(battle.step().type,'action');
});

test('V3-4-2: canonical six-vs-six seeded combat output, RNG and status match exact old rentals',()=>{
 for(const school of [false,true])
  for(const seed of [3,42,212,8192,20261030]){
   const oldOptions={seed,playtestSoulTuning:school,
    enableLoafing:school,researchDamageModel:true,researchMultiHit:true,
    researchSpecialEffects:true,researchStatInspirits:true};
   const expected=createCombat(oldOptions);
   const actual=createCombat({...oldOptions,
    teams:compileCatalogTeamsForCombat({
     catalog:school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG,
     teamCharacterIds:teams(),school
    })});
   assert.deepEqual(actual.snapshot(),expected.snapshot(),
    'initial canonical parity seed '+seed);
   for(let action=0;action<100;action++){
    const a=expected.step(),b=actual.step();
    assert.deepEqual(b,a,'same RNG/target/KO/skill/action seed '+seed+' action '+action);
    assert.deepEqual(actual.snapshot(),expected.snapshot(),
     'full event/HP/soul/clock/status parity seed '+seed+' action '+action);
    if(a.type!=='action'||a.winner!==null)break;
   }
  }
});

test('V3-4-2: online protocol with six compiled teams preserves exact host turns, ACK and replay',()=>{
 for(const school of [false,true])for(const seed of [7,212,481]){
  const options={seed,playtestSoulTuning:school,enableLoafing:school};
  const original=createMatchProtocol({battleOptions:options,hostNowMs:()=>10000});
  const compiled=createMatchProtocol({battleOptions:{...options,
   teams:compileCatalogTeamsForCombat({
    catalog:school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG,
    teamCharacterIds:teams(),school
   })},hostNowMs:()=>10000});
  assert.deepEqual(compiled.snapshot(),original.snapshot());
  for(const [side,seq,intent] of [
   [0,1,{type:'pin',targetId:'B1'}],
   [1,1,{type:'pin',targetId:'A2'}],
   [0,2,{type:'rotate',direction:1}],
   [1,2,{type:'watch',mode:'zero'}]
  ]){
   assert.deepEqual(compiled.dispatch(side,seq,intent),
    original.dispatch(side,seq,intent));
   assert.deepEqual(compiled.snapshot(),original.snapshot());
  }
  for(let step=0;step<110;step++){
   assert.deepEqual(compiled.advanceAuto(),original.advanceAuto());
   assert.deepEqual(compiled.snapshot(),original.snapshot());
   if(compiled.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(compiled.exportJournal()).ok,true);
  assert.equal(replayMatchJournal(original.exportJournal()).ok,true);
 }
});

test('V3-4-2: unknown seventh authoring ID cannot silently enter battle without full executable specs',()=>{
 const input=clone(RENTAL_YOKAI_REFERENCES_LAB[0]);
 const base=RENTAL_LAB_CATALOG;
 const attack=clone(base.getMove('rental-01:attack'));
 input.id='original-test-seventh';input.name='架空追加キャラ';
 input.moveIds.attack='original-test-seventh:attack';
 const pack=extendCombatCatalog({baseCatalog:base,characters:[input],
  moveMaster:[{...attack,id:'original-test-seventh:attack',power:45}]});
 assert.equal(pack.characters.length,7);
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog:pack,teamCharacterIds:[all().slice(0,5).concat([input.id]),all()]
 }),/uncertified/);
 assert.deepEqual(compileCatalogTeamsForCombat({
  catalog:pack,teamCharacterIds:teams()
 })[0],RENTAL_SQUAD,'existing six can still be compiled from an extended catalog');
 assert.equal(base.characters.length,6);
});

test('V3-4-2: fail closed before any battle mutation on bad IDs or unverified move/skill/personality',()=>{
 const catalog=RENTAL_LAB_CATALOG,refs=teams();
 for(const bad of [
  null,[],[all()],[[...all(),all()[0]],all()],
  [all().slice(1).concat(['not-a-member']),all()],
  [all().map((id,i)=>i===1?all()[0]:id),all()]
 ]){
  assert.throws(()=>compileCatalogTeamsForCombat({
   catalog,teamCharacterIds:bad
  }));
 }
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog:RENTAL_LAB_CATALOG,teamCharacterIds:refs,school:true
 }),/differs/);
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog:RENTAL_SCHOOL_CATALOG,teamCharacterIds:refs,school:false
 }),/differs/);
 const moved=clone(RENTAL_YOKAI_REFERENCES_LAB);
 moved[0].stats.hp+=10;
 const tampered=createCombatCatalog({
  characters:moved,moveMaster:RENTAL_MOVE_MASTER
 });
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog:tampered,teamCharacterIds:teams()
 }),/differs/);
 const skillWrong=clone(RENTAL_YOKAI_REFERENCES_LAB);
 skillWrong[0].skill.id='skill:care';
 skillWrong[0].skill.trigger='after_any_action';
 skillWrong[0].skill.effect='adjacent_ally_heal';
 skillWrong[0].skill.displayName='おせわ型';
 const conflict=createCombatCatalog({
  characters:skillWrong,moveMaster:RENTAL_MOVE_MASTER
 });
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog:conflict,teamCharacterIds:teams()
 }),/differs/);
 const forgedMove=clone(RENTAL_MOVE_MASTER);
 forgedMove[0].power+=100;
 const forgedCatalog=createCombatCatalog({
  characters:RENTAL_YOKAI_REFERENCES_LAB,moveMaster:forgedMove
 });
 assert.throws(()=>compileCatalogTeamsForCombat({
  catalog:forgedCatalog,teamCharacterIds:teams()
 }),/differs/);
 assert.deepEqual(compileCatalogTeamsForCombat({
  catalog,teamCharacterIds:teams()
 })[0],RENTAL_SQUAD);
});
