/**
 * ActionOutcome v2 - the data contract between an authoritative battle result
 * and transport/presentation. This module has NO RNG, rendering, state writes,
 * Firebase, timers or research move formulas.
 *
 * Phase1: one resolved normal physical attack only. The validator deliberately
 * refuses unrecorded hit numbers; heal, Inspirit and Soultimate adapters must
 * be added only when their authoritative result ledgers exist.
 */
export const ACTION_OUTCOME_SCHEMA=2;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
const unit=s=>typeof s==='string'&&/^[AB][1-6]$/.test(s);
const own=Object.prototype.hasOwnProperty;
const evidence=new Set(['observed','documented','fixture','unknown']);

export function validateActionOutcomeV2(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||
    data.schema!==ACTION_OUTCOME_SCHEMA)throw new TypeError('ActionOutcome v2 required');
 if(!positive(data.eventId)||!positive(data.actionId)||
    !unit(data.actorId)||typeof data.moveId!=='string'||!data.moveId||
    data.actionKind!=='attack'||!evidence.has(data.moveEvidence)||
    data.source!=='host-recorded-hit-results')
  throw new TypeError('invalid ActionOutcome identity/source');
 if(!data.outcome||typeof data.outcome!=='object'||Array.isArray(data.outcome)||
    !Array.isArray(data.outcome.hits)||!Array.isArray(data.outcome.effects)||
    data.outcome.hits.length<1||data.outcome.hits.length>12||
    !nonnegative(data.outcome.plannedHitCount)||
    data.outcome.hits.length>data.outcome.plannedHitCount||
    !nonnegative(data.outcome.totalDamage)||
    ![null,0,1].includes(data.outcome.winner))
  throw new TypeError('invalid ActionOutcome resolution');
 // No additional effects or multi-target inference while the legacy action
 // event has no reliable hit-by-hit status/soul records.
 if(data.outcome.effects.length!==0)
  throw new TypeError('unverified non-damage effects');
 let previous=null,total=0;
 for(const [i,hit] of data.outcome.hits.entries()){
  if(!hit||!positive(hit.sequence)||hit.sequence!==i+1||
     !unit(hit.targetId)||typeof hit.hit!=='boolean'||
     typeof hit.critical!=='boolean'||!nonnegative(hit.damage)||
     !nonnegative(hit.hpBefore)||!nonnegative(hit.hpAfter)||
     hit.hpBefore-hit.hpAfter!==hit.damage||
     (!hit.hit&&(hit.damage!==0||hit.critical))||
     hit.critical&&!hit.hit)
   throw new TypeError('invalid ActionOutcome hit');
  if(previous!==null&&hit.hpBefore!==previous.hpAfter)
   throw new TypeError('non-contiguous hit HP');
  if(previous!==null&&hit.targetId!==previous.targetId)
   throw new TypeError('mixed targets require a separate verified outcome type');
  if(previous!==null&&previous.hpAfter===0)
   throw new TypeError('unrecorded attack after KO');
  previous=hit;total+=hit.damage;
 }
 if(total!==data.outcome.totalDamage)
  throw new TypeError('ActionOutcome damage sum mismatch');
 return true;
}
/** Validate then produce a deeply immutable copy without changing the input. */
export function defineActionOutcomeV2(data){
 validateActionOutcomeV2(data);
 const hits=Object.freeze(data.outcome.hits.map(hit=>Object.freeze({
  sequence:hit.sequence,targetId:hit.targetId,hit:hit.hit,
  critical:hit.critical,damage:hit.damage,hpBefore:hit.hpBefore,
  hpAfter:hit.hpAfter
 })));
 return Object.freeze({
  schema:ACTION_OUTCOME_SCHEMA,eventId:data.eventId,actionId:data.actionId,
  actorId:data.actorId,moveId:data.moveId,
  actionKind:data.actionKind,moveEvidence:data.moveEvidence,source:data.source,
  outcome:Object.freeze({
   plannedHitCount:data.outcome.plannedHitCount,totalDamage:data.outcome.totalDamage,
   hits,effects:Object.freeze([]),winner:data.outcome.winner
  })
 });
}
