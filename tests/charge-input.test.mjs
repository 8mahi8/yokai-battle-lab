import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARGE_KINDS,chooseChargeKind,createChargeTrial} from '../engine/charge-input.mjs';

test('four modes exist and seeded selection is repeatable',()=>{
 const choices=new Set();
 for(let i=1;i<=120;i++){
  assert.equal(chooseChargeKind(i),chooseChargeKind(i));
  choices.add(chooseChargeKind(i));
 }
 assert.deepEqual([...choices].sort(),[...CHARGE_KINDS].sort());
});
test('invalid trial configuration/input is rejected',()=>{
 assert.throws(()=>createChargeTrial({kind:'unknown'}));
 assert.throws(()=>chooseChargeKind(1.2));
 const trial=createChargeTrial({kind:'tap'});
 assert.throws(()=>trial.input({type:'erase',x:0,y:0}));
 assert.equal(trial.input({type:'tap',x:-9,y:0}).count,0);
});
test('tap demands each active target; tapping elsewhere does not advance',()=>{
 const trial=createChargeTrial({kind:'tap',seed:17});
 for(let i=0;i<6;i++){
  const before=trial.snapshot();
  assert.equal(trial.input({type:'tap',x:0,y:0}).count,i);
  assert.equal(trial.input({type:'tap',x:before.target[0],y:before.target[1]}).count,i+1);
 }
 assert.equal(trial.snapshot().completed,true);
 assert.equal(trial.snapshot().progress,1);
});
test('trace requires continuous gesture across each of three paths',()=>{
 const trial=createChargeTrial({kind:'trace',seed:19});
 for(let pass=0;pass<3;pass++){
  let {path}=trial.snapshot();
  trial.input({type:'down',x:path[0][0],y:path[0][1]});
  for(const p of path.slice(1))trial.input({type:'move',x:p[0],y:p[1]});
  assert.equal(trial.snapshot().count,pass+1);
 }
 assert.equal(trial.snapshot().completed,true);
});
test('trace aborts partial path on premature pointer lift',()=>{
 const trial=createChargeTrial({kind:'trace'});
 const path=trial.snapshot().path;
 trial.input({type:'down',x:path[0][0],y:path[0][1]});
 trial.input({type:'move',x:path[1][0],y:path[1][1]});
 trial.input({type:'up'});
 assert.equal(trial.snapshot().pathIndex,0);
 assert.equal(trial.snapshot().count,0);
});
test('spin counts motion around ring, not taps or teleport jumps',()=>{
 const trial=createChargeTrial({kind:'spin'});
 trial.input({type:'tap',x:.5,y:.2});
 assert.equal(trial.snapshot().progress,0);
 trial.input({type:'down',x:.8,y:.5});
 trial.input({type:'move',x:.2,y:.5}); // jump 180°, rejected
 assert.equal(trial.snapshot().progress,0);
 trial.input({type:'up'});
 trial.input({type:'down',x:.8,y:.5});
 for(let i=1;i<=100;i++){
  const a=i*Math.PI*2/40;
  trial.input({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
 }
 assert.equal(trial.snapshot().completed,true);
});
test('clock alignment needs a drag from hand to glowing target, 3 repetitions',()=>{
 const trial=createChargeTrial({kind:'align',seed:8});
 for(let n=0;n<3;n++){
  let snap=trial.snapshot();
  const hand=[.5+.32*Math.cos(snap.handAngle),.5+.32*Math.sin(snap.handAngle)];
  trial.input({type:'down',x:0,y:0});
  trial.input({type:'move',x:snap.target[0],y:snap.target[1]});
  trial.input({type:'up'});
  assert.equal(trial.snapshot().count,n);
  trial.input({type:'down',x:hand[0],y:hand[1]});
  trial.input({type:'move',x:snap.target[0],y:snap.target[1]});
  trial.input({type:'up'});
  assert.equal(trial.snapshot().count,n+1);
 }
 assert.equal(trial.snapshot().completed,true);
});
test('completed challenge stays immutable and snapshots are defensive',()=>{
 const t=createChargeTrial({kind:'tap',seed:1});
 for(let i=0;i<6;i++){const p=t.snapshot().target;t.input({type:'down',x:p[0],y:p[1]});}
 assert.equal(t.snapshot().completed,true);
 const old=t.snapshot();old.target=null;old.path.push([4,4]);
 assert.deepEqual(t.input({type:'tap',x:.1,y:.1}),t.snapshot());
});
