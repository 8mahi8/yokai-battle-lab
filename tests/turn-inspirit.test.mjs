import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateTurnInspirit} from '../engine/turn-inspirit.mjs';
const spec=(effect,level,sign=effect==='hp-loss'?'negative':'positive')=>
 ({effect,level,sign});
test('one owner-turn negative HP Inspirit decreases HP by a capped fixture amount',()=>{
 assert.deepEqual(calculateTurnInspirit({statuses:[spec('hp-loss',2)],currentHp:80,maxHp:200}),{
  kind:'loss',amount:20,hpAfter:60,lossLevel:2,regenLevel:0,
  netLevel:-2,percentage:-.1,model:'yw2-own-turn-hp-research-fixture'
 });
});
test('source positive 5%/level regen is bounded by max HP',()=>{
 const result=calculateTurnInspirit({statuses:[spec('hp-regen',3)],currentHp:190,maxHp:200});
 assert.equal(result.kind,'regen');
 assert.equal(result.amount,10);
 assert.equal(result.hpAfter,200);
});
test('positive and negative HP statuses offset by level and cap at five',()=>{
 const statuses=[spec('hp-loss',4),spec('hp-loss',4),spec('hp-regen',3)];
 const result=calculateTurnInspirit({statuses,currentHp:200,maxHp:200});
 assert.equal(result.netLevel,-5);
 assert.equal(result.amount,50);
 assert.equal(result.hpAfter,150);
 assert.equal(calculateTurnInspirit({statuses:[spec('hp-loss',2),spec('hp-regen',2)],
  currentHp:50,maxHp:100}).amount,0);
});
test('poison never makes HP negative and does not report a fabricated excess damage',()=>{
 const result=calculateTurnInspirit({statuses:[spec('hp-loss',4)],currentHp:5,maxHp:500});
 assert.equal(result.amount,5);
 assert.equal(result.hpAfter,0);
});
test('non-HP effects do not alter HP and samples do not mutate the ledger',()=>{
 const statuses=[{effect:'sleep',sign:'negative',level:2},spec('hp-regen',1)];
 const copy=JSON.stringify(statuses);
 const out=calculateTurnInspirit({statuses,currentHp:100,maxHp:100});
 assert.equal(out.kind,'none');
 assert.equal(out.netLevel,1);
 assert.equal(JSON.stringify(statuses),copy);
});
test('invalid HP, sign and unsupported status strength are rejected',()=>{
 for(const data of [
  {statuses:null,currentHp:3,maxHp:10},
  {statuses:[],currentHp:-1,maxHp:10},
  {statuses:[],currentHp:11,maxHp:10},
  {statuses:[],currentHp:2.5,maxHp:10},
  {statuses:[spec('hp-loss',5)],currentHp:10,maxHp:10},
  {statuses:[spec('hp-regen',1,'negative')],currentHp:10,maxHp:10}
 ])assert.throws(()=>calculateTurnInspirit(data));
});
