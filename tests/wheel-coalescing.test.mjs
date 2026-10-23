import test from 'node:test';
import assert from 'node:assert/strict';
import {createWheelCoalescing} from '../engine/wheel-coalescing.mjs';
const init=()=>createWheelCoalescing({fronts:[['A1','A2','A3'],['B1','B2','B3']]});
test('second rotation without auto action retroactively suppresses the first tentative lock',()=>{
 const w=init();
 w.rotate({side:1,frontIds:['B2','B3','B4']});
 assert.equal(w.trackLockedHit({targetSide:1,hitId:15}).tracked,true);
 const second=w.rotate({side:1,frontIds:['B3','B4','B5']});
 assert.equal(second.groupRotations,2);
 assert.deepEqual(second.corrections,[{
  hitId:15,frontIds:['B1','B2','B3'],
  supersededFront:['B2','B3','B4'],
  reason:'second-rotation-before-auto-action'
 }]);
 assert.deepEqual(w.snapshot().physical[1],['B3','B4','B5']);
});
test('lock after the second rotation uses final front and requires no correction',()=>{
 const w=init();
 w.rotate({side:1,frontIds:['B2','B3','B4']});
 w.rotate({side:1,frontIds:['B3','B4','B5']});
 assert.equal(w.trackLockedHit({targetSide:1,hitId:3}).tracked,false);
 assert.deepEqual(w.snapshot().physical[1],['B3','B4','B5']);
});
test('one wheel rotation without a second leaves target as actually selected',()=>{
 const w=init();
 const moved=w.rotate({side:1,frontIds:['B2','B3','B4']});
 assert.deepEqual(moved.corrections,[]);
 assert.equal(w.trackLockedHit({targetSide:1,hitId:11}).tracked,true);
 assert.deepEqual(w.snapshot().groups[1].first,['B2','B3','B4']);
});
test('auto Yo-kai action clears the candidate pair and pending correction',()=>{
 const w=init();
 w.rotate({side:1,frontIds:['B2','B3','B4']});
 w.trackLockedHit({targetSide:1,hitId:5});
 w.actionBoundary();
 const moved=w.rotate({side:1,frontIds:['B3','B4','B5']});
 assert.deepEqual(moved.corrections,[]);
 assert.equal(moved.groupRotations,1);
});
test('a hit already resolved cannot be corrected later',()=>{
 const w=init();
 w.rotate({side:1,frontIds:['B2','B3','B4']});
 w.trackLockedHit({targetSide:1,hitId:5});
 w.finalizeHit(5);
 const moved=w.rotate({side:1,frontIds:['B3','B4','B5']});
 assert.deepEqual(moved.corrections,[]);
});
test('no correction crosses sides or distinct IDs',()=>{
 const w=init();
 w.rotate({side:0,frontIds:['A2','A3','A4']});
 w.trackLockedHit({targetSide:0,hitId:1});
 const result=w.rotate({side:1,frontIds:['B2','B3','B4']});
 assert.deepEqual(result.corrections,[]);
 assert.equal(w.trackLockedHit({targetSide:1,hitId:2}).tracked,true);
 assert.deepEqual(w.rotate({side:1,frontIds:['B3','B4','B5']}).corrections.map(x=>x.hitId),[2]);
 assert.deepEqual(w.rotate({side:0,frontIds:['A3','A4','A5']}).corrections.map(x=>x.hitId),[1]);
});
test('identical front, invalid cross-team IDs, duplicate hit do not corrupt snapshot',()=>{
 const w=init();
 assert.equal(w.rotate({side:0,frontIds:['A1','A2','A3']}).changed,false);
 w.rotate({side:0,frontIds:['A2','A3','A4']});
 assert.equal(w.trackLockedHit({targetSide:0,hitId:8}).tracked,true);
 assert.equal(w.trackLockedHit({targetSide:0,hitId:8}).tracked,false);
 const before=w.snapshot();
 for(const ids of [['A3','A3','A4'],['B1','A3','A4'],['A3']])
  assert.throws(()=>w.rotate({side:0,frontIds:ids}));
 assert.deepEqual(w.snapshot(),before);
});
test('snapshots and returned correction arrays are defensive copies',()=>{
 const w=init();
 w.rotate({side:1,frontIds:['B2','B3','B4']});
 w.trackLockedHit({targetSide:1,hitId:2});
 const c=w.rotate({side:1,frontIds:['B3','B4','B5']});
 c.corrections[0].frontIds.push('C');
 const before=w.snapshot();before.physical[1][0]='Z';before.history.length=0;
 const after=w.snapshot();
 assert.deepEqual(after.physical[1],['B3','B4','B5']);
 assert.equal(after.history.length,2);
});
