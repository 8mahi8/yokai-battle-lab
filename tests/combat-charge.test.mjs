import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';

function feed(combat, side, event){
  return combat.chargeInput(side,event);
}
function complete(combat,side,first){
 let state=first.challenge, last;
 const go=e=>{last=feed(combat,side,e);return last;};
 if(first.kind==='tap'){
  for(let i=0;i<6;i++){
   const p=state.target;last=go({type:'tap',x:p[0],y:p[1]});
   if(last.completed)break;
   state=last.challenge;
  }
 }else if(first.kind==='trace'){
  for(let pass=0;pass<3;pass++){
   const path=state.path;go({type:'down',x:path[0][0],y:path[0][1]});
   for(const p of path.slice(1)){last=go({type:'move',x:p[0],y:p[1]});if(last.completed)break;}
   if(last?.completed)break;
   state=last.challenge;
  }
 }else if(first.kind==='spin'){
  go({type:'down',x:.8,y:.5});
  for(let i=1;i<=140;i++){
   const a=i*2*Math.PI/40;
   last=go({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
   if(last.completed)break;
  }
 }else if(first.kind==='align'){
  for(let pass=0;pass<3;pass++){
   state=combat.snapshot().guided[side].challenge;
   const a=state.handAngle,p=[.5+.32*Math.cos(a),.5+.32*Math.sin(a)];
   go({type:'down',x:p[0],y:p[1]});
   go({type:'move',x:state.target[0],y:state.target[1]});
   last=go({type:'up'});
   if(last.completed)break;
  }
 }
 return last;
}
test('all four modes can complete a real Soul spend through touch input',()=>{
 const observed=new Set();
 for(let seed=1;seed<=120;seed++){
  const combat=createCombat({seed});combat.giveSoul('A1',100);
  const first=combat.beginGuidedCharge(0,'A1');
  if(observed.has(first.kind))continue;
  const result=complete(combat,0,first);
  assert.equal(result.ok,true,first.kind+': '+JSON.stringify(result));
  assert.equal(result.completed,true);
  assert.equal(result.special.kind,'soultimate');
  assert.equal(combat.snapshot().soul.teams[0][0].soul,0);
  assert.equal(combat.snapshot().guided[0],null);
  observed.add(first.kind);
 }
 assert.deepEqual([...observed].sort(),['align','spin','tap','trace']);
});
test('not yet completed charge does not spend Soul',()=>{
 const combat=createCombat({seed:1});combat.giveSoul('A1',100);
 const begin=combat.beginGuidedCharge(0,'A1');
 assert.equal(begin.ok,true);
 assert.equal(combat.snapshot().soul.teams[0][0].soul,100);
 assert.equal(combat.beginGuidedCharge(0,'A2').reason,'charge_already_pending');
});
test('G charge only spends neighbors when touch minigame is completed',()=>{
 const combat=createCombat({seed:11});
 combat.setWatchMode(0,'zero');
 for(const id of ['A6','A1','A2'])combat.giveSoul(id,100);
 const begin=combat.beginGuidedCharge(0,'A1');
 assert.equal(begin.ok,true);
 const result=complete(combat,0,begin);
 assert.equal(result.ok,true);
 assert.equal(result.special.kind,'g-tech');
 for(const id of ['A6','A1','A2'])assert.equal(combat.snapshot().soul.teams[0].find(m=>m.id===id).soul,0);
});
test('wheel rotation out of front cancels guided charge without spending',()=>{
 const combat=createCombat({seed:7});combat.giveSoul('A1',100);
 const begin=combat.beginGuidedCharge(0,'A1');assert.equal(begin.ok,true);
 const rotation=combat.rotate(0,1);assert.equal(rotation.chargeCancelled,true);
 assert.equal(combat.snapshot().guided[0],null);
 assert.equal(combat.snapshot().soul.teams[0][0].soul,100);
 assert.equal(combat.chargeInput(0,{type:'tap',x:.5,y:.5}).reason,'no_active_charge');
});
test('mode switch cancels charge without consuming meter',()=>{
 const combat=createCombat();combat.giveSoul('A1',100);
 combat.beginGuidedCharge(0,'A1');combat.setWatchMode(0,'zero');
 assert.equal(combat.snapshot().guided[0],null);
 assert.equal(combat.snapshot().soul.teams[0][0].soul,100);
});
test('explicit guided cancel preserves resources and invalidates token',()=>{
 const combat=createCombat();combat.giveSoul('A1',100);
 const begin=combat.beginGuidedCharge(0,'A1');
 const canceled=combat.cancelGuidedCharge(0);
 assert.equal(canceled.reason,'charge_cancelled');
 assert.equal(combat.snapshot().soul.teams[0][0].soul,100);
 assert.equal(combat.resolveSoultimate(0,begin.token,true).reason,'stale_or_unknown_charge');
});
test('wrong side input and missing active charge fail safely',()=>{
 const combat=createCombat();assert.throws(()=>combat.chargeInput(2,{type:'tap',x:.2,y:.2}));
 assert.equal(combat.cancelGuidedCharge(0).reason,'no_active_charge');
 assert.equal(combat.chargeInput(0,{type:'up'}).reason,'no_active_charge');
});
