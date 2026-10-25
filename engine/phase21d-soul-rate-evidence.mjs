/**
 * Phase21D-B: independent numerical comparison of original-game player
 * recharge experiments, NOT the school/default online Soul model.
 *
 * Data source: RC, YW2 experimental notes,
 * https://note.com/ricosama0726/n/n14710bbe446c
 * under "えんら魂", published table for technique level MAX groups.
 *
 * Record exact *reported turns to full* rather than deriving a rule from
 * a guessed character rank. A candidate rounding model fits 23/24 samples
 * but FAILS g2-power / cap130 / two souls; do NOT use as original truth.
 */
const rows=[
  ['g4-power',250,50,25,17],
  ['g3-power',200,40,23,16],
  ['g4-soul',165,33,21,15],
  ['g3-soul',130,26,19,13],
  ['g2-power',130,26,19,14],
  ['g2-soul',105,21,15,12],
  ['g1-power',100,20,15,12],
  ['g1-soul',75,15,13,10]
];
export const SOUL_RECHARGE_SOURCE_CASES=Object.freeze(rows.map(([kind,capacity,none,one,two])=>
  Object.freeze({kind,capacity,turnsToFull:Object.freeze([none,one,two])})
));

/**
 * HYPOTHESIS: constant +5 plus 2% of capacity for each adjacent Enra Soul,
 * truncating the aggregate recovery to an integer each action. It is
 * consistent with MOST reported measurements, not all.
 *
 * Do not extrapolate into ordinary attacks, passive wall time, Poké rewards,
 * skill exceptions, UI Soul bar values or actual online host options.
 */
export function predictResearchRecharge({capacity,adjacentRecoverySouls=0}={}){
  if(!Number.isSafeInteger(capacity)||capacity<1||capacity>10000)
    throw new RangeError('research Soul capacity must be an integer 1..10000');
  if(!Number.isInteger(adjacentRecoverySouls)||adjacentRecoverySouls<0||
    adjacentRecoverySouls>2)
    throw new RangeError('research adjacent recovery Souls must be 0, 1 or 2');
  const perAction=Math.floor(5+adjacentRecoverySouls*capacity/50);
  const actionsToFull=Math.ceil(capacity/perAction);
  return {capacity,adjacentRecoverySouls,perAction,actionsToFull,
    model:'hypothesis-aggregate-floor-5-plus-2pct-capacity-per-soul',
    originalParityVerified:false};
}

export function comparePublishedRechargeEvidence(){
  return SOUL_RECHARGE_SOURCE_CASES.flatMap(record=>
    record.turnsToFull.map((observedActions,adjacentRecoverySouls)=>{
      const predicted=predictResearchRecharge({
        capacity:record.capacity,adjacentRecoverySouls});
      return {kind:record.kind,capacity:record.capacity,adjacentRecoverySouls,
        observedActions,predictedActions:predicted.actionsToFull,
        candidatePerAction:predicted.perAction,
        agrees:observedActions===predicted.actionsToFull,
        confidence:'original-player-experiment-unreplicated'};
    }));
}


/**
 * If a full bar of capacity C was reached on action T from zero by a
 * CONSTANT amount r on each of the owner's actions, then
 *            C/T <= r < C/(T-1)  (T >= 2).
 * The boundaries are mathematically exact rational numbers. This does
 * NOT assume the earlier integer-floor candidate model, nor imply that
 * an original 3DS gauge actually follows constant increments.
 */
export function constantRecoveryInterval(capacity,turnsToFull){
  if(!Number.isSafeInteger(capacity)||capacity<=0||
     !Number.isSafeInteger(turnsToFull)||turnsToFull<=0)
    throw new RangeError('positive safe integer capacity and turns required');
  return {
    lowerInclusive:{numerator:capacity,denominator:turnsToFull},
    upperExclusive:turnsToFull===1?null:
      {numerator:capacity,denominator:turnsToFull-1},
    originalParityVerified:false
  };
}

const fractionCompare=(a,b)=>{
  // Actual research data are small; separately validate safe products to
  // avoid presenting precision-corrupted comparisons for extended fixtures.
  const l=a.numerator*b.denominator,r=b.numerator*a.denominator;
  if(!Number.isSafeInteger(l)||!Number.isSafeInteger(r))
    throw new RangeError('unsafe rational comparison');
  return Math.sign(l-r);
};

/**
 * Exposes WHEN two observations with identical stated capacity and Soul
 * count cannot share one constant per-owner-turn rate, even if fractional.
 * This is evidence of an unresolved input condition, differing behavior,
 * observation error, or a nonconstant progression — not proof which one.
 */
