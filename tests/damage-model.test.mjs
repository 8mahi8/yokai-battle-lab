import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateOneHit,statStageMultiplier,deriveStrengthStage,
 validateElementResistances,STAT_STAGE_MULTIPLIERS} from '../engine/damage-model.mjs';

const attack={kind:'attack',power:50,strength:100,defense:80};
const tech={kind:'technique',power:50,spirit:100,defense:80};
test('source-derived neutral attack and technique base cases',()=>{
 assert.equal(calculateOneHit(attack).amount,55);
 assert.equal(calculateOneHit(tech).amount,
  Math.floor(150/10+150/3-80/7));
 assert.equal(calculateOneHit({...attack,critical:true}).amount,
  Math.floor(150/1.5-80/10));
 assert.equal(calculateOneHit({...tech,critical:true}).amount,
  Math.floor(150/5+150/2.5-80/14));
});
test('element scales technique damage INCLUDING the defense subtraction',()=>{
 const neutral=calculateOneHit(tech),weak=calculateOneHit({...tech,elementMultiplier:1.5});
 const resist=calculateOneHit({...tech,elementMultiplier:.5});
 assert.ok(weak.amount>neutral.amount&&resist.amount<neutral.amount);
 assert.equal(weak.amount,Math.floor((150/10+150/3-80/7)*1.5));
 assert.equal(calculateOneHit({...attack,elementMultiplier:2}).amount,
   calculateOneHit(attack).amount,'physical base attack is neutral in this model');
});
test('multi-hit power is applied separately per hit; divide stat only, subtract full Defense on every hit',()=>{
 const triple=calculateOneHit({...attack,power:30,hits:3});
 assert.equal(triple.amount,Math.floor((30+100/3)/2-80/4));
 const tripleTech=calculateOneHit({...tech,power:35,hits:3,elementMultiplier:1.25});
 assert.equal(tripleTech.amount,
  Math.floor(((35+100/3)/10+(35+100/3)/3-80/7)*1.25));
});
test('guard half damage and guard-breaking applies to physical move only',()=>{
 assert.equal(calculateOneHit({...attack,guarded:true}).amount,27);
 assert.equal(calculateOneHit({...attack,guarded:true,guardBreak:true}).amount,55);
 assert.equal(calculateOneHit({...tech,guarded:true,guardBreak:true}).amount,
  calculateOneHit({...tech,guarded:true}).amount);
 assert.equal(calculateOneHit({...tech,guarded:true,guardBreak:true}).guardIgnored,false);
});
test('critical defense overrides normal defense only on critical hit',()=>{
 assert.equal(calculateOneHit({...attack,critical:true,criticalDefense:150}).amount,85);
 assert.equal(calculateOneHit({...attack,criticalDefense:150}).amount,55);
});
test('YW2 stage steps have nonlinear penalties and cap ±8',()=>{
 assert.equal(STAT_STAGE_MULTIPLIERS.length,17);
 assert.equal(statStageMultiplier(-8),.1);
 assert.equal(statStageMultiplier(-1),.85);
 assert.equal(statStageMultiplier(0),1);
 assert.equal(statStageMultiplier(1),1.1);
 assert.equal(statStageMultiplier(4),1.4);
 assert.equal(statStageMultiplier(7),1.8);
 assert.equal(statStageMultiplier(8),2);
 assert.throws(()=>statStageMultiplier(9));
 assert.throws(()=>statStageMultiplier(1.5));
});
test('positive Strength Inspirit stages add and cap, negative statuses ignored',()=>{
 assert.equal(deriveStrengthStage([]),0);
 assert.equal(deriveStrengthStage([{sign:'positive',effect:'strength-up',level:2}]),2);
 assert.equal(deriveStrengthStage([
  {sign:'positive',effect:'strength-up',level:4},
  {sign:'positive',effect:'strength-up',level:4},
  {sign:'positive',effect:'strength-up',level:2},
  {sign:'negative',effect:'strength-up',level:4}
 ]),8);
 assert.throws(()=>deriveStrengthStage([{sign:'positive',effect:'strength-up',level:9}]));
});
test('validates optional elemental affinities defensively',()=>{
 assert.deepEqual(validateElementResistances({fire:1.5,water:.7}),{fire:1.5,water:.7});
 assert.deepEqual(validateElementResistances(),{});
 for(const bad of [null,[],{strange:1},{neutral:1},{fire:NaN},{ice:0},{wind:3.1}])
  assert.throws(()=>validateElementResistances(bad));
});
test('invalid power/defense/mode/critical and hit count cannot yield NaN damage',()=>{
 const variations=[
  {...attack,power:-1},{...attack,defense:NaN},
  {...attack,kind:'healing'},{...attack,critical:'yes'},
  {...attack,hits:0},{...attack,hits:21},
  {...tech,elementMultiplier:Infinity},{...tech,statStage:9}
 ];
 for(const v of variations)assert.throws(()=>calculateOneHit(v));
});
test('huge defense clamps to 1, huge power clamps to 999',()=>{
 assert.equal(calculateOneHit({...attack,defense:100000}).amount,1);
 assert.equal(calculateOneHit({...attack,power:999999,strength:999999,defense:0}).amount,999);
});
