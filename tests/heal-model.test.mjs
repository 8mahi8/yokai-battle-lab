import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHeal} from '../engine/heal-model.mjs';
const args={power:50,spirit:100,targetHp:70,maxHp:200};
test('unchanged provisional base healing remains 1/3 of power plus spirit',()=>{
 const out=calculateHeal(args);
 assert.equal(out.base,50);
 assert.equal(out.amount,50);
 assert.equal(out.hpAfter,120);
 assert.equal(out.varianceAmount,0);
 assert.equal(out.model,'unverified-base-healing-fixture');
});
test('healing result cannot exceed missing HP and cannot heal a full ally',()=>{
 assert.equal(calculateHeal({...args,targetHp:198}).amount,2);
 assert.equal(calculateHeal({...args,targetHp:200}).amount,0);
 assert.equal(calculateHeal({...args,targetHp:0,maxHp:20}).amount,20);
});
test('documented approximate healing variance can be tested deterministically',()=>{
 const min=calculateHeal({...args,varianceRoll:0});
 const mid=calculateHeal({...args,varianceRoll:.5});
 const max=calculateHeal({...args,varianceRoll:.999});
 assert.ok(min.amount<mid.amount);
 assert.ok(max.amount>mid.amount);
 assert.equal(mid.amount,50);
 assert.equal(max.amount,56);
 assert.equal(min.amount,44);
});
test('Spirit down changes healing strength while Spirit up increases it',()=>{
 const neutral=calculateHeal(args);
 const weakened=calculateHeal({...args,spiritStage:-2});
 const buffed=calculateHeal({...args,spiritStage:2});
 assert.ok(weakened.amount<neutral.amount);
 assert.ok(buffed.amount>neutral.amount);
 assert.equal(weakened.spiritMultiplier,.7);
 assert.equal(buffed.spiritMultiplier,1.2);
});
test('invalid inputs and stat ranges cannot corrupt HP or produce random NaN',()=>{
 for(const value of [
  {...args,power:-1},{...args,spirit:NaN},{...args,maxHp:0},
  {...args,targetHp:-1},{...args,targetHp:201},
  {...args,varianceRoll:1},{...args,varianceRoll:-.1},
  {...args,baseScale:0},{...args,baseScale:4},
  {...args,spiritStage:9}
 ])assert.throws(()=>calculateHeal(value));
});
