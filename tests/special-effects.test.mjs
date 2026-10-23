import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpecialSpec,planResearchSpecial} from '../engine/special-effects.mjs';
import {soulCapacityForRank,createSoulSystem} from '../engine/soul.mjs';
const actor={id:'A1',hp:100,maxHp:100,strength:100,spirit:70,defense:50,guard:false};
const allies=[actor,{id:'A2',hp:30,maxHp:100,strength:70,spirit:20,defense:50,guard:false}];
const foes=[{id:'B1',hp:90,maxHp:90,strength:70,spirit:50,defense:80,guard:false},
 {id:'B2',hp:60,maxHp:60,strength:70,spirit:50,defense:80,guard:true}];
test('original Soultimate rank costs 100/150/200/250',()=>{
 assert.deepEqual([1,2,3,4].map(soulCapacityForRank),[100,150,200,250]);
 for(const bad of [0,5,1.5,'2',NaN])assert.throws(()=>soulCapacityForRank(bad));
});
test('rank-derived capacity and explicit manual override both work',()=>{
 const g=createSoulSystem({teams:[
 Array.from({length:6},(_,i)=>({id:'A'+i,soultimateRank:i%4+1})),
 Array.from({length:6},(_,i)=>({id:'B'+i,capacity:175,soultimateRank:4}))
 ]});
 assert.deepEqual(g.snapshot().teams[0].slice(0,4).map(x=>x.capacity),[100,150,200,250]);
 assert.ok(g.snapshot().teams[1].every(x=>x.capacity===175));
});
test('special fixture validation rejects unsupported or incomplete effects',()=>{
 const good=validateSpecialSpec({kind:'damage',scope:'front',power:100,damageKind:'attack'});
 assert.equal(good.power,100); assert.equal(Object.isFrozen(good),true);
 for(const bad of [
  null,{kind:'resurrect',scope:'front',power:1},
  {kind:'damage',scope:'front',power:0,damageKind:'attack'},
  {kind:'damage',scope:'front',power:100},
  {kind:'heal',scope:'one',power:100}
 ])assert.throws(()=>validateSpecialSpec(bad));
});
test('source-shaped one-hit damage plans remain pure and respect guard',()=>{
 const before=JSON.stringify(foes);
 const out=planResearchSpecial({spec:{kind:'damage',scope:'front',power:100,damageKind:'attack'},caster:actor,allies,enemies:foes});
 assert.deepEqual(out.map(x=>x.targetId),['B1','B2']);
 assert.equal(out[0].amount,80);
 assert.equal(out[1].amount,40);
 assert.equal(JSON.stringify(foes),before);
});
test('normal single target obeys player pin and does not hit unrelated foes',()=>{
 const out=planResearchSpecial({spec:{kind:'damage',scope:'one',power:100,damageKind:'attack'},caster:actor,allies,enemies:foes,pinnedId:'B2'});
 assert.deepEqual(out.map(x=>x.targetId),['B2']);
});
test('G research multiplier increases move power before defense, not final HP delta',()=>{
 const spec={kind:'damage',scope:'front',power:100,damageKind:'attack'};
 const normal=planResearchSpecial({spec,caster:actor,allies,enemies:foes});
 const g=planResearchSpecial({spec,caster:actor,allies,enemies:foes,powerMultiplier:2});
 assert.ok(g[0].amount>normal[0].amount);
 assert.ok(g[1].amount>=normal[1].amount);
 assert.ok(g.every(x=>x.hpAfter>=0));
});
test('healing caps HP and does not resurrect KO allies',()=>{
 const party=[...allies,{id:'A3',hp:0,maxHp:100,defense:40}];
 const out=planResearchSpecial({spec:{kind:'heal',scope:'front',power:75},caster:actor,allies:party,enemies:foes});
 assert.deepEqual(out.map(x=>x.targetId),['A1','A2']);
 assert.deepEqual(out.map(x=>x.amount),[0,70]);
 assert.ok(out.every(x=>x.hpAfter<=100));
});
test('damage cannot push target below zero',()=>{
 const out=planResearchSpecial({spec:{kind:'damage',scope:'front',power:900,damageKind:'attack'},caster:actor,allies,enemies:foes});
 assert.deepEqual(out.map(x=>x.hpAfter),[0,0]);
 assert.ok(out.every(x=>x.predictedKO));
});
