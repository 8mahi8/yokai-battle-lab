/** Phase 2 deterministic battle research prototype.
 * Combat action selection and damage are modeled from Mt. Wildwood's YW2 pages;
 * original rental stats, weights, heal formula and auto reserve rotation are test fixtures.
 * No online transport, status effects, soul or Soultimate implementation.
 */
import { createBattle } from './phase1.mjs';
import { createInspiritLedger } from './inspirit.mjs';

export const RENTAL_SQUAD = Object.freeze([
  {name:'あかねこ',speed:210,maxHp:225,strength:105,spirit:55,defense:73,attackPower:55,techniquePower:45,technique:'damage',attitude:'grouchy',weights:[70,25,5]},
  {name:'こもれび',speed:170,maxHp:210,strength:55,spirit:125,defense:65,attackPower:40,techniquePower:50,technique:'heal',attitude:'gentle',weights:[30,65,5]},
  {name:'いしもり',speed:105,maxHp:310,strength:92,spirit:45,defense:145,attackPower:45,techniquePower:35,technique:'damage',attitude:'careful',weights:[40,10,50]},
  {name:'すずかぜ',speed:251,maxHp:190,strength:73,spirit:115,defense:55,attackPower:45,techniquePower:65,technique:'damage',attitude:'grouchy',weights:[40,55,5]},
  {name:'ほたる',speed:195,maxHp:220,strength:66,spirit:112,defense:72,attackPower:45,techniquePower:50,technique:'heal',attitude:'gentle',weights:[35,60,5]},
  {name:'くろがね',speed:128,maxHp:305,strength:116,spirit:47,defense:130,attackPower:65,techniquePower:25,technique:'damage',attitude:'grouchy',weights:[70,10,20]}
]);

