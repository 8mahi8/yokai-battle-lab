/**
 * Original YW2 elemental Technique coefficient (research-only host input).
 * Source: https://mtwildwood.net/elements.php?g=yw2
 *
 * Keep defender affinity, attacker's applicable Play sources, and
 * attacker's Penetrate separate. This does NOT assign either ability
 * to the original six rentals or implement an in-battle skill trigger.
 */
import {ELEMENTS,validateElementResistances} from './damage-model.mjs';

export function resolveTechniqueElementMultiplier({
 element='neutral',resistances={},playSources=0,penetrate=false
}={}){
 if(!ELEMENTS.includes(element))throw new RangeError('invalid Technique element');
 if(!Number.isInteger(playSources)||playSources<0||playSources>2)
  throw new RangeError('Technique Play sources must be integer 0..2');
 if(typeof penetrate!=='boolean')throw new TypeError('Technique Penetrate must be boolean');
 const validated=validateElementResistances(resistances);
 const resistance=element==='neutral'?1:(validated[element]??1);
 // Penetrate removes a resistance (<1); it never removes a weakness (>1).
 const resistanceAfterPenetrate=penetrate?Math.max(1,resistance):resistance;
 // The attacking element must match the Play source; the research input
 // counts only sources applying to THIS attacker's Technique.
 const playMultiplier=element==='neutral'?1:(1+playSources*.2);
 return {
  element,resistance,resistanceAfterPenetrate,
  penetrateApplied:penetrate&&resistance<1,
  playSources,playMultiplier,
  multiplier:resistanceAfterPenetrate*playMultiplier
 };
}
