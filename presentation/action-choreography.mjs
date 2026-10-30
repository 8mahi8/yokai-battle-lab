/**
 * Phase45 original-experience rebuild: read-only action choreography contract.
 *
 * Input is an event ALREADY RESOLVED by the authoritative combat engine.
 * This module may schedule pictures, but NEVER deals damage, changes HP, Soul,
 * action order, sends networking commands, or infers authoritative outcomes.
 *
 * The three visual phases are an initial scaffold; original 3DS timings and
 * pose keyframes require actual video comparison, not invented parity claims.
 */
import {ACTION_VISUAL_CATALOG} from './action-catalog.mjs';
import {defineActionOutcomeV2} from '../contracts/action-outcome-v2.mjs';
import {assertSoultimateImpactLedger} from '../contracts/soultimate-impact-ledger-v1.mjs';
import {assertSoultimateHitLedger} from '../contracts/soultimate-hit-ledger-v1.mjs';
import {yw2ReferenceSoultimate} from '../content/yw2-soultimate-reference.mjs';
export const CHOREOGRAPHY_SCHEMA=1;
const allowedTargets=new Set(['damage','heal','revive','buff','debuff','status','miss','dispel']);
const freezeTargets=values=>Object.freeze(values.map(e=>Object.freeze({...e})));
const isUnit=x=>typeof x==='string'&&/^[AB][1-6]$/.test(x);
function extractKind(event){
 if(event.type==='special')return 'special';
 if(event.type==='poke')return 'poke';
 if(event.type==='action'&&ACTION_VISUAL_CATALOG[event.kind]&&
    event.kind!=='poke'&&event.kind!=='special')return event.kind;
 throw new RangeError('unsupported canonical visual event');
}
function normalizeImpacts(event,kind){
 let targets;
 if(kind==='special')targets=event.targets??event.impacts??[];
 else if(kind==='poke')targets=event.targets??(event.targetId?[{
    id:event.targetId,kind:'damage',amount:0,hit:true}]:[]);
 else if(event.targets!==undefined)targets=event.targets;
 else if(event.target)targets=[{id:event.target,
  kind:kind==='heal'?'heal':kind==='inspirit'?'status':'damage',
  hit:event.hit!==false,amount:event.amount??0}];
 else targets=[];
 if(!Array.isArray(targets))throw new TypeError('impacts must be array');
 if(targets.length>12)throw new RangeError('too many impacts');
 return freezeTargets(targets.map(raw=>{
  if(!raw||typeof raw!=='object')throw new TypeError('invalid impact');
  const id=raw.id??raw.targetId;
  if(!isUnit(id))throw new TypeError('invalid target id');
  const effect=kind==='inspirit'?'status':raw.kind??'damage';
  if(!allowedTargets.has(effect))throw new RangeError('invalid visual impact kind');
  const hit=raw.hit!==false&&raw.applied!==false;
  const amount=raw.amount??0;
  if(!Number.isFinite(amount)||amount<0||amount>99999)
   throw new RangeError('visual amount must be nonnegative');
  return {targetId:id,effect,hit,amount};
 }));
}
/** Build a deterministic VISUAL instruction plan; no DOM/network/clock reads. */
export function planActionChoreography(event){
 if(!event||typeof event!=='object'||Array.isArray(event))
  throw new TypeError('canonical event required');
 const kind=extractKind(event);
 const actorId=event.actor??null;
 if(actorId!==null&&!isUnit(actorId))throw new TypeError('invalid actor');
 const preset=ACTION_VISUAL_CATALOG[kind];
 const durationMs=preset.windupMs+preset.impactMs+preset.recoveryMs;
 const impacts=normalizeImpacts(event,kind);
 // V2 migration: ordered, already-resolved hit metadata (NOT damage logic).
 // The existing renderer still presents one aggregate damage cue; a future
 // phase can schedule the individual hits without guessing outcomes.
 const actionOutcomeV2=event.actionOutcomeV2?
  defineActionOutcomeV2(event.actionOutcomeV2):null;
 const specialImpactLedger=event.specialImpactLedger??null;
 const specialHitLedger=event.specialHitLedger??null;
 if(specialImpactLedger){
  assertSoultimateImpactLedger(specialImpactLedger);
  if(kind!=='special'||actorId!==specialImpactLedger.actorId||
     event.key!=='event:'+specialImpactLedger.eventId||
     impacts.length!==specialImpactLedger.impacts.length)
   throw new TypeError('Soultimate impact ledger identity/target conflict');
  for(let i=0;i<impacts.length;i++){
   const source=specialImpactLedger.impacts[i];
   const expected=['heal','revive','buff','debuff','dispel'].includes(source.kind)?
     source.kind:'damage';
   if(impacts[i].targetId!==source.targetId||
      impacts[i].amount!==source.amount||impacts[i].effect!==expected||
      (['buff','debuff','dispel'].includes(source.kind)&&
       impacts[i].hit!==source.applied))
    throw new TypeError('Soultimate visual target contradicts host ledger');
  }
 }
 if(specialHitLedger){
  assertSoultimateHitLedger(specialHitLedger);
  if(kind!=='special'||!specialImpactLedger||
     specialHitLedger.eventId!==specialImpactLedger.eventId||
     specialHitLedger.actorId!==actorId||
     specialHitLedger.originalHitCount!==null)
   throw new TypeError('Soultimate hits lack a matching host target ledger');
  let cursor=0;
  for(const impact of specialImpactLedger.impacts){
   if(impact.kind!=='damage')throw new TypeError('non-damage special hit row');
   const subset=[];
   while(cursor<specialHitLedger.hits.length&&
      specialHitLedger.hits[cursor].targetId===impact.targetId)
    subset.push(specialHitLedger.hits[cursor++]);
   if(!subset.length||subset[0].hpBefore!==impact.hpBefore||
      subset.at(-1).hpAfter!==impact.hpAfter||
      subset.reduce((sum,h)=>sum+h.damage,0)!==impact.amount)
    throw new TypeError('Soultimate hit rows contradict host target totals');
  }
  if(cursor!==specialHitLedger.hits.length)
   throw new TypeError('unmatched host Soultimate hit rows');
 }
 const referenceSoultimate=event.referenceSoultimate??null;
 if(referenceSoultimate){
  const ref=yw2ReferenceSoultimate(referenceSoultimate.id);
  if(kind!=='special'||!specialHitLedger||!specialImpactLedger||
     ref.hitsPerTarget!==specialHitLedger.plannedPerTarget||
     referenceSoultimate.hitCount!==ref.hitsPerTarget||
     referenceSoultimate.scope!==ref.targetScope||
     referenceSoultimate.evidence!==ref.evidence||
     JSON.stringify(referenceSoultimate.sourceRefs)!==JSON.stringify(ref.sourceRefs)||
     specialImpactLedger.impacts.length> (ref.scope==='front'?3:1))
   throw new TypeError('source-backed YW2 visual move conflicts with host evidence');
 }
 if(actionOutcomeV2&&
   (kind!=='attack'||event.actor!==actionOutcomeV2.actorId||
    (event.moveId!==undefined&&event.moveId!==actionOutcomeV2.moveId)||
    (event.amount!==undefined&&event.amount!==actionOutcomeV2.outcome.totalDamage)||
    (event.key?.startsWith('event:')&&
      event.key!=='event:'+actionOutcomeV2.eventId)||
    (Array.isArray(event.hitResults)&&
      JSON.stringify(event.hitResults)!==JSON.stringify(actionOutcomeV2.outcome.hits))))
  throw new TypeError('ActionOutcome conflicts with visual cue');
 const moveId=actionOutcomeV2?.moveId??
  (typeof event.moveId==='string'&&event.moveId?event.moveId:null);
 const sourceHits=actionOutcomeV2?.outcome.hits??event.hitResults;
 const hitResults=Array.isArray(sourceHits)?
  Object.freeze(sourceHits.map((hit,index)=>{
   if(!hit||!isUnit(hit.targetId)||hit.sequence!==index+1||
      typeof hit.hit!=='boolean'||typeof hit.critical!=='boolean'||
      !Number.isSafeInteger(hit.damage)||hit.damage<0||
      !Number.isSafeInteger(hit.hpBefore)||hit.hpBefore<0||
      !Number.isSafeInteger(hit.hpAfter)||hit.hpAfter<0||
      hit.hpBefore-hit.hpAfter!==hit.damage)
    throw new TypeError('invalid resolved hit metadata');
   return Object.freeze({...hit});
  })):Object.freeze([]);
 if(hitResults.length>12)throw new RangeError('too many resolved hits');
 const key=typeof event.key==='string'&&event.key?event.key:
  event.type==='action'&&Number.isInteger(event.turn)&&event.turn>0?
   'action:'+event.turn:null;
 if(key===null)throw new TypeError('stable event key required');
 const phases=Object.freeze([
  Object.freeze({name:'anticipation',startMs:0,endMs:preset.windupMs}),
  Object.freeze({name:'impact',startMs:preset.windupMs,endMs:preset.windupMs+preset.impactMs}),
  Object.freeze({name:'recovery',startMs:preset.windupMs+preset.impactMs,endMs:durationMs})
 ]);
 return Object.freeze({
  schema:CHOREOGRAPHY_SCHEMA,eventKey:key,kind,actorId,
  label:preset.label,pose:preset.pose,durationMs,phases,impacts,
  moveId,hitResults,actionOutcomeV2,specialImpactLedger,specialHitLedger,
  referenceSoultimate
 });
}
/**
 * Absolute elapsed animation time is supplied by the caller (rAF timestamp
 * delta). Browsers suspend rAF in hidden tabs/iframes. This projection never
 * fast-forwards the authoritative battle or changes any state.
 */
