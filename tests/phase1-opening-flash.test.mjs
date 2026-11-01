import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle} from '../engine/phase1.mjs';

const feature=extras=>({
 seed:15,rotationCooldownMs:0,
 openingPriorityResearch:{flashIds:['B6'],...extras}
});
test('legacy default scheduling remains byte-for-byte unchanged when feature is absent',()=>{
 const expected=createBattle({seed:43}).simulate(100);
 const defaultInstance=createBattle({seed:43,openingPriorityResearch:null});
 assert.deepEqual(defaultInstance.simulate(100),expected);
 assert.equal(Object.hasOwn(defaultInstance.snapshot(),'openingPriority'),false);
});
test('benched Flash enters and replaces next ordinary action once only',()=>{
 const regular=createBattle({seed:15,rotationCooldownMs:0});
 const g=createBattle(feature());
 regular.rotate(1,-1,0);
 g.rotate(1,-1,0); // deploy B6 while other front are still awaiting turns
 const usual=regular.step();
 const first=g.step();
 assert.notEqual(usual.id,'B6','the flash should actually change action order for this fixture');
 assert.equal(first.id,'B6');
 assert.equal(first.priorityKind,'flash-intercept');
 assert.equal(first.originalScheduledId,usual.id);
 assert.equal(first.skippedId,usual.id);
 assert.equal(first.flashConsumed,true);
 assert.deepEqual(g.snapshot().openingPriority.flashReady,[]);
 const later=g.simulate(45);
 assert.equal(later.filter(e=>e.flashConsumed).length,0);
});
test('swapping Flash out before it acts does not consume the charge',()=>{
 const g=createBattle(feature());
 g.rotate(1,-1,0); // B6 enters
 g.rotate(1,1,1); // B6 leaves without acting
 assert.deepEqual(g.snapshot().openingPriority.flashReady,['B6']);
 const first=g.step();
 assert.equal(first.flashConsumed,false);
 assert.deepEqual(g.snapshot().openingPriority.flashReady,['B6']);
 g.rotate(1,-1,2);
 assert.equal(g.step().id,'B6');
 assert.equal(g.snapshot().openingPriority.flashReady.length,0);
});
test('matching-time original-front identity can differ from current visible wheel',()=>{
 const g=createBattle(feature({registeredFront:[['A4','A5','A6'],['B4','B5','B6']]}));
 const s=g.snapshot();
 assert.deepEqual(s.teams[0].members.filter(x=>x.originalFront).map(x=>x.id),['A4','A5','A6']);
 assert.deepEqual(s.teams[0].frontIds,['A1','A2','A3']);
 assert.ok(s.openingPriority.openingPending.includes('A4'));
 assert.ok(!s.openingPriority.openingPending.includes('A1'));
});
test('predict remains side effect free and agrees with real Flash scheduler',()=>{
 for(const skippedTurnPolicy of ['consume','preserve']){
  for(const seed of [1,15,50]){
   const g=createBattle({seed,rotationCooldownMs:0,openingPriorityResearch:{
    flashIds:['A1','B3','B6'],skippedTurnPolicy
   }});
   g.rotate(1,-1,0);
   const before=g.snapshot();
   const predicted=g.predict(30);
   assert.deepEqual(g.snapshot(),before);
   const actual=g.simulate(30);
   assert.deepEqual(predicted.map(x=>x.id),actual.map(x=>x.id));
   assert.deepEqual(predicted.map(x=>x.pointsUntil),
    actual.map(x=>x.pointsElapsed-before.pointsElapsed));
   assert.deepEqual(predicted.map(x=>x.priorityKind),actual.map(x=>x.priorityKind));
   assert.deepEqual(predicted.map(x=>x.skippedId),actual.map(x=>x.skippedId));
  }
 }
});
test('skipped-turn consumption variant remains an explicit unverified choice',()=>{
 const consume=createBattle(feature({skippedTurnPolicy:'consume'}));
 const preserve=createBattle(feature({skippedTurnPolicy:'preserve'}));
 consume.rotate(1,-1,0);preserve.rotate(1,-1,0);
 const a=consume.step(),b=preserve.step();
 assert.equal(a.id,'B6');assert.equal(b.id,'B6');
 assert.equal(a.skippedId,b.skippedId);
 const scheduled=a.skippedId;
 const cost=consume.snapshot().teams.flatMap(x=>x.members).find(x=>x.id===scheduled).cost;
 const waitA=consume.snapshot().teams.flatMap(x=>x.members).find(x=>x.id===scheduled).wait;
 const waitB=preserve.snapshot().teams.flatMap(x=>x.members).find(x=>x.id===scheduled).wait;
 assert.equal(waitA,cost);
 assert.equal(waitB,0);
});
test('disabled and re-enabled Flash user is not consumed by another member action',()=>{
 const g=createBattle(feature({flashIds:['A2']}));
 g.setCanAct('A2',false);
 for(let n=0;n<10;n++)g.step();
 assert.deepEqual(g.snapshot().openingPriority.flashReady,['A2']);
 g.setCanAct('A2',true);
 const action=g.step();
 assert.equal(action.id,'A2');assert.equal(action.flashConsumed,true);
});
test('invalid optional research configuration is rejected',()=>{
 for(const option of [true,[],4,'flash'])assert.throws(()=>createBattle({openingPriorityResearch:option}));
 assert.throws(()=>createBattle({openingPriorityResearch:{flashIds:['Z9']}}));
});
