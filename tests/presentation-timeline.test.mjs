import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationTimeline} from '../engine/presentation-timeline.mjs';
const make=()=>createPresentationTimeline();

test('start and complete inside a long animation only reveals a no-motion release',()=>{
 const t=make();t.beginMotion({durationMs:1200,kind:'inspirit',actorId:'B2'});
 t.record({side:0,kind:'rotate'});t.record({side:0,kind:'chargeStart',token:5,memberId:'A1'});
 t.advance(700);t.record({side:0,kind:'chargeComplete',token:5,memberId:'A1'});
 assert.deepEqual(t.snapshot().visible,[]);
 assert.deepEqual(t.advance(499),[]);
 const shown=t.advance(1);
 assert.deepEqual(shown.map(x=>x.kind),['rotate','specialRelease']);
 assert.equal(shown[1].hiddenCharge,true);
 assert.equal(shown[1].visibleAt,1200);
 assert.equal(shown[1].chargeStartedAt,0);
 assert.equal(t.snapshot().activeCharges[0],null);
});
test('slow charge shows start after animation and finish later',()=>{
 const t=make();t.beginMotion({durationMs:600});
 t.record({side:1,kind:'chargeStart',token:12});
 assert.deepEqual(t.advance(600).map(x=>x.kind),['chargeStart']);
 t.advance(200);t.record({side:1,kind:'chargeComplete',token:12});
 assert.deepEqual(t.snapshot().visible.map(e=>e.kind),['chargeStart','specialRelease']);
 assert.equal(t.snapshot().visible[1].hiddenCharge,false);
 assert.equal(t.snapshot().visible[1].visibleAt,800);
});
test('cancellation entirely inside a motion hides incomplete charge',()=>{
 const t=make();t.beginMotion({durationMs:800});
 t.record({side:0,kind:'chargeStart',token:1});
 t.advance(200);t.record({side:0,kind:'chargeCancel',token:1});
 assert.deepEqual(t.advance(600),[]);
 assert.deepEqual(t.snapshot().visible,[]);
});
test('cancellation after the charge appeared remains visible',()=>{
 const t=make();t.beginMotion({durationMs:100});
 t.record({side:0,kind:'chargeStart',token:7});t.advance(100);
 t.record({side:0,kind:'chargeCancel',token:7});
 assert.deepEqual(t.snapshot().visible.map(e=>e.kind),['chargeStart','chargeCancel']);
});
test('overlapping actions block through the latest animation end',()=>{
 const t=make();t.beginMotion({durationMs:200});
 t.advance(100);t.beginMotion({durationMs:500,kind:'soultimate'});
 t.record({side:0,kind:'rotate'});
 t.advance(101);assert.equal(t.snapshot().visible.length,0);
 assert.equal(t.snapshot().blockUntil,600);
 t.advance(399);
 assert.equal(t.snapshot().visible[0].visibleAt,600);
});
test('charge tokens and sides do not cross-suppress unrelated moves',()=>{
 const t=make();t.beginMotion({durationMs:100});
 t.record({side:0,kind:'chargeStart',token:1});
 t.record({side:1,kind:'chargeStart',token:2});
 t.record({side:0,kind:'chargeComplete',token:1});
 const events=t.advance(100);
 assert.deepEqual(events.map(e=>e.kind),['chargeStart','specialRelease']);
 assert.equal(events[1].hiddenCharge,true);
 assert.equal(events[0].side,1);
});
test('multiple completed charges in one animation remain distinct',()=>{
 const t=make();t.beginMotion({durationMs:200});
 t.record({side:0,kind:'chargeStart',token:1});
 t.record({side:0,kind:'chargeComplete',token:1});
 t.record({side:0,kind:'chargeStart',token:2});
 t.record({side:0,kind:'chargeComplete',token:2});
 const shown=t.advance(200);
 assert.deepEqual(shown.map(x=>x.kind),['specialRelease','specialRelease']);
 assert.ok(shown.every(x=>x.hiddenCharge));
});
test('bounded visibility journal and defensive snapshots',()=>{
 const t=createPresentationTimeline({maxLog:2});
 t.record({side:0,kind:'rotate'});t.record({side:0,kind:'action'});
 t.record({side:1,kind:'watchMode'});
 const s=t.snapshot();assert.equal(s.visible.length,2);
 s.visible.pop();s.motions.push({});
 assert.equal(t.snapshot().visible.length,2);
 assert.equal(t.snapshot().motions.length,0);
});
test('invalid timestamps, tokens, events and overlapping same-side charges rejected',()=>{
 const t=make();
 for(const x of [-1,1.5,Infinity,NaN])assert.throws(()=>t.advance(x));
 assert.throws(()=>t.beginMotion({durationMs:0}));
 assert.throws(()=>t.record({side:2,kind:'rotate'}));
 assert.throws(()=>t.record({side:0,kind:'other'}));
 assert.throws(()=>t.record({side:0,kind:'chargeStart',token:-1}));
 assert.throws(()=>t.record({side:0,kind:'chargeComplete',token:100}));
 t.record({side:0,kind:'chargeStart',token:1});
 assert.throws(()=>t.record({side:0,kind:'chargeStart',token:2}));
 assert.throws(()=>t.record({side:0,kind:'chargeCancel',token:2}));
 t.record({side:0,kind:'chargeCancel',token:1});
});
test('outside a motion visibility is immediate',()=>{
 const t=createPresentationTimeline({startMs:17});
 t.record({side:0,kind:'rotate',memberId:'A1'});
 assert.equal(t.snapshot().visible[0].visibleAt,17);
 assert.equal(t.snapshot().visible[0].delayed,false);
});
test('jumping beyond the motion still reveals at the actual unlock timestamp',()=>{
 const t=make();t.beginMotion({durationMs:100});
 t.advance(30);t.record({side:1,kind:'action'});
 t.advance(500);
 assert.equal(t.snapshot().now,530);
 assert.equal(t.snapshot().visible[0].visibleAt,100);
});