export function compareSameCapacityRateIntervals(){
  const buckets=new Map();
  for(const item of SOUL_RECHARGE_SOURCE_CASES){
    item.turnsToFull.forEach((turnsToFull,adjacentRecoverySouls)=>{
      const key=item.capacity+':'+adjacentRecoverySouls;
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push({kind:item.kind,capacity:item.capacity,
        adjacentRecoverySouls,turnsToFull});
    });
  }
  const output=[];
  for(const [key,records] of buckets){
    if(records.length<2)continue;
    const intervals=records.map(record=>({
      ...record,...constantRecoveryInterval(record.capacity,record.turnsToFull)
    }));
    let maxLower=intervals[0].lowerInclusive;
    let minUpper=intervals[0].upperExclusive;
    for(const interval of intervals.slice(1)){
      if(fractionCompare(interval.lowerInclusive,maxLower)>0)
        maxLower=interval.lowerInclusive;
      if(minUpper===null||(interval.upperExclusive!==null&&
        fractionCompare(interval.upperExclusive,minUpper)<0))
        minUpper=interval.upperExclusive;
    }
    const compatible=minUpper===null||fractionCompare(maxLower,minUpper)<0;
    output.push({key,capacity:records[0].capacity,
      adjacentRecoverySouls:records[0].adjacentRecoverySouls,
      compatible,lowerInclusive:maxLower,upperExclusive:minUpper,
      observations:records,
      limitation:'Assumes comparable starting empty gauge, full-threshold and constant recovery per owner action, without unmeasured triggers.'});
  }
  return output;
}

/**
 * Phase21D-B3: the SAME RC source reports four named/special technique rows
 * *in addition* to the eight-grade aggregate table above. Do not overwrite
 * or quietly recompute the original 24 observations.
 * https://note.com/ricosama0726/n/n14710bbe446c
 * section "隣接妖怪妖気回復魂について" (2026-10-25 source review).
 *
 * The article prints question marks next to max values for the last THREE
 * examples. Their gauges are estimates, not exact published capacities.
 * Index 0/1/2 of turnsToFull = zero/one/two adjacent Enra Souls.
 */
const namedRows=[
  ['jibanyan-hyakuretsu',75,null,[15,13,10]],
  ['nyoe',null,100,[20,17,13]],
  ['nya-in',null,100,[20,17,13]],
  ['komanyachi',null,115,[23,16,13]]
];
export const SOUL_RECHARGE_NAMED_SOURCE_CASES=Object.freeze(namedRows.map(
  ([kind,confirmedCapacity,questionedCapacity,turnsToFull])=>Object.freeze({
    kind,confirmedCapacity,questionedCapacity,
    turnsToFull:Object.freeze(turnsToFull),
    evidenceTier:'player-reported-not-ROM-verified'
  })
));

/** Other video descriptions in the same original source report one-soul
 * per-turn increments for named characters. These are PLAYER interpretations
 * of gauge changes, not calibrated raw 3DS point logs. Do not infer their
 * exact maximum capacity or fit a global formula from these statements.
 */
export const SOUL_RECHARGE_INCREMENT_CLAIMS=Object.freeze([
  Object.freeze({subject:'robonyan',adjacentRecoverySouls:1,
    reportedAdditionalPerOwnerTurn:3,evidenceTier:'player-video-description'}),
  Object.freeze({subject:'jibanyan-hyakuretsu',adjacentRecoverySouls:1,
    reportedAdditionalPerOwnerTurn:2,evidenceTier:'player-video-description'})
]);

/** Compare only cases whose SOURCE capacity is unqualified. Rows with a
 * questioned 'max100?' or 'max115?' MUST remain unpredicted until a source
 * verifies the full gauge. Capacity guesses are not hypotheses to auto-fit.
 */
export function compareNamedRechargeEvidence(){
  return SOUL_RECHARGE_NAMED_SOURCE_CASES.map(row=>{
    const comparisons=row.turnsToFull.map((observedActions,adjacentRecoverySouls)=>{
      const predicted=row.confirmedCapacity===null?null:predictResearchRecharge({
        capacity:row.confirmedCapacity,adjacentRecoverySouls
      });
      return Object.freeze({adjacentRecoverySouls,observedActions,
        predictedActions:predicted?.actionsToFull??null,
        agrees:predicted===null?null:predicted.actionsToFull===observedActions});
    });
    return Object.freeze({kind:row.kind,capacity:row.confirmedCapacity,
      questionedCapacity:row.questionedCapacity,
      comparisons:Object.freeze(comparisons),
      originalParityVerified:false,
      unresolved:row.confirmedCapacity===null?'questioned-gauge-capacity':'mechanics-not-independently-reproduced'
    });
  });
}
