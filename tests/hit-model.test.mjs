import test from 'node:test';
import assert from 'node:assert/strict';
import {yw2HitProbability,yw2CriticalProbability,rollPercent} from '../engine/hit-model.mjs';

test('the YW2 hit formula is fractional and speed-clamped BEFORE attack accuracy',()=>{
 assert.equal(yw2HitProbability({kind:'attack',attackerSpeed:100,targetSpeed:100}).probability,98);
 assert.equal(yw2HitProbability({kind:'technique',attackerSpeed:200,targetSpeed:201}).probability,97.8);
 assert.equal(yw2HitProbability({kind:'technique',attackerSpeed:10,targetSpeed:950}).probability,75);
 assert.equal(yw2HitProbability({kind:'technique',attackerSpeed:950,targetSpeed:10}).probability,98);
});
test('physical move accuracy modifies hit probability; technique ignores that value',()=>{
 const opts={kind:'attack',attackerSpeed:190,targetSpeed:190};
 assert.equal(yw2HitProbability({...opts,moveAccuracy:.5}).probability,49);
 assert.equal(yw2HitProbability({...opts,moveAccuracy:4}).probability,100);
 assert.equal(yw2HitProbability({...opts,kind:'technique',moveAccuracy:.5}).probability,98);
});
test('YW2 critical hits are 1-in-99 normally and 7-in-99 against loafing targets',()=>{
 assert.deepEqual(yw2CriticalProbability(),{
  units:1,denominator:99,probability:100/99,
  loafingBonus:0,criticalImmune:false,model:'yw2-wiki-research'
 });
 assert.equal(yw2CriticalProbability({loafing:true}).units,7);
 assert.equal(yw2CriticalProbability({loafing:true,moveCritBonus:3}).units,10);
 assert.equal(yw2CriticalProbability({loafing:true,criticalImmune:true}).units,0);
 assert.equal(yw2CriticalProbability({loafing:true,moveCritBonus:98}).units,99);
});
test('deterministic RNG boundary checks do not consume hidden randomness',()=>{
 assert.equal(rollPercent(0,0),false);
 assert.equal(rollPercent(100,.99999),true);
 assert.equal(rollPercent(50,.49),true);
 assert.equal(rollPercent(50,.5),false);
 assert.equal(rollPercent(97.8,.9779),true);
 assert.equal(rollPercent(97.8,.978),false);
});
test('rejects unsupported move types, inaccurate inputs and invalid RNG',()=>{
 for(const opt of [
  {kind:'guard',attackerSpeed:100,targetSpeed:100},
  {kind:'attack',attackerSpeed:-1,targetSpeed:100},
  {kind:'attack',attackerSpeed:100,targetSpeed:NaN},
  {kind:'attack',attackerSpeed:100,targetSpeed:100,moveAccuracy:0},
  {kind:'attack',attackerSpeed:100,targetSpeed:100,moveAccuracy:4.1}
 ])assert.throws(()=>yw2HitProbability(opt));
 for(const bad of [-1,99,1.2,'6'])assert.throws(()=>yw2CriticalProbability({moveCritBonus:bad}));
 for(const bad of [-.1,1,NaN])assert.throws(()=>rollPercent(90,bad));
});
