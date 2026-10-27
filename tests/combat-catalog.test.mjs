import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SKILLS,SKILL_TRIAL} from '../engine/skill-effects.mjs';
import {RENTAL_YOKAI_LAB,RENTAL_YOKAI_SCHOOL}
 from '../content/rental-yokai-definitions.mjs';
import {PLAYTEST_SKILL_CATALOG,validateSkillEntry}
 from '../content/skill-catalog.mjs';
import {COMBAT_CATALOG_SCHEMA,createCombatCatalog,
 RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
test('two six-rental catalogs resolve 24 move IDs and six independent skill types',()=>{
 for(const catalog of [RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG]){
  assert.equal(catalog.schema,COMBAT_CATALOG_SCHEMA);
  assert.equal(catalog.characters.length,6);
  assert.equal(catalog.moves.length,24);
  assert.equal(catalog.skills.length,6);
  for(const character of catalog.characters){
   assert.strictEqual(catalog.getCharacter(character.id),character);
   assert.strictEqual(catalog.getSkill(character.skill.id)?.id,character.skill.id);
   for(const move of Object.values(character.moves)){
    assert.strictEqual(catalog.getMove(move.id),move);
    assert.equal(move.evidence,'fixture');
    assert.ok(Object.isFrozen(move),'move record must not mutate at runtime');
   }
  }
  assert.equal(catalog.getCharacter('missing'),null);
  assert.equal(catalog.getMove('missing'),null);
  assert.equal(catalog.getSkill('missing'),null);
  assert.ok(Object.isFrozen(catalog.characters));
  assert.ok(Object.isFrozen(catalog.moves));
  assert.ok(Object.isFrozen(catalog.skills));
  assert.ok(Object.isFrozen(catalog.getSkill('skill:care').parameters));
 }
});
test('playtest skill catalog names and parameter refs agree with existing engine',()=>{
 assert.deepEqual(new Set(PLAYTEST_SKILL_CATALOG.map(x=>x.legacyKey)),
  new Set(Object.keys(RENTAL_SKILLS)));
 for(const x of PLAYTEST_SKILL_CATALOG){
  assert.equal(validateSkillEntry(x),true);
  assert.equal(x.displayName,RENTAL_SKILLS[x.legacyKey]);
  assert.equal(x.evidence,'fixture');
  assert.deepEqual(x.sourceRefs,[]);
  for(const field of Object.values(x.parameters)){
   assert.ok(field.startsWith('SKILL_TRIAL.'));
   assert.ok(Object.prototype.hasOwnProperty.call(SKILL_TRIAL,field.slice('SKILL_TRIAL.'.length)));
  }
 }
});
test('catalogs differ by school personality only, not by moves or skill declarations',()=>{
 for(let i=0;i<6;i++){
  const a=RENTAL_LAB_CATALOG.characters[i];
  const b=RENTAL_SCHOOL_CATALOG.characters[i];
  assert.deepEqual(a.moves,b.moves);
  assert.deepEqual(a.skill,b.skill);
  assert.deepEqual(a.stats,b.stats);
  assert.equal(a.id,b.id);
 }
 assert.deepEqual(RENTAL_LAB_CATALOG.skills,RENTAL_SCHOOL_CATALOG.skills);
});
test('adding shared moves preserves one canonical definition; conflicting IDs are rejected',()=>{
 const characters=copy(RENTAL_YOKAI_LAB.slice(0,2));
 characters[1].moves.attack=copy(characters[0].moves.attack);
 const shared=createCombatCatalog({characters});
 assert.equal(shared.moves.length,7,'two characters share one attack; other 6 slots differ');
 assert.deepEqual(shared.getMove(characters[0].moves.attack.id),
  shared.getCharacter(characters[1].id).moves.attack,
  'same move ID must resolve to identical data, even after cloning authoring records');
 const conflicting=copy(RENTAL_YOKAI_LAB.slice(0,2));
 conflicting[1].moves.attack.id=conflicting[0].moves.attack.id;
 assert.throws(()=>createCombatCatalog({characters:conflicting}),/move ID collision/);
});
test('catalog rejects duplicate characters, missing skills, bad skill references and mismatches',()=>{
 assert.throws(()=>createCombatCatalog({characters:[RENTAL_YOKAI_LAB[0],
  RENTAL_YOKAI_LAB[0]]}),/duplicate character ID/);
 assert.throws(()=>createCombatCatalog({characters:[],skills:PLAYTEST_SKILL_CATALOG}),/nonempty/);
 const missing=copy(RENTAL_YOKAI_LAB[0]);
 missing.skill.id='skill:DoesNotExist';
 assert.throws(()=>createCombatCatalog({characters:[missing]}),/missing skill reference/);
 const skill=copy(RENTAL_YOKAI_LAB[0]);
 skill.skill.trigger='on_bad_event';
 assert.throws(()=>createCombatCatalog({characters:[skill]}),/trigger disagreement/);
 const dup=copy(PLAYTEST_SKILL_CATALOG);
 dup.push(copy(PLAYTEST_SKILL_CATALOG[0]));
 assert.throws(()=>createCombatCatalog({characters:[RENTAL_YOKAI_LAB[0]],skills:dup}),/duplicate skill ID/);
 const falsified=copy(PLAYTEST_SKILL_CATALOG[0]);
 falsified.evidence='documented';
 assert.throws(()=>validateSkillEntry(falsified),/requires a source/);
 const wrongType=copy(PLAYTEST_SKILL_CATALOG[0]);
 wrongType.trigger='everything';
 assert.throws(()=>validateSkillEntry(wrongType),/trigger\/effect/);
});
test('authoring catalog freezes cloned source, not the mutable input objects',()=>{
 const input=copy(RENTAL_YOKAI_SCHOOL.slice(0,1));
 const skills=copy(PLAYTEST_SKILL_CATALOG);
 const catalog=createCombatCatalog({characters:input,skills});
 input[0].stats.hp=1;input[0].moves.attack.power=999;
 skills[0].displayName='tweaked';
 assert.equal(catalog.getCharacter('rental-01').stats.hp,225);
 assert.equal(catalog.getMove('rental-01:attack').power,55);
 assert.equal(catalog.getSkill('skill:momentum').displayName,'まえのめり型');
 assert.throws(()=>{catalog.getSkill('skill:momentum').parameters.foo='bad'},TypeError);
});
