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
 // YW2 rolls an INTEGER 0..99, against an INTEGER threshold.
 // The speed-based chance is truncated first, AFTER clamping to 75..98.
 // Physical move accuracy then multiplies that integer, and its result is
 // truncated again. Fractional probabilities must not leak into combat.
 // Source: https://mtwildwood.net/hit-chance.php (85 vs 151 SPD => 84,
 // not 84.8; 84 × 0.4 => 33, not 33.6). Technique ignores accuracy.
 const base=Math.floor(clamp(98+(attackerSpeed-targetSpeed)/5,75,98));
 const value=kind==='attack'?
  Math.floor(clamp(base*moveAccuracy,0,100)):base;
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
