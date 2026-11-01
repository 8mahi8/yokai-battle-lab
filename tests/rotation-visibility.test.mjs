import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationTimeline} from '../engine/presentation-timeline.mjs';

test('two concealed wheel rotations show only final opponent-visible front',()=>{
 const t=createPresentationTimeline({coalesceRotations:true});
 t.beginMotion({durationMs:600});
 t.record({side:1,kind:'rotate',detail:'right',frontIds:['B2','B3','B4']});
 t.advance(100);
 t.record({side:1,kind:'rotate',detail:'right',frontIds:['B3','B4','B5']});
 assert.deepEqual(t.snapshot().visible,[]);
 const view=t.advance(500);
 assert.deepEqual(view.map(x=>x.kind),['rotate']);
 assert.deepEqual(view[0].frontIds,['B3','B4','B5']);
 assert.equal(view[0].collapsedRotations,1);
 assert.equal(view[0].at,100);
});
test('rotation coalescing preserves charge timing and latest rotate slot',()=>{
 const t=createPresentationTimeline({coalesceRotations:true});
 t.beginMotion({durationMs:300});
 t.record({side:1,kind:'rotate',frontIds:['B2','B3','B4']});
 t.record({side:0,kind:'chargeStart',token:7});
 t.record({side:0,kind:'chargeComplete',token:7});
 t.record({side:1,kind:'rotate',frontIds:['B3','B4','B5']});
 const shown=t.advance(300);
 assert.deepEqual(shown.map(x=>x.kind),['specialRelease','rotate']);
 assert.equal(shown[0].hiddenCharge,true);
 assert.deepEqual(shown[1].frontIds,['B3','B4','B5']);
});
test('actual automatic action prevents two rotations from being coalesced',()=>{
 const t=createPresentationTimeline({coalesceRotations:true});
 t.beginMotion({durationMs:300});
 t.record({side:1,kind:'rotate',frontIds:['B2','B3','B4']});
 t.record({side:0,kind:'action',memberId:'A1'});
 t.record({side:1,kind:'rotate',frontIds:['B3','B4','B5']});
 assert.deepEqual(t.advance(300).map(x=>x.kind),['rotate','action','rotate']);
});
test('different team wheel rotations do not suppress each other',()=>{
 const t=createPresentationTimeline({coalesceRotations:true});
 t.beginMotion({durationMs:150});
 t.record({side:0,kind:'rotate',frontIds:['A2','A3','A4']});
 t.record({side:1,kind:'rotate',frontIds:['B2','B3','B4']});
 t.record({side:0,kind:'rotate',frontIds:['A3','A4','A5']});
 const view=t.advance(150);
 assert.deepEqual(view.map(x=>x.side),[1,0]);
 assert.equal(view[1].collapsedRotations,1);
});
test('a wheel movement outside a visual lock cannot erase already visible move',()=>{
 const t=createPresentationTimeline({coalesceRotations:true});
 t.record({side:1,kind:'rotate',frontIds:['B2','B3','B4']});
 t.record({side:1,kind:'rotate',frontIds:['B3','B4','B5']});
 assert.equal(t.snapshot().visible.length,2);
});
test('coalescing opt-out preserves old visibility behavior',()=>{
 const t=createPresentationTimeline();
 t.beginMotion({durationMs:300});
 t.record({side:1,kind:'rotate',frontIds:['B2','B3','B4']});
 t.record({side:1,kind:'rotate',frontIds:['B3','B4','B5']});
 assert.deepEqual(t.advance(300).map(x=>x.kind),['rotate','rotate']);
});
test('all visible front arrays and snapshot records are immutable copies',()=>{
 const t=createPresentationTimeline({coalesceRotations:true});
 const front=['A2','A3','A4'];
 t.beginMotion({durationMs:100});
 t.record({side:0,kind:'rotate',frontIds:front});
 front[0]='WRONG';
 const before=t.snapshot();
 before.buffered[0].frontIds[1]='WRONG';
 const view=t.advance(100);
 view[0].frontIds[2]='WRONG';
 assert.deepEqual(t.snapshot().visible[0].frontIds,['A2','A3','A4']);
});
test('invalid rotation payloads and incorrect mode parameter are rejected',()=>{
 assert.throws(()=>createPresentationTimeline({coalesceRotations:'yes'}));
 const t=createPresentationTimeline({coalesceRotations:true});
 assert.throws(()=>t.record({side:1,kind:'rotate',frontIds:['A1','A1','A3']}));
 assert.throws(()=>t.record({side:1,kind:'chargeStart',token:1,frontIds:['A1','A2','A3']}));
});
