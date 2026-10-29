import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_MOVE_MASTER} from '../content/rental-move-master.mjs';
import {compileTypedEffectPlan,commitTypedEffect,TYPED_EFFECT_PLAN_VERSION}
 from '../engine/typed-effect-plan.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const byId=id=>RENTAL_MOVE_MASTER.find(m=>m.id===id);
const clone=x=>JSON.parse(JSON.stringify(x));

test('V3-2: all 18 ordinary rental moves compile from the ONE current move master',()=>{
 const ordinary=RENTAL_MOVE_MASTER.filter(m=>m.slot!=='soultimate');
 assert.equal(ordinary.length,18);
 for(const authored of ordinary){
  const plan=compileTypedEffectPlan(authored);
  assert.equal(plan.version,TYPED_EFFECT_PLAN_VERSION);
  assert.equal(plan.moveId,authored.id);
  assert.equal(plan.slot,authored.slot);
  assert.equal(plan.targetScope,authored.targetScope);
  assert.equal(plan.evidence,'fixture');
  assert.equal(Object.isFrozen(plan),true);
  assert.equal(Object.isFrozen(plan.effect),true);
  if(authored.slot==='attack'||authored.category==='technique_damage'){
   assert.equal(plan.effect.type,'damage');
   assert.equal(plan.effect.power,authored.power);
   assert.equal(plan.effect.hits,authored.hitPattern.count);
  }else if(authored.category==='heal'){
   assert.deepEqual(plan.effect,{type:'heal',power:authored.power});
  }else{
   assert.equal(plan.effect.type,'status');
   assert.equal(plan.effect.statusId,authored.statusEffect);
  }
 }
 assert.equal(RENTAL_MOVE_MASTER.filter(m=>m.slot==='soultimate').length,6);
 for(const special of RENTAL_MOVE_MASTER.filter(m=>m.slot==='soultimate'))
  assert.throws(()=>compileTypedEffectPlan(special),/not yet supported/,
   'unknown/multi-effect Soultimate must not become a fake one-hit plan');
});

test('V3-2: unsupported authoring shapes fail before any battle effect',()=>{
 const attack=byId('rental-01:attack');
 for(const changes of [
  {power:-1},{targetScope:'enemy_front'},
  {hitPattern:{type:'unknown',count:null}},
  {hitPattern:{type:'multi',count:1}},
  {category:'damage-status'}
 ]){
  assert.throws(()=>compileTypedEffectPlan({...clone(attack),...changes}));
 }
 const status=byId('rental-01:inspirit');
 assert.throws(()=>compileTypedEffectPlan({...clone(status),targetScope:'single_ally'}));
 assert.throws(()=>compileTypedEffectPlan({...clone(status),statusEffect:null}));
 const heal=byId('rental-02:technique');
 assert.throws(()=>compileTypedEffectPlan({...clone(heal),hitPattern:{type:'single',count:1}}));
 assert.throws(()=>compileTypedEffectPlan({...clone(heal),targetScope:'single_enemy'}));
});

test('V3-2: typed damage/heal/status only calls the existing canonical committer',()=>{
 const calls=[],target={id:'B1',hp:100,maxHp:100};
 const committer={
  commitDamage:(unit,amount)=>{calls.push(['damage',unit.id,amount]);return {amount};},
  commitHeal:(unit,amount)=>{calls.push(['heal',unit.id,amount]);return {amount};},
  commitStatus:spec=>{calls.push(['status',spec.id,spec.effect]);return spec;}
 };
 const damage=compileTypedEffectPlan(byId('rental-01:attack'));
 const healing=compileTypedEffectPlan(byId('rental-02:technique'));
 const status=compileTypedEffectPlan(byId('rental-01:inspirit'));
 assert.equal(commitTypedEffect(damage,committer,{target,amount:25}).amount,25);
 assert.equal(commitTypedEffect(healing,committer,{target,amount:3}).amount,3);
 const spec={id:'B1',sign:'negative',effect:'sleep',source:'A1',level:1};
 assert.deepEqual(commitTypedEffect(status,committer,{target,statusSpec:spec}),spec);
 assert.deepEqual(calls,[['damage','B1',25],['heal','B1',3],['status','B1','sleep']]);
 const before=calls.length;
 assert.throws(()=>commitTypedEffect(status,committer,{target,
  statusSpec:{...spec,sign:'positive'}}),/does not match/);
 assert.throws(()=>commitTypedEffect(status,committer,{target,
  statusSpec:{...spec,id:'B2'}}),/does not match/);
 assert.throws(()=>commitTypedEffect(damage,committer,{target,amount:-1}),/amount-only/);
 assert.throws(()=>commitTypedEffect(healing,committer,{target,statusSpec:spec}),/amount-only/);
 assert.equal(calls.length,before,'failed validation may not mutate HP or ledger');
});

test('V3-2: canonical match still replays in full with typed normal commits',()=>{
 for(const seed of [3,12,20261029,918273]){
  const match=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:true}});
  for(let i=0;i<90&&match.snapshot().game.winner===null;i++){
   const result=match.advanceAuto();
   assert.equal(result.ok,true);
  }
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
  for(const team of match.snapshot().game.squads)
   for(const member of team)
    assert.ok(member.hp>=0&&member.hp<=member.maxHp);
 }
});
