import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationTimeline} from '../engine/presentation-timeline.mjs';

test('three hidden wheel turns show only final pose, explicitly marked as unsourced',()=>{
 const view=createPresentationTimeline({coalesceRotations:true});
 view.beginMotion({durationMs:600});
 const turns=[['B2','B3','B4'],['B3','B4','B5'],['B4','B5','B6']];
 turns.forEach(frontIds=>view.record({side:1,kind:'rotate',frontIds}));
 const [result]=view.advance(600);
 assert.deepEqual(view.snapshot().visible.map(x=>x.kind),['rotate']);
 assert.deepEqual(result.frontIds,turns[2]);
 assert.equal(result.collapsedRotations,2);
 assert.equal(result.unsourcedThreePlus,true);
});
test('two hidden wheel turns do not carry the 3+ unsupported flag',()=>{
 const view=createPresentationTimeline({coalesceRotations:true});
 view.beginMotion({durationMs:400});
 view.record({side:1,kind:'rotate',frontIds:['B2','B3','B4']});
 view.record({side:1,kind:'rotate',frontIds:['B3','B4','B5']});
 const result=view.advance(400)[0];
 assert.equal(result.collapsedRotations,1);
 assert.equal(result.unsourcedThreePlus,undefined);
});
test('ordinary auto action boundary means two adjacent 2-turn groups rather than 4-turn speculation',()=>{
 const view=createPresentationTimeline({coalesceRotations:true});
 view.beginMotion({durationMs:400});
 for(const ids of [['B2','B3','B4'],['B3','B4','B5']])
  view.record({side:1,kind:'rotate',frontIds:ids});
 view.record({side:0,kind:'action',memberId:'A1'});
 for(const ids of [['B4','B5','B6'],['B5','B6','B1']])
  view.record({side:1,kind:'rotate',frontIds:ids});
 const shown=view.advance(400);
 assert.deepEqual(shown.map(x=>x.kind),['rotate','action','rotate']);
 assert.equal(shown[0].unsourcedThreePlus,undefined);
 assert.equal(shown[2].unsourcedThreePlus,undefined);
 assert.deepEqual(shown[0].frontIds,['B3','B4','B5']);
 assert.deepEqual(shown[2].frontIds,['B5','B6','B1']);
});
