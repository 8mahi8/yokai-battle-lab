/**
 * Phase 1 vertical slice: one READ-ONLY projection from the existing
 * authoritative attack event to a catalog-backed move identity and ordered
 * per-hit facts. This is NOT a new battle resolver or a v2 wire schema.
 *
 * hpBefore is recoverable here because combat.mjs records the exact amount
 * removed from HP and hpAfter after EVERY hit (including Last Stand).
 * A skipped, unexecuted, or unrecorded hit is NEVER synthesized.
 */
import {RENTAL_SCHOOL_CATALOG} from '../content/combat-catalog.mjs';

const isInt=x=>Number.isSafeInteger(x)&&x>=0;
const isUnit=x=>typeof x==='string'&&/^[AB][1-6]$/.test(x);
const validHit=h=>h&&isInt(h.index)&&h.index>=1&&typeof h.hit==='boolean'&&
 typeof h.critical==='boolean'&&isInt(h.amount)&&isInt(h.targetHpAfter);
const freezeHits=hits=>Object.freeze(hits.map(x=>Object.freeze(x)));

/**
 * event: one pre-existing host type:action event
 * squads: both teams from the SAME host snapshot
 * catalog: an authoring-only catalog; never executes mechanics
 * returns: frozen presentation projection, or null for unsupported cases.
 */
export function projectLegacyAttackOutcome(event,squads,
 catalog=RENTAL_SCHOOL_CATALOG){
 if(!event||event.type!=='action'||event.kind!=='attack'||
    !isUnit(event.actor)||!isUnit(event.target)||
    !Array.isArray(squads)||squads.length!==2||
    typeof catalog?.getCharacter!=='function')return null;
 const actorSide=event.actor.startsWith('A')?0:1;
 const actorIndex=Number(event.actor.slice(1))-1;
 const actor=squads[actorSide]?.[actorIndex];
 const character=catalog.getCharacter('rental-'+String(actorIndex+1).padStart(2,'0'));
 // A1/B1 identifies a slot, NOT an original rental identity:
 // custom-team matches must NOT receive a fabricated move ID.
 if(!actor||actor.id!==event.actor||!character||
    actor.name!==character.name)return null;
 const move=character.moves?.attack;
 if(!move||move.category!=='physical_damage'||
    !Array.isArray(event.multiHit?.hits))return null;
 const recorded=event.multiHit.hits;
 if(!recorded.length||!isInt(event.multiHit.planned)||
    recorded.length>event.multiHit.planned||
    !isInt(event.amount)||!isInt(event.targetHp))return null;
 let total=0,previousHp=null;
 const hitResults=[];
 for(const [i,h] of recorded.entries()){
  if(!validHit(h)||h.index!==i+1||
     (!h.hit&&(h.amount!==0||h.critical)))return null;
  const hpBefore=h.targetHpAfter+h.amount;
  if(!isInt(hpBefore)|| (previousHp!==null&&hpBefore!==previousHp))
   return null;
  hitResults.push({sequence:i+1,targetId:event.target,
   hit:h.hit,critical:h.critical,
   damage:h.amount,hpBefore,hpAfter:h.targetHpAfter});
  previousHp=h.targetHpAfter;
  total+=h.amount;
 }
 if(total!==event.amount||previousHp!==event.targetHp)return null;
 return Object.freeze({
  schema:'legacy-attack-projection-v1',
  sourceEventId:isInt(event.eventId)&&event.eventId>0?event.eventId:null,
  actionId:isInt(event.turn)&&event.turn>0?event.turn:null,
  actorId:event.actor,moveId:move.id,moveEvidence:move.evidence,
  targetId:event.target,totalDamage:total,
  plannedHitCount:event.multiHit.planned,
  hitResults:freezeHits(hitResults),
  // This object is presentation data, not additional match truth.
  source:'host-recorded-hit-results'
 });
}
