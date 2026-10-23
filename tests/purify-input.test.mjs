import test from 'node:test';
import assert from 'node:assert/strict';
import {createPurifyTrial,choosePurifyKind,PURIFY_KINDS} from '../engine/purify-input.mjs';
function complete(trial){
 const snap=trial.snapshot();
 if(snap.kind==='pop'){
  for(const [x,y] of snap.popPoints)trial.input({type:'tap',x,y});
 }else if(snap.kind==='mash'){
  for(let i=0;i<14;i++)trial.input({type:'down',x:.5,y:.5});
 }else if(snap.kind==='rub'){
  trial.input({type:'down',x:.45,y:.5});
  for(let i=0;i<40;i++)trial.input({type:'move',x:i%2?.55:.45,y:.5});
 }else if(snap.kind==='spin'){
  for(let i=0;i<=54;i++){
   const a=Math.PI*2*i/50;
   const event={type:i===0?'down':'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)};
   trial.input(event);
  }
 }else if(snap.kind==='slash'){
  for(const pair of snap.slashPoints){
   trial.input({type:'down',x:pair[0][0],y:pair[0][1]});
   trial.input({type:'move',x:pair[1][0],y:pair[1][1]});
   trial.input({type:'up'});
  }
 }
 return trial.snapshot();
}
test('all five YW2 purification types can be completed using pointer gestures',()=>{
 for(let i=0;i<PURIFY_KINDS.length;i++){
  const kind=PURIFY_KINDS[i],trial=createPurifyTrial({kind,seed:i});
  assert.equal(complete(trial).completed,true,kind);
  assert.equal(trial.snapshot().progress,1);
 }
});
test('kind selection deterministically covers five gestures and rejects bad seeds',()=>{
 for(let i=0;i<25;i++)assert.equal(choosePurifyKind(i),PURIFY_KINDS[i%5]);
 assert.equal(choosePurifyKind(-1),'slash');
 assert.throws(()=>choosePurifyKind(1.5));
 assert.throws(()=>createPurifyTrial({kind:'fake'}));
});
test('wrong input, out-of-bounds and taps on empty space cannot complete purify',()=>{
 for(const kind of PURIFY_KINDS){
  const trial=createPurifyTrial({kind,seed:2});
  assert.throws(()=>trial.input({type:'hacked',x:.5,y:.5}));
  for(let i=0;i<30;i++){
   trial.input({type:'tap',x:Infinity,y:.5});
   trial.input({type:'tap',x:-1,y:10});
  }
  assert.equal(trial.snapshot().completed,false,kind);
 }
});
test('repeated tapping same purple bubble never counts as multiple bubbles',()=>{
 const trial=createPurifyTrial({kind:'pop',seed:3});
 const [x,y]=trial.snapshot().popPoints[0];
 for(let i=0;i<20;i++)trial.input({type:'tap',x,y});
 assert.equal(trial.snapshot().count,1);
 assert.equal(trial.snapshot().progress,.2);
});
test('rub cannot be completed by teleporting pointer across screen',()=>{
 const trial=createPurifyTrial({kind:'rub'});
 trial.input({type:'down',x:.2,y:.5});
 for(let i=0;i<100;i++)trial.input({type:'move',x:i%2?.8:.2,y:.5});
 assert.equal(trial.snapshot().completed,false);
});
test('spin rejects direction reversal and discontinuous angular leaps',()=>{
 const trial=createPurifyTrial({kind:'spin'});
 trial.input({type:'down',x:.8,y:.5});
 for(let i=1;i<=8;i++){
  const a=i*Math.PI/8;
  trial.input({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
 }
 const half=trial.snapshot().progress;
 for(let i=7;i>=0;i--){
  const a=i*Math.PI/8;
  trial.input({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
 }
 assert.equal(trial.snapshot().progress,half);
});
test('slash requires separate down-to-right drags, not repeated target taps',()=>{
 const trial=createPurifyTrial({kind:'slash'});
 const pairs=trial.snapshot().slashPoints;
 for(let i=0;i<15;i++)trial.input({type:'tap',x:pairs[0][1][0],y:pairs[0][1][1]});
 assert.equal(trial.snapshot().count,0);
 trial.input({type:'down',x:pairs[0][0][0],y:pairs[0][0][1]});
 trial.input({type:'move',x:pairs[0][1][0],y:pairs[0][1][1]});
 assert.equal(trial.snapshot().count,1);
 // No new down => cannot hit the second chain link.
 trial.input({type:'move',x:pairs[1][1][0],y:pairs[1][1][1]});
 assert.equal(trial.snapshot().count,1);
});
test('trial and snapshot do not share mutable arrays',()=>{
 const trial=createPurifyTrial({kind:'slash',seed:5});
 const snap=trial.snapshot();snap.slashPoints[0][0][0]=1000;
 assert.notEqual(trial.snapshot().slashPoints[0][0][0],1000);
 assert.equal(complete(trial).completed,true);
 assert.deepEqual(trial.input({type:'up'}),trial.snapshot());
});
