import test from 'node:test';
import assert from 'node:assert/strict';
import {createCounterWindow} from '../engine/counter-window.mjs';

const start=(t,durationMs=800,enduresSpent=0)=>{
 const c=t.beginCutin({attackerSide:1,durationMs,enduresSpent});
 assert.equal(c.ok,true);
 const started=t.beginCharge({side:0,token:7});
 assert.equal(started.ok,true);
};
test('charge complete inside cut-in locks enemy current front',()=>{
 const t=createCounterWindow();start(t);
 t.advance(200);
 t.setFront({side:1,ids:['B2','B3','B4']});
 const result=t.completeCharge({side:0,token:7});
 assert.equal(result.frontLock,'completion');
 assert.equal(result.hitAt,800);
 assert.deepEqual(result.targetIds,['B2','B3','B4']);
 t.advance(200);t.setFront({side:1,ids:['B4','B5','B6']});
 assert.deepEqual(t.advance(400)[0].targetIds,['B2','B3','B4']);
});
test('late completion checks front at approximately 500ms after cut-in',()=>{
 const t=createCounterWindow();start(t);
 t.advance(950);
 const outcome=t.completeCharge({side:0,token:7});
 assert.equal(outcome.frontLock,'impact');
 assert.equal(outcome.hitAt,1300);
 assert.equal(outcome.targetIds,null);
 t.setFront({side:1,ids:['B2','B3','B4']});
 assert.deepEqual(t.advance(349),[]);
 assert.deepEqual(t.advance(1)[0].targetIds,['B2','B3','B4']);
});
test('late charge completing after delay cannot hit before it is complete',()=>{
 const t=createCounterWindow({lateDelayMs:500});start(t);
 t.advance(1700);
 const outcome=t.completeCharge({side:0,token:7});
 assert.equal(outcome.hitAt,1700);
 assert.equal(t.advance(0)[0].resolvedAt,1700);
});
test('two endurance consumptions have unambiguous cut-in front only if no cut-in rotation happened',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.advance(900);
 const outcome=t.completeCharge({side:0,token:7});
 assert.equal(outcome.frontLock,'endure-exception');
 assert.equal(outcome.uncertainty,null);
 assert.deepEqual(outcome.targetIds,['B1','B2','B3']);
 t.setFront({side:1,ids:['B4','B5','B6']});
 assert.deepEqual(t.advance(400)[0].targetIds,['B1','B2','B3']);
});
test('22D two Endures with wheel changes DURING cut-in expose unknown lock frame, not a verified target',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.advance(400);
 t.setFront({side:1,ids:['B2','B3','B4']});
 assert.equal(t.snapshot().cutin.frontChangedDuringCutin,true);
 t.advance(500);
 const result=t.completeCharge({side:0,token:7});
 assert.equal(result.frontLock,'endure-exception');
 assert.equal(result.uncertainty?.code,'two-endures-cutin-front-lock-time-unverified');
 assert.deepEqual(result.targetIds,['B1','B2','B3'],
  'original front is a fixture CANDIDATE, never an established lock');
 t.setFront({side:1,ids:['B4','B5','B6']});
 const hit=t.advance(400)[0];
 assert.equal(hit.uncertainty.code,'two-endures-cutin-front-lock-time-unverified');
 assert.deepEqual(hit.targetIds,['B1','B2','B3']);
});
test('22D returning to the original face DURING cut-in still leaves the lock frame unverified',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.advance(200);t.setFront({side:1,ids:['B2','B3','B4']});
 t.advance(100);t.setFront({side:1,ids:['B1','B2','B3']});
 t.advance(600);
 const q=t.completeCharge({side:0,token:7});
 assert.equal(q.uncertainty.code,'two-endures-cutin-front-lock-time-unverified');
 assert.deepEqual(t.snapshot().fronts[1],['B1','B2','B3']);
});
test('22D a wheel rotation AFTER cut-in does not create an ambiguity DURING cut-in',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.advance(800);t.setFront({side:1,ids:['B2','B3','B4']});
 t.advance(100);
 const q=t.completeCharge({side:0,token:7});
 assert.equal(q.uncertainty,null);
 assert.deepEqual(q.targetIds,['B1','B2','B3']);
});
test('one endurance charge does not activate special exception',()=>{
 const t=createCounterWindow();start(t,800,1);
 t.advance(900);
 const result=t.completeCharge({side:0,token:7});
 assert.equal(result.frontLock,'impact');
});
test('exact cut-in end timestamp counts as late, not during',()=>{
 const t=createCounterWindow();start(t);
 t.advance(800);
 const result=t.completeCharge({side:0,token:7});
 assert.equal(result.completedDuringCutin,false);
 assert.equal(result.hitAt,1300);
});
test('counter cannot begin after cutin, on attacking side or with second charge',()=>{
 const t=createCounterWindow();
 assert.equal(t.beginCharge({side:0,token:1}).reason,'not_opponent_cutin');
 start(t);
 assert.equal(t.beginCharge({side:1,token:9}).reason,'not_opponent_cutin');
 assert.equal(t.beginCharge({side:0,token:9}).reason,'charge_already_tracked');
 t.advance(800);
 assert.equal(t.beginCharge({side:0,token:9}).reason,'not_opponent_cutin');
});
test('cancelling pending gesture prevents a hit without consuming any model state',()=>{
 const t=createCounterWindow();start(t);
 assert.equal(t.cancelCharge({side:0,token:9}).ok,false);
 assert.equal(t.cancelCharge({side:0,token:7}).ok,true);
 assert.equal(t.completeCharge({side:0,token:7}).reason,'no_matching_counter_charge');
 assert.deepEqual(t.advance(900),[]);
 assert.deepEqual(t.snapshot().hits,[]);
});
test('duplicate resolution and starting a second cutin while pending are rejected',()=>{
 const t=createCounterWindow();start(t);
 t.advance(300);assert.equal(t.completeCharge({side:0,token:7}).ok,true);
 assert.equal(t.completeCharge({side:0,token:7}).ok,false);
 t.advance(500);
 assert.equal(t.beginCutin({attackerSide:0,durationMs:400}).ok,true);
});
test('late hit pending disallows starting new cutin until hit resolves',()=>{
 const t=createCounterWindow();start(t);
 t.advance(900);t.completeCharge({side:0,token:7});
 assert.equal(t.beginCutin({attackerSide:0,durationMs:500}).reason,'cutin_or_hit_pending');
 t.advance(400);
 assert.equal(t.beginCutin({attackerSide:0,durationMs:500}).ok,true);
});
test('model is independent from wall time and defensive snapshots cannot mutate results',()=>{
 const t=createCounterWindow({startMs:400,lateDelayMs:250});
 start(t,200);
 const s=t.snapshot();s.fronts[0].push('X');s.cutin.frontAtStart[0]='X';
 assert.deepEqual(t.snapshot().fronts[0],['A1','A2','A3']);
 assert.deepEqual(t.snapshot().cutin.frontAtStart,['B1','B2','B3']);
 assert.equal(t.snapshot().now,400);
});
test('invalid input, duplicates and malformed timings rejected',()=>{
 assert.throws(()=>createCounterWindow({fronts:[['A1','A1','A3'],['B1','B2','B3']]}));
 assert.throws(()=>createCounterWindow({lateDelayMs:-1}));
 const t=createCounterWindow();
 assert.throws(()=>t.beginCutin({attackerSide:0,durationMs:-1}));
 assert.throws(()=>t.beginCutin({attackerSide:0,durationMs:5,enduresSpent:2.5}));
 assert.throws(()=>t.advance(2.1));
 assert.throws(()=>t.setFront({side:0,ids:['A1','A1','A2']}));
 assert.throws(()=>t.beginCharge({side:2,token:7}));
 assert.throws(()=>t.completeCharge({side:0,token:0}));
});


