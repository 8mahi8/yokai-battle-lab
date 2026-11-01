import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMatchCommand} from '../engine/match-command-kernel.mjs';
import {createChargeTrial} from '../engine/charge-input.mjs';
import {createPurifyTrial} from '../engine/purify-input.mjs';

test('interrupted pointer is a coordinate-free canonical command, distinct from finger lift',()=>{
 for(const type of ['chargeInput','purifyInput']){
  assert.deepEqual(normalizeMatchCommand(1,{type,gesture:{type:'cancel'}}),
   {type,gesture:{type:'cancel'}});
  assert.deepEqual(normalizeMatchCommand(1,{type,gesture:{type:'up'}}),
   {type,gesture:{type:'up'}});
  assert.throws(()=>normalizeMatchCommand(1,
   {type,gesture:{type:'cancel',x:.5,y:.5}}),
   /unexpected command fields/);
 }
});

test('clock align pointercancel must not award a target even when hand was aligned',()=>{
 const trial=createChargeTrial({kind:'align',seed:8});
 const first=trial.snapshot();
 trial.input({type:'down',x:.5,y:.18});
 trial.input({type:'move',x:first.target[0],y:first.target[1]});
 assert.equal(trial.snapshot().count,0);
 trial.input({type:'cancel'});
 assert.equal(trial.snapshot().count,0);
 assert.equal(trial.snapshot().handAngle,-Math.PI/2);
 // Some mobile browsers dispatch a late pointerup/lostcapture after cancel;
 // without a new pointerdown it must not turn the canceled gesture into success.
 trial.input({type:'up'});
 assert.equal(trial.snapshot().count,0);
 trial.input({type:'down',x:.5,y:.18});
 trial.input({type:'move',x:first.target[0],y:first.target[1]});
 trial.input({type:'up'});
 assert.equal(trial.snapshot().count,1);
 assert.equal(trial.snapshot().completed,false);
});

test('charge trace canceled stroke loses only its unfinished path, not earned rounds',()=>{
 const t=createChargeTrial({kind:'trace',seed:15});
 const p=t.snapshot().path;
 t.input({type:'down',x:p[0][0],y:p[0][1]});
 t.input({type:'move',x:p[1][0],y:p[1][1]});
 assert.equal(t.snapshot().pathIndex,2);
 t.input({type:'cancel'});
 assert.equal(t.snapshot().pathIndex,0);
 t.input({type:'move',x:p[2][0],y:p[2][1]});
 assert.equal(t.snapshot().count,0);
 t.input({type:'down',x:p[0][0],y:p[0][1]});
 for(const [x,y] of p.slice(1))t.input({type:'move',x,y});
 assert.equal(t.snapshot().count,1);
});

test('purify slash canceled stroke cannot finish on stray move without new touch',()=>{
 const t=createPurifyTrial({kind:'slash',seed:4});
 const [a,b]=t.snapshot().slashPoints[0];
 t.input({type:'down',x:a[0],y:a[1]});
 t.input({type:'cancel'});
 t.input({type:'move',x:b[0],y:b[1]});
 assert.equal(t.snapshot().count,0);
 t.input({type:'down',x:a[0],y:a[1]});
 t.input({type:'move',x:b[0],y:b[1]});
 assert.equal(t.snapshot().count,1);
});
