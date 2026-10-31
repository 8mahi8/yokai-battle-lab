import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
test('sleep disables action until the unit is purified from bench',()=>{
 const combat=createCombat({seed:11});
 combat.applyInspirit({id:'A1',sign:'negative',effect:'sleep',source:'B2'});
 assert.equal(combat.snapshot().clock.teams[0].members[0].canAct,false);
 assert.ok(!combat.simulate(5).some(action=>action.actor==='A1'));
 assert.equal(combat.purify(0,'A1').reason,'must_be_on_bench');
 combat.rotate(0,1);
 assert.equal(combat.purify(0,'A1').ok,true);
 combat.rotate(0,-1);
 assert.equal(combat.snapshot().clock.teams[0].members[0].canAct,true);
 assert.ok(combat.simulate(200).some(action=>action.actor==='A1'));
});
test('purification does not erase an unrelated positive marker',()=>{
 const combat=createCombat({seed:13});
 combat.applyInspirit({id:'A1',sign:'positive',effect:'research-marker'});
 combat.applyInspirit({id:'A1',sign:'negative',effect:'sleep'});
 combat.rotate(0,1);
 assert.equal(combat.purify(0,'A1').removed.length,1);
 assert.equal(combat.snapshot().inspirits.A1[0].sign,'positive');
});
test('all front asleep yields await-rotation instead of scheduler exception',()=>{
 const combat=createCombat({seed:14});
 for(const id of ['A1','A2','A3','B1','B2','B3'])combat.applyInspirit({id,sign:'negative',effect:'sleep'});
 const waiting=combat.step();
 assert.equal(waiting.type,'awaiting_rotation');
 assert.equal(waiting.reason,'all_front_units_unable_to_act');
 combat.rotate(0,1);
 assert.equal(combat.step().type,'action');
});
test('unsupported temporary sleep is rejected rather than left permanently stuck',()=>{
 const combat=createCombat({seed:14});
 assert.throws(()=>combat.applyInspirit({id:'A1',sign:'negative',effect:'sleep',duration:2}),/unsupported/);
});
test('inspirited battle remains seed deterministic across purification and rotation',()=>{
 function replay(){
  const combat=createCombat({seed:17});
  combat.applyInspirit({id:'A1',sign:'negative',effect:'sleep'});
  combat.rotate(0,1);combat.purify(0,'A1');combat.rotate(0,-1);
  return [combat.simulate(140),combat.snapshot()];
 }
 assert.deepEqual(replay(),replay());
});
