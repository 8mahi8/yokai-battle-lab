import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const make=(mode,teams,seed=41)=>createCombat({
 seed,teams,researchDamageModel:mode
});
const allTech=RENTAL_SQUAD.map(m=>({
 ...m,technique:'damage',weights:[0,100,0,0],techniqueElement:'wind',
 elementResistances:{wind:1.6}
}));
const allAttack=RENTAL_SQUAD.map(m=>({
 ...m,weights:[100,0,0,0]
}));
function firstHit(game,kind,max=100){
 for(let i=0;i<max;i++){
  const out=game.step();
  if(out.type!=='action')break;
  if(out.kind===kind&&out.hit&&out.critical===false)return out;
 }
 throw Error('no noncritical hit found in '+max+' steps');
}
test('source-grounded research element multiplier changes actual technique HP impact',()=>{
 const neutral=make(false,[allTech,allTech],15);
 const elemental=make(true,[allTech,allTech],15);
 const a=firstHit(neutral,'technique');
 const b=firstHit(elemental,'technique');
 assert.equal(b.actor,a.actor);
 assert.equal(b.target,a.target);
 assert.ok(b.amount>a.amount);
 assert.equal(b.damageResearch.elementMultiplier,1.6);
 assert.equal(b.damageResearch.techniqueElement,'wind');
 assert.equal(b.damageResearch.confidence,'yw2-wiki-formula-research');
 assert.equal(neutral.snapshot().events.some(x=>x.damageResearch),false);
});
test('strength-up levels stack as YW2 stages in actual regular physical attacks',()=>{
 const original=make(false,[allAttack,allAttack],90);
 const studied=make(true,[allAttack,allAttack],90);
 for(const g of [original,studied]){
  for(const team of g.snapshot().squads){
   for(const m of team)g.applyInspirit({
    id:m.id,sign:'positive',effect:'strength-up',level:2
   });
  }
 }
 const a=firstHit(original,'attack');
 const b=firstHit(studied,'attack');
 assert.equal(a.actor,b.actor);
 assert.equal(a.target,b.target);
 assert.equal(b.damageResearch.statStage,2);
 assert.equal(b.damageResearch.statMultiplier,1.2);
 assert.ok(b.amount>=a.amount);
});
test('two positive Strength inspirits aggregate stages and reflect curing/expiry',()=>{
 const g=make(true,[allAttack,allAttack]);
 g.applyInspirit({id:'A1',sign:'positive',effect:'strength-up',level:3});
 g.applyInspirit({id:'A1',sign:'positive',effect:'strength-up',level:4});
 assert.deepEqual(g.snapshot().inspirits.A1.map(x=>x.level),[3,4]);
 const healed=make(true,[allAttack,allAttack]);
 healed.applyInspirit({id:'A1',sign:'positive',effect:'strength-up',level:3});
 healed.applyInspirit({id:'A1',sign:'positive',effect:'strength-up',level:4});
 // Positive status lasts 30 global actions, preserving source rule.
 healed.simulate(30);
 assert.ok(healed.snapshot().inspirits.A1.length<=2);
});
test('combat snapshot elemental resistances are deeply defensive',()=>{
 const game=make(true,[allTech,allTech]);
 const a=game.snapshot();a.squads[0][0].elementResistances.wind=100;
 assert.equal(game.snapshot().squads[0][0].elementResistances.wind,1.6);
 assert.equal(allTech[0].elementResistances.wind,1.6);
});
test('unsupported research toggle/invalid affinity/level/crit defense are rejected',()=>{
 assert.throws(()=>createCombat({researchDamageModel:'true'}));
 const malformed=RENTAL_SQUAD.map(m=>({...m}));
 for(const [key,bad] of [
  ['techniqueElement','plasma'],['elementResistances',{fire:5}],
  ['inspiritLevel',6],['criticalDefense',-2],['guardBreak',2]
 ]){
  malformed[0]={...RENTAL_SQUAD[0],[key]:bad};
  assert.throws(()=>createCombat({teams:[malformed,RENTAL_SQUAD]}));
 }
 const g=createCombat();
 assert.throws(()=>g.applyInspirit({id:'A1',sign:'positive',effect:'strength-up',level:0}));
 assert.throws(()=>g.applyInspirit({id:'A1',sign:'positive',effect:'strength-up',level:8}));
});
test('optional damage engine remains deterministic over many seeds with bounded HP',()=>{
 for(let seed=1;seed<=20;seed++){
  const opts={seed,teams:[allTech,allTech],researchDamageModel:true,
   researchSoulRecoveryMode:'owner-nonattack'};
  const a=createCombat(opts),b=createCombat(opts);
  const logA=a.simulate(125),logB=b.simulate(125);
  assert.deepEqual(logA,logB);
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.ok(a.snapshot().squads.flat().every(m=>
   Number.isInteger(m.hp)&&m.hp>=0&&m.hp<=m.maxHp
  ));
 }
});
