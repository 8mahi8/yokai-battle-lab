/**
 * YW2 accuracy and critical roll research helpers; never draw RNG internally.
 * https://mtwildwood.net/hit-chance.php
 * https://mtwildwood.net/critical-hits.php
 * Special skill modifiers, targeting immunity and true move tables are TODO.
 */
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function percent(x,name){
 if(!Number.isFinite(x))throw new RangeError(name+' must be finite');
 return x;
}
export function yw2HitProbability({
 kind,attackerSpeed,targetSpeed,moveAccuracy=1
}={}){
 if(kind!=='attack'&&kind!=='technique')throw new RangeError('invalid move kind');
 percent(attackerSpeed,'attackerSpeed');percent(targetSpeed,'targetSpeed');
 if(attackerSpeed<0||targetSpeed<0||attackerSpeed>9999||targetSpeed>9999)
  throw new RangeError('invalid speed');
 if(!Number.isFinite(moveAccuracy)||moveAccuracy<.5||moveAccuracy>4)
  throw new RangeError('attack move accuracy must be .5..4');
 // Base chance is clamped before applying a physical attack's move accuracy.
 const base=clamp(98+(attackerSpeed-targetSpeed)/5,75,98);
 const value=kind==='attack'?clamp(base*moveAccuracy,0,100):base;
 return {probability:value,base,moveAccuracy:kind==='attack'?moveAccuracy:1,
   kind,model:'yw2-wiki-research'};
}
export function yw2CriticalProbability({loafing=false,moveCritBonus=0,criticalImmune=false}={}){
 if(typeof loafing!=='boolean'||typeof criticalImmune!=='boolean')
  throw new TypeError('critical flags must be boolean');
 if(!Number.isInteger(moveCritBonus)||moveCritBonus<0||moveCritBonus>98)
  throw new RangeError('moveCritBonus 0..98');
 const units=criticalImmune?0:Math.min(99,1+moveCritBonus+(loafing?6:0));
 return {units,denominator:99,probability:100*units/99,
   loafingBonus:loafing?6:0,criticalImmune,model:'yw2-wiki-research'};
}
export function rollPercent(probability,unitRoll){
 percent(probability,'probability');
 if(probability<0||probability>100)throw new RangeError('probability outside 0..100');
 if(!Number.isFinite(unitRoll)||unitRoll<0||unitRoll>=1)
  throw new RangeError('unitRoll must be a deterministic draw 0..<1');
 return unitRoll*100<probability;
}