test('22D-B cut-in research ledger retains every candidate front and virtual offset, not a freeze-frame guess',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.advance(100);t.setFront({side:1,ids:['B2','B3','B4']});
 t.advance(230);t.setFront({side:1,ids:['B3','B4','B5']});
 t.advance(70);t.setFront({side:1,ids:['B1','B2','B3']});
 t.advance(500);
 const end=t.completeCharge({side:0,token:7});
 assert.equal(end.uncertainty.code,'two-endures-cutin-front-lock-time-unverified');
 assert.deepEqual(end.uncertainty.cutinFrontlineTimeline,[
  {at:0,frontIds:['B1','B2','B3']},
  {at:100,frontIds:['B2','B3','B4']},
  {at:330,frontIds:['B3','B4','B5']},
  {at:400,frontIds:['B1','B2','B3']}
 ]);
 assert.equal(end.uncertainty.historyTruncated,false);
 end.uncertainty.cutinFrontlineTimeline[1].frontIds[0]='FAKE';
 assert.equal(t.snapshot().pending[0].uncertainty.cutinFrontlineTimeline[1].frontIds[0],'B2',
  'observations must not mutate the pending research target');
});

test('22D-B only changes while the cut-in runs enter the candidate lineup ledger',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.setFront({side:0,ids:['A2','A3','A4']});
 t.setFront({side:1,ids:['B1','B2','B3']});
 t.advance(800);t.setFront({side:1,ids:['B2','B3','B4']});
 assert.deepEqual(t.snapshot().cutin.cutinFrontlineTimeline,[
  {at:0,frontIds:['B1','B2','B3']}
 ]);
 assert.equal(t.snapshot().cutin.frontChangedDuringCutin,false);
 t.advance(1);assert.equal(t.completeCharge({side:0,token:7}).uncertainty,null);
});

test('22D-B a bounded virtual cut-in ledger reports discarded observations instead of pretending complete footage',()=>{
 const t=createCounterWindow();start(t,800,2);
 for(let i=0;i<70;i++)t.setFront({side:1,
  ids:i%2===0?['B2','B3','B4']:['B1','B2','B3']});
 assert.equal(t.snapshot().cutin.cutinFrontlineTimeline.length,64);
 assert.equal(t.snapshot().cutin.historyTruncated,true);
 t.advance(800);
 const result=t.completeCharge({side:0,token:7});
 assert.equal(result.uncertainty.historyTruncated,true);
 assert.equal(result.uncertainty.cutinFrontlineTimeline.length,64);
});
