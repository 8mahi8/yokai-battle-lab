/**
 * One-hit YW2 damage & stat-stage RESEARCH calculator.
 *
 * Formula: https://mtwildwood.net/damage.php?g=yw2
 * Stages: https://mtwildwood.net/stat-changes.php?g=yw2
 *
 * The exact multi-hit crit/accuracy rolls and per-move affinity parameters
 * require real-game cross-checks. This is a pure, *one hit* model: it does not
 * apply HP, choose targets, or generate random rolls itself.
 */
export const ELEMENTS=Object.freeze(['neutral','fire','water','lightning','earth','ice','wind']);
export const STAT_STAGE_MULTIPLIERS=Object.freeze([
  .1,.15,.2,.3,.4,.55,.7,.85,1,1.1,1.2,1.3,1.4,1.5,1.6,1.8,2
]);
// Source YW2 stages +7 and +8 are ×1.8 and ×2; lower negatives differ from YW1.
function validNumber(n,name,{min=0,max=999999}={}){
 if(!Number.isFinite(n)||n<min||n>max)throw new RangeError(name+' out of range');
 return n;
}
export function statStageMultiplier(stage){
 if(!Number.isInteger(stage)||stage< -8||stage>8)
  throw new RangeError('stat stage must be -8..8');
 return STAT_STAGE_MULTIPLIERS[stage+8];
}
export function deriveStatStage(effects,stat){
 if(!Array.isArray(effects))throw new TypeError('status effects must be array');
 if(!['strength','spirit','defense'].includes(stat))
  throw new RangeError('unknown stat stage');
 const up=stat+'-up',down=stat+'-down';
 let total=0;
 for(const status of effects){
  if(status?.effect!==up&&status?.effect!==down)continue;
  if((status.effect===up&&status.sign!=='positive')||
     (status.effect===down&&status.sign!=='negative'))
   throw new RangeError('stage status sign mismatch');
  const level=status.level??1;
  if(!Number.isInteger(level)||level<1||level>4)
   throw new RangeError('stage level must be 1..4');
  total+=(status.effect===up?1:-1)*level;
 }
 return Math.max(-8,Math.min(8,total));
}
export function deriveStrengthStage(effects){
 if(!Array.isArray(effects))throw new TypeError('status effects must be array');
 let total=0;
 for(const status of effects){
  if(status?.effect!=='strength-up'||status.sign!=='positive')continue;
  const level=status.level??1;
  if(!Number.isInteger(level)||level<1||level>4)
   throw new RangeError('Inspirit strength level must be 1..4');
  total+=level;
 }
 return Math.min(8,total);
}
export function calculateOneHit({
 kind,power,strength=0,spirit=0,defense,criticalDefense=defense,
 hits=1,critical=false,elementMultiplier=1,statStage=0,defenseStage=0,
 guarded=false,guardBreak=false,guardBoost=false
}={}){
 if(kind!=='attack'&&kind!=='technique')throw new RangeError('attack or technique required');
 for(const [name,value] of Object.entries({power,strength,spirit,defense,criticalDefense}))
  validNumber(value,name);
 if(!Number.isInteger(hits)||hits<1||hits>20)throw new RangeError('hits must be 1..20');
 validNumber(elementMultiplier,'elementMultiplier',{min:0.1,max:3});
 if(typeof critical!=='boolean'||typeof guarded!=='boolean'||typeof guardBreak!=='boolean'||typeof guardBoost!=='boolean')
  throw new TypeError('critical / guarded / guardBreak / guardBoost must be booleans');
 const multiplier=statStageMultiplier(statStage);
 const effectiveStat=(kind==='attack'?strength:spirit)*multiplier;
 // Each hit gets the full per-hit move Power and only 1/Hits of the
 // attacker's stat.  DEF is subtracted IN FULL for EACH hit, not divided.
 // E.g. 3-hit Attack: (Power + STR/3)/2 - DEF/4.
 // See individual original YW2 move pages (Firewig, Lava Lord).
 const x=power+effectiveStat/hits;
 const def=(critical?criticalDefense:defense)*statStageMultiplier(defenseStage);
 let raw=kind==='attack'
  ?(critical?x/1.5-def/10:x/2-def/4)
  :(critical?x/5+x/2.5-def/14:x/10+x/3-def/7)*elementMultiplier;
 // YW2: normal guard takes x0.5, boosted guard takes x0.25.
 // Guard Break only pierces physical attacks. No arbitrary guard buff
 // multipliers are invented here (Jar Guard is a DIFFERENT mechanic).
 // https://mtwildwood.net/guarding.php?g=yw2
 const ignoreGuard=guardBreak&&kind==='attack';
 const guardFactor=guarded?(ignoreGuard?1:(guardBoost?.25:.5)):1;
 raw*=guardFactor;
 const amount=Math.max(1,Math.min(999,Math.floor(raw)));
 return {amount,kind,hits,critical,guarded,
  guardApplied:guarded&&!ignoreGuard,guardIgnored:guarded&&ignoreGuard,
  guardFactor,
  elementMultiplier:kind==='technique'?elementMultiplier:1,
  statStage,statMultiplier:multiplier,
  defenseStage,defenseMultiplier:statStageMultiplier(defenseStage),
  confidence:'yw2-wiki-formula-research'};
}
export function validateElementResistances(input){
 if(input===undefined)return {};
 if(input===null||typeof input!=='object'||Array.isArray(input))
  throw new TypeError('resistances must be a map of elemental multipliers');
 const out={};
 for(const [key,value] of Object.entries(input)){
  if(!ELEMENTS.includes(key)||key==='neutral')
   throw new RangeError('unknown elemental resistance key '+key);
  out[key]=validNumber(value,'resistance '+key,{min:0.1,max:3});
 }
 return out;
}
