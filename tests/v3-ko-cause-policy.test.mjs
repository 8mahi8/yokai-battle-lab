import test from 'node:test';
import assert from 'node:assert/strict';
import {createKnockoutLifecycle,KO_CAUSE_POLICY}
 from '../engine/knockout-lifecycle.mjs';

function fixture(){
 const log=[],caster={id:'A1',side:0,knockouts:0},
  target={id:'B1',side:1,hp:0,maxHp:160};
 const ko=createKnockoutLifecycle({
  syncEligibility:id=>log.push({phase:'eligibility',id}),
  afterEnemyKO:(actor,enemy)=>{
   log.push({phase:'after_ko',actor:actor.id,target:enemy.id,
    knockouts:actor.knockouts});
  },
  refreshPins:()=>log.push({phase:'pin_refresh'})
 });
 return {log,caster,target,ko};
}

test('V3-2 KO cause policies are immutable and explicitly retain legacy ordering',()=>{
 assert.deepEqual(KO_CAUSE_POLICY,{
  ordinary:{eligibilityPhase:'before-skill',refreshPin:true,creditCaster:true},
  special:{eligibilityPhase:'after-skill',refreshPin:false,creditCaster:true},
  poke:{eligibilityPhase:'before-skill',refreshPin:true,creditCaster:false}
 });
 assert.equal(Object.isFrozen(KO_CAUSE_POLICY),true);
 for(const policy of Object.values(KO_CAUSE_POLICY))
  assert.equal(Object.isFrozen(policy),true);
});

test('V3-2 ordinary, special, Poke KO cause calls remain exact legacy snapshot and callback equals',()=>{
 for(const cause of Object.keys(KO_CAUSE_POLICY)){
  const withCause=fixture(),withLegacy=fixture(),policy=KO_CAUSE_POLICY[cause];
  const credited=policy.creditCaster;
  withCause.ko.commitForCause({cause,target:withCause.target,
   ...(credited?{caster:withCause.caster}:{})});
  withLegacy.ko.commit({target:withLegacy.target,
   ...(credited?{caster:withLegacy.caster}:{}),
   eligibilityPhase:policy.eligibilityPhase,refreshPin:policy.refreshPin});
  assert.deepEqual({
   callbacks:withCause.log,
   KOCount:withCause.caster.knockouts,
   target:withCause.target
  },{
   callbacks:withLegacy.log,
   KOCount:withLegacy.caster.knockouts,
   target:withLegacy.target
  },cause);
 }
});

test('V3-2 each KO cause retains distinct ordered side effects',()=>{
 const sequences={
  ordinary:['eligibility','after_ko','pin_refresh'],
  special:['after_ko','eligibility'],
  poke:['eligibility','pin_refresh']
 };
 for(const cause of Object.keys(sequences)){
  const {ko,caster,target,log}=fixture();
  ko.commitForCause({cause,target,...(cause==='poke'?{}:{caster})});
  assert.deepEqual(log.map(x=>x.phase),sequences[cause]);
  assert.equal(caster.knockouts,cause==='poke'?0:1);
  if(cause!=='poke')
   assert.equal(log.find(x=>x.phase==='after_ko').knockouts,1);
 }
});

test('V3-2 invalid cause, missing actor, credited Poke, living target fail before mutation',()=>{
 for(const example of [
  {cause:'unverified',giveCaster:true},
  {cause:'special',giveCaster:false},
  {cause:'ordinary',giveCaster:false},
  {cause:'poke',giveCaster:true},
  {cause:'toString',giveCaster:false},
  {cause:'poke',giveCaster:false,targetHp:1}
 ]){
  const {ko,caster,target,log}=fixture();
  if(example.targetHp!==undefined)target.hp=example.targetHp;
  const prior={...caster};
  assert.throws(()=>ko.commitForCause({cause:example.cause,target,
   ...(example.giveCaster?{caster}:{})}));
  assert.deepEqual(log,[]);
  assert.deepEqual(caster,prior);
 }
});
