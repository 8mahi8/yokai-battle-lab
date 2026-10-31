/**
 * V3-3: read-only projection of the three already-existing battle domains.
 *
 * Logical action points are NOT animation milliseconds. Canonical event
 * ordinals are NOT the visibility journal's sequence. The host may accept
 * commands and commit effects while its opponent-visible research animation
 * is blocked. The original game's exact timing remains unknown.
 *
 * This module has no random draws, mutators, timers or network access.
 */
const integer=(x)=>Number.isSafeInteger(x)&&x>=0;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const frozen=x=>Object.freeze(x);

/** Projections intentionally contain only primitive values (no live arrays). */
export function readBattleTimeDomains({
 clockSnapshot,hostEvents,presentationSnapshot=null
}={}){
 if(!object(clockSnapshot)||!integer(clockSnapshot.turn)||
    !integer(clockSnapshot.pointsElapsed))
  throw new TypeError('canonical logical clock snapshot required');
 if(!Array.isArray(hostEvents)||hostEvents.some(x=>!object(x)))
  throw new TypeError('canonical host event journal required');
 const logical=frozen({
  unit:'action-points',actionCount:clockSnapshot.turn,
  pointsElapsed:clockSnapshot.pointsElapsed
 });
 const canonical=frozen({
  unit:'host-event-ordinal',
  eventCount:hostEvents.length,
  lastEventOrdinal:hostEvents.length||null
 });
 let display=null;
 if(presentationSnapshot!==null){
  const p=presentationSnapshot;
  if(!object(p)||!integer(p.now)||!integer(p.blockUntil)||
     typeof p.isBlocked!=='boolean'||p.isBlocked!==(p.now<p.blockUntil)||
     !Array.isArray(p.buffered)||!Array.isArray(p.visible)||
     p.buffered.some(x=>!object(x))||p.visible.some(x=>!object(x)))
   throw new TypeError('valid presentation research clock snapshot required');
  const last=p.visible.at(-1);
  if(last&&(!integer(last.sequence)||last.sequence<1||
     !integer(last.visibleAt)||last.visibleAt>p.now))
   throw new TypeError('invalid last displayed research event');
  display=frozen({
   unit:'research-animation-ms',nowMs:p.now,
   blockedUntilMs:p.blockUntil,blocked:p.isBlocked,
   queuedEventCount:p.buffered.length,visibleEventCount:p.visible.length,
   lastVisibleSequence:last?.sequence??null,
   lastVisibleAtMs:last?.visibleAt??null
  });
 }
 return frozen({logical,canonical,display});
}
