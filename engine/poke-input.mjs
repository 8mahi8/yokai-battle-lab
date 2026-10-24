/**
 * YW2 Watch Zero "Poke" input experiment.
 *
 * Authoritative manual: selecting a Loafing/Inspirited enemy and repeatedly
 * poking to fill a meter is required for a reward.
 * https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-Yo-Kai_Watch_2_Fleshy_Souls
 *
 * The number of taps, point radius, deadlines, success thresholds and
 * competitive reward quantities are NOT documented in that manual. The
 * adjustable values here are plain research fixtures, not original timing.
 */
const clone=x=>JSON.parse(JSON.stringify(x));
export function createPokeTrial({targetId,requiredHits=12,radius=.4}={}){
 if(typeof targetId!=='string'||!/^[AB][1-6]$/.test(targetId))
  throw new TypeError('Poke requires a six-unit team target ID');
 if(!Number.isInteger(requiredHits)||requiredHits<1||requiredHits>60)
  throw new RangeError('requiredHits 1..60 is a research fixture');
 if(!Number.isFinite(radius)||radius<=0||radius>.5)
  throw new RangeError('radius 0..0.5 is a research fixture');
 let hits=0;
 function snapshot(){
  return clone({targetId,hits,requiredHits,progress:hits/requiredHits,
   completed:hits===requiredHits,center:[.5,.5],radius,
   model:'research-tap-count'});
 }
 function input(event){
  if(!event||typeof event!=='object'||!['tap','down'].includes(event.type))
   throw new TypeError('Poke accepts tap/down input only');
  if(!Number.isFinite(event.x)||!Number.isFinite(event.y)||
     event.x<0||event.x>1||event.y<0||event.y>1)
   return snapshot();
  if(hits<requiredHits&&Math.hypot(event.x-.5,event.y-.5)<=radius)
   hits++;
  return snapshot();
 }
 return {snapshot,input};
}
