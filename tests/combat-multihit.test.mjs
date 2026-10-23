import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const asAttack=RENTAL_SQUAD.map(m=>({...m,weights:[100,0,0,0],
 attackPower:30,attackHits:3,strength:100,defense:80}));
const asTechnique=RENTAL_SQUAD.map(m=>({...m,weights:[0,100,0,0],
 technique:'damage',techniquePower:25,techniqueHits:2,
 spirit:100,defense:80,techniqueElement:'fire',
 elementResistances:{fire:1.5}}));
const create=(r,seed=41,extra={})=>createCombat({
 seed,teams:[r,r],researchDamageModel:true,researchMultiHit:true,...extra
});
test('research-only multi-hit physical attacks carry a per-hit outcome and HP ledger',()=>{
 const g=create(asAttack);
 const old=Object.fromEntries(g.snapshot().squads.flat().map(m=>[m.id,m.hp]));
 const result=g.step();
 assert.equal(result.type,'action');
 assert.equal(result.kind,'attack');
 assert.ok(result.multiHit);
 assert.equal(result.multiHit.planned,3);
 assert.ok(result.multiHit.attempted>=1&&result.multiHit.attempted<=3);
 assert.equal(result.multiHit.totalDamage,result.amount);
 assert.equal(result.multiHit.hits.reduce((sum,h)=>sum+h.amount,0),result.amount);
 assert.equal(result.multiHit.landed,result.multiHit.hits.filter(h=>h.hit).length);
 assert.equal(result.multiHit.criticalHits,result.multiHit.hits.filter(h=>h.critical).length);
 assert.equal(result.hit,result.multiHit.landed>0);
 assert.equal(result.critical,result.multiHit.criticalHits>0);
 assert.equal(old[result.target]-g.snapshot().squads.flat().find(m=>m.id===result.target).hp,result.amount);
 if(result.hit)assert.equal(result.damageResearch.hits,3);
});
test('multi-hit technique rolls separately and retains its original element affinity',()=>{
 const g=create(asTechnique,35),action=g.step();
 assert.equal(action.kind,'technique');
 assert.equal(action.multiHit.planned,2);
 assert.equal(action.multiHit.attempted,2);
 assert.ok(action.multiHit.hits.every(h=>Number.isInteger(h.amount)&&h.amount>=0));
 assert.equal(action.multiHit.hits.reduce((sum,h)=>sum+h.amount,0),action.amount);
 if(action.hit){
  assert.equal(action.damageResearch.hits,2);
  assert.equal(action.damageResearch.elementMultiplier,1.5);
  assert.equal(action.damageResearch.techniqueElement,'fire');
 }
});
test('each hit uses the source formula based on divided offensive stat',()=>{
 const g=create(asAttack,3);
 for(let i=0;i<20;i++){
  const act=g.step();
  if(act.type!=='action')break;
  if(act.kind==='attack'&&act.hit&&!act.critical){
   assert.equal(act.damageResearch.hits,3);
   assert.equal(act.damageResearch.amount,25);
   return;
  }
 }
 assert.fail('no ordinary hit found');
});
test('KO stops the remainder of a nine-hit attack and counts knockout once',()=>{
 const overpower=RENTAL_SQUAD.map(m=>({...m,weights:[100,0,0,0],
  attackHits:9,attackPower:500,strength:500,maxHp:25,defense:10}));
 const g=create(overpower,90);
 let ko=null;
 for(let i=0;i<30;i++){
  const action=g.step();if(action.type!=='action')break;
  if(action.targetHp===0){ko=action;break;}
 }
 assert.ok(ko);
 assert.equal(ko.multiHit.attempted,1);
 assert.equal(ko.multiHit.hits[0].targetHpAfter,0);
 assert.equal(ko.multiHit.hits[0].amount,25);
 const actor=g.snapshot().squads.flat().find(m=>m.id===ko.actor);
 assert.equal(actor.knockouts,1);
});
test('hit details do not exceed target HP even across many critical/accuracy rolls',()=>{
 for(let seed=1;seed<=15;seed++){
  const g=create(asAttack,seed);
  for(let i=0;i<150;i++){
   const action=g.step();
   if(action.type!=='action')break;
   if(action.multiHit){
    assert.equal(action.amount,action.multiHit.hits.reduce((acc,x)=>acc+x.amount,0));
    assert.ok(action.multiHit.hits.every((x,n,a)=>
     x.targetHpAfter>=0&&(n===0||x.targetHpAfter<=a[n-1].targetHpAfter)));
    assert.equal(action.multiHit.hits.at(-1).targetHpAfter,action.targetHp);
   }
  }
  assert.ok(g.snapshot().squads.flat().every(m=>m.hp>=0&&m.hp<=m.maxHp));
 }
});
test('one-hit fallback and default mode are unchanged if multi-hit option is not selected',()=>{
 const g=createCombat({teams:[asAttack,asAttack],researchDamageModel:true,
  researchMultiHit:false});
 assert.equal(g.step().multiHit,undefined);
 const defaultGame=createCombat();
 assert.equal(defaultGame.step().multiHit,undefined);
 assert.throws(()=>createCombat({researchMultiHit:true}));
 assert.throws(()=>createCombat({researchDamageModel:true,researchMultiHit:'yes'}));
 for(const [field,bad] of [['attackHits',0],['attackHits',10],
  ['attackHits',2.5],['techniqueHits',-1],['techniqueHits',10]]){
  const badTeam=RENTAL_SQUAD.map(m=>({...m}));
  badTeam[0]={...badTeam[0],[field]:bad};
  assert.throws(()=>createCombat({teams:[badTeam,RENTAL_SQUAD]}));
 }
});
test('multi-hit automatic simulation remains seeded and predictable over 80 actions',()=>{
 for(const seed of [5,11,17,41,57,93]){
  const a=create(asTechnique,seed),b=create(asTechnique,seed);
  assert.deepEqual(a.simulate(80),b.simulate(80));
  assert.deepEqual(a.snapshot(),b.snapshot());
 }
});
