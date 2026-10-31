import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLogicalAction,validateActionWait} from '../engine/action-timeline-core.mjs';
import {createBattle} from '../engine/phase1.mjs';

/** This is a legacy-behavior parity test, NOT a claim of original YW2 timing. */
test('V3 shared clock advances only logical wait debt, preserving stable tie precedence',()=>{
 const active=[
  {id:'A1',wait:24,cost:120,acted:0},
  {id:'B1',wait:24,cost:90,acted:0},
  {id:'A2',wait:30,cost:150,acted:0}
 ];
 const {actor,scheduled,delta,decision}=advanceLogicalAction(active,{actionWait:3});
 assert.equal(actor.id,'A1');
 assert.strictEqual(actor,scheduled);
 assert.equal(delta,24);
 assert.equal(decision,undefined);
 assert.deepEqual(active.map(m=>m.wait),[120,0,6]);
 assert.deepEqual(active.map(m=>m.acted),[0,0,0],
  'logical scheduler does not mutate separate action counters');
});

test('V3 shared scheduler preserves opt-in opening-priority skip and commit order',()=>{
 const active=[{id:'A1',wait:12,cost:120},{id:'B1',wait:7,cost:90}];
 const calls=[];
 const openingPriority={
  choose:(state)=>{calls.push(['choose',state.frontIds,state.scheduledId]);
   return {actorId:'A1',skippedId:'B1',skippedTurnPolicy:'consume'};},
  commit:(decision)=>calls.push(['commit',decision.actorId])
 };
 const result=advanceLogicalAction(active,{actionWait:3,openingPriority});
 assert.equal(result.delta,7);
 assert.equal(result.actor.id,'A1');
 assert.equal(result.scheduled.id,'B1');
 assert.deepEqual(active.map(x=>x.wait),[120,90]);
 assert.deepEqual(calls,[['choose',['A1','B1'],'B1'],['commit','A1']]);
});

test('V3 shared clock validates domain-specific action weight, not milliseconds',()=>{
 for(const n of [-1,1.5,Infinity,NaN,11,'3',null])
  assert.throws(()=>validateActionWait(n),/actionWait/);
 assert.equal(validateActionWait(3),3);
 assert.throws(()=>advanceLogicalAction([]),/No eligible/);
});

test('V3: tentative next-five action forecast uses exact live scheduler yet leaves live state unchanged',()=>{
 for(const seed of [7,212,8192,20261029]){
  const g=createBattle({seed});
  for(let turn=0;turn<12;turn++){
   const before=g.snapshot();
   const predictions=g.predict(5);
   assert.deepEqual(g.snapshot(),before,
    'viewing the future must not consume RNG, action credits, or turn count');
   const actual=g.step(3);
   assert.equal(actual.id,predictions[0].id,'next actor drifted from common kernel');
   assert.equal(actual.elapsed,predictions[0].pointsUntil,
    'actual action debt must equal a one-step forecast');
   assert.equal(actual.action,turn+1);
  }
 }
});
