/**
 * Presentation-only incremental event reader.
 *
 * A Firebase listener can receive several completed actions in one snapshot.
 * The old latest-cue-only renderer lost every action but the final one.
 * Consume stable host event IDs in chronological order, with a bounded visual
 * catch-up budget so a resumed Safari iframe never plays minutes of history.
 * No host ticks, battle outcomes, Firebase writes, or Soul rules live here.
 */
import {latestBattleCue} from './battle-vfx.mjs';

export const MAX_VISUAL_CATCHUP_CUES=4;

export function collectNewBattleCues(events,afterEventId,{maxCues=MAX_VISUAL_CATCHUP_CUES}={}){
 if(!Array.isArray(events))throw new TypeError('battle events array required');
 if(!Number.isSafeInteger(afterEventId)||afterEventId<0)
  throw new RangeError('last event ID must be a nonnegative safe integer');
 if(!Number.isSafeInteger(maxCues)||maxCues<1||maxCues>20)
  throw new RangeError('visual cue limit must be 1..20');
 const ordered=events.filter(event=>event&&Number.isSafeInteger(event.eventId)&&event.eventId>0)
  .slice().sort((a,b)=>a.eventId-b.eventId);
 const latestEventId=ordered.at(-1)?.eventId??0;
 const fresh=ordered.filter(event=>event.eventId>afterEventId);
 const cues=fresh.map(event=>latestBattleCue([event])).filter(Boolean);
 // Report the highest actually observed ID; a rewind must be handled by the
 // caller as a NEW match, not hidden by max(afterEventId, latestEventId).
 return Object.freeze({latestEventId,
  cues:Object.freeze(cues.slice(-maxCues)),
  skipped:cues.length>maxCues?cues.length-maxCues:0});
}

/**
 * Return the host action whose ANIMATION is currently on screen, not the
 * latest host action from a newer bundled Firebase snapshot. Read-only.
 * The stage never infers an action from an older title or current HP.
 */
export function actionForVisibleCue(events,visibleCue=null){
 if(!Array.isArray(events))throw new TypeError('battle events array required');
 if(visibleCue!==null&&(!visibleCue||typeof visibleCue!=='object'))
  throw new TypeError('visible battle cue must be an object');
 const actions=events.filter(e=>e?.type==='action');
 if(visibleCue?.type==='action'){
  const key=visibleCue.key;
  if(typeof key!=='string')return null;
  const id=/^event:([1-9]\d*)$/.exec(key);
  if(id){
   const eventId=Number(id[1]);
   return actions.find(e=>e.eventId===eventId)??null;
  }
  const turn=/^action:([1-9]\d*)$/.exec(key);
  if(turn){
   const turnId=Number(turn[1]);
   return actions.find(e=>e.turn===turnId)??null;
  }
  return null; // never substitute a later action when cue cannot be matched
 }
 return actions.at(-1)??null;
}
