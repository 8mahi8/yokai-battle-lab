import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
test('optional test-only 100% loaf chance skips damage',()=>{
  const rental=RENTAL_SQUAD.map(u=>({...u,loafChance:100}));
  const game=createCombat({teams:[rental,rental],enableLoafing:true});
  const actions=game.simulate(100);
  assert.equal(actions.length,100);
  assert.ok(actions.every(e=>e.kind==='loaf'));
  assert.ok(game.snapshot().squads.flat().every(u=>u.hp===u.maxHp));
});
test('zero loaf chance still allows usual moves',()=>{
  const rental=RENTAL_SQUAD.map(u=>({...u,loafChance:0}));
  const game=createCombat({teams:[rental,rental],enableLoafing:true});
  assert.ok(game.simulate(30).every(e=>e.kind!=='loaf'));
});
test('out-of-range test probability rejected',()=>{
  const rental=RENTAL_SQUAD.map(u=>({...u}));
  rental[0].loafChance=101;
  assert.throws(()=>createCombat({teams:[rental,rental],enableLoafing:true}));
});
