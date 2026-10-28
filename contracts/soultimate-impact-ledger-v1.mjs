/**
 * Soultimate Impact Ledger v1 — presentation-only proof of host-applied
 * per-TARGET results. This is NOT a hit-by-hit ledger and it deliberately
 * contains no inferred original Soultimate hit count or random rolls.
 *
 * The authoritative research battle already stores hpBefore/hpAfter and
 * applied/resisted statuses on its 'special' event. Project them without
 * recomputing damage or touching the host.
 */
export const SOULTIMATE_IMPACT_SCHEMA=1;
const unit=id=>typeof id==='string'&&/^[AB][1-6]$/.test(id);
const hp=n=>Number.isSafeInteger(n)&&n>=0;
const kinds=new Set(['damage','damage-status','drain',
 'heal','revive','buff','debuff']);
const dealing=new Set(['damage','damage-status','drain']);
const recovering=new Set(['heal','revive']);

export function projectSoultimateImpactLedger(event){
 if(!event||event.type!=='special'||event.model!=='research-fixture'||
    !Number.isSafeInteger(event.eventId)||event.eventId<1||
    !unit(event.actor)||!Array.isArray(event.impacts)||
    event.impacts.length>12)return null;
 const rows=[];
 for(const [index,source] of event.impacts.entries()){
  if(!source||!unit(source.targetId)||!kinds.has(source.kind)||
     !hp(source.hpBefore)||!hp(source.hpAfter)||
     !hp(source.amount)||!Number.isSafeInteger(source.deltaHp))
   return null;
  const delta=source.hpAfter-source.hpBefore;
  if(source.deltaHp!==delta)return null;
  if(dealing.has(source.kind)&&
    (delta!==-source.amount||source.hpBefore<source.hpAfter))return null;
  if(recovering.has(source.kind)&&
    (delta!==source.amount||source.hpAfter<source.hpBefore))return null;
  if((source.kind==='buff'||source.kind==='debuff')&&
     (source.amount!==0||delta!==0))return null;
  if(source.kind==='revive'&&
     (source.hpBefore!==0||source.hpAfter===0))return null;
  const statusSource=source.kind==='debuff'||source.kind==='buff'||
    source.kind==='damage-status';
  const statusEffect=statusSource?source.statusEffect:null;
  if(statusSource&&
    (typeof statusEffect!=='string'||!statusEffect||
     typeof source.applied!=='boolean'||typeof source.resisted!=='boolean'||
     (source.applied===source.resisted)))
   return null;
  const row={sequence:index+1,targetId:source.targetId,
    kind:source.kind,amount:source.amount,hpBefore:source.hpBefore,
    hpAfter:source.hpAfter,deltaHp:delta,
    ...(statusSource?{statusEffect,applied:source.applied,
       resisted:source.resisted}:{}),
    ...(source.lastStand===true?{lastStand:true}:{})
  };
  rows.push(Object.freeze(row));
 }
 // The model fixture is openly labeled; neither row count nor count of
 // unique targetIds can be used as a claim about repeated move hits.
 return Object.freeze({schema:SOULTIMATE_IMPACT_SCHEMA,
   eventId:event.eventId,actorId:event.actor,
   model:'research-fixture',source:'host-resolved-special-impact-records',
   originalHitCount:null,impacts:Object.freeze(rows)});
}

export function assertSoultimateImpactLedger(ledger){
 if(!ledger||ledger.schema!==SOULTIMATE_IMPACT_SCHEMA||
    ledger.source!=='host-resolved-special-impact-records'||
    ledger.model!=='research-fixture'||ledger.originalHitCount!==null||
    !Number.isSafeInteger(ledger.eventId)||ledger.eventId<1||
    !unit(ledger.actorId)||!Array.isArray(ledger.impacts))
  throw new TypeError('invalid host Soultimate impact ledger');
 const event={type:'special',model:'research-fixture',
  actor:ledger.actorId,eventId:ledger.eventId,impacts:ledger.impacts.map(x=>({
    targetId:x.targetId,kind:x.kind,amount:x.amount,
    hpBefore:x.hpBefore,hpAfter:x.hpAfter,deltaHp:x.deltaHp,
    ...(x.statusEffect===undefined?{}:{
      statusEffect:x.statusEffect,applied:x.applied,resisted:x.resisted}),
    ...(x.lastStand?{lastStand:true}:{})
  }))};
 const canonical=projectSoultimateImpactLedger(event);
 if(!canonical||JSON.stringify(canonical)!==JSON.stringify(ledger))
  throw new TypeError('Soultimate impact ledger has altered/unsupported records');
 return true;
}
