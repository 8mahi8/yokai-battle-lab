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
export const CHOREOGRAPHY_SCHEMA=1;
const allowedTargets=new Set(['damage','heal','revive','buff','debuff','status','miss']);
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
 const moveId=typeof event.moveId==='string'&&event.moveId?event.moveId:null;
 const hitResults=Array.isArray(event.hitResults)?
  Object.freeze(event.hitResults.map((hit,index)=>{
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
  moveId,hitResults
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
 const impactVisible=timeMs>=plan.phases[1].startMs;
 return Object.freeze({eventKey:plan.eventKey,timeMs,phase,finished,
  actorPose:finished?'idle':phase==='anticipation'?plan.pose:
    phase==='impact'?plan.pose:'recover',
  impactVisible,impacts:impactVisible?plan.impacts:Object.freeze([])});
}
