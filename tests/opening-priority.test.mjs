import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningPriority} from '../engine/opening-priority.mjs';

const roster={
 registeredFront:[['A1','A2','A3'],['B1','B2','B3']],
 flashIds:['A6','B2']
};
const choose=(rights,front=['A1','A2','A6','B1','B2','B3'],wait=[0,8,50,3,28,10],scheduledId='A1')=>
 rights.choose({frontIds:front,waits:wait,scheduledId});
test('matching-time frontline remains separate from visible roster',()=>{
 const p=createOpeningPriority({
  registeredFront:[['A4','A5','A6'],['B1','B2','B3']],flashIds:['A4']
 });
 assert.deepEqual(p.snapshot().registeredFront[0],['A4','A5','A6']);
 assert.ok(p.snapshot().openingPending.includes('A6'));
 assert.ok(!p.snapshot().openingPending.includes('A1'));
});
test('Flash chooses one active holder rather than next normal scheduled actor',()=>{
 const p=createOpeningPriority(roster);
 const choice=choose(p);
 assert.equal(choice.actorId,'B2');
 assert.equal(choice.kind,'flash-intercept');
 assert.equal(choice.skippedId,'A1');
 assert.equal(choice.consumedFlash,true);
 p.commit(choice);
 assert.deepEqual(p.snapshot().flashReady,['A6']);
 assert.equal(p.snapshot().recent[0].originalNext,'A1');
});
test('one-use Flash cannot be spent twice and does not disappear when benched',()=>{
 const p=createOpeningPriority(roster);
 // First normal unit acts with no Flash holder in front.
 const noFlash=choose(p,['A1','A2','A3','B1','B3','B4'],[1,2,3,4,5,6],'A1');
 assert.equal(noFlash.kind,'opening-initial');
 p.commit(noFlash);
 assert.deepEqual(p.snapshot().flashReady,['A6','B2']);
 const trigger=choose(p,['A1','A2','A6','B1','B2','B3'],[1,2,50,4,10,5],'A1');
 p.commit(trigger);
 assert.throws(()=>p.commit(trigger),/already consumed/);
 const afterward=choose(p,['A1','A2','A6','B1','B2','B3'],[1,2,50,4,10,5],'A1');
 assert.equal(afterward.actorId,'A6');
});
test('multiple Flash holders tied on wait use stable front order research fixture',()=>{
 const p=createOpeningPriority(roster);
 const c=choose(p,['A6','B2','A1'],[15,15,0],'A1');
 assert.equal(c.actorId,'A6');
});
test('non-flash opening right metadata is consumed on first genuine action',()=>{
 const p=createOpeningPriority();
 const first=choose(p,['A1','B1'],[0,3],'A1');
 assert.equal(first.registeredUnspent,true);
 p.commit(first);
 const repeat=choose(p,['A1','B1'],[0,3],'A1');
 assert.equal(repeat.kind,'normal');
 assert.equal(repeat.registeredUnspent,false);
});
test('fork keeps Flash and pending original-right state without sharing mutation',()=>{
 const p=createOpeningPriority(roster);
 p.commit(choose(p,['A1','B1'],[0,1],'A1'));
 const before=p.snapshot();
 const other=p.fork();
 const action=choose(other);
 other.commit(action);
 assert.deepEqual(p.snapshot(),before);
 assert.deepEqual(other.snapshot().flashReady,['A6']);
});
test('refuses invalid IDs, duplicate flags, missing scheduled actor or invalid policy',()=>{
 for(const bad of [
  {flashIds:['Z7']},{flashIds:['A1','A1']},
  {registeredFront:[['A1','A1','A3'],['B1','B2','B3']]},
  {registeredFront:[['B1','A2','A3'],['B1','B2','B3']]},
  {registeredFront:[['A1','A2','A3']]},
  {skippedTurnPolicy:'pretend-original'}
 ])assert.throws(()=>createOpeningPriority(bad));
 const p=createOpeningPriority();
 assert.throws(()=>p.choose({frontIds:['A1'],waits:[0],scheduledId:'B1'}));
 assert.throws(()=>p.choose({frontIds:['A1'],waits:[-1],scheduledId:'A1'}));
});
