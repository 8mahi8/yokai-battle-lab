import test from 'node:test';
import assert from 'node:assert/strict';
import {createWheelCoalescing} from '../engine/wheel-coalescing.mjs';
import {createCombat} from '../engine/combat.mjs';

const front='B1 B2 B3'.split(' ');
const wheel=()=>createWheelCoalescing({fronts:['A1 A2 A3'.split(' '),front]});
const make=()=>createCombat({seed:113,researchSpecialEffects:true,
  researchPresentation:true,researchCounterTiming:true,researchWheelCoalescing:true});
const charge=(g)=>{
  g.beginCounterCutin({attackerSide:1,durationMs:800});
  g.giveSoul('A1',100);
  const c=g.prepareSoultimate(0,'A1');assert.equal(c.ok,true);
  return c;
};
const HP=(g)=>g.snapshot().squads[1].map(m=>m.hp);

test('three and four rotations are explicitly UNSOURCED and audited',()=>{
  const w=wheel();
  assert.equal(w.rotate({side:1,frontIds:['B2','B3','B4']}).uncertainty,null);
  assert.equal(w.rotate({side:1,frontIds:['B3','B4','B5']}).uncertainty,null);
  const third=w.rotate({side:1,frontIds:['B4','B5','B6']});
  assert.equal(third.uncertainty.code,'three-plus-rotations-unverified');
  assert.equal(third.groupRotations,3);
  const fourth=w.rotate({side:1,frontIds:['B1','B2','B3']});
  assert.equal(fourth.uncertainty.rotations,4);
  assert.deepEqual(w.snapshot().uncertainties.map(x=>x.rotations),[3,4]);
  assert.deepEqual(w.snapshot().physical[1],front);
});
test('an actual auto-action clears uncertain grouping for a new sourced two-turn window',()=>{
  const w=wheel();
  for(const ids of [['B2','B3','B4'],['B3','B4','B5'],['B4','B5','B6']])w.rotate({side:1,frontIds:ids});
  assert.equal(w.snapshot().groups[1].rotations,3);
  w.actionBoundary();
  assert.equal(w.snapshot().groups[1],null);
  const next=w.rotate({side:1,frontIds:['B5','B6','B1']});
  assert.equal(next.uncertainty,null);
  assert.equal(next.groupRotations,1);
});
test('three rotations while a counter hit is pending do not invent a damage target',()=>{
  const game=make(),c=charge(game);
  game.rotate(1,1); // provisional first
  const prepared=game.resolveSoultimate(0,c.token,true);
  assert.equal(prepared.effectStatus,'pending-counter-hit');
  game.rotate(1,1); // proven two-turn correction
  game.rotate(1,1); // unsourced third
  const snapshot=game.snapshot();
  assert.equal(snapshot.uncertainCounterHits.length,1);
  assert.equal(snapshot.uncertainCounterHits[0].hitId,prepared.counter.id);
  const before=HP(game);
  game.advancePresentation(800);
  const after=game.snapshot();
  assert.deepEqual(HP(game),before);
  assert.equal(after.counterEffectsPending,0);
  assert.deepEqual(after.uncertainCounterHits,[]);
  const unresolved=after.events.filter(e=>e.type==='counter-hit-indeterminate');
  assert.equal(unresolved.length,1);
  assert.equal(unresolved[0].hpApplied,false);
  assert.equal(unresolved[0].rotationCount,3);
  assert.equal(after.events.filter(e=>e.type==='counter-hit').length,0);
});
test('counter charge begun AFTER three rotations also reports an unverified hit result',()=>{
  const game=make(),c=charge(game);
  game.rotate(1,1);game.rotate(1,1);game.rotate(1,1);
  const planned=game.resolveSoultimate(0,c.token,true);
  assert.equal(planned.effectStatus,'pending-counter-hit');
  assert.equal(game.snapshot().uncertainCounterHits.length,1);
  const before=HP(game);game.advancePresentation(800);
  assert.deepEqual(HP(game),before);
  assert.ok(game.snapshot().events.some(e=>e.type==='counter-hit-indeterminate'));
});
test('two rotations remain fully executable and retain previous source-grounded behavior',()=>{
  const game=make(),c=charge(game);
  game.rotate(1,1);
  game.resolveSoultimate(0,c.token,true);
  game.rotate(1,1);
  const before=HP(game);
  game.advancePresentation(800);
  assert.deepEqual(game.snapshot().uncertainCounterHits,[]);
  assert.ok(HP(game).some((hp,i)=>hp<before[i]));
  assert.equal(game.snapshot().events.filter(e=>e.type==='counter-hit').length,1);
});
test('third rotation on non-target team cannot mark opposing side pending target uncertain',()=>{
  const game=make(),c=charge(game);
  // Charging caster A1 remains in front while B is the target side.
  // A-side spinning here would cancel charge, so mark B hit first, then
  // rotate A after completion.
  game.resolveSoultimate(0,c.token,true);
  game.rotate(0,1);game.rotate(0,1);game.rotate(0,1);
  assert.deepEqual(game.snapshot().uncertainCounterHits,[]);
  const before=HP(game);
  game.advancePresentation(800);
  assert.ok(HP(game).some((hp,i)=>hp<before[i]));
});
test('unknown target flag persists across extra rotations but does not apply damage twice',()=>{
 const game=make(),c=charge(game);
 game.resolveSoultimate(0,c.token,true);
 for(let i=0;i<5;i++)game.rotate(1,1);
 assert.equal(game.snapshot().uncertainCounterHits.length,1);
 const before=HP(game);game.advancePresentation(800);
 game.advancePresentation(1000);
 assert.deepEqual(HP(game),before);
 assert.equal(game.snapshot().events.filter(e=>e.type==='counter-hit-indeterminate').length,1);
});
