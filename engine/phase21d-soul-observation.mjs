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


/**
 * Phase21D-B4: compare two matched 3DS Soul-meter observations, not invent
 * the amount an attack or a technique is supposed to grant.
 *
 * Source for the qualitative hypothesis (secondary guide):
 * https://gamepedia.jp/youkai-yw2/archives/1482
 * It reports increased Soul when attacking a loafing or negatively
 * Inspirited enemy, without quantified points or a physical/technique split.
 * RC's measured +5 NON-attack amount does NOT supply this missing formula.
 *
 * This research-only comparator never writes to createMatchProtocol's
 * canonical battle and never infers causation from a single before/after.
 */
const DAMAGING_KINDS=new Set(['attack','technique']);
const ATTACK_TARGET_STATES=new Set(['normal','loafing','negative-inspirit']);
function validateDamageSoulObservation(o,label){
  if(!o||typeof o!=='object'||Array.isArray(o))
    throw new TypeError(label+' must be an observation');
  if(!unit.test(o.actorId)||!unit.test(o.gaugeOwnerId)||!unit.test(o.targetId)||
    o.targetId[0]===o.actorId[0])
    throw new TypeError(label+' actor, gauge owner, enemy target must be identified');
  if(!DAMAGING_KINDS.has(o.actionKind)||
    !ATTACK_TARGET_STATES.has(o.enemyStatus)||
    typeof o.moveKey!=='string'||!o.moveKey.trim()||o.moveKey.length>100)
    throw new TypeError(label+' move, action kind or target condition unknown');
  if(!Number.isSafeInteger(o.capacity)||o.capacity<=0||
    !Number.isSafeInteger(o.before)||o.before<0||o.before>o.capacity||
    !Number.isSafeInteger(o.after)||o.after<0||o.after>o.capacity||
    typeof o.hitLanded!=='boolean')
    throw new TypeError(label+' gauge or hit observation is invalid');
  return {
    actorId:o.actorId,gaugeOwnerId:o.gaugeOwnerId,
    targetId:o.targetId,actionKind:o.actionKind,
    moveKey:o.moveKey,enemyStatus:o.enemyStatus,hitLanded:o.hitLanded,
    before:o.before,after:o.after,capacity:o.capacity,delta:o.after-o.before
  };
}

/**
 * Observations must bracket only the damaging action (not other turns).
 * The controls are externally asserted by a human reviewing the footage:
 * this function cannot independently prove they are true.
 *
 * "greater" is an observation about the two sample deltas, NEVER a YW2
 * numeric rule or proof that the inflicted status caused the difference.
 */
export function auditDamagingActionSoulPair({
  baseline,vulnerable,
  sameBattleConditionsConfirmed=false,
  noOtherSoulSourcesConfirmed=false
}={}){
  const a=validateDamageSoulObservation(baseline,'baseline');
  const b=validateDamageSoulObservation(vulnerable,'vulnerable');
  if(a.enemyStatus!=='normal'||
    !['loafing','negative-inspirit'].includes(b.enemyStatus))
    throw new TypeError('baseline must be normal and comparison enemy vulnerable');
  if(typeof sameBattleConditionsConfirmed!=='boolean'||
    typeof noOtherSoulSourcesConfirmed!=='boolean')
    throw new TypeError('comparison controls must be boolean');
  const reasons=[];
  if(!sameBattleConditionsConfirmed)
    reasons.push('Equipment, skill, timing, action selection and matching scenario were not independently controlled.');
  if(!noOtherSoulSourcesConfirmed)
    reasons.push('Other Soul gains (passive, neighboring Soul, Poke or prior actions) have not been excluded.');
  if(a.actorId!==b.actorId||a.targetId!==b.targetId||
    a.gaugeOwnerId!==b.gaugeOwnerId||a.gaugeOwnerId!==a.actorId||
    a.actionKind!==b.actionKind||a.moveKey!==b.moveKey||
    a.capacity!==b.capacity||a.before!==b.before)
    reasons.push('Actor, target, own gauge, move, capacity and starting meter must match.');
  if(!a.hitLanded||!b.hitLanded)
    reasons.push('Both attacks must actually land before comparing rewards.');
  if(a.after===a.capacity||b.after===b.capacity)
    reasons.push('A full gauge censors the amount gained; measure below the cap.');
  const comparable=reasons.length===0;
  const observedDifference=comparable?b.delta-a.delta:null;
  return {
    model:'matched-damaging-action-soul-observation-only',
    sourceTier:'secondary-qualitative-guidance-not-original-ROM',
    originalRuleVerified:false,
    actionKind:a.actionKind===b.actionKind?a.actionKind:null,
    normalDelta:a.delta,vulnerableDelta:b.delta,
    observedDifference,
    status:!comparable?'indeterminate':
      observedDifference>0?'vulnerable-greater-observed':'not-greater-observed',
    originalNumericBonus:null,
    reasonForUncertainty:reasons,
    limitations:[
      'The source does not specify exact Soul points or whether physical attacks and damaging techniques differ.',
      'A matched before/after comparison cannot prove why the meter changed or that the same difference holds across battles.',
      'Never apply these observational deltas directly to the default online battle rules.'
    ]
  };
}
