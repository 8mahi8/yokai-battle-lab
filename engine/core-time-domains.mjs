/**
 * V3-1 explicit boundaries between three different forms of "time".
 *
 * - logicalActionPoints: current deterministic action debt scheduler.
 * - hostInputMs: trusted host monotonic input timestamp (wheel cooldown).
 * - visibilityMs: presentation-only motion buffering / opponent view.
 *
 * These must NEVER be converted to one another using arbitrary constants.
 * The YW2 source has not established a wall-ms↔action-point conversion.
 * The public inspection is read-only and is NOT an additional snapshot
 * field, so it cannot silently change legacy hash/ACK/transport formats.
 */
const validNonnegative=(n)=>Number.isFinite(n)&&n>=0;
export function sampleHostInputMs(hostClock){
 if(typeof hostClock!=='function')throw new TypeError('trusted host clock function required');
 const sample=hostClock();
 return validNonnegative(sample)?sample:null;
}

export function inspectCoreTimeDomains(gameState){
 if(!gameState||typeof gameState!=='object'||!gameState.clock)
  throw new TypeError('canonical battle state with clock required');
 const {clock,presentation,winner,guided,purification,poke}=gameState;
 if(!Number.isSafeInteger(clock.turn)||clock.turn<0||
  !validNonnegative(clock.pointsElapsed))
  throw new TypeError('invalid logical action scheduler clock');
 const visible=Array.isArray(guided)&&guided.some(Boolean)||
  Array.isArray(purification)&&purification.some(Boolean)||
  (Array.isArray(poke?.active)&&poke.active.some(Boolean));
 const phase=winner!==null&&winner!==undefined?'finished':
  visible?'touch-active':'battle-active';
 let display=null;
 if(presentation!==undefined){
  if(!validNonnegative(presentation.now)||
   !validNonnegative(presentation.blockUntil))
   throw new TypeError('invalid presentation clock');
  display=Object.freeze({
   timeDomain:'presentation-ms',
   nowMs:presentation.now,blockUntilMs:presentation.blockUntil,
   isBlocked:presentation.isBlocked===true
  });
 }
 return Object.freeze({
  version:1,
  logical:Object.freeze({
   timeDomain:'logical-action-points',
   completedActions:clock.turn,pointsElapsed:clock.pointsElapsed
  }),
  input:Object.freeze({timeDomain:'trusted-host-monotonic-ms',
   note:'only host samples this on voluntary wheel inputs; not a battle timer'}),
  presentation:display,
  phase,
  note:'read-only contract; video timings and action-point formula are not established YW2 constants'
 });
}
