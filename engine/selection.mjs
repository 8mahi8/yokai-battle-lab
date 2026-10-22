/**
 * Research-only four-way auto-action selection. General order and three partial
 * YW2 attitudes follow https://www.mtwildwood.net/attitudes.php.
 * Rental weights and excluded skill/soultimate conditions are NOT original values.
 * Weight indices: Attack, Technique, Inspirit, Guard.
 */
export const ACTION_KINDS = Object.freeze(['attack','technique','inspirit','guard']);
const below = (members,limit) => members.some(m=>m.hp/m.maxHp<limit);
const allAbove = (members,limit) => members.every(m=>m.hp/m.maxHp>=limit);

export function actionWeights(actor,{allies,enemies,enemyPin=null,negativeCounts={},positiveCounts={}}={}){
 if(!Array.isArray(actor.weights)||actor.weights.length!==4||actor.weights.some(n=>!Number.isFinite(n)||n<0))
  throw new TypeError('expected four nonnegative action weights');
 if(!Array.isArray(allies)||!allies.length||!Array.isArray(enemies)||!enemies.length)
  throw new TypeError('living allies and enemies required');
 const w=[...actor.weights];
 const healer=actor.technique==='heal';
 // Each attitude's FIRST applicable rule wins. Rules requiring Soul charge,
 // element matchup, or stat down are deliberately not guessed here.
 if(actor.attitude==='gentle'){
  if(allies.every(x=>x.hp===x.maxHp))w[1]=0;
  else if(allAbove(allies,.90))w[1]*=.2;
  else if(below(allies,.25)){w[0]=0;w[2]=0;w[3]=0;}
  else if(below(allies,.5))w[1]*=5;
 } else if(actor.attitude==='careful'){
  if(healer&&below(allies,.25))w[1]*=4;
  else if(actor.hp/actor.maxHp>=.25&&actor.hp/actor.maxHp<=.5)w[3]*=5;
  else if(actor.hp/actor.maxHp<.25)w[3]*=10;
 } else if(actor.attitude==='grouchy'){
  if(healer&&below(allies,.25))w[1]*=3;
  else if(actor.strength>Math.min(...enemies.map(x=>x.defense)))w[0]*=3;
 }
 // Partial source-backed saturation logic, still pending full rule priority.
 const relevant=enemyPin?enemies.filter(e=>e.id===enemyPin):enemies;
 const haveNegative = relevant.length && relevant.every(e=>(negativeCounts[e.id]??0)>=1);
 const havePositive = allies.every(e=>(positiveCounts[e.id]??0)>=1);
 if(actor.inspirit==='sleep' && haveNegative)w[2]*=.3;
 if(actor.inspirit==='strength-up' && havePositive)w[2]*=.3;
 // Healing technique is not permitted when every alive ally is full.
 if(healer&&allies.every(x=>x.hp===x.maxHp))w[1]=0;
 const eligible=actor.inspirit==='sleep'
  ? enemies.some(m=>(negativeCounts[m.id]??0)===0)
  :actor.inspirit==='strength-up' ? allies.some(m=>(positiveCounts[m.id]??0)===0):false;
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
