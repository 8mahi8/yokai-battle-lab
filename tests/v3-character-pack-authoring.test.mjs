import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatCatalog,extendCombatCatalog,
 RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG} from '../content/combat-catalog.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB,RENTAL_YOKAI_REFERENCES_SCHOOL}
 from '../content/rental-yokai-definitions.mjs';
import {RENTAL_MOVE_MASTER} from '../content/rental-move-master.mjs';
import {PLAYTEST_SKILL_CATALOG} from '../content/skill-catalog.mjs';
import {YOKAI_ACTION_SLOTS} from '../content/yokai-definition.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const compact=ref=>{
 const {skill,...rest}=copy(ref);
 return {...rest,skillId:skill.id};
};
function seventh(base=RENTAL_YOKAI_REFERENCES_LAB[0]){
 const entry=compact(base);
 entry.id='authoring-seventh';
 entry.name='追加テスト妖怪';
 // Reuse existing three moves. Only the physical attack gets a new ID.
 entry.moveIds.attack='authoring-seventh:attack';
 return entry;
}
const newAttack=()=>{
 const attack=copy(RENTAL_LAB_CATALOG.getMove('rental-01:attack'));
 attack.id='authoring-seventh:attack';
 attack.power=47;
 attack.evidence='fixture';
 return attack;
};

test('V3-4: six compact references use only skillId + four move IDs with identical full catalog output',()=>{
 for(const [refs,original] of [
  [RENTAL_YOKAI_REFERENCES_LAB,RENTAL_LAB_CATALOG],
  [RENTAL_YOKAI_REFERENCES_SCHOOL,RENTAL_SCHOOL_CATALOG]
 ]){
  const input=refs.map(compact);
  assert.ok(input.every(x=>x.skill===undefined&&typeof x.skillId==='string'));
  assert.ok(input.every(x=>YOKAI_ACTION_SLOTS.every(slot=>typeof x.moveIds[slot]==='string')));
  const constructed=createCombatCatalog({
   characters:input,skills:PLAYTEST_SKILL_CATALOG,moveMaster:RENTAL_MOVE_MASTER
  });
  assert.deepEqual(constructed.characters,original.characters);
  assert.deepEqual(constructed.moves,original.moves);
  assert.deepEqual(constructed.skills,original.skills);
  assert.equal(constructed.getCharacter('rental-04').skill.id,
   original.getCharacter('rental-04').skill.id);
 }
});

test('V3-4: append seventh character and one physical move without copying three shared move definitions',()=>{
 const base=RENTAL_LAB_CATALOG,unit=seventh(),attack=newAttack();
 const add=extendCombatCatalog({
  baseCatalog:base,characters:[unit],moveMaster:[attack]
 });
 assert.equal(add.characters.length,7);
 assert.equal(add.moves.length,25,'shared move IDs resolve to same master definitions');
 assert.equal(add.skills.length,6);
 const added=add.getCharacter(unit.id);
 assert.equal(added.skill.id,'skill:momentum');
 assert.equal(added.moves.attack.id,attack.id);
 assert.equal(added.moves.attack.power,47);
 assert.deepEqual(add.getMove(unit.moveIds.technique),added.moves.technique,
  'catalog returns the same authored values after defensive copying');
 assert.deepEqual(base.characters,add.characters.slice(0,6));
 assert.equal(base.getCharacter(unit.id),null,'base must not be changed');
 assert.equal(base.moves.length,24);
 for(const slot of ['technique','inspirit','soultimate'])
  assert.deepEqual(added.moves[slot],base.getMove(unit.moveIds[slot]));
 assert.ok(Object.isFrozen(added));
 assert.ok(Object.isFrozen(added.moves));
 assert.ok(Object.isFrozen(added.skill));
 assert.ok(Object.isFrozen(added.moves.attack.hitPattern));
 assert.ok(Object.isFrozen(add.characters));
 assert.ok(Object.isFrozen(add.moves));
});

test('V3-4: new skill is defined once and resolved to two character references',()=>{
 const original=copy(PLAYTEST_SKILL_CATALOG[0]);
 const skill={...original,id:'skill:practice7',legacyKey:'practice7',
  displayName:'試験用のスキル',evidence:'fixture',sourceRefs:[]};
 const seventhOne=seventh(),seventhTwo=seventh();
 seventhOne.skillId=skill.id;
 seventhTwo.id='authoring-eighth';
 seventhTwo.name='追加テスト妖怪2';
 seventhTwo.skillId=skill.id;
 seventhTwo.moveIds.attack='authoring-eighth:attack';
 const secondAttack={...newAttack(),id:'authoring-eighth:attack'};
 const combined=extendCombatCatalog({
  baseCatalog:RENTAL_LAB_CATALOG,characters:[seventhOne,seventhTwo],
  moveMaster:[newAttack(),secondAttack],skills:[skill]
 });
 assert.equal(combined.characters.length,8);
 assert.equal(combined.moves.length,26);
 assert.equal(combined.skills.length,7);
 assert.equal(combined.getCharacter(seventhOne.id).skill.id,skill.id);
 assert.equal(combined.getCharacter(seventhTwo.id).skill.id,skill.id);
 assert.equal(combined.getSkill(skill.id).displayName,skill.displayName);
 assert.equal(RENTAL_LAB_CATALOG.getSkill(skill.id),null);
});

