import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const guards=RENTAL_SQUAD.map(m=>({...m,weights:[0,0,0,100]}));
const attacks=RENTAL_SQUAD.map(m=>({...m,weights:[100,0,0,0]}));
const lab=(teams=[guards,guards],seed=21)=>createCombat({
 seed,teams,researchDamageModel:true,researchTurnInspirits:true
});
function until(g,predicate,n=180){
 for(let i=0;i<n;i++){
  const a=g.step();
  if(a.type!=='action')break;
  if(predicate(a))return a;
 }
 throw Error('No expected action found');
}
test('HP-loss Inspirit triggers only at the affected Yo-kai own turn end',()=>{
 const g=lab();
 g.applyInspirit({id:'A1',sign:'negative',effect:'hp-loss',level:2});
 const prev=g.snapshot().squads[0][0].hp;
 const act=until(g,a=>a.actor==='A1');
 const m=g.snapshot().squads[0][0];
 assert.equal(act.kind,'guard');
 assert.equal(act.turnInspirit.kind,'loss');
 assert.equal(act.turnInspirit.amount,Math.floor(m.maxHp*.1));
 assert.equal(m.hp,prev-Math.floor(m.maxHp*.1));
 assert.equal(g.snapshot().events.filter(x=>x.type==='turn-inspirit').length,1);
 assert.equal(g.snapshot().inspirits.A1[0].effect,'hp-loss');
});
test('regeneration and HP loss cancel in a deterministic signed-level net',()=>{
 const g=lab();
 g.applyInspirit({id:'A1',sign:'negative',effect:'hp-loss',level:3});
 g.applyInspirit({id:'A1',sign:'positive',effect:'hp-regen',level:2});
 const first=until(g,a=>a.actor==='A1');
 assert.equal(first.turnInspirit.kind,'loss');
 assert.equal(first.turnInspirit.netLevel,-1);
 assert.equal(first.turnInspirit.amount,Math.floor(225*.05));
 assert.deepEqual(g.snapshot().inspirits.A1.map(x=>x.effect),['hp-loss','hp-regen']);
});
test('negative Strength Inspirit decreases actual physical damage in deterministic replay',()=>{
 const baseline=lab([attacks,guards],11);
 const debuffed=lab([attacks,guards],11);
 debuffed.applyInspirit({id:'A1',sign:'negative',effect:'strength-down',level:3});
 const a=until(baseline,e=>e.actor==='A1'&&e.kind==='attack'&&e.hit&&!e.critical);
 const b=until(debuffed,e=>e.actor==='A1'&&e.kind==='attack'&&e.hit&&!e.critical);
 assert.equal(a.target,b.target);
 assert.equal(a.damageResearch.statStage,0);
 assert.equal(b.damageResearch.statStage,-3);
 assert.ok(b.amount<a.amount,'weakened attack should deal less damage');
 assert.equal(b.damageResearch.statMultiplier,.55);
});
test('negative Defense Inspirit increases damage taken by pinned defender',()=>{
 const baseline=lab([attacks,guards],41);
 const weakened=lab([attacks,guards],41);
 for(const g of [baseline,weakened])g.pin(0,'B1');
 weakened.applyInspirit({id:'B1',sign:'negative',effect:'defense-down',level:2});
 const a=until(baseline,e=>e.actor.startsWith('A')&&e.kind==='attack'&&e.hit&&!e.critical);
 const b=until(weakened,e=>e.actor.startsWith('A')&&e.kind==='attack'&&e.hit&&!e.critical);
 assert.equal(a.actor,b.actor);
 assert.equal(a.target,'B1');assert.equal(b.target,'B1');
 assert.equal(b.damageResearch.defenseStage,-2);
 assert.ok(b.amount>a.amount);
});
test('purifying a benched target removes harmful turn-end effect but retains positive regeneration',()=>{
 const g=lab();
 g.applyInspirit({id:'A1',sign:'negative',effect:'hp-loss',level:2});
 g.applyInspirit({id:'A1',sign:'positive',effect:'hp-regen',level:1});
 g.rotate(0,1);
 assert.equal(g.purify(0,'A1').removed.length,1);
 assert.deepEqual(g.snapshot().inspirits.A1.map(x=>x.effect),['hp-regen']);
 g.rotate(0,-1);
 const action=until(g,x=>x.actor==='A1');
 assert.equal(action.turnInspirit,undefined,'full HP cannot regenerate above maximum');
});
test('stage down and HP effects require explicitly opted-in research mode',()=>{
 const g=createCombat();
 assert.throws(()=>g.applyInspirit({id:'A1',sign:'negative',effect:'hp-loss'}));
 assert.throws(()=>g.applyInspirit({id:'A1',sign:'negative',effect:'defense-down'}));
 assert.throws(()=>createCombat({researchTurnInspirits:true}));
 assert.throws(()=>createCombat({researchTurnInspirits:1,researchDamageModel:true}));
 const modified=RENTAL_SQUAD.map(x=>({...x}));
 modified[0]={...modified[0],inspirit:'hp-loss'};
 assert.throws(()=>createCombat({teams:[modified,RENTAL_SQUAD]}));
 assert.doesNotThrow(()=>lab([modified,guards]));
});
test('real auto AI can apply a new harmful HP Inspirit with ordinary resistance handling',()=>{
 const enemies=RENTAL_SQUAD.map(m=>({...m,weights:[0,0,0,100],inspiritResistance:0}));
 const applyers=RENTAL_SQUAD.map(m=>({...m,weights:[0,0,100,0],inspirit:'hp-loss',
  inspiritResistance:0,attitude:'neutral'}));
 const g=lab([enemies,applyers],10);
 const act=until(g,a=>a.kind==='inspirit'&&a.effect==='hp-loss'&&a.hit);
 assert.ok(act.target?.startsWith('A'));
 assert.ok(g.snapshot().inspirits[act.target].some(s=>s.effect==='hp-loss'));
});
test('determinism and HP bounds across inspired status battles',()=>{
 for(const seed of [1,9,20,55]){
  const opts={seed,teams:[guards,guards],researchDamageModel:true,researchTurnInspirits:true};
  const a=createCombat(opts),b=createCombat(opts);
  for(const g of [a,b]){
   g.applyInspirit({id:'A1',sign:'negative',effect:'hp-loss',level:2});
   g.applyInspirit({id:'B2',sign:'positive',effect:'hp-regen',level:1});
  }
  assert.deepEqual(a.simulate(120),b.simulate(120));
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.ok(a.snapshot().squads.flat().every(m=>m.hp>=0&&m.hp<=m.maxHp));
 }
});
