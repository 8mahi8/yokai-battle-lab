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
test('two endurance consumptions lock original cut-in front even on late finish',()=>{
 const t=createCounterWindow();start(t,800,2);
 t.advance(400);t.setFront({side:1,ids:['B2','B3','B4']});
 t.advance(500);
 const outcome=t.completeCharge({side:0,token:7});
 assert.equal(outcome.frontLock,'endure-exception');
 assert.deepEqual(outcome.targetIds,['B1','B2','B3']);
 t.setFront({side:1,ids:['B4','B5','B6']});
 assert.deepEqual(t.advance(400)[0].targetIds,['B1','B2','B3']);
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
