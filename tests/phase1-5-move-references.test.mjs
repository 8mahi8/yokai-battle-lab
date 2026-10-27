import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_ATTACK_MOVES} from '../content/rental-attack-moves.mjs';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {YOKAI_ACTION_SLOTS} from '../content/yokai-definition.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';
import {RENTAL_MOVE_MASTER,rentalMoveById}
 from '../content/rental-move-master.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB,RENTAL_YOKAI_REFERENCES_SCHOOL,
 RENTAL_YOKAI_LAB,RENTAL_YOKAI_SCHOOL}
 from '../content/rental-yokai-definitions.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG,
 createCombatCatalog} from '../content/combat-catalog.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));

test('all six characters own only IDs, while one master owns 24 move definitions',()=>{
 assert.equal(RENTAL_CHARACTER_MOVE_REFS.length,6);
 assert.equal(RENTAL_MOVE_MASTER.length,24);
 assert.equal(new Set(RENTAL_MOVE_MASTER.map(x=>x.id)).size,24);
 for(let i=0;i<6;i++){
  const char=RENTAL_CHARACTER_MOVE_REFS[i],rental=RENTAL_SQUAD[i];
  assert.equal(char.id,'rental-'+String(i+1).padStart(2,'0'));
  assert.equal(char.name,rental.name);
  assert.equal(char.skillId,'skill:'+rental.skill);
  assert.deepEqual(Object.keys(char.moveIds),YOKAI_ACTION_SLOTS);
  assert.equal(Object.keys(char).length,4);
  assert.equal('moves' in char,false,'no embedded move rules on character');
  assert.equal('attackPower' in char,false,'no attack power duplicated on character');
  for(const slot of YOKAI_ACTION_SLOTS){
   const id=char.moveIds[slot];
   assert.strictEqual(rentalMoveById(id),RENTAL_MOVE_MASTER.find(x=>x.id===id));
   assert.equal(rentalMoveById(id).slot,slot);
   assert.equal(rentalMoveById(id).evidence,'fixture');
  }
  assert.ok(Object.isFrozen(char.moveIds));
 }
 assert.equal(rentalMoveById('rental-01:missing'),null);
 assert.ok(Object.isFrozen(RENTAL_MOVE_MASTER));
 assert.ok(Object.isFrozen(RENTAL_MOVE_MASTER[0].hitPattern));
});

test('attack power exists once as source; legacy API is derived without numeric drift',()=>{
 assert.deepEqual(RENTAL_ATTACK_MOVES.map(x=>x.power),[55,40,45,45,45,65]);
 for(let i=0;i<6;i++){
  const attack=RENTAL_ATTACK_MOVES[i],legacy=RENTAL_SQUAD[i];
  const compiled=rentalMoveById(attack.id);
  assert.equal(legacy.attackPower,attack.power);
  assert.equal(legacy.attackHits??1,attack.hits);
  assert.equal(compiled.power,attack.power);
  assert.equal(compiled.hitPattern.count,attack.hits);
  assert.equal(compiled.evidence,'fixture');
  assert.ok(Object.isFrozen(attack));
  assert.ok(Object.isFrozen(legacy));
 }
});

test('primary normalized catalogs generate identical full V1 compatibility records',()=>{
 for(const [references,legacy,catalog] of [
  [RENTAL_YOKAI_REFERENCES_LAB,RENTAL_YOKAI_LAB,RENTAL_LAB_CATALOG],
  [RENTAL_YOKAI_REFERENCES_SCHOOL,RENTAL_YOKAI_SCHOOL,RENTAL_SCHOOL_CATALOG]
 ]){
  assert.equal(references.length,6);
  for(let i=0;i<6;i++){
   const ref=references[i],old=legacy[i];
   assert.deepEqual(ref.moveIds,RENTAL_CHARACTER_MOVE_REFS[i].moveIds);
   assert.equal('moves' in ref,false);
   assert.ok(Object.isFrozen(ref)&&Object.isFrozen(ref.stats));
   assert.ok(Object.isFrozen(ref.personality.actionWeights));
   assert.ok(Object.isFrozen(ref.fieldSourceRefs.identity));
   assert.throws(()=>{ref.moveIds.attack='corrupt'},TypeError);
   assert.deepEqual(catalog.getCharacter(ref.id),old,
    'reference-only authoring must create same compiled character as old V1');
   assert.deepEqual(Object.values(old.moves).map(x=>x.id),
    YOKAI_ACTION_SLOTS.map(slot=>ref.moveIds[slot]));
   for(const slot of YOKAI_ACTION_SLOTS)
    assert.deepEqual(catalog.getMove(ref.moveIds[slot]),old.moves[slot]);
  }
 }
});

test('bad references are rejected before match construction',()=>{
 const refs=copy(RENTAL_YOKAI_REFERENCES_LAB.slice(0,1));
 refs[0].moveIds.attack='missing';
 assert.throws(()=>createCombatCatalog({characters:refs,moveMaster:RENTAL_MOVE_MASTER}),
  /missing or wrong-slot/);
 const wrongSlot=copy(RENTAL_YOKAI_REFERENCES_LAB.slice(0,1));
 wrongSlot[0].moveIds.technique='rental-01:attack';
 assert.throws(()=>createCombatCatalog({characters:wrongSlot,moveMaster:RENTAL_MOVE_MASTER}),
  /missing or wrong-slot/);
 assert.throws(()=>createCombatCatalog({
  characters:RENTAL_YOKAI_REFERENCES_LAB
 }),/require a move master/);
 const invalidMaster=copy(RENTAL_MOVE_MASTER);
 invalidMaster.push(copy(invalidMaster[0]));
 assert.throws(()=>createCombatCatalog({
  characters:RENTAL_YOKAI_REFERENCES_LAB,moveMaster:invalidMaster
 }),/duplicate or invalid move ID/);
 const incomplete=copy(RENTAL_YOKAI_REFERENCES_LAB.slice(0,1));
 delete incomplete[0].moveIds.inspirit;
 assert.throws(()=>createCombatCatalog({
  characters:incomplete,moveMaster:RENTAL_MOVE_MASTER
 }),/four move ID references/);
});

test('school standard match still yields the same first 80 authoritative turns across old/new catalog modes',()=>{
 for(const seed of [13,421,20261028]){
  const base={seed,playtestSoulTuning:true,enableLoafing:true};
  const legacy=createMatchProtocol({battleOptions:{...base,catalogAttackResolution:false}});
  const ref=createMatchProtocol({battleOptions:{...base,catalogAttackResolution:true}});
  for(let i=0;i<80;i++){
   const a=legacy.advanceAuto(),b=ref.advanceAuto();
   assert.deepEqual(a,b,'host result divergence seed '+seed+' step '+i);
   assert.deepEqual(legacy.snapshot(),ref.snapshot());
   if(a.result?.type!=='action'||a.result?.winner!==null)break;
  }
 }
});
