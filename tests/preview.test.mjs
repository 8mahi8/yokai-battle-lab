import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle} from '../engine/phase1.mjs';
test('predicted first five actions exactly match stepped research scheduler',()=>{
  const game=createBattle({seed:87});
  const before=game.snapshot();
  const preview=game.predict(5);
  assert.equal(preview.length,5);
  assert.deepEqual(game.snapshot(),before);
  assert.deepEqual(preview.map(x=>x.id),game.simulate(5).map(x=>x.id));
});
test('disabled unit excluded and post-rotation preview matches events',()=>{
  const game=createBattle({seed:2,rotationCooldownMs:0});
  game.setCanAct('A1',false);
  assert.ok(game.predict(30).every(x=>x.id!=='A1'));
  game.rotate(0,1,0);
  assert.deepEqual(game.predict(30).map(x=>x.id),game.simulate(30).map(x=>x.id));
});
test('predicted debt is cumulative and unverified label is explicit',()=>{
  const game=createBattle({seed:400}),preview=game.predict(30);
  assert.ok(preview.every((event,i)=>i===0||event.pointsUntil>=preview[i-1].pointsUntil));
  assert.ok(preview.every(event=>event.confidence==='research-model'));
  assert.throws(()=>game.predict(31));
});
