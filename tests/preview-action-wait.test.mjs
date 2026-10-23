import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle} from '../engine/phase1.mjs';

test('preview agrees with real scheduler for six wait multipliers',()=>{
 for(const actionWait of [0,1,2,3,5,10]){
  for(const seed of [1,3,20,101]){
   const battle=createBattle({seed});
   const original=battle.snapshot();
   const forecast=battle.predict(20,actionWait);
   assert.deepEqual(battle.snapshot(),original);
   const actual=Array.from({length:20},()=>battle.step(actionWait));
   assert.deepEqual(forecast.map(e=>e.id),actual.map(e=>e.id));
   assert.deepEqual(forecast.map(e=>e.pointsUntil),
    actual.map(e=>e.pointsElapsed-original.pointsElapsed));
  }
 }
});
test('forecast rejects unsupported action wait values',()=>{
 const battle=createBattle();
 for(const n of [-1,11,1.5,NaN,'3'])assert.throws(()=>battle.predict(5,n));
});
