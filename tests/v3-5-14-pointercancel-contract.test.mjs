import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMatchCommand} from '../engine/match-command-kernel.mjs';
import {createChargeTrial} from '../engine/charge-input.mjs';
import {createPurifyTrial} from '../engine/purify-input.mjs';

const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');

test('Safari clock pointercancel does not send up; RTDB gesture wire vocabulary stays unchanged',()=>{
 // Firebase no-Auth rules only admit these preexisting four gesture types.
 for(const type of ['chargeInput','purifyInput']){
  for(const gesture of [{type:'up'},{type:'down',x:.5,y:.5},
   {type:'move',x:.5,y:.5},{type:'tap',x:.5,y:.5}]){
   assert.deepEqual(normalizeMatchCommand(1,{type,gesture}).gesture,gesture);
  }
  assert.throws(()=>normalizeMatchCommand(1,{type,gesture:{type:'cancel'}}));
 }
 assert.match(stage,/else if\(!cancelled\|\|kind!=='align'\)/,
  'canceled clock contact must not be sent as successful pointerup');
 assert.match(stage,/function onCancel\(event\)\{finishPointer\(event,true\)/);
});

test('uncommitted clock drag remains incomplete; a NEW legitimate down resets stale hand',()=>{
 const trial=createChargeTrial({kind:'align',seed:8});
 const first=trial.snapshot();
 trial.input({type:'down',x:.5,y:.18});
 trial.input({type:'move',x:first.target[0],y:first.target[1]});
 assert.equal(trial.snapshot().count,0);
 // The browser aborted the stream. UI intentionally sends no up; next down
 // resets the in-progress hand. This keeps engine AND wire protocol unchanged.
 trial.input({type:'down',x:.5,y:.18});
 assert.equal(trial.snapshot().count,0);
 assert.equal(trial.snapshot().active,true);
 trial.input({type:'move',x:first.target[0],y:first.target[1]});
 trial.input({type:'up'});
 assert.equal(trial.snapshot().count,1);
 assert.equal(trial.snapshot().completed,false);
});

test('other abandoned drags remain safe with the existing up event',()=>{
 const trace=createChargeTrial({kind:'trace',seed:19});
 const path=trace.snapshot().path;
 trace.input({type:'down',x:path[0][0],y:path[0][1]});
 trace.input({type:'move',x:path[1][0],y:path[1][1]});
 trace.input({type:'up'});
 assert.equal(trace.snapshot().count,0);
 assert.equal(trace.snapshot().pathIndex,0);
 const slash=createPurifyTrial({kind:'slash'});
 const [a,b]=slash.snapshot().slashPoints[0];
 slash.input({type:'down',x:a[0],y:a[1]});
 slash.input({type:'up'});
 slash.input({type:'move',x:b[0],y:b[1]});
 assert.equal(slash.snapshot().count,0);
});
