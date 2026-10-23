/** Phase 2 deterministic battle research prototype.
 * Combat action selection and damage are modeled from Mt. Wildwood's YW2 pages;
 * original rental stats, weights, heal formula and auto reserve rotation are test fixtures.
 * No online transport, status effects, soul or Soultimate implementation.
 */
import { createBattle } from './phase1.mjs';
import { createInspiritLedger } from './inspirit.mjs';
import { actionWeights, pickAction } from './selection.mjs';
import { createSoulSystem, chargeInterruptChance } from './soul.mjs';
import { chooseChargeKind, createChargeTrial } from './charge-input.mjs';
import { soulCapacityForRank } from './soul.mjs';
import { validateSpecialSpec, planResearchSpecial } from './special-effects.mjs';

export const RENTAL_SQUAD = Object.freeze([
  {name:'あかねこ',speed:210,maxHp:225,strength:105,spirit:55,defense:73,attackPower:55,techniquePower:45,technique:'damage',attitude:'grouchy',inspirit:'sleep',weights:[60,25,10,5]},
  {name:'こもれび',speed:170,maxHp:210,strength:55,spirit:125,defense:65,attackPower:40,techniquePower:50,technique:'heal',attitude:'gentle',inspirit:'strength-up',weights:[25,55,15,5]},
  {name:'いしもり',speed:105,maxHp:310,strength:92,spirit:45,defense:145,attackPower:45,techniquePower:35,technique:'damage',attitude:'careful',inspirit:'strength-up',weights:[35,10,15,40]},
  {name:'すずかぜ',speed:251,maxHp:190,strength:73,spirit:115,defense:55,attackPower:45,techniquePower:65,technique:'damage',attitude:'grouchy',inspirit:'sleep',weights:[35,50,10,5]},
  {name:'ほたる',speed:195,maxHp:220,strength:66,spirit:112,defense:72,attackPower:45,techniquePower:50,technique:'heal',attitude:'gentle',inspirit:'strength-up',weights:[30,50,15,5]},
  {name:'くろがね',speed:128,maxHp:305,strength:116,spirit:47,defense:130,attackPower:65,techniquePower:25,technique:'damage',attitude:'grouchy',inspirit:'sleep',weights:[60,10,10,20]}
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
  if(source.soulCapacity!==undefined)intStat(source.soulCapacity,'soulCapacity',1);
  if(source.soultimateRank!==undefined)soulCapacityForRank(source.soultimateRank);
  if(source.inspiritResistance!==undefined){intStat(source.inspiritResistance,'inspiritResistance');if(source.inspiritResistance>100)throw new RangeError('resistance > 100');}
 if(!['sleep','strength-up'].includes(source.inspirit))throw new TypeError('unsupported Inspirit');
 if(source.loafChance!==undefined){
    intStat(source.loafChance,'loafChance');
    if(source.loafChance>100)throw new RangeError('loafChance > 100');
  }
  if(!['damage','heal'].includes(source.technique))throw new TypeError('technique must be damage/heal');
  if(!Array.isArray(source.weights)||source.weights.length!==4||source.weights.some(x=>!Number.isInteger(x)||x<0)||source.weights.reduce((a,b)=>a+b,0)!==100)throw new TypeError('invalid weights');
  return {id:(side===0?'A':'B')+(index+1),name:source.name||'Unit '+(index+1),side,maxHp:source.maxHp,hp:source.maxHp,speed:source.speed,
    strength:source.strength,spirit:source.spirit,defense:source.defense,attackPower:source.attackPower,techniquePower:source.techniquePower,
    loafChance:source.loafChance??0,inspiritResistance:source.inspiritResistance??20,inspirit:source.inspirit,technique:source.technique,attitude:source.attitude??'neutral',weights:[...source.weights],guard:false,knockouts:0,soultimateRank:source.soultimateRank??1,
    soulCapacity:source.soulCapacity??soulCapacityForRank(source.soultimateRank??1),
    special:validateSpecialSpec(source.special??(
      source.technique==='heal'
        ? {kind:'heal',scope:'front',power:75}
        : {kind:'damage',scope:'front',power:100,damageKind:'attack'}
    ))};
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
export function createCombat({seed=20261023,teams,autoRotateReserves=true,enableLoafing=false,researchSoulGainPerAction=0,researchSpecialEffects=false,
  researchSoulRecoveryMode='none'}={}) {
  if(!Number.isInteger(seed))throw new TypeError('seed must be integer');
  if(typeof researchSpecialEffects!=='boolean')throw new TypeError('researchSpecialEffects must be boolean');
  if(!['none','owner-nonattack'].includes(researchSoulRecoveryMode))
    throw new RangeError('unsupported researchSoulRecoveryMode');
  if(researchSoulRecoveryMode!=='none'&&researchSoulGainPerAction!==0)
    throw new RangeError('choose only one experimental Soul recovery mode');
  if(!Number.isInteger(researchSoulGainPerAction)||researchSoulGainPerAction<0||researchSoulGainPerAction>10000)throw new RangeError('invalid experimental Soul gain');
  const source=teams??[RENTAL_SQUAD,RENTAL_SQUAD];
  if(!Array.isArray(source)||source.length!==2||!source.every(x=>Array.isArray(x)&&x.length===6))throw new TypeError('requires two rosters of six');
  const squads=source.map((team,side)=>team.map((member,i)=>buildMember(member,side,i)));
  const byId=new Map(squads.flat().map(x=>[x.id,x]));
  const soul=createSoulSystem({teams:squads.map(team=>team.map(m=>({id:m.id,capacity:m.soulCapacity})))});
 const statuses=createInspiritLedger([...byId.keys()]);
  const clock=createBattle({seed,teams:squads.map(t=>t.map(m=>({name:m.name,speed:m.speed}))),rotationCooldownMs:0});
  const rng=seededRandom(seed ^ 0xA365E91F);
  const pins=[null,null], events=[];
  const guided=[null,null];
  const chargeHits=[0,0];
  let winner=null;
  const front=(side)=>clock.snapshot().teams[side].frontIds.map(id=>byId.get(id));
  const livingFront=(side)=>front(side).filter(x=>x.hp>0);
  function syncCanAct(id){
    const member=byId.get(id);
    const pending=soul.snapshot().pending[member.side];
    const charging=pending?.casterId===id;
    clock.setCanAct(id,member.hp>0&&!statuses.has(id,'sleep')&&!charging);
  }
  /** Damage from BOTH normal and special moves can interrupt a charge.
   * Source: mtwildwood.net/soultimate-charge.php; move bonuses remain TODO.
   */
  function interruptOnHit(target,damage,critical=false){
    const side=target.side;
    const pending=soul.snapshot().pending[side];
    if(!pending||pending.casterId!==target.id||damage<=0)return null;
    const chance=chargeInterruptChance({damage,maxHp:target.maxHp,
      hitsTaken:chargeHits[side],critical});
    const stopped=target.hp===0||rng()*100<chance;
    const result={target:target.id,chance,stopped,
      reason:target.hp===0?'caster_ko':stopped?'hit_interruption':'charge_continues'};
    if(stopped){
      soul.resolve({side,token:pending.token,frontIds:clock.snapshot().teams[side].frontIds,
        success:false,alive:target.hp>0});
      guided[side]=null;
      chargeHits[side]=0;
      syncCanAct(target.id);
    }else chargeHits[side]++;
    return result;
  }
  /** Experimental injection: not an auto AI Inspirit move; hit/resistance unimplemented. */
  function applyInspirit({id,sign,effect,source=null,duration=null}={}){
    if(winner!==null)throw new Error('battle finished');
    if(!byId.has(id))throw new RangeError('unknown member');
    if(!['sleep','strength-up','research-marker'].includes(effect))throw new RangeError('effect not modeled');
    if(effect==='strength-up'&&sign!=='positive')throw new RangeError('strength-up is positive');
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
    if(result.ok){
      syncPinned();
      const pending=guided[side];
      if(pending&&!clock.snapshot().teams[side].frontIds.includes(pending.id)){
        cancelGuidedCharge(side);
        result.chargeCancelled=true;
      }
    }
    return result;
  }
  function setWatchMode(side,mode){
    if(winner!==null)throw new Error('battle finished');
    const old=soul.snapshot().pending[side];
    const result=soul.setMode(side,mode);
    guided[side]=null;
    if(old)syncCanAct(old.casterId);
    chargeHits[side]=0;
    if(mode==='zero')pins[side]=null; // original Watch Zero replaces Pin with Poke
    return result;
  }
  function giveSoul(id,amount){
    if(winner!==null)throw new Error('battle finished');
    return soul.addSoul(id,amount); // explicit lab input; no automatic real-game accrual assumed
  }
  function prepareSoultimate(side,id){
    if(winner!==null)throw new Error('battle finished');
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const team=clock.snapshot().teams[side];
    const caster=byId.get(id);
    const clockUnit=team.members.find(m=>m.id===id);
    if(caster&&clockUnit&&!clockUnit.canAct)return {ok:false,reason:'caster_unable_to_act'};
    const result=soul.prepare({side,casterId:id,frontIds:team.frontIds,alive:!!caster&&caster.hp>0});
    if(result.ok){chargeHits[side]=0;syncCanAct(id);}
    return result;
  }
  function resolveSoultimate(side,token,success){
    if(winner!==null)throw new Error('battle finished');
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const pending=soul.snapshot().pending[side];
    const caster=pending?byId.get(pending.casterId):null;
    const result=soul.resolve({side,token,success,frontIds:clock.snapshot().teams[side].frontIds,alive:!!caster&&caster.hp>0});
    if(guided[side]?.token===token)guided[side]=null;
    chargeHits[side]=0;
    if(pending&&pending.token===token)syncCanAct(pending.casterId);
    if(!result.ok)return result;
    if(!researchSpecialEffects)return {...result,effectStatus:'unimplemented'};
    // RESEARCH ONLY. All numeric special powers are fixture values until verified
    // for a specific YW2 move. Mode changes the power input, not final HP delta.
    const impacts=planResearchSpecial({
      spec:caster.special,caster,
      allies:livingFront(side),enemies:livingFront(1-side),
      powerMultiplier:result.powerMultiplier,pinnedId:pins[side]
    });
    const interruptions=[];
    for(const impact of impacts){
      const target=byId.get(impact.targetId);
      target.hp=impact.hpAfter;
      if(impact.kind==='damage'){
        const changed=interruptOnHit(target,impact.amount,false);
        if(changed)interruptions.push(changed);
      }
      if(impact.predictedKO){
        caster.knockouts++;
        syncCanAct(target.id);
      }
    }
    syncPinned();
    if(squads.some(team=>team.every(member=>member.hp===0)))
      winner=squads[0].every(m=>m.hp===0)?1:0;
    const entry={type:'special',mode:result.kind,actor:caster.id,
      impacts:impacts.map(x=>({...x})),interruptions,winner,model:'research-fixture'};
    events.push(entry);
    return {...result,effectStatus:'research-fixture',impacts:entry.impacts,interruptions,winner};
  }
  /** Player-facing touch charge: challenge selected deterministically per accepted attempt. */
  function beginGuidedCharge(side,id){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    if(guided[side])return {ok:false,reason:'charge_already_pending'};
    const result=prepareSoultimate(side,id);
    if(!result.ok)return result;
    const trialSeed=(seed^(result.token*0x9e3779b1)^((side+1)*0x85ebca6b))|0;
    const kind=chooseChargeKind(trialSeed);
    const trial=createChargeTrial({kind,seed:trialSeed});
    guided[side]={token:result.token,id,kind,trial};
    return {ok:true,token:result.token,kind,challenge:trial.snapshot(),
      mode:result.mode,consumers:[...result.consumers]};
  }
  function chargeInput(side,input){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const state=guided[side];
    if(!state)return {ok:false,reason:'no_active_charge'};
    const charge=soul.snapshot().pending[side];
    if(!charge||charge.token!==state.token){guided[side]=null;return {ok:false,reason:'stale_charge'};}
    const result=state.trial.input(input);
    if(!result.completed)return {ok:true,completed:false,challenge:result};
    const special=resolveSoultimate(side,state.token,true);
    return {ok:special.ok,completed:true,challenge:result,special};
  }
  function cancelGuidedCharge(side){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const state=guided[side];
    if(!state)return {ok:false,reason:'no_active_charge'};
    return resolveSoultimate(side,state.token,false);
  }
  function pokeEligibility(side,id){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const enemyFront=clock.snapshot().teams[1-side].frontIds;
    const last=events.length?events[events.length-1]:null;
    return soul.pokeEligibility({side,targetId:id,enemyFrontIds:enemyFront,
      negativeIds:enemyFront.filter(x=>statuses.list(x).some(t=>t.sign==='negative')),
      loafingIds:last?.kind==='loaf'?[last.actor]:[]});
  }
  function pin(side,id=null){
    if(![0,1].includes(side))throw new RangeError('invalid side');
    if(soul.snapshot().modes[side]==='zero')throw new Error('Pin unavailable in Watch Zero mode');
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
    const allies=livingFront(actor.side),enemies=livingFront(1-actor.side);
    const negativeCounts=Object.fromEntries(enemies.map(m=>[m.id,statuses.list(m.id).filter(x=>x.sign==='negative').length]));
    const positiveCounts=Object.fromEntries(allies.map(m=>[m.id,statuses.list(m.id).filter(x=>x.sign==='positive').length]));
    const weights=actionWeights(actor,{allies,enemies,enemyPin:pins[actor.side],negativeCounts,positiveCounts});
    return pickAction(weights,rng);
  }
  function snapshot(){
    return {seed,winner,pins:[...pins],clock:clock.snapshot(),squads:squads.map(t=>t.map(m=>({...m,weights:[...m.weights]}))),events:events.slice(-80).map(e=>({...e})),soul:soul.snapshot(),
      guided:guided.map(g=>g?{token:g.token,id:g.id,kind:g.kind,challenge:g.trial.snapshot()}:null),
      inspirits:Object.fromEntries([...byId.keys()].map(id=>[id,statuses.list(id)]))};
  }
  function step(){
    if(winner!==null)return {type:'finished',winner};
    ensureFront();
    const pending=clock.snapshot();
    if(![0,1].every(s=>livingFront(s).length))return {type:'awaiting_rotation',fronts:pending.teams.map(t=>t.frontIds)};
    if(!pending.teams.some(team=>team.frontIds.some(id=>team.members.find(m=>m.id===id)?.canAct)))
      return {type:'awaiting_rotation',reason:'all_front_units_unable_to_act',fronts:pending.teams.map(t=>t.frontIds)};
    const clockEvent=clock.step();
    const actor=byId.get(clockEvent.id);
    // A guard lasts until the next time that actor begins an action.
    actor.guard=false;
    const kind=enableLoafing&&rng()*100<actor.loafChance?'loaf':choice(actor);
    let target=null,amount=0,hit=true,critical=false,effect=null,resisted=false,interruption=null;
    if(kind==='guard'){
      actor.guard=true;
    }else if(kind==='loaf'){
      // Test fixture only; official level/leader-adjusted chance is unmodeled.
    }else if(kind==='inspirit'){
      const sign=actor.inspirit==='sleep'?'negative':'positive';
      const group=sign==='negative'?livingFront(1-actor.side):livingFront(actor.side);
      const candidates=group.filter(x=>!statuses.has(x.id,actor.inspirit));
      if(!candidates.length)throw new Error('Inspirit selected without eligible target');
      target=sign==='negative'
       ? candidates.find(m=>m.id===pins[actor.side])??candidates[Math.floor(rng()*candidates.length)]
       : candidates[Math.floor(rng()*candidates.length)];
      effect=actor.inspirit;
      // Resistance formula is cross-version research; unit resistance is a TEST fixture.
      resisted=sign==='negative'&&rng()*100<target.inspiritResistance;
      hit=!resisted;
      if(hit)applyInspirit({id:target.id,sign,effect,source:actor.id});
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
        let damage=baseDamage(statuses.has(actor.id,'strength-up')?{...actor,strength:Math.floor(actor.strength*1.10)}:actor,target,kind,critical);
        if(target.guard) damage=Math.max(1,Math.floor(damage*.5));
        else {const range=Math.floor(damage/10+1); damage=Math.max(1,Math.min(999,damage+Math.floor(rng()*(2*range+1))-range));}
        amount=Math.min(target.hp,damage);
        target.hp-=amount;
        interruption=interruptOnHit(target,amount,critical);
        if(target.hp===0){syncCanAct(target.id);actor.knockouts++;syncPinned();}
      }
    }
    if(squads.some(team=>team.every(member=>member.hp===0)))winner=squads[0].every(m=>m.hp===0)?1:0;
    const action={type:'action',turn:clockEvent.action,elapsed:clockEvent.elapsed,pointsElapsed:clockEvent.pointsElapsed,
      actor:actor.id,kind:kind==='technique'&&actor.technique==='heal'?'heal':kind,target:target?.id??null,
      hit,critical,amount,targetHp:target?.hp??null,guard:target?.guard??false,effect,resisted,interruption,winner};
    events.push(action);
    if(researchSoulGainPerAction>0){for(const member of squads.flat())if(member.hp>0)soul.addSoul(member.id,researchSoulGainPerAction);}
    if(researchSoulRecoveryMode==='owner-nonattack'){
      // Empirical YW2 research: non-attacking Yo-kai restore ~5 Soul AFTER
      // THEIR OWN turn. The exact recovery for attacks / damaging Techniques
      // has not been verified; this intentionally doesn't guess it.
      const didNotAttack=kind==='guard'||kind==='loaf'||kind==='inspirit'||
        (kind==='technique'&&actor.technique==='heal');
      if(didNotAttack && actor.hp>0)soul.addSoul(actor.id,5);
    }
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
  return {snapshot,step,simulate,rotate,pin,applyInspirit,purify,preview:clock.predict,
    setWatchMode,giveSoul,prepareSoultimate,resolveSoultimate,pokeEligibility,
    beginGuidedCharge,chargeInput,cancelGuidedCharge};
}