export function choreographyFrame(plan,elapsedMs){
 if(!plan||plan.schema!==CHOREOGRAPHY_SCHEMA||
    !Number.isFinite(plan.durationMs)||!Array.isArray(plan.phases))
  throw new TypeError('valid choreography plan required');
 if(!Number.isFinite(elapsedMs)||elapsedMs<0)
  throw new RangeError('elapsedMs must be nonnegative');
 const timeMs=Math.min(elapsedMs,plan.durationMs);
 const finished=elapsedMs>=plan.durationMs;
 const phase=plan.phases.find(x=>timeMs<x.endMs)?.name??'done';
 const impactStart=plan.phases[1].startMs;
 const impactEnd=plan.phases[1].endMs;
 const impactVisible=timeMs>=impactStart;
 // Phase1.3 VISUAL TRIAL: divide the existing impact interval among the
 // recorded hits. This spacing is NOT a sourced original 3DS timing; only
 // the sequence, target, miss/critical, HP and damage came from the host.
 // A multi-target single hit must not use this timeline (no hit ledger).
 const hits=plan.hitResults??[];
 const hitIndex=impactVisible&&hits.length?
  Math.min(hits.length-1,Math.floor(
   (Math.min(timeMs,impactEnd)-impactStart)/(impactEnd-impactStart)*hits.length
  )):null;
 const currentHit=hitIndex===null?null:hits[hitIndex];
 const nextHitAtMs=phase==='impact'&&hitIndex!==null&&hitIndex+1<hits.length?
  impactStart+(hitIndex+1)*(impactEnd-impactStart)/hits.length:null;
 // Phase2.2: special IMPACT TARGETS are already host-resolved records,
 // not hits. An all-enemy one-strike move can have three targets and zero
 // verified per-hit records; do not turn those targets into three hits.
 // Stagger their visual cues only, preserving the original host target order.
 // These visual spacing intervals are a PLAYTEST prototype, not original
 // 3DS timing, and never change the authoritative effect application.
 const specialImpacts=plan.kind==='special'?plan.impacts:[];
 const specialTargetIndex=impactVisible&&specialImpacts.length?
  Math.min(specialImpacts.length-1,Math.floor(
   (Math.min(timeMs,impactEnd)-impactStart)/(impactEnd-impactStart)*
   specialImpacts.length)):null;
 const currentSpecialImpact=specialTargetIndex===null?null:
  specialImpacts[specialTargetIndex];
 const nextSpecialImpactAtMs=phase==='impact'&&specialTargetIndex!==null&&
  specialTargetIndex+1<specialImpacts.length?
  impactStart+(specialTargetIndex+1)*(impactEnd-impactStart)/
   specialImpacts.length:null;
 // Verified *host output*, not verified original YW2 move count.
 // Custom research may have multiple hits against the SAME target; keep
 // target indexing separate from the hit presentation clock.
 const specialHits=plan.specialHitLedger?.hits??[];
 const specialHitIndex=impactVisible&&specialHits.length?
  Math.min(specialHits.length-1,Math.floor(
   (Math.min(timeMs,impactEnd)-impactStart)/(impactEnd-impactStart)*specialHits.length
  )):null;
 const currentSpecialHit=specialHitIndex===null?null:specialHits[specialHitIndex];
 const nextSpecialHitAtMs=phase==='impact'&&specialHitIndex!==null&&
  specialHitIndex+1<specialHits.length?
  impactStart+(specialHitIndex+1)*(impactEnd-impactStart)/specialHits.length:null;
 const actualTargetIndex=currentSpecialHit?
  plan.impacts.findIndex(x=>x.targetId===currentSpecialHit.targetId):
  specialTargetIndex;
 const actualImpact=actualTargetIndex===null?null:plan.impacts[actualTargetIndex];
 const visibleImpacts=currentSpecialHit?Object.freeze([Object.freeze({
    targetId:currentSpecialHit.targetId,effect:'damage',hit:currentSpecialHit.hit,
    amount:currentSpecialHit.damage
  })]):plan.kind==='special'?
  (currentSpecialImpact?Object.freeze([currentSpecialImpact]):Object.freeze([])):
  impactVisible?plan.impacts:Object.freeze([]);
 return Object.freeze({eventKey:plan.eventKey,timeMs,phase,finished,
  actorPose:finished?'idle':phase==='anticipation'?plan.pose:
    phase==='impact'?plan.pose:'recover',
  impactVisible,impacts:visibleImpacts,
  hitIndex,currentHit,nextHitAtMs,
  specialTargetIndex:actualTargetIndex,currentSpecialImpact:actualImpact,
  nextSpecialImpactAtMs:currentSpecialHit?null:nextSpecialImpactAtMs,
  specialHitIndex,currentSpecialHit,nextSpecialHitAtMs});
}
