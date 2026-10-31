import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const damageTeams=(accuracy)=>[
 RENTAL_SQUAD.map(m=>({...m,attackAccuracy:accuracy,weights:[100,0,0,0]})),
 RENTAL_SQUAD.map(m=>({...m,attackAccuracy:accuracy,weights:[100,0,0,0]}))
];
test('real research combat reports move-specific accuracy on actual physical attacks',()=>{
 const game=createCombat({seed:31,researchDamageModel:true,teams:damageTeams(.5)});
 const hit=game.step();
 assert.equal(hit.type,'action');
 assert.equal(hit.kind,'attack');
 assert.ok(hit.hitResearch);
 const src=game.snapshot().squads.flat().find(x=>x.id===hit.actor);
 const target=game.snapshot().squads.flat().find(x=>x.id===hit.target);
 assert.equal(hit.hitResearch.probability,
  Math.min(98,Math.max(75,98+(src.speed-target.speed)/5))*.5);
 assert.equal(hit.hitResearch.moveAccuracy,.5);
 if(hit.hit)assert.equal(hit.criticalResearch.denominator,99);
});
test('techniques ignore physical attack accuracy and preserve element arithmetic',()=>{
 const team=RENTAL_SQUAD.map(m=>({...m,technique:'damage',
  techniqueElement:'wind',attackAccuracy:.5,weights:[0,100,0,0]}));
 const game=createCombat({seed:18,teams:[team,team],researchDamageModel:true});
 const first=game.step();
 assert.equal(first.kind,'technique');
 assert.equal(first.hitResearch.moveAccuracy,1);
 assert.equal(first.hitResearch.probability,Math.min(98,Math.max(75,
  98+(game.snapshot().squads.flat().find(x=>x.id===first.actor).speed-
   game.snapshot().squads.flat().find(x=>x.id===first.target).speed)/5)));
});
test('critical immunity inhibits all researched attack criticals without affecting hit rolls',()=>{
 const team=RENTAL_SQUAD.map(m=>({...m,criticalImmune:true,weights:[100,0,0,0]}));
 const game=createCombat({seed:8,teams:[team,team],researchDamageModel:true});
 const actions=game.simulate(70).filter(e=>e.kind==='attack'&&e.hit);
 assert.ok(actions.length>0);
 assert.ok(actions.every(e=>e.critical===false&&e.criticalResearch.units===0));
});
test('research accuracy, crit bonus, and immunity values are strictly validated',()=>{
 for(const [key,value] of [['attackAccuracy',0],['attackAccuracy',5],
   ['moveCritBonus',99],['moveCritBonus',2.5],['criticalImmune',12]]){
  const bad=RENTAL_SQUAD.map(m=>({...m}));
  bad[0]={...bad[0],[key]:value};
  assert.throws(()=>createCombat({teams:[bad,RENTAL_SQUAD]}));
 }
});
test('new accuracy model is deterministic with 100 sampled auto actions',()=>{
 for(const seed of [5,6,7,8,44,96]){
  const props={seed,teams:damageTeams(1.2),researchDamageModel:true};
  const a=createCombat(props),b=createCombat(props);
  assert.deepEqual(a.simulate(100),b.simulate(100));
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.ok(a.snapshot().squads.flat().every(u=>
   Number.isInteger(u.hp)&&u.hp>=0&&u.hp<=u.maxHp));
 }
});
