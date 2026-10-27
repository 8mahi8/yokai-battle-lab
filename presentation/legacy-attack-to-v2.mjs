/**
 * Read-only migration adapter. Legacy host events remain the authority and
 * the wire protocol stays v1. No move resolution, damage, RNG or HP edits.
 */
import {defineActionOutcomeV2}
 from '../engine/action-outcome-v2.mjs';
import {projectLegacyAttackOutcome}
 from './legacy-attack-outcome.mjs';

/** Returns null for unsupported or contradictory existing host actions. */
export function projectAttackOutcomeV2(event,squads,catalog){
 const observed=projectLegacyAttackOutcome(event,squads,catalog);
 if(!observed||!Number.isSafeInteger(observed.sourceEventId)||
    observed.sourceEventId<1||
    !Number.isSafeInteger(observed.actionId)||observed.actionId<1||
    ![null,0,1].includes(event.winner??null))return null;
 const hits=observed.hitResults;
 if(event.hit!==hits.some(x=>x.hit)||
    event.critical!==hits.some(x=>x.critical)||
    event.target!==hits[0]?.targetId||
    event.multiHit.planned!==observed.plannedHitCount)
  return null;
 return defineActionOutcomeV2({
  schema:2,eventId:observed.sourceEventId,actionId:observed.actionId,
  actorId:observed.actorId,moveId:observed.moveId,
  actionKind:'attack',moveEvidence:observed.moveEvidence,
  source:observed.source,
  outcome:{
   plannedHitCount:observed.plannedHitCount,
   totalDamage:observed.totalDamage,hits,
   effects:[],winner:event.winner??null
  }
 });
}