function seededRandom(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}
function intStat(value, label, min=0) {
  if (!Number.isInteger(value) || value < min || value > 999999) throw new RangeError(label+' must be an integer >= '+min);
  return value;
}
function buildMember(source,side,index) {
  for(const key of ['speed','maxHp','strength','spirit','defense','attackPower','techniquePower']) intStat(source[key],key,key==='speed'||key==='maxHp'?1:0);
  if(!['damage','heal'].includes(source.technique))throw new TypeError('technique must be damage/heal');
  if(!Array.isArray(source.weights)||source.weights.length!==3||source.weights.some(x=>!Number.isInteger(x)||x<0)||source.weights.reduce((a,b)=>a+b,0)===0)throw new TypeError('invalid weights');
  return {id:(side===0?'A':'B')+(index+1),name:source.name||'Unit '+(index+1),side,maxHp:source.maxHp,hp:source.maxHp,speed:source.speed,
    strength:source.strength,spirit:source.spirit,defense:source.defense,attackPower:source.attackPower,techniquePower:source.techniquePower,
    technique:source.technique,attitude:source.attitude??'neutral',weights:[...source.weights],guard:false,knockouts:0};
}
export function hitChance(attacker,target) {
  return Math.floor(Math.max(75,Math.min(98,98+(attacker.speed-target.speed)/5)));
}
/** Simplified 1-hit neutral element damage, excluding extra abilities and stat modifiers. */
export function baseDamage(attacker,target,kind,critical=false) {
  const physical = kind==='attack';
  if(!physical && kind!=='technique')throw new RangeError('invalid offensive move');
  const total=(physical?attacker.attackPower+attacker.strength:attacker.techniquePower+attacker.spirit);
  const amount=physical?(critical?total/1.5-target.defense/10:total/2-target.defense/4)
    :(critical?total/5+total/2.5-target.defense/14:total/10+total/3-target.defense/7);
  return Math.max(1,Math.min(999,Math.floor(amount)));
}
export function createCombat({seed=20261023,teams,autoRotateReserves=true}={}) {
  if(!Number.isInteger(seed))throw new TypeError('seed must be integer');
  const source=teams??[RENTAL_SQUAD,RENTAL_SQUAD];
  if(!Array.isArray(source)||source.length!==2||!source.every(x=>Array.isArray(x)&&x.length===6))throw new TypeError('requires two rosters of six');
  const squads=source.map((team,side)=>team.map((member,i)=>buildMember(member,side,i)));
  const byId=new Map(squads.flat().map(x=>[x.id,x]));
 const statuses=createInspiritLedger([...byId.keys()]);
  const clock=createBattle({seed,teams:squads.map(t=>t.map(m=>({name:m.name,speed:m.speed}))),rotationCooldownMs:0});
  const rng=seededRandom(seed ^ 0xA365E91F);
  const pins=[null,null], events=[];
  let winner=null;
  const front=(side)=>clock.snapshot().teams[side].frontIds.map(id=>byId.get(id));
  const livingFront=(side)=>front(side).filter(x=>x.hp>0);
  function syncCanAct(id){const member=byId.get(id);clock.setCanAct(id,member.hp>0&&!statuses.has(id,'sleep'));}
  /** Experimental injection: not an auto AI Inspirit move; hit/resistance unimplemented. */
  function applyInspirit({id,sign,effect,source=null,duration=null}={}){
    if(winner!==null)throw new Error('battle finished');
    if(!byId.has(id))throw new RangeError('unknown member');
    if(!['sleep','research-marker'].includes(effect))throw new RangeError('effect not modeled');
    if(effect==='sleep'&&sign!=='negative')throw new RangeError('sleep is negative');
    if(effect==='sleep'&&duration!==null)throw new RangeError('sleep owner-turn duration is unsupported');
    const result=statuses.apply({id,sign,effect,source,duration});
    syncCanAct(id);return result;
  }
  function purify(side,id){
    if(winner!==null)throw new Error('battle finished');
    if(![0,1].includes(side))throw new RangeError('invalid side');
    const result=statuses.purify({id,side,benchIds:clock.snapshot().teams[side].benchIds});
    if(result.ok)syncCanAct(id);
    return result;
  }
  function syncPinned(){ for(let side=0;side<2;side++)if(pins[side]&&!livingFront(1-side).some(m=>m.id===pins[side]))pins[side]=null; }
  function rotate(side,direction){
    if(winner!==null)throw new Error('battle finished');
    const result=clock.rotate(side,direction,0);
    if(result.ok)syncPinned();
    return result;
  }
  function pin(side,id=null){
    if(![0,1].includes(side))throw new RangeError('invalid side');
    if(id!==null&&!livingFront(1-side).some(m=>m.id===id))throw new RangeError('target must be living enemy in front');
    pins[side]=id;
  }
  function ensureFront(){
    if(!autoRotateReserves)return;
    for(let side=0;side<2;side++){
      for(let tries=0;tries<6&&!livingFront(side).length&&squads[side].some(m=>m.hp>0);tries++)clock.rotate(side,1,0);
    }
    syncPinned();
  }
  function choice(actor){
    const allies=livingFront(actor.side), enemies=livingFront(1-actor.side);
    const weights=[...actor.weights];
    // Selected YW2 attitude multipliers; priority follows mtwildwood.net/attitudes.php.
    // No Inspirit, Soultimate charge or buff effects in this research fixture.
    if(actor.attitude==='gentle' && actor.technique==='heal'){
      if(allies.every(x=>x.hp===x.maxHp))weights[1]=0;
      else if(allies.every(x=>x.hp/x.maxHp>=0.90))weights[1]*=0.2;
      else if(allies.some(x=>x.hp/x.maxHp<0.25)){weights[0]=0;weights[2]=0;}
      else if(allies.some(x=>x.hp/x.maxHp<0.50))weights[1]*=5;
    }else if(actor.attitude==='careful'){
      if(actor.technique==='heal' && allies.some(x=>x.hp/x.maxHp<0.25))weights[1]*=4;
      else if(actor.hp/actor.maxHp<0.25)weights[2]*=10;
      else if(actor.hp/actor.maxHp<=0.50)weights[2]*=5;
    }else if(actor.attitude==='grouchy'){
      if(actor.technique==='heal' && allies.some(x=>x.hp/x.maxHp<0.25))weights[1]*=3;
      else if(enemies.length && actor.strength>Math.min(...enemies.map(x=>x.defense)))weights[0]*=3;
    }
    if(actor.technique==='heal'&&!allies.some(m=>m.hp<m.maxHp)) weights[1]=0;
    const total=weights.reduce((a,b)=>a+b,0);
    const roll=rng()*total;
    if(roll<weights[0])return 'attack';
    if(roll<weights[0]+weights[1])return 'technique';
    return 'guard';
  }
  function snapshot(){
    return {seed,winner,pins:[...pins],clock:clock.snapshot(),squads:squads.map(t=>t.map(m=>({...m,weights:[...m.weights]}))),events:events.slice(-80).map(e=>({...e})),inspirits:Object.fromEntries([...byId.keys()].map(id=>[id,statuses.list(id)]))};
  }
  function step(){
    if(winner!==null)return {type:'finished',winner};
    ensureFront();
    const pending=clock.snapshot();
    if(![0,1].every(s=>livingFront(s).length))return {type:'awaiting_rotation',fronts:pending.teams.map(t=>t.frontIds)};
    if(!pending.teams.some(team=>team.frontIds.some(id=>byId.get(id).hp>0&&!statuses.has(id,'sleep'))))
      return {type:'awaiting_rotation',reason:'all_front_units_unable_to_act',fronts:pending.teams.map(t=>t.frontIds)};
    const clockEvent=clock.step();
    const actor=byId.get(clockEvent.id);
    // A guard lasts until the next time that actor begins an action.
    actor.guard=false;
    const kind=choice(actor);
    let target=null,amount=0,hit=true,critical=false;
    if(kind==='guard'){
      actor.guard=true;
    }else if(kind==='technique'&&actor.technique==='heal'){
      const hurt=livingFront(actor.side).filter(x=>x.hp<x.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
      target=hurt[0]??null;
      if(!target)throw new Error('healing selected without injured ally');
      // PROVISIONAL healing magnitude. YW2 healing formula is not confirmed here.
      const heal=Math.max(1,Math.floor((actor.techniquePower+actor.spirit)/3));
      amount=Math.min(target.maxHp-target.hp,heal); target.hp+=amount;
    }else{
      const opponents=livingFront(1-actor.side);
      target=opponents.find(m=>m.id===pins[actor.side])??opponents[Math.floor(rng()*opponents.length)];
      hit=rng()*100<hitChance(actor,target);
      if(hit){
        // YW2 base unmodified critical chance: approximately 1 in 99.
        critical=rng()*99<1;
        let damage=baseDamage(actor,target,kind,critical);
        if(target.guard) damage=Math.max(1,Math.floor(damage*.5));
        else {const range=Math.floor(damage/10+1); damage=Math.max(1,Math.min(999,damage+Math.floor(rng()*(2*range+1))-range));}
        amount=Math.min(target.hp,damage);
        target.hp-=amount;
        if(target.hp===0){syncCanAct(target.id);actor.knockouts++;syncPinned();}
      }
    }
    if(squads.some(team=>team.every(member=>member.hp===0)))winner=squads[0].every(m=>m.hp===0)?1:0;
    const action={type:'action',turn:clockEvent.action,elapsed:clockEvent.elapsed,pointsElapsed:clockEvent.pointsElapsed,
      actor:actor.id,kind:kind==='technique'&&actor.technique==='heal'?'heal':kind,target:target?.id??null,
      hit,critical,amount,targetHp:target?.hp??null,guard:target?.guard??false,winner};
    events.push(action);
    const expired=statuses.tick({actorId:actor.id});
    for(const item of expired)syncCanAct(item.id);
    return {...action};
  }
  function simulate(count=1){
    if(!Number.isInteger(count)||count<0||count>10000)throw new RangeError('count 0..10000');
    const result=[];
    for(let i=0;i<count;i++){
      const evt=step();result.push(evt);
      if(evt.type!=='action'||winner!==null)break;
    }
    return result;
  }
  return {snapshot,step,simulate,rotate,pin,applyInspirit,purify,preview:clock.predict};
}
