import test from 'node:test';
import assert from 'node:assert/strict';
import {createPokeTrial} from '../engine/poke-input.mjs';

test('a sequence of accepted taps fills the trial gauge once and once only',()=>{
 const g=createPokeTrial({targetId:'B1',requiredHits:4});
 assert.deepEqual(g.snapshot().center,[.5,.5]);
 for(let i=1;i<=4;i++){
  const result=g.input({type:'tap',x:.5,y:.5});
  assert.equal(result.hits,i);
  assert.equal(result.progress,i/4);
 }
 assert.equal(g.snapshot().completed,true);
 assert.deepEqual(g.input({type:'tap',x:.5,y:.5}),g.snapshot());
});
test('outside target, invalid coordinates and pointer motion do not advance',()=>{
 const g=createPokeTrial({targetId:'A4',requiredHits:3});
 for(const e of [{type:'tap',x:0,y:0},{type:'tap',x:NaN,y:.5},
   {type:'tap',x:-1,y:.5},{type:'down',x:1.01,y:.5}])
  assert.equal(g.input(e).hits,0);
 assert.throws(()=>g.input({type:'move',x:.5,y:.5}));
 assert.throws(()=>g.input({type:'up',x:.5,y:.5}));
});
test('normalized stroke within edge is accepted, beyond circle is not',()=>{
 const g=createPokeTrial({targetId:'B5',requiredHits:3,radius:.2});
 assert.equal(g.input({type:'down',x:.7,y:.5}).hits,1);
 assert.equal(g.input({type:'tap',x:.8,y:.5}).hits,1);
});
test('invalid target, hit count and radius are rejected',()=>{
 for(const bad of [undefined,null,'C7','X','B0','B7'])assert.throws(()=>createPokeTrial({targetId:bad}));
 for(const bad of [0,-1,61,3.5,'2'])assert.throws(()=>createPokeTrial({targetId:'A1',requiredHits:bad}));
 for(const bad of [0,-1,.6,NaN])assert.throws(()=>createPokeTrial({targetId:'A1',radius:bad}));
});
test('mutating UI snapshots never changes internal state',()=>{
 const g=createPokeTrial({targetId:'B2'});
 const copy=g.snapshot();
 copy.center[0]=-100;
 assert.equal(g.snapshot().center[0],.5);
});
