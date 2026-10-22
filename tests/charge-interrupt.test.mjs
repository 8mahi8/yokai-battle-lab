import test from 'node:test';
import assert from 'node:assert/strict';
import {chargeInterruptChance} from '../engine/soul.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

test('published charge interruption bases scale by hits taken',()=>{
 const expected=[8,12,18,35,35,35];
 expected.forEach((chance,hitsTaken)=>{
  assert.equal(chargeInterruptChance({damage:0,maxHp:100,hitsTaken}),chance);
 });
});
test('damage/maxHP, critical, move bonus and cap contribute correctly',()=>{
 assert.equal(chargeInterruptChance({damage:50,maxHp:100,hitsTaken:0}),13);
 assert.equal(chargeInterruptChance({damage:50,maxHp:100,hitsTaken:1,critical:true,moveBonus:15}),42);
 assert.equal(chargeInterruptChance({damage:1000,maxHp:100,hitsTaken:3}),100);
 assert.equal(chargeInterruptChance({damage:30,maxHp:100,immune:true}),0);
 assert.throws(()=>chargeInterruptChance({damage:-1,maxHp:100}));
});
test('charging actor does not auto attack during active charge, then can act again after cancel',()=>{
 const combat=createCombat({seed:9});
 combat.giveSoul('A1',100);
 const first=combat.beginGuidedCharge(0,'A1');
 assert.equal(first.ok,true);
 assert.equal(combat.snapshot().clock.teams[0].members[0].canAct,false);
 assert.ok(!combat.simulate(18).some(e=>e.actor==='A1'));
 if(combat.snapshot().guided[0]){
  combat.cancelGuidedCharge(0);
  assert.equal(combat.snapshot().clock.teams[0].members[0].canAct,true);
 }
});
test('sleeping caster cannot start a guided charge',()=>{
 const game=createCombat();game.giveSoul('A1',100);
 game.applyInspirit({id:'A1',sign:'negative',effect:'sleep'});
 assert.equal(game.beginGuidedCharge(0,'A1').reason,'caster_unable_to_act');
});
test('seeded enemy attacks can interrupt a pending charge and preserve unspent Soul',()=>{
 let found=false;
 for(let seed=1;seed<=80&&!found;seed++){
  const party=RENTAL_SQUAD.map(u=>({...u,weights:[100,0,0,0]}));
  const game=createCombat({seed,teams:[party,party],autoRotateReserves:false});
  game.pin(1,'A1');game.giveSoul('A1',100);
  game.beginGuidedCharge(0,'A1');
  const actions=game.simulate(70);
  const event=actions.find(e=>e.interruption?.stopped);
  if(event){
   found=true;
   assert.equal(event.interruption.target,'A1');
   assert.equal(game.snapshot().guided[0],null);
   assert.equal(game.snapshot().soul.teams[0][0].soul,100);
  }
 }
 assert.equal(found,true,'should observe at least one deterministic interruption');
});