test('V3-4: conflicts and incomplete packs fail atomically before changing base registry',()=>{
 const base=RENTAL_LAB_CATALOG,original=copy(base.characters);
 const valid=seventh(),attack=newAttack();
 const cases=[
  {characters:[{...valid,skillId:'skill:missing'}],moveMaster:[attack]},
  {characters:[{...valid,skill:{...copy(base.getCharacter('rental-01').skill)}}],
   moveMaster:[attack]},
  {characters:[{...valid,moveIds:{...valid.moveIds,attack:'rental-01:technique'}}],
   moveMaster:[attack]},
  {characters:[{...valid,moveIds:{...valid.moveIds,inspirit:'missing'}}],
   moveMaster:[attack]},
  {characters:[{...valid,id:'rental-01'}],moveMaster:[attack]},
  {characters:[valid],moveMaster:[copy(base.moves[0])]},
  {characters:[valid],moveMaster:[attack,copy(attack)]}
 ];
 for(const pack of cases){
  assert.throws(()=>extendCombatCatalog({baseCatalog:base,...pack}),
   'invalid registry must reject, never partially update');
  assert.deepEqual(base.characters,original);
  assert.equal(base.getCharacter(valid.id),null);
 }
});

test('V3-4: origin/evidence must remain fixture or have sourceRefs, not silently become confirmed',()=>{
 const base=RENTAL_LAB_CATALOG,entry=seventh(),move=newAttack();
 move.evidence='documented';move.sourceRefs=[];
 assert.throws(()=>extendCombatCatalog({
  baseCatalog:base,characters:[entry],moveMaster:[move]
 }),/sourceRefs/);
 move.sourceRefs=['https://example.org/record'];
 const catalog=extendCombatCatalog({
  baseCatalog:base,characters:[entry],moveMaster:[move]
 });
 assert.equal(catalog.getMove(move.id).evidence,'documented');
 assert.deepEqual(catalog.getMove(move.id).sourceRefs,['https://example.org/record']);
 assert.equal(base.getMove(move.id),null);
});

test('V3-4: external changes to authoring pack cannot mutate existing or compiled source entries',()=>{
 const entry=seventh(),attack=newAttack(),skill=copy(PLAYTEST_SKILL_CATALOG[1]);
 const pack=extendCombatCatalog({
  baseCatalog:RENTAL_LAB_CATALOG,characters:[entry],moveMaster:[attack]
 });
 const expected=copy(pack.getCharacter(entry.id));
 entry.stats.hp=1;
 entry.moveIds.attack='tampered';
 attack.power=9999;
 skill.displayName='fake';
 assert.deepEqual(pack.getCharacter('authoring-seventh'),expected);
 assert.equal(pack.getMove('authoring-seventh:attack').power,47);
 assert.throws(()=>{pack.getMove('authoring-seventh:attack').power=100;},TypeError);
 assert.equal(RENTAL_LAB_CATALOG.characters.length,6);
});

test('V3-4: building and extending catalogs never changes deterministic host battles',()=>{
 for(const school of [false,true])for(const seed of [3,42,212]){
  const before=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school}});
  const compactRefs=(school?
   RENTAL_YOKAI_REFERENCES_SCHOOL:RENTAL_YOKAI_REFERENCES_LAB).map(compact);
  const catalog=createCombatCatalog({
   characters:compactRefs,moveMaster:RENTAL_MOVE_MASTER,
   skills:PLAYTEST_SKILL_CATALOG
  });
  assert.equal(catalog.characters.length,6);
  const extra=extendCombatCatalog({baseCatalog:catalog,
   characters:[seventh(school?RENTAL_YOKAI_REFERENCES_SCHOOL[0]:
    RENTAL_YOKAI_REFERENCES_LAB[0])],moveMaster:[newAttack()]});
  assert.equal(extra.characters.length,7);
  const after=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school}});
  assert.deepEqual(before.snapshot(),after.snapshot());
  for(let i=0;i<75;i++){
   assert.deepEqual(before.advanceAuto(),after.advanceAuto());
   assert.deepEqual(before.snapshot(),after.snapshot());
   if(before.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(before.exportJournal()).ok,true);
  assert.equal(replayMatchJournal(after.exportJournal()).ok,true);
 }
});
