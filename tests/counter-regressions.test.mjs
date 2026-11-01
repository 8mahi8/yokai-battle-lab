import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {createCounterWindow} from '../engine/counter-window.mjs';

test('invalid cutin duration does not half-start combat or presentation clocks',()=>{
 const game=createCombat({researchPresentation:true,researchSpecialEffects:true,researchCounterTiming:true});
 const before=game.snapshot();
 for(const durationMs of [0,60001,-1,1.5]){
  assert.throws(()=>game.beginCounterCutin({attackerSide:1,durationMs}),RangeError);
  assert.deepEqual(game.snapshot().counterWindow,before.counterWindow);
  assert.deepEqual(game.snapshot().presentation,before.presentation);
 }
});
test('invalid wheel snapshot cannot mutate either team',()=>{
 const tracker=createCounterWindow();
 const before=tracker.snapshot();
 assert.throws(()=>tracker.setFront({side:0,ids:['A1','B2','A3']}));
 assert.throws(()=>tracker.setFront({side:1,ids:['B1','B1','B2']}));
 assert.deepEqual(tracker.snapshot(),before);
});
test('a previously resolved delayed counter never reapplies damage on future clock ticks',()=>{
 const game=createCombat({researchPresentation:true,researchSpecialEffects:true,researchCounterTiming:true});
 game.beginCounterCutin({attackerSide:1,durationMs:800});
 game.giveSoul('A1',100);
 const charge=game.prepareSoultimate(0,'A1');
 const prepared=game.resolveSoultimate(0,charge.token,true);
 assert.equal(prepared.effectStatus,'pending-counter-hit');
 game.advancePresentation(800);
 const once=game.snapshot();
 assert.equal(once.events.filter(x=>x.type==='counter-hit').length,1);
 game.advancePresentation(5000);
 const twice=game.snapshot();
 assert.equal(twice.events.filter(x=>x.type==='counter-hit').length,1);
 assert.deepEqual(twice.squads,once.squads);
});
