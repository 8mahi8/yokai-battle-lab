/** Deterministic original-rental battle RESEARCH prototype (Phases 1–9).
 * Initial battle: seeded automatic actions, front/back wheel, Inspirits, Watch
 * Zero Poke, five touch Purify modes, Soul/Soultimate/G, and experimental
 * damage/critical/attribute calculations.
 * Original rental stats, attitudes, healing, many skill effects and timings
 * are fixtures. Research advanced mechanics (Flash, counter cut-ins, wheel
 * coalescing) remain opt-in. NO multiplayer protocol or Google Sites release.
 */
import {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES} from '../content/rental-roster.mjs';
import {resolveRentalAttackSpec} from './catalog-attack-spec.mjs';
import {resolveRentalTechniqueSpec} from './catalog-technique-spec.mjs';
import {resolveRentalInspiritSpec} from './catalog-inspirit-spec.mjs';
import {resolveRentalSoultimateSpec} from './catalog-soultimate-spec.mjs';
import {yw2ReferenceSoultimate,yw2ReferenceSpecialDefinition} from '../content/yw2-soultimate-reference.mjs';
export {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES} from '../content/rental-roster.mjs';
import { createBattle } from './phase1.mjs';
import { createInspiritLedger } from './inspirit.mjs';
import { actionWeights, pickAction } from './selection.mjs';
import { createSoulSystem, chargeInterruptChance } from './soul.mjs';
import { chooseChargeKind, createChargeTrial } from './charge-input.mjs';
import { soulCapacityForRank } from './soul.mjs';
import { validateSpecialSpec, planResearchSpecial, researchSpecialAllies } from './special-effects.mjs';
import { createPresentationTimeline } from './presentation-timeline.mjs';
import { createCounterWindow } from './counter-window.mjs';
import { createWheelCoalescing } from './wheel-coalescing.mjs';
import { createPokeTrial } from './poke-input.mjs';
import { createPurifyTrial, choosePurifyKind, PURIFY_KINDS } from './purify-input.mjs';
import {ELEMENTS, validateElementResistances, calculateOneHit, deriveStatStage} from './damage-model.mjs';
import {resolveTechniqueElementMultiplier} from './element-model.mjs';
import {calculateTurnInspirit} from './turn-inspirit.mjs';
import {calculateHeal} from './heal-model.mjs';
import {yw2HitProbability,yw2CriticalProbability,rollPercent} from './hit-model.mjs';
import {PLAYTEST_SOUL_TUNING,choosePlaytestPokeOutcome} from './playtest-soul-tuning.mjs';
import {validateRentalSkill,skillMomentumStage} from './skill-effects.mjs';
import {resolveRentalSkillSpec} from './catalog-skill-spec.mjs';
import {createEffectCommitter} from './effect-commit.mjs';
import {createSkillHookPipeline} from './skill-hook-pipeline.mjs';
import {createKnockoutLifecycle} from './knockout-lifecycle.mjs';

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
  const techniqueElement=source.techniqueElement??'neutral';
  if(!ELEMENTS.includes(techniqueElement))throw new RangeError('invalid technique element');
  const elementResistances=validateElementResistances(source.elementResistances);
  // Custom research inputs, not an invented passive for built-in rentals.
  if(source.techniquePlaySources!==undefined&&
    (!Number.isInteger(source.techniquePlaySources)||
     source.techniquePlaySources<0||source.techniquePlaySources>2))
    throw new RangeError('techniquePlaySources must be integer 0..2');
  if(source.techniquePenetrate!==undefined&&typeof source.techniquePenetrate!=='boolean')
    throw new TypeError('techniquePenetrate must be boolean');
  if(source.criticalDefense!==undefined)intStat(source.criticalDefense,'criticalDefense');
  for(const field of ['attackHits','techniqueHits']){
    if(source[field]!==undefined&&(!Number.isInteger(source[field])||
       source[field]<1||source[field]>9))
      throw new RangeError(field+' must be integer 1..9');
  }
  if(source.inspiritLevel!==undefined){
    intStat(source.inspiritLevel,'inspiritLevel',1);
    if(source.inspiritLevel>4)throw new RangeError('Inspirit level must be 1..4');
  }
  if(source.attackAccuracy!==undefined&&(!Number.isFinite(source.attackAccuracy)||
    source.attackAccuracy<.5||source.attackAccuracy>4))
    throw new RangeError('attackAccuracy must be .5..4');
  if(source.moveCritBonus!==undefined){
    intStat(source.moveCritBonus,'moveCritBonus');
    if(source.moveCritBonus>98)throw new RangeError('moveCritBonus >98');
  }
  if(source.criticalImmune!==undefined&&typeof source.criticalImmune!=='boolean')
    throw new TypeError('criticalImmune must be a boolean');
  if(source.guardBreak!==undefined&&typeof source.guardBreak!=='boolean')
    throw new TypeError('guardBreak must be a boolean');
  if(source.guardBoost!==undefined&&typeof source.guardBoost!=='boolean')
    throw new TypeError('guardBoost must be a boolean');
 if(!['sleep','strength-up','strength-down','defense-down','spirit-down',
  'hp-loss','hp-regen'].includes(source.inspirit))
    throw new TypeError('unsupported Inspirit');
 if(source.loafChance!==undefined){
    intStat(source.loafChance,'loafChance');
    if(source.loafChance>100)throw new RangeError('loafChance > 100');
  }
  if(!['damage','heal'].includes(source.technique))throw new TypeError('technique must be damage/heal');
  if(!Array.isArray(source.weights)||source.weights.length!==4||source.weights.some(x=>!Number.isInteger(x)||x<0)||source.weights.reduce((a,b)=>a+b,0)!==100)throw new TypeError('invalid weights');
  return {id:(side===0?'A':'B')+(index+1),name:source.name||'Unit '+(index+1),side,maxHp:source.maxHp,hp:source.maxHp,speed:source.speed,
    strength:source.strength,spirit:source.spirit,defense:source.defense,criticalDefense:source.criticalDefense??source.defense,
    attackPower:source.attackPower,techniquePower:source.techniquePower,techniqueElement,elementResistances,
    inspiritLevel:source.inspiritLevel??1,guardBreak:source.guardBreak??false,
    // Preserve default roster snapshots. Boosted guard is a custom research
    // input until a source-backed in-battle Guard Boost effect exists.
    ...(source.guardBoost===true?{guardBoost:true}:{}),
    ...(source.techniquePlaySources>0?{techniquePlaySources:source.techniquePlaySources}:{}),
    ...(source.techniquePenetrate===true?{techniquePenetrate:true}:{}),
    attackHits:source.attackHits??1,techniqueHits:source.techniqueHits??1,
    attackAccuracy:source.attackAccuracy??1,moveCritBonus:source.moveCritBonus??0,
    criticalImmune:source.criticalImmune??false,
    loafChance:source.loafChance??0,inspiritResistance:source.inspiritResistance??20,inspirit:source.inspirit,technique:source.technique,attitude:source.attitude??'neutral',weights:[...source.weights],guard:false,knockouts:0,soultimateRank:source.soultimateRank??1,
    skill:validateRentalSkill(source.skill),
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
export function createCombat({seed=20261023,teams,autoRotateReserves=true,enableLoafing=false,rotationCooldownMs=0,researchSoulGainPerAction=0,researchSpecialEffects=false,
  researchSoulRecoveryMode='none',researchPresentation=false,researchCounterTiming=false,
  researchWheelCoalescing=false,researchOpeningPriority=null,
  researchPokeSoulTransfer=0,playtestSoulTuning=false,researchDamageModel=false,researchMultiHit=false,researchSoultimateHitCount=null,researchYw2Soultimate=null,researchStatInspirits=false,researchTurnInspirits=false,researchHealingVariance=false,enableRentalSkills=playtestSoulTuning,
  catalogAttackResolution=false,catalogTechniqueResolution=false,
  catalogInspiritResolution=false,catalogSoultimateResolution=false,
  catalogSkillResolution=false}={}) {
  if(!Number.isInteger(seed))throw new TypeError('seed must be integer');
  if(typeof enableRentalSkills!=='boolean')throw new TypeError('enableRentalSkills must be boolean');
  if(typeof researchSpecialEffects!=='boolean')throw new TypeError('researchSpecialEffects must be boolean');
  if(typeof researchPresentation!=='boolean')throw new TypeError('researchPresentation must be boolean');
  if(typeof researchCounterTiming!=='boolean')throw new TypeError('researchCounterTiming must be boolean');
  if(typeof researchWheelCoalescing!=='boolean')throw new TypeError('researchWheelCoalescing must be boolean');
  if(typeof researchDamageModel!=='boolean')throw new TypeError('researchDamageModel must be boolean');
  if(typeof researchMultiHit!=='boolean')throw new TypeError('researchMultiHit must be boolean');
  if(typeof catalogAttackResolution!=='boolean')throw new TypeError('catalogAttackResolution must be boolean');
  if(catalogAttackResolution&&teams!==undefined)
    throw new RangeError('catalog attack mode only supports unchanged built-in rentals');
  if(typeof catalogTechniqueResolution!=='boolean')throw new TypeError('catalogTechniqueResolution must be boolean');
  if(catalogTechniqueResolution&&teams!==undefined)
    throw new RangeError('catalog Technique mode only supports unchanged built-in rentals');
  if(typeof catalogInspiritResolution!=='boolean')
    throw new TypeError('catalogInspiritResolution must be boolean');
  if(catalogInspiritResolution&&teams!==undefined)
    throw new RangeError('catalog Inspirit mode only supports unchanged built-in rentals');
  if(typeof catalogSoultimateResolution!=='boolean')
    throw new TypeError('catalogSoultimateResolution must be boolean');
  if(catalogSoultimateResolution&&teams!==undefined)
    throw new RangeError('catalog Soultimate mode only supports unchanged built-in rentals');
  if(typeof catalogSkillResolution!=='boolean')
    throw new TypeError('catalogSkillResolution must be boolean');
  if(catalogSkillResolution&&teams!==undefined)
    throw new RangeError('catalog skill mode only supports unchanged built-in rentals');
  if(researchMultiHit&&!researchDamageModel)
    throw new RangeError('researchMultiHit requires researchDamageModel');
  // Only an explicit CUSTOM research roster can turn on this provisional
  // mechanic; original-rental Soultimate hit counts remain unknown.
  if(researchSoultimateHitCount!==null&&
     (!Number.isInteger(researchSoultimateHitCount)||
      researchSoultimateHitCount<2||researchSoultimateHitCount>9))
    throw new RangeError('researchSoultimateHitCount must be null or integer 2..9');
  if(researchSoultimateHitCount!==null&&
     (teams===undefined||!researchSpecialEffects||!researchDamageModel))
    throw new RangeError('Soultimate hit research requires custom rosters, special effects and damage model');
  // One sourced, shape-only YW2 reference applied to A1 in a CUSTOM research
  // battle. It cannot combine with unverified global fixture hit counts.
  if(researchYw2Soultimate!==null&&
     (typeof researchYw2Soultimate!=='string'||
      researchSoultimateHitCount!==null||
      teams===undefined||!researchDamageModel||
      !researchSpecialEffects||catalogSoultimateResolution))
    throw new RangeError('YW2 reference Soultimate requires custom teams, damage model and no other hit override');
  const referenceMove=researchYw2Soultimate===null?null:
    yw2ReferenceSoultimate(researchYw2Soultimate);
  if(typeof researchStatInspirits!=='boolean')
    throw new TypeError('researchStatInspirits must be boolean');
  if(researchStatInspirits&&!researchDamageModel)
    throw new RangeError('researchStatInspirits requires researchDamageModel');
  if(typeof researchTurnInspirits!=='boolean')
    throw new TypeError('researchTurnInspirits must be boolean');
  if(researchTurnInspirits&&!researchDamageModel)
    throw new RangeError('researchTurnInspirits requires researchDamageModel');
  if(typeof researchHealingVariance!=='boolean')
    throw new TypeError('researchHealingVariance must be boolean');
  if(researchHealingVariance&&!researchDamageModel)
    throw new RangeError('researchHealingVariance requires researchDamageModel');
  if(typeof playtestSoulTuning!=='boolean')throw new TypeError('playtestSoulTuning must be boolean');
  if(playtestSoulTuning&&(researchPokeSoulTransfer!==0||researchSoulGainPerAction!==0))
    throw new RangeError('playtest Soul tuning cannot mix with research-only Soul injections');
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
  const rentals=playtestSoulTuning
    ?RENTAL_SQUAD.map((unit,i)=>({...unit,
      attitude:SCHOOL_RENTAL_PERSONALITIES[i].attitude,
      loafChance:SCHOOL_RENTAL_PERSONALITIES[i].loafChance,
      weights:[...SCHOOL_RENTAL_PERSONALITIES[i].weights]}))
    :RENTAL_SQUAD;
  const source=teams??[rentals,rentals];
  if(!Array.isArray(source)||source.length!==2||!source.every(x=>Array.isArray(x)&&x.length===6))throw new TypeError('requires two rosters of six');
  const squads=source.map((team,side)=>team.map((member,i)=>buildMember(member,side,i)));
  if(!researchDamageModel&&squads.flat().some(m=>
    m.techniquePlaySources>0||m.techniquePenetrate===true))
    throw new RangeError('Technique Play/Penetrate research requires researchDamageModel');
  // Resolve ONCE at battle start. The only changed input to the existing
  // physical-hit loop is the definition of power and hit count.
  // Unsupported/custom teams never silently inherit an original-rental ID.
  const catalogAttackByActor=catalogAttackResolution?new Map(
   squads.flatMap(team=>team.map((member,index)=>[
    member.id,resolveRentalAttackSpec(member,index,{school:playtestSoulTuning})
   ]))):null;
  const catalogTechniqueByActor=catalogTechniqueResolution?new Map(
   squads.flatMap(team=>team.map((member,index)=>[
    member.id,resolveRentalTechniqueSpec(member,index,{school:playtestSoulTuning})
   ]))):null;
  const catalogInspiritByActor=catalogInspiritResolution?new Map(
   squads.flatMap(team=>team.map((member,index)=>[
    member.id,resolveRentalInspiritSpec(member,index,{school:playtestSoulTuning})
   ]))):null;
  const catalogSoultimateByActor=catalogSoultimateResolution?new Map(
   squads.flatMap(team=>team.map((member,index)=>[
    member.id,resolveRentalSoultimateSpec(member,index,{school:playtestSoulTuning})
   ]))):null;
  const catalogSkillByActor=catalogSkillResolution?new Map(
   squads.flatMap(team=>team.map((member,index)=>[
    member.id,resolveRentalSkillSpec(member,index,{school:playtestSoulTuning})
   ]))):null;
  const skillFor=member=>catalogSkillByActor?.get(member.id)?.legacyKey??member.skill;
  // Stat reductions and HP-over-time are distinct move categories.
  // Do not enable unverified negative HP-loss math to use real debuff types.
  const statDebuffs=['strength-down','defense-down','spirit-down'];
  if(squads.flat().some(m=>statDebuffs.includes(m.inspirit))&&
      !researchStatInspirits&&!researchTurnInspirits)
    throw new RangeError('stat debuffs require researchStatInspirits');
  if(squads.flat().some(m=>['hp-loss','hp-regen'].includes(m.inspirit))&&
      !researchTurnInspirits)
    throw new RangeError('HP-over-time Inspirits require researchTurnInspirits');
  const byId=new Map(squads.flat().map(x=>[x.id,x]));
  const skillBoosts=new Map();
  const spentLastStand=new Set();
  const soul=createSoulSystem({teams:squads.map(team=>team.map(m=>({id:m.id,capacity:m.soulCapacity})))});
 const statuses=createInspiritLedger([...byId.keys()]);
  const clock=createBattle({seed,teams:squads.map(t=>t.map(m=>({name:m.name,speed:m.speed}))),rotationCooldownMs,
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
  function markCounterUnknown(hitId,reason){
    const prev=uncertainCounterHits.get(hitId);
    if(!prev){uncertainCounterHits.set(hitId,reason);return;}
    if(prev.code===reason.code){
      uncertainCounterHits.set(hitId,{...prev,...reason});return;
    }
    const extras=[...(prev.additionalReasons||[])];
    const index=extras.findIndex(x=>x.code===reason.code);
    if(index>=0)extras[index]=reason;
    else extras.push(reason);
    uncertainCounterHits.set(hitId,{...prev,additionalReasons:extras});
  }
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
          const causes=[uncertainty,...(uncertainty.additionalReasons||[])];
          const wheelCause=causes.find(x=>x.rotations!==undefined);
          const cutinCause=causes.find(x=>x.cutinFrontlineTimeline!==undefined);
          events.push({type:'counter-hit-indeterminate',hitId:hit.id,
            hitAt:hit.hitAt,frontLock:hit.frontLock,possibleFixtureTargets:[...hit.targetIds],
            reason:uncertainty.code,
            reasonCodes:causes.map(x=>x.code),
            ...(wheelCause?{rotationCount:wheelCause.rotations}:{}),
            ...(cutinCause?{candidateCutinFronts:cutinCause.cutinFrontlineTimeline.map(x=>({at:x.at,frontIds:[...x.frontIds]})),
              cutinHistoryTruncated:cutinCause.historyTruncated}:{}),
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
  // V3-2: one canonical effect commit point for direct hits (physical,
  // Soultimate, Poke), healing and ledger mutation. Formulae, random rolls
  // and hit->interruption->KO order remain exactly as in the legacy host.
  // Each trigger is now resolved through the same passive hook registry.
  // The closure runs only after skillHooks is initialized, at damage commit.
  let skillHooks;
  const effects=createEffectCommitter({
    resolveDirectDamage:(target,incoming)=>skillHooks.beforeLethalDamage(
      target,incoming,spentLastStand.has(target.id)),
    onSurvival:target=>{
      spentLastStand.add(target.id);
      events.push({type:'skill',actor:target.id,skill:'lastStand',
        label:'どひょうぎわ型',kind:'発動',remainingHp:1});
    },
    applyStatus:spec=>statuses.apply(spec),
    onStatus:id=>syncCanAct(id)
  });
  skillHooks=createSkillHookPipeline({
    enabled:enableRentalSkills,skillOf:skillFor,teams:squads,
    boosts:skillBoosts,byId,emit:e=>events.push(e),
    commitHeal:(recipient,amount)=>effects.commitHeal(recipient,amount)
  });
  const koLifecycle=createKnockoutLifecycle({
    syncEligibility:id=>syncCanAct(id),
    afterEnemyKO:(caster,target)=>skillHooks.afterEnemyKO(caster,target),
    refreshPins:()=>syncPinned()
  });
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
  function applyInspirit({id,sign,effect,source=null,duration=null,level=1}={}){
    if(winner!==null)throw new Error('battle finished');
    if(!byId.has(id))throw new RangeError('unknown member');
    if(!['sleep','strength-up','research-marker','strength-down','defense-down',
      'spirit-down','hp-loss','hp-regen'].includes(effect))
      throw new RangeError('effect not modeled');
    const positive=['strength-up','hp-regen','research-marker'];
    if(positive.includes(effect)&&sign!=='positive'&&effect!=='research-marker')
      throw new RangeError('positive effect requires positive sign');
    if(!positive.includes(effect)&&sign!=='negative')
      throw new RangeError('negative effect requires negative sign');
    if(['strength-down','defense-down','spirit-down'].includes(effect)&&
       !researchStatInspirits&&!researchTurnInspirits)
      throw new RangeError('stat Inspirit requires researchStatInspirits');
    if(['hp-loss','hp-regen'].includes(effect)&&!researchTurnInspirits)
      throw new RangeError('HP-over-time Inspirit requires researchTurnInspirits');
    if(effect==='sleep'&&duration!==null)throw new RangeError('sleep owner-turn duration is unsupported');
    return effects.commitStatus({id,sign,effect,source,duration,level});
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
  function rotate(side,direction,atMs=0){
    if(winner!==null)throw new Error('battle finished');
    // Drain a hit whose scheduled timestamp is already due, BEFORE applying
    // a later wheel input. Otherwise setFront could erase its queued HP impact.
    if(counter){
      advancePresentation(0);
      if(winner!==null)throw new Error('battle finished');
    }
    const result=clock.rotate(side,direction,atMs);
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
          for(const hit of affected)markCounterUnknown(hit.id,update.uncertainty);
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
    const sourceMove=referenceMove&&caster.id==='A1'?referenceMove:null;
    const resolvedSpec=sourceMove?yw2ReferenceSpecialDefinition(sourceMove.id):
      catalogSoultimateByActor?.get(caster.id)?.definition??caster.special;
    const actualHitCount=sourceMove?.hitsPerTarget??researchSoultimateHitCount;
    const impacts=planResearchSpecial({
      spec:resolvedSpec,caster,
      allies:researchSpecialAllies(resolvedSpec,squads[side],livingFront(side)),enemies,
      powerMultiplier:result.powerMultiplier,pinnedId
    });
    const interruptions=[];
    const hitRecords=[];
    for(const impact of impacts){
      const target=byId.get(impact.targetId);
      if(impact.kind==='buff'||impact.kind==='debuff'){
        // Status ledger/resistance shared with regular Inspirits.
        const resisted=impact.kind==='debuff'&&rng()*100<target.inspiritResistance;
        impact.resisted=resisted;
        if(!resisted){
          applyInspirit({id:target.id,sign:impact.statusSign,
            effect:impact.statusEffect,level:impact.statusLevel,source:caster.id});
          impact.applied=true;
        }else impact.applied=false;
        continue;
      }
      if(actualHitCount!==null&&impact.kind==='damage'){
        // Each hit changes actual host HP. This is NOT original move data:
        // per-hit count is a fixture selected explicitly for a custom team.
        const originalHp=target.hp;
        const moveKind=resolvedSpec.damageKind;
        let total=0;
        for(let k=0;k<actualHitCount&&target.hp>0;k++){
          const hpBefore=target.hp;
          const chance=yw2HitProbability({kind:moveKind,
            attackerSpeed:caster.speed,targetSpeed:target.speed,
            moveAccuracy:caster.attackAccuracy}).probability;
          const hit=rollPercent(chance,rng());
          let critical=false,damage=0;
          if(hit){
            critical=rng()*99<yw2CriticalProbability({
              loafing:loafingActors.has(target.id),
              moveCritBonus:caster.moveCritBonus,
              criticalImmune:target.criticalImmune}).units;
            const statStage=deriveStatStage(statuses.list(caster.id),
              moveKind==='attack'?'strength':'spirit');
            const defenseStage=deriveStatStage(statuses.list(target.id),'defense');
            const formula=calculateOneHit({
              kind:moveKind,power:resolvedSpec.power*result.powerMultiplier,
              strength:caster.strength,spirit:caster.spirit,
              defense:target.defense,criticalDefense:target.criticalDefense,
              hits:actualHitCount,critical,guarded:target.guard,
              guardBoost:target.guardBoost??false,guardBreak:caster.guardBreak,
              statStage,defenseStage
            });
            let attempt=formula.amount;
            if(!formula.guardApplied){
              const spread=Math.floor(attempt/10+1);
              attempt=Math.max(1,Math.min(999,
                attempt+Math.floor(rng()*(2*spread+1))-spread));
            }
            const applied=effects.commitDamage(target,Math.min(target.hp,attempt));
            damage=applied.amount;
            if(applied.activated)impact.lastStand=true;
            const interrupted=interruptOnHit(target,damage,critical);
            if(interrupted)interruptions.push(interrupted);
          }
          total+=damage;
          hitRecords.push({sequence:hitRecords.length+1,
            targetId:target.id,targetSequence:k+1,hit,critical,
            damage,hpBefore,hpAfter:target.hp});
        }
        impact.hpBefore=originalHp;
        impact.hpAfter=target.hp;
        impact.amount=total;
        impact.deltaHp=-total;
        impact.predictedKO=target.hp===0;
        impact.model='custom-soultimate-multi-hit-fixture';
      }else if(impact.kind==='damage'||impact.kind==='damage-status'||impact.kind==='drain'){
        const damage=effects.commitDamage(target,impact.amount);
        impact.amount=damage.amount;
        impact.deltaHp=-damage.amount;
        impact.hpAfter=damage.hpAfter;
        impact.predictedKO=target.hp===0;
        if(damage.activated)impact.lastStand=true;
      }else if(impact.kind==='heal'||impact.kind==='revive'){
        // A shared bounded HP commit for normal techniques and specials.
        effects.commitHeal(target,Math.max(0,impact.hpAfter-target.hp));
      }else target.hp=impact.hpAfter;
      if(!(actualHitCount!==null&&impact.kind==='damage')&&
         (impact.kind==='damage'||impact.kind==='damage-status'||impact.kind==='drain')){
        const changed=interruptOnHit(target,impact.amount,false);
        if(changed)interruptions.push(changed);
      }
      if(impact.predictedKO){
        koLifecycle.commit({caster,target,eligibilityPhase:'after-skill'});
      }else if(impact.kind==='revive'&&impact.revived){
        // A KO ally, including a reserve, can act again on being rotated in.
        syncCanAct(target.id);
      }
      if(impact.kind==='damage-status'){
        // An attack cannot Inspirit a member it just KOed. Effect odds and
        // level are temporary; never label as exact original game data.
        const resisted=target.hp<=0||rng()*100<target.inspiritResistance;
        impact.resisted=resisted;
        if(!resisted){
          applyInspirit({id:target.id,sign:impact.statusSign,
            effect:impact.statusEffect,level:impact.statusLevel,source:caster.id});
          impact.applied=true;
        }else impact.applied=false;
      }
    }
    syncPinned();
    if(squads.some(team=>team.every(member=>member.hp===0)))
      winner=squads[0].every(m=>m.hp===0)?1:0;
    const entry={type:'special',mode:result.kind,actor:caster.id,
      impacts:impacts.map(x=>({...x})),interruptions,winner,model:'research-fixture',
      ...(sourceMove?{referenceSoultimate:{id:sourceMove.id,
        evidence:sourceMove.evidence,hitCount:sourceMove.hitsPerTarget,
        scope:sourceMove.targetScope,sourceRefs:[...sourceMove.sourceRefs],
        limitation:'original-shape-only; applied RNG/visual timing are research'}}:{}),
      ...(hitRecords.length?{researchSoultimateHits:{
        model:'custom-roster-per-hit-fixture',
        plannedPerTarget:actualHitCount,
        originalHitCount:null,
        hits:hitRecords.map(x=>({...x}))
      }}:{})};
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
      // The player report establishes an Endure exception, but does NOT
      // establish which cut-in frame locks targets if the defending team
      // rotates during the cut-in. Never apply fictional HP in that case.
      if(planned.uncertainty)markCounterUnknown(planned.id,{
        ...planned.uncertainty,side:planned.attackerSide,
        candidateFronts:[...planned.targetIds]
      });
      if(wheel){
        const targetSide=planned.attackerSide;
        const group=wheel.snapshot().groups[targetSide];
        if(group?.rotations>=3){
          markCounterUnknown(planned.id,{
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
    // YW2's versus Poke has three documented EFFECT CLASSES:
    // HP damage, Soul drain, and rare 999-damage one-hit effect.
    // Exact chances and standard damage are not established. Trial uses
    // host-only seeded RNG; never allow client-specified Poke rewards.
    // The research/default-off paths remain unchanged for evidence audits.
    const enemy=byId.get(pending.targetId);
    let reward;
    if(playtestSoulTuning){
      const chosen=choosePlaytestPokeOutcome(rng());
      if(chosen==='damage'||chosen==='heavy-hit'){
        const nominal=chosen==='heavy-hit'
          ?PLAYTEST_SOUL_TUNING.pokeHeavyDamage:PLAYTEST_SOUL_TUNING.pokeNormalDamage;
        const damage=effects.commitDamage(enemy,Math.min(enemy.hp,nominal));
        const amount=damage.amount;
        const interruption=interruptOnHit(enemy,amount,false);
        if(enemy.hp===0)koLifecycle.commit({target:enemy,refreshPin:true});
        if(squads.some(team=>team.every(unit=>unit.hp===0)))
          winner=squads[0].every(unit=>unit.hp===0)?1:0;
        reward={kind:chosen==='heavy-hit'?'playtest-heavy-hit':'playtest-damage',
          effect:chosen,amount,nominalDamage:nominal,targetHpAfter:enemy.hp,
          sourceId:enemy.id,recipientId:null,
          ...(interruption?{interruption}:{}) ,
          winner,model:'playtest-estimate'};
      }else{
        const targetSoul=soul.snapshot().teams[1-side].find(x=>x.id===enemy.id);
        const recipient=livingFront(side)[0]??null;
        const receiverSoul=recipient?soul.snapshot().teams[side].find(x=>x.id===recipient.id):null;
        const amount=recipient?Math.min(PLAYTEST_SOUL_TUNING.pokeMaxTransfer,
          targetSoul.soul,receiverSoul.capacity-receiverSoul.soul):0;
        if(amount>0){
          soul.setSoul(enemy.id,targetSoul.soul-amount);
          soul.addSoul(recipient.id,amount);
        }
        reward={kind:'playtest-soul-transfer',effect:'soul-drain',amount,
          recipientId:recipient?.id??null,sourceId:enemy.id,
          model:'playtest-estimate'};
      }
    }else{
      const targetSoul=soul.snapshot().teams[1-side].find(x=>x.id===enemy.id);
      const recipient=livingFront(side)[0]??null;
      const receiverSoul=recipient?soul.snapshot().teams[side].find(x=>x.id===recipient.id):null;
      const amount=researchPokeSoulTransfer>0&&recipient
        ?Math.min(researchPokeSoulTransfer,targetSoul.soul,
          receiverSoul.capacity-receiverSoul.soul):0;
      if(amount>0){
        soul.setSoul(enemy.id,targetSoul.soul-amount);
        soul.addSoul(recipient.id,amount);
      }
      reward={kind:researchPokeSoulTransfer>0?'research-soul-transfer':'unresolved',
        amount,recipientId:recipient?.id??null,sourceId:enemy.id,model:'research-only'};
    }
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
        // The entire visible front is KO, but reserves still have HP.
        // Force the compulsory substitution past the player-only cooldown;
        // otherwise a long real-host timestamp or even a second KO swap
        // leaves online auto progression stuck in awaiting_rotation.
        const moved=clock.rotate(side,1,0,{automaticKo:true});
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
    return {seed,winner,pins:[...pins],clock:clock.snapshot(),
      skillBoosts:Object.fromEntries([...skillBoosts].map(([id,boost])=>[id,{...boost}])),
      spentLastStand:[...spentLastStand],
      squads:squads.map(t=>t.map(m=>({...m,weights:[...m.weights],
      elementResistances:{...m.elementResistances}}))),// Event IDs are absolute in this match, not indices in the sliding last-80 window.
      // This is DISPLAY metadata only and never advances the battle/RNG.
      events:events.slice(-80).map((e,i)=>({...e,eventId:events.length-Math.min(events.length,80)+i+1})),soul:soul.snapshot(),
      guided:guided.map(g=>g?{token:g.token,id:g.id,kind:g.kind,challenge:g.trial.snapshot()}:null),
      purification:purification.map(p=>p?{id:p.id,challenge:p.trial.snapshot()}:null),
      poke:{active:pokes.map(p=>p?{targetId:p.targetId,challenge:p.trial.snapshot()}:null),
        used:pokedTargets.map(set=>[...set]),loafing:[...loafingActors],
        rewardFixture:researchPokeSoulTransfer,
         ...(playtestSoulTuning?{playtestSoulTuning:{...PLAYTEST_SOUL_TUNING}}:{})},
      inspirits:Object.fromEntries([...byId.keys()].map(id=>[id,statuses.list(id)])),
      ...(presentation?{presentation:presentation.snapshot()}:{}),
      ...(counter?{counterWindow:counter.snapshot(),counterEffectsPending:pendingCounterEffects.size}:{}),
      ...(wheel?{wheelCoalescing:wheel.snapshot(),
        uncertainCounterHits:[...uncertainCounterHits].map(([hitId,reason])=>({hitId,reason:JSON.parse(JSON.stringify(reason))}))}:{})};
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
    const existingBoost=skillBoosts.get(actor.id)||null;
    loafingActors.delete(actor.id);
    // A guard lasts until the next time that actor begins an action.
    actor.guard=false;
    const kind=enableLoafing&&rng()*100<actor.loafChance?'loaf':choice(actor);
    // Resolve before branches: event metadata is emitted after every kind,
    // and the legacy source fields remain the exact fallback.
    const attackSpec=kind==='attack'?catalogAttackByActor?.get(actor.id):null;
    const attackPower=attackSpec?.power??actor.attackPower;
    const techniqueSpec=kind==='technique'?catalogTechniqueByActor?.get(actor.id):null;
    const techniquePower=techniqueSpec?.power??actor.techniquePower;
    const techniqueKind=techniqueSpec?.kind??actor.technique;
    const techniqueElement=techniqueSpec?.element??actor.techniqueElement;
    const techniqueHits=techniqueSpec?.hits??actor.techniqueHits;
    let target=null,amount=0,hit=true,critical=false,effect=null,resisted=false,interruption=null,damageResearch=null,
      hitResearch=null,criticalResearch=null,multiHitDetails=null,healingResearch=null;
    if(kind==='guard'){
      actor.guard=true;
    }else if(kind==='loaf'){
      // The vulnerable window until this actor next acts is a research
      // approximation. Source confirms loafing can trigger Zero Poke.
      loafingActors.add(actor.id);
    }else if(kind==='inspirit'){
      const inspiritSpec=catalogInspiritByActor?.get(actor.id);
      const sign=inspiritSpec?.sign??(
       ['sleep','strength-down','defense-down','spirit-down','hp-loss']
        .includes(actor.inspirit)?'negative':'positive');
      const inspiritEffect=inspiritSpec?.effect??actor.inspirit;
      const group=sign==='negative'?livingFront(1-actor.side):livingFront(actor.side);
      const candidates=group.filter(x=>!statuses.has(x.id,inspiritEffect));
      if(!candidates.length)throw new Error('Inspirit selected without eligible target');
      target=sign==='negative'
       ? candidates.find(m=>m.id===pins[actor.side])??candidates[Math.floor(rng()*candidates.length)]
       : candidates[Math.floor(rng()*candidates.length)];
      effect=inspiritEffect;
      // Resistance formula is cross-version research; unit resistance is a TEST fixture.
      resisted=sign==='negative'&&rng()*100<target.inspiritResistance;
      hit=!resisted;
      if(hit)applyInspirit({id:target.id,sign,effect,source:actor.id,
       level:inspiritSpec?.level??actor.inspiritLevel});
    }else if(kind==='technique'&&techniqueKind==='heal'){
      const hurt=livingFront(actor.side).filter(x=>x.hp<x.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
      target=hurt[0]??null;
      if(!target)throw new Error('healing selected without injured ally');
      if(researchDamageModel){
        healingResearch=calculateHeal({
          power:techniquePower,spirit:actor.spirit,
          spiritStage:deriveStatStage(statuses.list(actor.id),'spirit'),
          targetHp:target.hp,maxHp:target.maxHp,
          varianceRoll:researchHealingVariance?rng():null
        });
        amount=effects.commitHeal(target,healingResearch.amount).amount;
      }else{
        // Provisional legacy base healing magnitude.
        const heal=Math.max(1,Math.floor((techniquePower+actor.spirit)/3));
        amount=effects.commitHeal(target,Math.min(target.maxHp-target.hp,heal)).amount;
      }
    }else{
      const opponents=livingFront(1-actor.side);
      target=opponents.find(m=>m.id===pins[actor.side])??opponents[Math.floor(rng()*opponents.length)];
      const attemptedHits=researchMultiHit
        ?(kind==='attack'?(attackSpec?.hits??actor.attackHits):techniqueHits):1;
      if(researchMultiHit)multiHitDetails=[];
      hit=false;critical=false;
      for(let index=0;index<attemptedHits;index++){
        let landed=false,oneCritical=false,oneDamage=0,oneInterruption=null;
        if(researchDamageModel){
          hitResearch=yw2HitProbability({kind,attackerSpeed:actor.speed,targetSpeed:target.speed,
            moveAccuracy:actor.attackAccuracy});
          landed=rollPercent(hitResearch.probability,rng());
        }else landed=rng()*100<hitChance(actor,target);
        if(landed){
          hit=true;
          if(researchDamageModel){
            criticalResearch=yw2CriticalProbability({
              loafing:loafingActors.has(target.id),
              moveCritBonus:skillHooks.beforeCriticalRoll(actor,actor.moveCritBonus),
              criticalImmune:skillHooks.beforeDefenderCriticalRoll(target,target.criticalImmune)});
            oneCritical=rng()*99<criticalResearch.units;
          }else oneCritical=rng()*99<1;
          critical=critical||oneCritical;
          let damage;
          if(researchDamageModel){
            const statStage=Math.max(-8,Math.min(8,
              deriveStatStage(statuses.list(actor.id),kind==='attack'?'strength':'spirit')+
              (enableRentalSkills?skillMomentumStage(skillBoosts.get(actor.id)):0)));
            const defenseStage=deriveStatStage(statuses.list(target.id),'defense');
            const elementResolution=kind==='technique'&&techniqueKind==='damage'
              ?resolveTechniqueElementMultiplier({
                 element:techniqueElement,
                 resistances:target.elementResistances,
                 playSources:actor.techniquePlaySources??0,
                 penetrate:actor.techniquePenetrate??false
               }):null;
            const elemental=elementResolution?.multiplier??1;
            damageResearch=calculateOneHit({
              kind,power:kind==='attack'?attackPower:techniquePower,
              strength:actor.strength,spirit:actor.spirit,defense:target.defense,
              criticalDefense:target.criticalDefense,critical:oneCritical,
              guarded:target.guard,guardBoost:target.guardBoost??false,
              guardBreak:skillHooks.beforeGuardedPhysicalHit(actor,actor.guardBreak),
              elementMultiplier:elemental,statStage,defenseStage,hits:attemptedHits
            });
            // Keep default rental metadata unchanged; only explicit custom
            // research scenarios reveal the separate elemental sources.
            if(elementResolution&&(actor.techniquePlaySources||actor.techniquePenetrate))
              damageResearch={...damageResearch,elementResolution};
            damage=damageResearch.amount;
          }else{
            const momentum=enableRentalSkills?skillMomentumStage(skillBoosts.get(actor.id)):0;
            const extra=momentum?1.2:1;
            damage=baseDamage({...actor,attackPower,
              strength:Math.floor(actor.strength*(statuses.has(actor.id,'strength-up')?1.10:1)*extra),
              spirit:Math.floor(actor.spirit*extra)},target,kind,oneCritical);
            if(target.guard&&!skillHooks.beforeGuardedPhysicalHit(actor,actor.guardBreak)&&kind==='attack')
              damage=Math.max(1,Math.floor(damage*(target.guardBoost?.25:.5)));
            else if(target.guard&&kind==='technique')
              damage=Math.max(1,Math.floor(damage*(target.guardBoost?.25:.5)));
          }
          // A separate seeded spread is drawn for each unguarded hit.
          if(!target.guard||damageResearch?.guardIgnored||(kind==='attack'&&skillHooks.beforeGuardedPhysicalHit(actor,false))){
            const range=Math.floor(damage/10+1);
            damage=Math.max(1,Math.min(999,damage+Math.floor(rng()*(2*range+1))-range));
          }
          const dealt=effects.commitDamage(target,Math.min(target.hp,damage));
          oneDamage=dealt.amount;
          amount+=oneDamage;
          oneInterruption=interruptOnHit(target,oneDamage,oneCritical);
          if(oneInterruption?.stopped||!interruption)interruption=oneInterruption??interruption;
          if(target.hp===0)koLifecycle.commit({
            caster:actor,target,refreshPin:true
          });
        }
        if(multiHitDetails)multiHitDetails.push({
          index:index+1,hit:landed,critical:oneCritical,
          amount:oneDamage,targetHpAfter:target.hp,
          interruption:oneInterruption?{...oneInterruption}:null
        });
        if(target.hp===0)break; // remaining hits cannot strike a KO body
      }
    }
    let turnInspirit=null;
    if(researchTurnInspirits&&actor.hp>0){
      const next=calculateTurnInspirit({
        statuses:statuses.list(actor.id),currentHp:actor.hp,maxHp:actor.maxHp});
      if(next.amount>0){
        actor.hp=next.hpAfter;
        if(actor.hp===0){syncCanAct(actor.id);syncPinned();}
        turnInspirit={id:actor.id,...next};
      }
    }
    if(squads.some(team=>team.every(member=>member.hp===0)))winner=squads[0].every(m=>m.hp===0)?1:0;
    const action={type:'action',turn:clockEvent.action,elapsed:clockEvent.elapsed,pointsElapsed:clockEvent.pointsElapsed,
      actor:actor.id,kind:kind==='technique'&&techniqueKind==='heal'?'heal':kind,target:target?.id??null,
      hit,critical,amount,targetHp:target?.hp??null,guard:target?.guard??false,effect,resisted,interruption,winner,
      ...(turnInspirit?{turnInspirit:{...turnInspirit}}:{}),
      ...(healingResearch?{healingResearch:{...healingResearch}}:{}),
      ...(multiHitDetails?{multiHit:{attempted:multiHitDetails.length,
        planned:kind==='attack'?(attackSpec?.hits??actor.attackHits):techniqueHits,
        totalDamage:amount,landed:multiHitDetails.filter(x=>x.hit).length,
        criticalHits:multiHitDetails.filter(x=>x.critical).length,
        hits:multiHitDetails.map(x=>({...x,interruption:x.interruption?{...x.interruption}:null})),
        model:'research-per-hit'}}:{}),
      ...(researchDamageModel&&hitResearch?{
        hitResearch:{...hitResearch},
        ...(criticalResearch?{criticalResearch:{...criticalResearch}}:{})
      }:{}),
      ...(damageResearch?{damageResearch:{
        ...damageResearch,techniqueElement:kind==='technique'?techniqueElement:'neutral',
        sourceMovePower:kind==='attack'?attackPower:techniquePower,
        targetId:target?.id??null
      }}:{}),
      ...(researchOpeningPriority?{priorityKind:clockEvent.priorityKind,
        skippedId:clockEvent.skippedId,flashConsumed:clockEvent.flashConsumed,
        priorityConfidence:'research-fixture'}:{})};
    events.push(action);
    // Legacy action boundary order is preserved: action -> Care ->
    // existing-owner boost countdown -> turn-status tick.
    skillHooks.afterAnyAction(actor,existingBoost);
    if(turnInspirit)events.push({type:'turn-inspirit',turn:clockEvent.action,
      actor:actor.id,...turnInspirit});
    recordView({side:actor.side,kind:'action',memberId:actor.id,detail:action.kind});
    if(researchSoulGainPerAction>0){for(const member of squads.flat())if(member.hp>0)soul.addSoul(member.id,researchSoulGainPerAction);}
    if(playtestSoulTuning){
      // Friendly-match temporary pacing. NOT measured original-game numbers.
      const didDamageAction=kind==='attack'||
        (kind==='technique'&&techniqueKind==='damage');
      const vulnerableHit=didDamageAction&&hit&&target!==null&&
        (loafingActors.has(target.id)||
         statuses.list(target.id).some(x=>x.sign==='negative'));
      const plannedGain=didDamageAction
        ?(kind==='attack'?PLAYTEST_SOUL_TUNING.attackGain:
          PLAYTEST_SOUL_TUNING.techniqueGain)+
          (vulnerableHit?PLAYTEST_SOUL_TUNING.vulnerableHitBonus:0)
        :PLAYTEST_SOUL_TUNING.nonAttackGain;
      if(actor.hp>0){
        const before=soul.snapshot().teams[actor.side].find(x=>x.id===actor.id).soul;
        const after=soul.addSoul(actor.id,plannedGain);
        action.soulPlaytest={model:'playtest-estimate',
          gained:after-before,vulnerableHit,plannedGain};
      }
    }else if(researchSoulRecoveryMode==='owner-nonattack'){
      // Empirical YW2 player report: +5 Soul after a nonattack owner's turn.
      // Research/default-off mode deliberately still avoids unknown attacks.
      const didNotAttack=kind==='guard'||kind==='loaf'||kind==='inspirit'||
        (kind==='technique'&&techniqueKind==='heal');
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
