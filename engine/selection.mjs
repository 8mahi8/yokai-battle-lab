/**
 * Research-only four-way auto-action selection. General order and three partial
 * YW2 attitudes follow https://www.mtwildwood.net/attitudes.php.
 * Rental weights and excluded skill/soultimate conditions are NOT original values.
 * Weight indices: Attack, Technique, Inspirit, Guard.
 */
import {INSPIRIT_EFFECT_MASTER} from '../content/inspirit-effect-master.mjs';
export const ACTION_KINDS = Object.freeze(['attack','technique','inspirit','guard']);
const below = (members,limit) => members.some(m=>m.hp/m.maxHp<limit);
const allAbove = (members,limit) => members.every(m=>m.hp/m.maxHp>=limit);
const NEGATIVE_INSPIRITS=new Set(INSPIRIT_EFFECT_MASTER
 .filter(effect=>effect.sign==='negative').map(effect=>effect.id));
const POSITIVE_INSPIRITS=new Set(INSPIRIT_EFFECT_MASTER
 .filter(effect=>effect.sign==='positive').map(effect=>effect.id));

/**
 * YW2 Grouchy rule priority (Mt. Wildwood YW2 section), research ONLY.
 * Apply the FIRST matched rule; zero weights remain zero. Attack-damage-down
 * is a distinct original status which this engine does not yet produce:
 * the caller may supply it explicitly, never conflate it with STR-down.
 * Pending enemy Soultimates and positive/negative Inspirit provenance
 * come from existing canonical battle state, not new mutable AI state.
 */
export function sourceYw2GrouchyWeights(actor,{
 allies,enemies,enemyPin=null,negativeCounts={},positiveCounts={},
 enemyChargingIds=[],attackDamageDownIds=[],
 alliesInspiritedByFoe=[],enemiesInspiritedByAlly=[]
}={}){
 if(!actor||!Array.isArray(actor.weights)||actor.weights.length!==4||
    actor.weights.some(x=>!Number.isFinite(x)||x<0)||
    !Array.isArray(allies)||!allies.length||
    !Array.isArray(enemies)||!enemies.length||
    !Array.isArray(enemyChargingIds)||!Array.isArray(attackDamageDownIds)||
    !Array.isArray(alliesInspiritedByFoe)||!Array.isArray(enemiesInspiritedByAlly))
  throw new TypeError('valid YW2 Grouchy battle context required');
 const relevant=enemyPin?
  enemies.filter(x=>x.id===enemyPin):enemies;
 const targets=relevant.length?relevant:enemies;
 const negative=NEGATIVE_INSPIRITS.has(actor.inspirit);
 const positive=POSITIVE_INSPIRITS.has(actor.inspirit);
 const noStatus=(key,id)=>(key[id]??0);
 const allTargetsAtLeast=n=>targets.every(x=>noStatus(negativeCounts,x.id)>=n);
 const allAlliesAtLeast=n=>allies.every(x=>noStatus(positiveCounts,x.id)>=n);
 const allAlliesEnemyInspired=allies.every(x=>alliesInspiritedByFoe.includes(x.id));
 const allEnemiesFriendlyInspired=targets.every(x=>enemiesInspiritedByAlly.includes(x.id));
 // Numbered in source precedence order. Rule 2 needs explicit attack damage-
 // down evidence; never infer from the unrelated STR-down ledger status.
 let rule=null,multiplier=[1,1,1,1];
 if(actor.technique==='heal'&&allies.some(x=>x.hp/x.maxHp<.25))
  {rule=1;multiplier=[1,3,1,1];}
 else if(targets.some(x=>attackDamageDownIds.includes(x.id)))
  {rule=2;multiplier=[5,1,1,0];}
 else if(targets.some(x=>enemyChargingIds.includes(x.id)))
  {rule=3;multiplier=[1,1,1,2];}
 else if(actor.strength>Math.min(...targets.map(x=>x.defense)))
  {rule=4;multiplier=[3,1,1,1];}
 else if(negative&&allTargetsAtLeast(3))
  {rule=5;multiplier=[1,1,0,1];}
 else if(positive&&allAlliesEnemyInspired)
  {rule=6;multiplier=[1,1,.2,1];}
 else if(negative&&allEnemiesFriendlyInspired)
  {rule=7;multiplier=[1,1,.3,1];}
 else if(positive&&allAlliesAtLeast(3))
  {rule=8;multiplier=[1,1,0,1];}
 else if(positive&&allAlliesAtLeast(2))
  {rule=9;multiplier=[1,1,.2,1];}
 else if(positive&&allAlliesAtLeast(1))
  {rule=10;multiplier=[1,1,.3,1];}
 return Object.freeze({rule,weights:Object.freeze(actor.weights.map((x,i)=>x*multiplier[i]))});
}

