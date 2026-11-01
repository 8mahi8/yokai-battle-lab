/**
 * Soultimate HIT ledger v1. Only the explicitly opted-in CUSTOM host can
 * create these actual per-hit HP rolls. This is not YW2's verified hit table.
 * It is deliberately separate from the existing per-target effect ledger.
 */
export const SOULTIMATE_HIT_SCHEMA=1;
const unit=id=>typeof id==='string'&&/^[AB][1-6]$/.test(id);
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const supported='custom-roster-per-hit-fixture';
export function projectSoultimateHitLedger(event){
 if(!event||event.type!=='special'||event.model!=='research-fixture'||
    !positive(event.eventId)||!unit(event.actor)||
    !Array.isArray(event.impacts)||!event.researchSoultimateHits)
  return null;
 const source=event.researchSoultimateHits;
 if(source.model!==supported||source.originalHitCount!==null||
    !Number.isInteger(source.plannedPerTarget)||
    source.plannedPerTarget<1||source.plannedPerTarget>9||
    !Array.isArray(source.hits)||source.hits.length<1||source.hits.length>27)
  return null;
 const hits=[];
 let offset=0;
 for(const impact of event.impacts){
  if(!impact||impact.kind!=='damage'||!unit(impact.targetId)||
     !nonnegative(impact.hpBefore)||!nonnegative(impact.hpAfter)||
     !nonnegative(impact.amount)||impact.hpBefore-impact.hpAfter!==impact.amount)
   return null;
  let prev=impact.hpBefore,damageTotal=0,number=0;
  for(;offset+number<source.hits.length;number++){
   const h=source.hits[offset+number];
   if(h.targetId!==impact.targetId)break;
   if(!positive(h.sequence)||h.sequence!==offset+number+1||
      h.targetSequence!==number+1||typeof h.hit!=='boolean'||
      typeof h.critical!=='boolean'||!nonnegative(h.damage)||
      !nonnegative(h.hpBefore)||!nonnegative(h.hpAfter)||
      h.hpBefore!==prev||h.hpBefore-h.hpAfter!==h.damage||
      (!h.hit&&(h.critical||h.damage!==0))||
      (number>0&&hits.at(-1)?.hpAfter===0))
    return null;
   hits.push(Object.freeze({sequence:h.sequence,targetId:h.targetId,
     targetSequence:h.targetSequence,hit:h.hit,critical:h.critical,
     damage:h.damage,hpBefore:h.hpBefore,hpAfter:h.hpAfter}));
   prev=h.hpAfter;damageTotal+=h.damage;
   if(prev===0){number++;break;}
  }
  // Hits can stop before the planned count ONLY when that target is KO.
  // A still-living target cannot silently lose unexecuted scheduled blows:
  // this catches a forged plannedPerTarget=9 over a real three-hit log.
  if(number<1||number>source.plannedPerTarget||
     (prev>0&&number!==source.plannedPerTarget)||
     damageTotal!==impact.amount||prev!==impact.hpAfter)
   return null;
  offset+=number;
 }
 if(offset!==source.hits.length)return null;
 return Object.freeze({schema:SOULTIMATE_HIT_SCHEMA,
  eventId:event.eventId,actorId:event.actor,model:supported,
  plannedPerTarget:source.plannedPerTarget,originalHitCount:null,
  hits:Object.freeze(hits)});
}
export function assertSoultimateHitLedger(ledger){
 if(!ledger||ledger.schema!==SOULTIMATE_HIT_SCHEMA||
    ledger.model!==supported||ledger.originalHitCount!==null||
    !positive(ledger.eventId)||!unit(ledger.actorId)||
    !Number.isInteger(ledger.plannedPerTarget)||
    !Array.isArray(ledger.hits)||ledger.hits.length<1)
  throw new TypeError('invalid Soultimate hit ledger');
 // Assert all intrinsic hit properties; consistency against target-effect
 // totals is checked in planActionChoreography with the *other* ledger.
 const event={type:'special',eventId:ledger.eventId,actor:ledger.actorId,
  model:'research-fixture',
  researchSoultimateHits:{model:ledger.model,
   plannedPerTarget:ledger.plannedPerTarget,originalHitCount:null,
   hits:ledger.hits},
  impacts:[]};
 for(const h of ledger.hits){
  const last=event.impacts.at(-1);
  if(!last||last.targetId!==h.targetId)
   event.impacts.push({kind:'damage',targetId:h.targetId,
     hpBefore:h.hpBefore,hpAfter:h.hpAfter,amount:h.damage});
  else {last.hpAfter=h.hpAfter;last.amount+=h.damage;}
 }
 const canonical=projectSoultimateHitLedger(event);
 if(!canonical||JSON.stringify(canonical)!==JSON.stringify(ledger))
  throw new TypeError('invalid or altered Soultimate hit rows');
 return true;
}
