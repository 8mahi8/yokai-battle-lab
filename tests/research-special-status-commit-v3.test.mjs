import test from 'node:test';
import assert from 'node:assert/strict';
import {commitResearchSpecialStatus} from '../engine/special-impact-commit.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const target=(id='B1',side=1,hp=100)=>({id,side,hp,maxHp:150});
const attempt=(impact,subject=target(),opts={})=>{
 const calls=[];
 const call=()=>commitResearchSpecialStatus({
  impact,target:subject,casterSide:0,casterId:'A1',
  applyStatus:spec=>{calls.push(spec);return spec},...opts
 });
 return {calls,call};
};

test('V3-2 research status uses the same one-time canonical ledger payload',()=>{
 for(const x of [
  {kind:'buff',subject:target('A2',0),sign:'positive',effect:'strength-up',level:2},
  {kind:'debuff',subject:target('B2',1),sign:'negative',effect:'sleep',level:1},
  {kind:'damage-status',subject:target('B3',1),sign:'negative',effect:'spirit-down',level:4}
 ]){
  const {calls,call}=attempt({kind:x.kind,targetId:x.subject.id,
   statusEffect:x.effect,statusSign:x.sign,statusLevel:x.level},x.subject);
  assert.deepEqual(call(),{id:x.subject.id,sign:x.sign,effect:x.effect,
   level:x.level,source:'A1'});
  assert.equal(calls.length,1);
  assert.equal(x.subject.hp,100,'status adapter cannot mutate HP');
 }
});

test('V3-2 status adapter fails before any write for bad target, side or level',()=>{
 const base={kind:'debuff',targetId:'B1',
  statusEffect:'sleep',statusSign:'negative',statusLevel:2};
 const variants=[
  [base,target('B1',1,0),{}],
  [{...base,targetId:'B2'},target(),{}],
  [{...base,kind:'unknown'},target(),{}],
  [{...base,kind:'buff'},target(),{}],
  [{...base,statusSign:'positive'},target(),{}],
  [{...base,statusLevel:0},target(),{}],
  [{...base,statusLevel:5},target(),{}],
  [{...base,statusLevel:1.2},target(),{}],
  [{...base,statusEffect:''},target(),{}],
  [base,target('A2',0),{}],
  [base,target(),{casterId:''}],
  [base,target(),{casterSide:2}],
  [base,target(),{applyStatus:null}]
 ];
 for(const [impact,subject,options] of variants){
  const {call,calls}=attempt(impact,subject,options);
  assert.throws(call);
  assert.deepEqual(calls,[],'invalid status must never reach the ledger');
  assert.equal(subject.hp,subject.hp,'invalid status leaves HP intact');
 }
});

const clonedRoster=spec=>RENTAL_SQUAD.map((unit,i)=>({
 ...unit,...(i===0?{special:spec}:{})
}));
test('V3-2 custom status Soultimates remain seeded host-deterministic',()=>{
 const specials=[
  {kind:'buff',scope:'front',effect:'strength-up',level:2},
  {kind:'debuff',scope:'front',effect:'defense-down',level:2},
  {kind:'damage-status',scope:'front',power:60,damageKind:'attack',
   effect:'sleep',level:2}
 ];
 for(const spec of specials)for(const seed of [19,42,8192]){
  const roster=clonedRoster(spec);
  const make=()=>{
   const game=createCombat({seed,teams:[roster,roster],
    researchSpecialEffects:true,researchDamageModel:true,
    researchStatInspirits:true});
   game.giveSoul('A1',250);
   const prepared=game.prepareSoultimate(0,'A1');
   assert.equal(prepared.ok,true);
   const completed=game.resolveSoultimate(0,prepared.token,true);
   assert.equal(completed.ok,true);
   return {completed,snapshot:game.snapshot()};
  };
  assert.deepEqual(make(),make(),spec.kind+' seed '+seed);
 }
});
