import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const healers=RENTAL_SQUAD.map(m=>({...m,
 technique:'heal',techniquePower:50,spirit:105,weights:[0,100,0,0]}));
const hitters=RENTAL_SQUAD.map(m=>({...m,
 attackPower:55,strength:115,weights:[100,0,0,0]}));
const make=(extra={},seed=18)=>createCombat({seed,teams:[healers,hitters],
 researchDamageModel:true,...extra});
function firstHeal(g){
 for(let i=0;i<220;i++){
  const evt=g.step();
  if(evt.type!=='action')break;
  if(evt.kind==='heal')return evt;
 }
 throw Error('no healer action found');
}
test('actual heal action contains explicitly unverified base healing research result',()=>{
 const g=make({researchHealingVariance:true});
 const h=firstHeal(g);
 assert.equal(h.healingResearch.model,'unverified-base-healing-fixture');
 assert.equal(h.healingResearch.amount,h.amount);
 assert.equal(h.healingResearch.hpAfter,h.targetHp);
 assert.ok(h.amount>0);
 const target=g.snapshot().squads.flat().find(m=>m.id===h.target);
 assert.ok(target.hp<=target.maxHp);
 assert.equal(h.healingResearch.spiritStage,0);
});
test('negative Spirit Inspirit weakens real research healing without breaking target selection',()=>{
 const normal=make({researchTurnInspirits:true},45);
 const weakened=make({researchTurnInspirits:true},45);
 for(let i=0;i<healers.length;i++)
  weakened.applyInspirit({id:'A'+(i+1),sign:'negative',
    effect:'spirit-down',level:2});
 const a=firstHeal(normal),b=firstHeal(weakened);
 assert.equal(a.actor,b.actor);
 assert.equal(a.target,b.target);
 assert.equal(a.healingResearch.spiritStage,0);
 assert.equal(b.healingResearch.spiritStage,-2);
 assert.ok(b.healingResearch.base<a.healingResearch.base);
 assert.ok(b.amount<=a.amount);
});
test('healing variation is reproducible and does not alter legacy mode when disabled',()=>{
 const a=make({researchHealingVariance:true},37);
 const b=make({researchHealingVariance:true},37);
 const h1=firstHeal(a),h2=firstHeal(b);
 assert.deepEqual(h1,h2);
 assert.deepEqual(a.snapshot(),b.snapshot());
 const noVariation=make({researchHealingVariance:false},37);
 const h3=firstHeal(noVariation);
 assert.equal(h3.healingResearch.varianceAmount,0);
});
test('strict research flag validation blocks using undocumented healing bonus as default',()=>{
 assert.throws(()=>createCombat({researchHealingVariance:true}));
 assert.throws(()=>createCombat({researchDamageModel:true,researchHealingVariance:4}));
 const legacy=createCombat();
 assert.equal(legacy.snapshot().events.some(e=>e.healingResearch),false);
});
