import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actionLabelImpact} from '../ui/battle-vfx.mjs';

test('V3-5-16 per-hit caption follows host hit rows, not final aggregate',()=>{
 const action={kind:'attack',hit:true,amount:19};
 const hits=[
  {sequence:1,targetId:'B1',hit:false,critical:false,damage:0,hpBefore:100,hpAfter:100},
  {sequence:2,targetId:'B1',hit:true,critical:false,damage:19,hpBefore:100,hpAfter:81}
 ];
 assert.deepEqual(actionLabelImpact(action,hits,0),{hit:false,amount:0});
 assert.deepEqual(actionLabelImpact(action,hits,1),{hit:true,amount:19});
 assert.deepEqual(actionLabelImpact(action,[],null),{hit:true,amount:19});
 assert.deepEqual(actionLabelImpact({hit:false,amount:0},null,null),{hit:false,amount:0});
});

test('V3-5-16 displayed damage and miss label use per-hit projection in stage',()=>{
 const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
 assert.match(stage,/actionLabelImpact\(action,scenePlan\?\.hitResults,sceneHitIndex\)/);
 assert.match(stage,/flash\?\.type==='action'&&!labelImpact\.hit/);
 assert.match(stage,/flash\?\.type==='action'&&labelImpact\.amount>0/);
 assert.doesNotMatch(stage,/flash\?\.type==='action'&&action\.amount>0/);
});
