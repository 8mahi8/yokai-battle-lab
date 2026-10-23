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
import { createPresentationTimeline } from './presentation-timeline.mjs';
import { createCounterWindow } from './counter-window.mjs';
import { createWheelCoalescing } from './wheel-coalescing.mjs';
import { createPokeTrial } from './poke-input.mjs';
import { createPurifyTrial, choosePurifyKind, PURIFY_KINDS } from './purify-input.mjs';

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
  researchSoulRecoveryMode='none',researchPresentation=false,researchCounterTiming=false,
  researchWheelCoalescing=false,researchOpeningPriority=null,
  researchPokeSoulTransfer=0}={}) {
  if(!Number.isInteger(seed))throw new TypeError('seed must be integer');
  if(typeof researchSpecialEffects!=='boolean')throw new TypeError('researchSpecialEffects must be boolean');
  if(typeof researchPresentation!=='boolean')throw new TypeError('researchPresentation must be boolean');
  if(typeof researchCounterTiming!=='boolean')throw new TypeError('researchCounterTiming must be boolean');
  if(typeof researchWheelCoalescing!=='boolean')throw new TypeError('researchWheelCoalescing must be boolean');
  if(!Number.isInteger(researchPokeSoulTransfer)||researchPokeSoulTransfer<0||
    researchPokeSoulTransfer>250)
    throw new RangeError('researchPokeSoulTransfer must be an integer 0..250');
  if(researchOpeningPriority!==null&&(typeof researchOpeningPriority!=='object'||Array.isArray(researchOpeningPriority)))throw new TypeError('invalid researchOpeningPriority');
  if(researchWheelCoalescing&&!researchCounterTiming)
    throw new RangeError('wheel pairing research requires counter timing research');
  if(researchCounterTiming&&(!researchPresentation||!researchSpecialEffects))
    throw new RangeError('counter timing requires researchPresentation and researchSpecialEffects');
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
  const clock=createBattle({seed,teams:squads.map(t=>t.map(m=>({name:m.name,speed:m.speed}))),rotationCooldownMs:0,
    openingPriorityResearch:researchOpeningPriority});
  const rng=seededRandom(seed ^ 0xA365E91F);
  const pins=[null,null], events=[];
  const guided=[null,null];
  const chargeHits=[0,0];
  const pokes=[null,null],pokedTargets=[new Set(),new Set()];
  const purification=[null,null];
  let purificationSerial=0;
  // Loaf vulnerability is provisional until that unit's next action.
  const loafingActors=new Set();
  // Opponent-visible animation is a SEPARATE research clock; no mapping from
  // phase1.pointsElapsed to wall-clock milliseconds is claimed here.
  const presentation=researchPresentation?createPresentationTimeline({coalesceRotations:researchWheelCoalescing}):null;
  const counter=researchCounterTiming
    ?createCounterWindow({fronts:clock.snapshot().teams.map(team=>team.frontIds)}):null;
  const wheel=researchWheelCoalescing
    ?createWheelCoalescing({fronts:clock.snapshot().teams.map(t=>t.frontIds)}):null;
  const pendingCounterEffects=new Map();
  const uncertainCounterHits=new Map();
  const recordView=event=>{if(presentation)presentation.record(event);};
  function beginPresentationMotion(options){
    if(!presentation)return {ok:false,reason:'presentation_disabled'};
    return presentation.beginMotion(options);
  }
  function advancePresentation(ms){
    if(!presentation)return {ok:false,reason:'presentation_disabled'};
    const visible=presentation.advance(ms);
    if(counter){
      const due=counter.advance(ms);
      for(const hit of due){
        const queued=pendingCounterEffects.get(hit.id);
        if(!queued)continue;
        pendingCounterEffects.delete(hit.id);
        if(wheel)wheel.finalizeHit(hit.id);
        const uncertainty=uncertainCounterHits.get(hit.id);
        if(uncertainty){
          uncertainCounterHits.delete(hit.id);
          // Unknown original target semantics for 3+ rotations: NEVER apply
          // invented HP changes as though they were verified YW2 outcomes.
          events.push({type:'counter-hit-indeterminate',hitId:hit.id,
            hitAt:hit.hitAt,frontLock:hit.frontLock,possibleFixtureTargets:[...hit.targetIds],
            reason:uncertainty.code,rotationCount:uncertainty.rotations,
            hpApplied:false,model:'research-uncertain'});
          continue;
        }
        const applied=applyResearchSpecial({
          side:queued.side,casterId:queued.casterId,
          result:queued.result,targets:hit.targetIds,pinnedId:queued.pinnedId
        });
        // Record the counter hit separately from the already-visible release.
        events.push({type:'counter-hit',hitAt:hit.hitAt,frontLock:hit.frontLock,
          casterId:queued.casterId,targets:[...hit.targetIds],impacts:applied.impacts.map(x=>({...x}))});
      }
    }
    return visible;
  }
  function beginCounterCutin({attackerSide,durationMs,enduresSpent=0}={}){
    if(!counter)return {ok:false,reason:'counter_timing_disabled'};
    if(winner!==null)throw new Error('battle finished');
    // Validate the narrower presentation clock range BEFORE updating the
    // counter state, preventing a half-started cutin on invalid requests.
    if(!Number.isSafeInteger(durationMs)||durationMs<1||durationMs>60000)
      throw new RangeError('research cutin duration must be 1..60000ms');
    const started=counter.beginCutin({attackerSide,durationMs,enduresSpent});
    if(started.ok){
      if(wheel)wheel.actionBoundary();
      presentation.beginMotion({durationMs,kind:'soultimate-cutin',
      actorId:clock.snapshot().teams[attackerSide].frontIds[0]});
    }
    return started;
  }
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
      if(counter)counter.cancelCharge({side,token:pending.token});
      recordView({side,kind:'chargeCancel',token:pending.token,memberId:pending.casterId,detail:'interrupted'});
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
  /** Debug shortcut retained only to preserve legacy engine tests.
   * Player UI must use beginPurify + purifyInput. This function deliberately
   * does not count as a successful gesture for gameplay.
   */
  function purify(side,id){
    if(winner!==null)throw new Error('battle finished');
    if(![0,1].includes(side))throw new RangeError('invalid side');
    const result=statuses.purify({id,side,benchIds:clock.snapshot().teams[side].benchIds});
    if(result.ok){
      if(purification[side]?.id===id)purification[side]=null;
      syncCanAct(id);
    }
    return result;
  }
  function beginPurify(side,id,{kind=null}={}){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    if(winner!==null)return {ok:false,reason:'battle_finished'};
    if(purification[side])return {ok:false,reason:'purify_already_pending'};
    if(pokes[side]||soul.snapshot().pending[side])
      return {ok:false,reason:'other_touch_action_pending'};
    const bench=clock.snapshot().teams[side].benchIds;
    if(!byId.has(id)||byId.get(id).side!==side)
      return {ok:false,reason:'not_your_member'};
    if(!bench.includes(id))return {ok:false,reason:'must_be_on_bench'};
    if(byId.get(id).hp<=0)return {ok:false,reason:'member_ko'};
    if(!statuses.list(id).some(x=>x.sign==='negative'))
      return {ok:false,reason:'no_negative_inspirit'};
    const selected=kind??choosePurifyKind(purificationSerial);
    if(!PURIFY_KINDS.includes(selected))throw new RangeError('invalid purification kind');
    const trial=createPurifyTrial({kind:selected,seed:purificationSerial});
    purificationSerial++;
    purification[side]={id,trial};
    return {ok:true,id,kind:selected,challenge:trial.snapshot()};
  }
  function purifyInput(side,event){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const pending=purification[side];
    if(!pending)return {ok:false,reason:'no_active_purification'};
    const bench=clock.snapshot().teams[side].benchIds;
    if(winner!==null||!bench.includes(pending.id)||
       byId.get(pending.id).hp<=0||
       !statuses.list(pending.id).some(x=>x.sign==='negative')){
      purification[side]=null;
      return {ok:false,reason:'purification_target_no_longer_valid'};
    }
    const challenge=pending.trial.input(event);
    if(!challenge.completed)return {ok:true,completed:false,challenge};
    const result=purify(side,pending.id);
    purification[side]=null;
    if(!result.ok)return {ok:false,reason:result.reason};
    events.push({type:'purification',side,targetId:pending.id,
      kind:challenge.kind,removed:result.removed.map(x=>({...x})),
      model:'research-gesture',bonusExperience:'unimplemented'});
    return {ok:true,completed:true,challenge,removed:result.removed,
      bonusExperience:'unimplemented'};
  }
  function cancelPurify(side){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    if(!purification[side])return {ok:false,reason:'no_active_purification'};
    purification[side]=null;
    return {ok:true,cancelled:true};
  }
  function syncPinned(){ for(let side=0;side<2;side++)if(pins[side]&&!livingFront(1-side).some(m=>m.id===pins[side]))pins[side]=null; }
  function rotate(side,direction){
    if(winner!==null)throw new Error('battle finished');
    // Drain a hit whose scheduled timestamp is already due, BEFORE applying
    // a later wheel input. Otherwise setFront could erase its queued HP impact.
    if(counter){
      advancePresentation(0);
      if(winner!==null)throw new Error('battle finished');
    }
    const result=clock.rotate(side,direction,0);
    if(result.ok){
      syncPinned();
      // Changes of lineups cancel stale manual touch gestures: a Poke target
      // leaves the enemy frontline, or a Purification subject returns to front.
      for(let i=0;i<2;i++){
        if(pokes[i]&&!clock.snapshot().teams[1-i].frontIds.includes(pokes[i].targetId))
          pokes[i]=null;
        if(purification[i]&&!clock.snapshot().teams[i].benchIds.includes(purification[i].id))
          purification[i]=null;
      }
      const frontIds=clock.snapshot().teams[side].frontIds;
      if(counter)counter.setFront({side,ids:frontIds});
      if(wheel){
        const update=wheel.rotate({side,frontIds});
        for(const correction of update.corrections){
          const revised=counter.revisePendingTarget({hitId:correction.hitId,
            targetIds:correction.frontIds,reason:correction.reason});
          if(revised.ok){
            events.push({type:'wheel-target-correction',hitId:correction.hitId,side,
              original:correction.supersededFront,targetIds:correction.frontIds});
          }
        }
        if(update.uncertainty){
          const affected=counter.snapshot().pending.filter(hit=>hit.attackerSide===side);
          for(const hit of affected)uncertainCounterHits.set(hit.id,update.uncertainty);
          events.push({type:'wheel-fidelity-unknown',side,
            rotations:update.groupRotations,affectedHits:affected.map(hit=>hit.id),
            code:update.uncertainty.code});
        }
      }
      recordView({side,kind:'rotate',detail:direction===1?'right':'left',frontIds});
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
    if(old){
      if(counter)counter.cancelCharge({side,token:old.token});
      recordView({side,kind:'chargeCancel',token:old.token,memberId:old.casterId,detail:'mode_changed'});
    }
    guided[side]=null;
    pokes[side]=null;
    purification[side]=null;
    if(old)syncCanAct(old.casterId);
    chargeHits[side]=0;
    if(mode==='zero')pins[side]=null; // original Watch Zero replaces Pin with Poke
    recordView({side,kind:'watchMode',detail:mode});
    return result;
  }
  function giveSoul(id,amount){
    if(winner!==null)throw new Error('battle finished');
    return soul.addSoul(id,amount); // explicit lab input; no automatic real-game accrual assumed
  }
  function prepareSoultimate(side,id){
    if(winner!==null)throw new Error('battle finished');
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    if(pokes[side])return {ok:false,reason:'poke_active'};
    if(purification[side])return {ok:false,reason:'purification_active'};
    const team=clock.snapshot().teams[side];
    const caster=byId.get(id);
    const clockUnit=team.members.find(m=>m.id===id);
    if(caster&&clockUnit&&!clockUnit.canAct)return {ok:false,reason:'caster_unable_to_act'};
    const result=soul.prepare({side,casterId:id,frontIds:team.frontIds,alive:!!caster&&caster.hp>0});
    if(result.ok){chargeHits[side]=0;syncCanAct(id);
      if(counter)counter.beginCharge({side,token:result.token});
      recordView({side,kind:'chargeStart',token:result.token,memberId:id});}
    return result;
  }
  /** Internal research-only HP resolution. Optional target IDs are frozen at a
   * cut-in hit window; these members may now be benched, which is intentional.
   * Normal specials continue to target the current live front.
   */
  function applyResearchSpecial({side,casterId,result,targets=null,pinnedId=null}={}){
    const caster=byId.get(casterId);
    const enemies=targets?targets.map(id=>byId.get(id)).filter(m=>m&&m.hp>0):livingFront(1-side);
    const impacts=planResearchSpecial({
      spec:caster.special,caster,
      allies:livingFront(side),enemies,
      powerMultiplier:result.powerMultiplier,pinnedId
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
    return {effectStatus:'research-fixture',impacts:entry.impacts,interruptions,winner};
  }
  function resolveSoultimate(side,token,success){
    if(winner!==null)throw new Error('battle finished');
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const pending=soul.snapshot().pending[side];
    const caster=pending?byId.get(pending.casterId):null;
    const result=soul.resolve({side,token,success,frontIds:clock.snapshot().teams[side].frontIds,alive:!!caster&&caster.hp>0});
    if(guided[side]?.token===token)guided[side]=null;
    chargeHits[side]=0;
    if(pending&&pending.token===token){
      syncCanAct(pending.casterId);
      recordView({side,kind:result.ok?'chargeComplete':'chargeCancel',
        token,memberId:pending.casterId,detail:result.ok?result.kind:result.reason});
    }
    if(!result.ok){
      if(counter&&pending)counter.cancelCharge({side,token});
      return result;
    }
    const planned=counter?counter.completeCharge({side,token}):null;
    if(planned?.ok){
      if(wheel){
        const targetSide=planned.attackerSide;
        const group=wheel.snapshot().groups[targetSide];
        if(group?.rotations>=3){
          uncertainCounterHits.set(planned.id,{
            code:'three-plus-rotations-unverified',side:targetSide,
            rotations:group.rotations,epoch:wheel.snapshot().epoch});
        }else if(planned.frontLock==='completion'){
          wheel.trackLockedHit({targetSide,hitId:planned.id});
        }
      }
      pendingCounterEffects.set(planned.id,{side,casterId:caster.id,result,
        pinnedId:pins[side]});
      return {...result,effectStatus:'pending-counter-hit',counter:planned};
    }
    if(!researchSpecialEffects)return {...result,effectStatus:'unimplemented'};
    return {...result,...applyResearchSpecial({side,casterId:caster.id,result,pinnedId:pins[side]})};
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
    if(winner!==null)return {ok:false,reason:'battle_finished'};
    const enemyFront=clock.snapshot().teams[1-side].frontIds;
    if(pokedTargets[side].has(id))return {ok:false,reason:'already_poked'};
    if(!byId.has(id)||byId.get(id).side===side||byId.get(id).hp<=0)
      return {ok:false,reason:'enemy_not_living'};
    return soul.pokeEligibility({side,targetId:id,enemyFrontIds:enemyFront,
      negativeIds:enemyFront.filter(x=>statuses.list(x).some(t=>t.sign==='negative')),
      loafingIds:enemyFront.filter(id=>loafingActors.has(id))});
  }
  function beginPoke(side,id){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    if(pokes[side])return {ok:false,reason:'poke_already_pending'};
    if(purification[side])return {ok:false,reason:'purification_active'};
    if(soul.snapshot().pending[side])return {ok:false,reason:'special_charge_active'};
    const eligible=pokeEligibility(side,id);
    if(!eligible.ok)return eligible;
    const trial=createPokeTrial({targetId:id});
    pokes[side]={targetId:id,trial};
    return {ok:true,targetId:id,challenge:trial.snapshot()};
  }
  function pokeInput(side,input){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    const pending=pokes[side];
    if(!pending)return {ok:false,reason:'no_active_poke'};
    const valid=pokeEligibility(side,pending.targetId);
    if(!valid.ok){
      pokes[side]=null;
      return {ok:false,reason:'poke_target_no_longer_valid',detail:valid.reason};
    }
    const challenge=pending.trial.input(input);
    if(!challenge.completed)return {ok:true,completed:false,challenge};
    pokes[side]=null;
    pokedTargets[side].add(pending.targetId);
    // The manual confirms Soul-drain as ONE possible result. Which unit
    // receives it, how much and the result odds are unresolved. Only a lab
    // fixture is implemented: select first LIVING front ally and drain up
    // to the configured integer from the target's Soul (0 by default).
    const targetSoul=soul.snapshot().teams[1-side].find(x=>x.id===pending.targetId);
    const recipient=livingFront(side)[0]??null;
    const receiverSoul=recipient?soul.snapshot().teams[side].find(x=>x.id===recipient.id):null;
    const amount=researchPokeSoulTransfer>0&&recipient
      ?Math.min(researchPokeSoulTransfer,targetSoul.soul,
        receiverSoul.capacity-receiverSoul.soul):0;
    if(amount>0){
      soul.setSoul(pending.targetId,targetSoul.soul-amount);
      soul.addSoul(recipient.id,amount);
    }
    const reward={kind:researchPokeSoulTransfer>0?'research-soul-transfer':'unresolved',
      amount,recipientId:recipient?.id??null,sourceId:pending.targetId,
      model:'research-only'};
    const event={type:'poke',side,targetId:pending.targetId,reward,
      actionCount:challenge.hits};
    events.push(event);
    return {ok:true,completed:true,challenge,reward};
  }
  function cancelPoke(side){
    if(side!==0&&side!==1)throw new RangeError('invalid side');
    if(!pokes[side])return {ok:false,reason:'no_active_poke'};
    pokes[side]=null;
    return {ok:true,cancelled:true};
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
      for(let tries=0;tries<6&&!livingFront(side).length&&squads[side].some(m=>m.hp>0);tries++){
        const moved=clock.rotate(side,1,0);
        if(moved.ok&&counter){
          const frontIds=clock.snapshot().teams[side].frontIds;
          counter.setFront({side,ids:frontIds});
          if(wheel){
            wheel.actionBoundary();
            wheel.rotate({side,frontIds});
            wheel.actionBoundary();
          }
        }
      }
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
      purification:purification.map(p=>p?{id:p.id,challenge:p.trial.snapshot()}:null),
      poke:{active:pokes.map(p=>p?{targetId:p.targetId,challenge:p.trial.snapshot()}:null),
        used:pokedTargets.map(set=>[...set]),loafing:[...loafingActors],
        rewardFixture:researchPokeSoulTransfer},
      inspirits:Object.fromEntries([...byId.keys()].map(id=>[id,statuses.list(id)])),
      ...(presentation?{presentation:presentation.snapshot()}:{}),
      ...(counter?{counterWindow:counter.snapshot(),counterEffectsPending:pendingCounterEffects.size}:{}),
      ...(wheel?{wheelCoalescing:wheel.snapshot(),
        uncertainCounterHits:[...uncertainCounterHits].map(([hitId,reason])=>({hitId,reason:{...reason}}))}:{})};
  }
  function step(){
    if(winner!==null)return {type:'finished',winner};
    if(counter){
      advancePresentation(0);
      if(winner!==null)return {type:'finished',winner};
    }
    ensureFront();
    const pending=clock.snapshot();
    if(![0,1].every(s=>livingFront(s).length))return {type:'awaiting_rotation',fronts:pending.teams.map(t=>t.frontIds)};
    if(!pending.teams.some(team=>team.frontIds.some(id=>team.members.find(m=>m.id===id)?.canAct)))
      return {type:'awaiting_rotation',reason:'all_front_units_unable_to_act',fronts:pending.teams.map(t=>t.frontIds)};
    const clockEvent=clock.step();
    if(wheel)wheel.actionBoundary();
    const actor=byId.get(clockEvent.id);
    loafingActors.delete(actor.id);
    // A guard lasts until the next time that actor begins an action.
    actor.guard=false;
    const kind=enableLoafing&&rng()*100<actor.loafChance?'loaf':choice(actor);
    let target=null,amount=0,hit=true,critical=false,effect=null,resisted=false,interruption=null;
    if(kind==='guard'){
      actor.guard=true;
    }else if(kind==='loaf'){
      // The vulnerable window until this actor next acts is a research
      // approximation. Source confirms loafing can trigger Zero Poke.
      loafingActors.add(actor.id);
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
      hit,critical,amount,targetHp:target?.hp??null,guard:target?.guard??false,effect,resisted,interruption,winner,
      ...(researchOpeningPriority?{priorityKind:clockEvent.priorityKind,
        skippedId:clockEvent.skippedId,flashConsumed:clockEvent.flashConsumed,
        priorityConfidence:'research-fixture'}:{})};
    events.push(action);
    recordView({side:actor.side,kind:'action',memberId:actor.id,detail:action.kind});
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
  return {snapshot,step,simulate,rotate,pin,applyInspirit,purify,
    beginPurify,purifyInput,cancelPurify,preview:clock.predict,
    setWatchMode,giveSoul,prepareSoultimate,resolveSoultimate,pokeEligibility,
    beginPoke,pokeInput,cancelPoke,beginGuidedCharge,chargeInput,cancelGuidedCharge,
    beginPresentationMotion,advancePresentation,beginCounterCutin};
}
