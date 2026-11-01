import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,initialWaitRange} from '../engine/phase1.mjs';

const option=(override={})=>({
 seed:31,rotationCooldownMs:0,
 openingPriorityResearch:{
  registeredFront:[['A1','A2','A3'],['B1','B2','B3']],
  visibleStartOffsets:[3,3],
  matchingCreditMode:'initial-wait',flashIds:[],
  ...override
 }
});
const find=(g,id)=>g.snapshot().teams.flatMap(t=>t.members).find(x=>x.id===id);
test('starting wheel can be different from matching-time original front',()=>{
 const g=createBattle(option());
 const snap=g.snapshot();
 assert.deepEqual(snap.teams[0].frontIds,['A4','A5','A6']);
 assert.deepEqual(snap.teams[0].members.filter(m=>m.originalFront).map(m=>m.id),['A1','A2','A3']);
 for(const id of ['A4','A5','A6','B4','B5','B6'])
  assert.equal(find(g,id).wait,find(g,id).cost);
 for(const id of ['A1','A2','A3','B1','B2','B3']){
  assert.equal(find(g,id).wait,null);
  const m=find(g,id),[low,high]=initialWaitRange(m.speed);
  assert.ok(m.researchedOpeningWait>=low&&m.researchedOpeningWait<=high);
 }
});
test('returning registered members before ANY auto action restores sampled opening wait',()=>{
 const g=createBattle(option());
 for(let i=0;i<3;i++)assert.equal(g.rotate(0,1,i).ok,true);
 assert.deepEqual(g.snapshot().teams[0].frontIds,['A1','A2','A3']);
 for(const id of ['A1','A2','A3']){
  const m=find(g,id);
  assert.equal(m.wait,m.researchedOpeningWait);
  assert.ok(m.wait<m.cost);
 }
});
test('after a real auto action, the same returning original front uses standard cost',()=>{
 const g=createBattle(option());
 const first=g.step();
 assert.ok(first.id.startsWith('A')||first.id.startsWith('B'));
 for(let i=0;i<3;i++)g.rotate(0,1,i);
 for(const id of ['A1','A2','A3'])assert.equal(find(g,id).wait,find(g,id).cost);
});
test('matching credit opt-out keeps old ordinary arrival wait even before action',()=>{
 const g=createBattle(option({matchingCreditMode:'metadata-only'}));
 for(let i=0;i<3;i++)g.rotate(0,1,i);
 for(const id of ['A1','A2','A3'])assert.equal(find(g,id).wait,find(g,id).cost);
});
test('first-wait experiments and forecasts are deterministic without side effects',()=>{
 const first=createBattle(option()),second=createBattle(option());
 first.rotate(0,1,1);second.rotate(0,1,1);
 assert.deepEqual(first.snapshot(),second.snapshot());
 const before=first.snapshot();
 const predicted=first.predict(20);
 assert.deepEqual(first.snapshot(),before);
 const actual=first.simulate(20);
 assert.deepEqual(predicted.map(x=>x.id),actual.map(x=>x.id));
 assert.deepEqual(predicted.map(x=>x.pointsUntil),
  actual.map(x=>x.pointsElapsed-before.pointsElapsed));
});
test('invalid offset and matching hypothesis names are rejected',()=>{
 for(const visibleStartOffsets of [[-1,0],[6,0],[0,0,0],['3',0],[0,1.3]])
  assert.throws(()=>createBattle(option({visibleStartOffsets})));
 for(const matchingCreditMode of ['real','boost-10',true,null])
  assert.throws(()=>createBattle(option({matchingCreditMode})));
});
