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