export function actionWeights(actor,{allies,enemies,enemyPin=null,negativeCounts={},positiveCounts={},
 sourceYw2Grouchy=false,enemyChargingIds=[],attackDamageDownIds=[],
 alliesInspiritedByFoe=[],enemiesInspiritedByAlly=[]}={}){
 if(!Array.isArray(actor.weights)||actor.weights.length!==4||actor.weights.some(n=>!Number.isFinite(n)||n<0))
  throw new TypeError('expected four nonnegative action weights');
 if(!Array.isArray(allies)||!allies.length||!Array.isArray(enemies)||!enemies.length)
  throw new TypeError('living allies and enemies required');
 const w=[...actor.weights];
 const healer=actor.technique==='heal';
 if(sourceYw2Grouchy&&actor.attitude==='grouchy'){
  const source=sourceYw2GrouchyWeights(actor,{
   allies,enemies,enemyPin,negativeCounts,positiveCounts,
   enemyChargingIds,attackDamageDownIds,alliesInspiritedByFoe,
   enemiesInspiritedByAlly
  });
  w.splice(0,4,...source.weights);
  // No other playtest attitude branch may override source precedence.
  // Still apply common existing action eligibility below.
  if(healer&&allies.every(x=>x.hp===x.maxHp))w[1]=0;
  const canInspirit=NEGATIVE_INSPIRITS.has(actor.inspirit)
   ? enemies.some(m=>(negativeCounts[m.id]??0)===0)
   :POSITIVE_INSPIRITS.has(actor.inspirit)
    ? allies.some(m=>(positiveCounts[m.id]??0)===0):false;
  if(!canInspirit)w[2]=0;
  if(w.every(x=>x===0))w[0]=1;
  return w;
 }
 let attitudeRuleApplied=false;
 // Each attitude's FIRST applicable rule wins. Rules requiring Soul charge,
 // element matchup, or stat down are deliberately not guessed here.
 if(actor.attitude==='gentle'){
  if(allies.every(x=>x.hp===x.maxHp)){w[1]=0;attitudeRuleApplied=true;}
  else if(allAbove(allies,.90)){w[1]*=.2;attitudeRuleApplied=true;}
  else if(below(allies,.25)){w[0]=0;w[2]=0;w[3]=0;attitudeRuleApplied=true;}
  else if(below(allies,.5)){w[1]*=5;attitudeRuleApplied=true;}
 } else if(actor.attitude==='careful'){
  if(healer&&below(allies,.25)){w[1]*=4;attitudeRuleApplied=true;}
  else if(actor.hp/actor.maxHp>=.25&&actor.hp/actor.maxHp<=.5){w[3]*=5;attitudeRuleApplied=true;}
  else if(actor.hp/actor.maxHp<.25){w[3]*=10;attitudeRuleApplied=true;}
 } else if(actor.attitude==='brainy'){
  // YW2 Zunouteki: offensive technique priority; multiplier is provisional.
  if(actor.technique==='damage'){w[1]*=4;attitudeRuleApplied=true;}
 } else if(actor.attitude==='cruel'){
  // YW2 Hidou: negative Inspirit priority; eligibility filtered below.
  if(NEGATIVE_INSPIRITS.has(actor.inspirit)){w[2]*=4;attitudeRuleApplied=true;}
 } else if(actor.attitude==='grouchy'){
  if(healer&&below(allies,.25)){w[1]*=3;attitudeRuleApplied=true;}
  else if(actor.strength>Math.min(...enemies.map(x=>x.defense))){w[0]*=3;attitudeRuleApplied=true;}
 }
 // Partial source-backed saturation logic, still pending full rule priority.
 const relevant=enemyPin?enemies.filter(e=>e.id===enemyPin):enemies;
 const haveNegative = relevant.length && relevant.every(e=>(negativeCounts[e.id]??0)>=1);
 const havePositive = allies.every(e=>(positiveCounts[e.id]??0)>=1);
 if(!attitudeRuleApplied && NEGATIVE_INSPIRITS.has(actor.inspirit) && haveNegative)w[2]*=.3;
 if(!attitudeRuleApplied && POSITIVE_INSPIRITS.has(actor.inspirit) && havePositive)w[2]*=.3;
 // Healing technique is not permitted when every alive ally is full.
 if(healer&&allies.every(x=>x.hp===x.maxHp))w[1]=0;
 const eligible=NEGATIVE_INSPIRITS.has(actor.inspirit)
  ? enemies.some(m=>(negativeCounts[m.id]??0)===0)
  :POSITIVE_INSPIRITS.has(actor.inspirit)
    ? allies.some(m=>(positiveCounts[m.id]??0)===0):false;
 if(!eligible)w[2]=0;
 if(w.every(x=>x===0))w[0]=1;
 return w;
}

export function pickAction(weights,random){
 if(!Array.isArray(weights)||weights.length!==4||weights.some(w=>!Number.isFinite(w)||w<0))
  throw new TypeError('four nonnegative weights required');
 const total=weights.reduce((a,b)=>a+b,0);
 if(total<=0)throw new RangeError('all weights zero');
 const roll=random()*total;
 let upto=0;
 for(let i=0;i<weights.length;i++){
  upto+=weights[i];
  if(roll<upto)return ACTION_KINDS[i];
 }
 return ACTION_KINDS[weights.length-1];
}
