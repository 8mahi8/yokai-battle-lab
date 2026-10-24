/**
 * Phase21D measurement aid: compare one Soul-gauge observation at a time.
 *
 * Research-only; no hooks into the authoritative multiplayer host.
 * Community player tests observed +5 after the *owner's* non-attacking
 * action in YW2: https://note.com/ricosama0726/n/n14710bbe446c
 * Sources have not established Soul point gain from attacks, techniques,
 * Zero Watch Poke, passive accumulation or equipment as exact constants.
 *
 * This is a parity CHECK of a narrow player-reported model, not a claim
 * that the original YW2 algorithm is established.
 */
const NON_ATTACK_KINDS=new Set(['guard','inspirit','heal','loaf']);
const UNSOURCED_KINDS=new Set(['attack','technique','poke','switch','soultimate','other']);
const unit=/^[AB][1-6]$/;

export function auditSoulGaugeChange({
  gaugeOwnerId, actorId, actionKind, before, after, capacity,
  noOtherSoulSourcesConfirmed=false
}={}){
  if(typeof gaugeOwnerId!=='string'||!unit.test(gaugeOwnerId)||
    typeof actorId!=='string'||!unit.test(actorId))
    throw new TypeError('gaugeOwnerId and actorId must identify a rental unit');
  if(!NON_ATTACK_KINDS.has(actionKind)&&!UNSOURCED_KINDS.has(actionKind))
    throw new RangeError('actionKind must be one of the documented observation types');
  if(!Number.isInteger(capacity)||capacity<=0||
    !Number.isInteger(before)||before<0||before>capacity||
    !Number.isInteger(after)||after<0||after>capacity)
    throw new RangeError('before/after must be integers between 0 and capacity');
  if(typeof noOtherSoulSourcesConfirmed!=='boolean')
    throw new TypeError('noOtherSoulSourcesConfirmed must be boolean');

  const result={
    gaugeOwnerId,actorId,actionKind,before,after,capacity,
    observedDelta:after-before,
    model:'player-reported-owner-nonattack-plus-five',
    // This means the data matches one restricted empirical fixture only.
    confidence:'community-experiment-not-ROM',
    status:'indeterminate',
    expectedAfter:null,
    limitations:[]
  };
  if(!noOtherSoulSourcesConfirmed){
    result.limitations.push('Unknown passive, adjacent Soul, skill, food, Poke or other changes may affect this interval.');
    return result;
  }
  if(gaugeOwnerId!==actorId){
    result.limitations.push('Owner-only +5 experiment does not establish other-unit Soul progression.');
    return result;
  }
  if(!NON_ATTACK_KINDS.has(actionKind)){
    result.limitations.push('Exact Soul delta for attacks, damaging techniques, Poke and Soultimates is unsourced.');
    return result;
  }
  const expectedAfter=Math.min(capacity,before+5);
  result.expectedAfter=expectedAfter;
  result.status=after===expectedAfter?'consistent-with-research':'inconsistent-with-research';
  result.limitations.push('Even a match proves only the narrowly isolated +5 experiment, not whole-battle YW2 Soul fidelity.');
  return result;
}
