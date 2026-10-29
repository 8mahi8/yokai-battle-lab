import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_MOVE_MASTER} from '../content/rental-move-master.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';
import {compileSoultimateEffectPlan} from '../engine/soultimate-effect-plan.mjs';
import {assertPlannedSpecialImpact,commitPlannedSpecialHp}
 from '../engine/special-impact-commit.mjs';
import {createEffectCommitter} from '../engine/effect-commit.mjs';

const fixture=index=>{
 const d=RENTAL_SOULTIMATE_MOVES[index];
 const move=RENTAL_MOVE_MASTER.find(m=>m.id===d.id);
 return compileSoultimateEffectPlan(move,d.definition);
};
const enemy=(hp=100)=>({id:'B1',side:1,hp,maxHp:200});
const ally=(hp=100)=>({id:'A2',side:0,hp,maxHp:200});
function makeCommitter(){
 const calls=[];
 const effects=createEffectCommitter({
  resolveDirectDamage:(target,amount)=>{
   const paid=Math.min(target.hp,amount);
   return {hpAfter:target.hp-paid,amount:paid,activated:false};
  },
  onSurvival:()=>{},
  applyStatus:()=>{},
  onStatus:()=>{}
 });
 return {
  calls,effects:{
   commitDamage:(target,amount)=>{
    calls.push(['damage',target.id,amount]);
    return effects.commitDamage(target,amount);
   },
   commitHeal:(target,amount)=>{
    calls.push(['heal',target.id,amount]);
    return effects.commitHeal(target,amount);
   }
  }
 };
}

test('V3-2: all six Soultimates validate the correct impact type and side',()=>{
 const data=[
  {index:0,target:enemy(),impact:{kind:'damage',targetId:'B1',amount:21}},
  {index:1,target:enemy(),impact:{kind:'drain',targetId:'B1',amount:12}},
  {index:1,target:ally(),impact:{kind:'heal',targetId:'A2',hpAfter:105,linkedDrain:true}},
  {index:2,target:ally(),impact:{kind:'buff',targetId:'A2',statusEffect:'strength-up',statusSign:'positive',statusLevel:2}},
  {index:3,target:enemy(),impact:{kind:'damage-status',targetId:'B1',amount:11,statusEffect:'spirit-down',statusSign:'negative',statusLevel:2}},
  {index:4,target:ally(0),impact:{kind:'revive',targetId:'A2',hpAfter:85,linkedReviveHeal:true}},
  {index:4,target:ally(),impact:{kind:'heal',targetId:'A2',hpAfter:185,linkedReviveHeal:true}},
  {index:5,target:enemy(),impact:{kind:'debuff',targetId:'B1',statusEffect:'defense-down',statusSign:'negative',statusLevel:2}}
 ];
 for(const {index,target,impact} of data){
  const plan=fixture(index);
  const stage=assertPlannedSpecialImpact(plan,impact,{target,casterSide:0});
  assert.equal(typeof stage.type,'string');
 }
});

test('V3-2: actual HP changes go through existing EffectCommitter exactly once',()=>{
 const f=makeCommitter();
 const t=enemy();
 const output=commitPlannedSpecialHp({
  plan:fixture(0),impact:{kind:'damage',targetId:'B1',amount:34},
  target:t,casterSide:0,effects:f.effects
 });
 assert.equal(output.amount,34);
 assert.equal(t.hp,66);
 const a=ally();
 const healing=commitPlannedSpecialHp({
  plan:fixture(1),impact:{kind:'heal',targetId:'A2',hpAfter:110,linkedDrain:true},
  target:a,casterSide:0,effects:f.effects
 });
 assert.equal(healing.amount,10);
 assert.equal(a.hp,110);
 const reviving=ally(0);
 commitPlannedSpecialHp({
  plan:fixture(4),
  impact:{kind:'revive',targetId:'A2',hpAfter:85,linkedReviveHeal:true},
  target:reviving,casterSide:0,effects:f.effects
 });
 assert.equal(reviving.hp,85);
 assert.deepEqual(f.calls,[
  ['damage','B1',34],['heal','A2',10],['heal','A2',85]
 ]);
});

test('V3-2: invalid composite effects cannot mutate HP or consume a commit',()=>{
 const f=makeCommitter();
 const t=enemy(),a=ally(),original={hp:t.hp,allyHp:a.hp};
 const rejects=[
  [fixture(0),{kind:'damage',targetId:'B1',amount:-1},t],
  [fixture(0),{kind:'heal',targetId:'B1',hpAfter:150},t],
  [fixture(0),{kind:'damage',targetId:'A2',amount:20},a],
  [fixture(1),{kind:'heal',targetId:'A2',hpAfter:120},a], // missing linkedDrain
  [fixture(1),{kind:'heal',targetId:'A2',hpAfter:999,linkedDrain:true},a],
  [fixture(2),{kind:'buff',targetId:'A2',statusEffect:'sleep',statusSign:'positive',statusLevel:2},a],
  [fixture(3),{kind:'damage-status',targetId:'B1',amount:12,statusEffect:'sleep',statusSign:'negative',statusLevel:2},t],
  [fixture(4),{kind:'revive',targetId:'A2',hpAfter:85},a], // missing linkedReviveHeal
  [fixture(5),{kind:'debuff',targetId:'A2',statusEffect:'defense-down',statusSign:'negative',statusLevel:2},a]
 ];
 for(const [plan,impact,target] of rejects){
  assert.throws(()=>assertPlannedSpecialImpact(plan,impact,{target,casterSide:0}));
  assert.throws(()=>commitPlannedSpecialHp({
   plan,impact,target,casterSide:0,effects:f.effects
  }));
 }
 assert.deepEqual([t.hp,a.hp],[original.hp,original.allyHp]);
 assert.deepEqual(f.calls,[],'fail-closed checks must run before HP writes');
});

test('V3-2: status-only stages can never write HP and G-levels may increase',()=>{
 const f=makeCommitter(),a=ally(),t=enemy();
 assert.equal(assertPlannedSpecialImpact(fixture(2),{
  kind:'buff',targetId:'A2',statusEffect:'strength-up',
  statusSign:'positive',statusLevel:4
 },{target:a,casterSide:0}).type,'status');
 assert.throws(()=>commitPlannedSpecialHp({plan:fixture(2),target:a,
  impact:{kind:'buff',targetId:'A2',statusEffect:'strength-up',
   statusSign:'positive',statusLevel:2},
  casterSide:0,effects:f.effects
 }),/cannot commit HP/);
 assert.throws(()=>assertPlannedSpecialImpact(fixture(5),{
  kind:'debuff',targetId:'B1',statusEffect:'defense-down',
  statusSign:'negative',statusLevel:1
 },{target:t,casterSide:0}),/status violates authored/);
 assert.equal(a.hp,100);
 assert.deepEqual(f.calls,[]);
});
