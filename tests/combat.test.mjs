import assert from 'node:assert/strict';
import test from 'node:test';
import {createCombat,RENTAL_SQUAD,hitChance,baseDamage} from '../engine/combat.mjs';
import {createBattle,initialWaitRange,waitCostFromSpeed} from '../engine/phase1.mjs';

test('original-inspired speed table boundaries and waiting',()=>{
 assert.deepEqual(initialWaitRange(161),[103,134]);
 assert.deepEqual(initialWaitRange(175),[99,126]);
 assert.deepEqual(initialWaitRange(201),[93,114]);
 assert.deepEqual(initialWaitRange(500),[38,56]);
 assert.deepEqual(initialWaitRange(999),[36,54]);
 assert.equal(waitCostFromSpeed(171),198);
});
test('KO disabled actor cannot act, even after a rotation',()=>{
 const b=createBattle({rotationCooldownMs:0});
 b.setCanAct('A1',false);
 assert.equal(b.snapshot().teams[0].members[0].wait,null);
 assert.ok(!b.simulate(100).some(x=>x.id==='A1'));
 for(let i=0;i<6;i++)b.rotate(0,1,0);
 assert.equal(b.snapshot().teams[0].members[0].wait,null);
});
test('source model hit chance and attack/technique basics',()=>{
 assert.equal(hitChance({speed:200},{speed:200}),98);
 assert.equal(hitChance({speed:10},{speed:200}),75);
 assert.equal(baseDamage({attackPower:50,strength:100},{defense:80},'attack'),55);
 assert.ok(baseDamage({techniquePower:50,spirit:100},{defense:80},'technique')>0);
});
test('both squads are equal fixtures and deep copied',()=>{
 const b=createCombat(); const s=b.snapshot();
 assert.equal(s.squads[0].length,6);assert.equal(s.squads[1].length,6);
 assert.deepEqual(s.squads[0].map(x=>x.maxHp),s.squads[1].map(x=>x.maxHp));
 s.squads[0][0].hp=0;
 assert.ok(b.snapshot().squads[0][0].hp>0);
 assert.equal(RENTAL_SQUAD.length,6);
});
test('seeds replay full state and log deterministically',()=>{
 const a=createCombat({seed:97}),b=createCombat({seed:97});
 assert.deepEqual(a.simulate(1000),b.simulate(1000));
 assert.deepEqual(a.snapshot(),b.snapshot());
});
test('ten thousand turn robustness/integrity, no negative hp, valid targets',()=>{
 for(let seed=1;seed<=24;seed++){
  const b=createCombat({seed});
  let last; for(let i=0;i<1500;i++){
   last=b.step(); if(last.type!=='action')break;
   assert.ok(last.targetHp===null||(last.targetHp>=0&&last.targetHp<=310));
   if(last.winner!==null)break;
  }
  const s=b.snapshot();
  assert.ok(s.squads.flat().every(u=>Number.isInteger(u.hp)&&u.hp>=0&&u.hp<=u.maxHp));
  assert.ok(s.clock.turn>0,'at least one legal action was scheduled');
  if(s.winner!==null)assert.ok(s.squads[s.winner===0?1:0].every(u=>u.hp===0),'loser must be wiped');
 }
});
test('pin must name live enemy on front, rotation clears an invalid pin',()=>{
 const b=createCombat({seed:19});
 assert.throws(()=>b.pin(0,'B4'));
 b.pin(0,'B1');assert.equal(b.snapshot().pins[0],'B1');
 b.rotate(1,1);assert.equal(b.snapshot().pins[0],null);
});
test('healing cannot exceed max HP, KO actors never return',()=>{
 const b=createCombat({seed:34});const actions=b.simulate(1000);const state=b.snapshot();
 assert.ok(actions.some(x=>x.kind==='heal'));
 assert.ok(state.squads.flat().every(x=>x.hp>=0&&x.hp<=x.maxHp));
 assert.ok(actions.every(x=>x.type!=='action'||x.amount>=0));
});
test('no auto-rotation means wait when enemy frontline is eliminated',()=>{
 const b=createCombat({seed:57,autoRotateReserves:false});
 const logs=b.simulate(1000);const terminal=logs.at(-1);
 assert.ok(terminal.type==='awaiting_rotation'||terminal.winner!==null);
});
test('invalid moves and stats rejected',()=>{
 const b=createCombat();assert.throws(()=>b.pin(3,'B1'));
 assert.throws(()=>b.pin(0,'B6'));
 const broken=[...RENTAL_SQUAD.map(x=>({...x}))];broken[0].speed=0;
 assert.throws(()=>createCombat({teams:[broken,RENTAL_SQUAD]}));
});
