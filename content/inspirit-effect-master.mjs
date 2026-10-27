/**
 * Shared effect classification. These labels are current battle RESEARCH
 * fixtures, not independently verified original duration/stack formulas.
 * Duration:null means: use the existing ledger's sign-specific default.
 * Do not encode original 30 actions in each authored character/move.
 */
const specs=[
 ['sleep','negative','cannot_act'],
 ['strength-up','positive','stat_up'],
 ['strength-down','negative','stat_down'],
 ['defense-down','negative','stat_down'],
 ['spirit-down','negative','stat_down'],
 ['hp-loss','negative','hp_over_time'],
 ['hp-regen','positive','hp_over_time']
];
export const INSPIRIT_EFFECT_MASTER=Object.freeze(specs.map(
 ([id,sign,category])=>Object.freeze({
  id,sign,category,defaultDuration:null,evidence:'fixture',
  sourceRefs:Object.freeze([])
 })
));
const byId=new Map(INSPIRIT_EFFECT_MASTER.map(x=>[x.id,x]));
export function inspiritEffectById(id){return byId.get(id)??null;}
