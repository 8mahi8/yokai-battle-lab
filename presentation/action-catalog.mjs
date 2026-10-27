/**
 * Phase45 foundation: data-driven battle PRESENTATION presets.
 * These timings are visualization prototypes, NOT verified YW2 frame timings.
 * No game-rule values, damage, Soul, RNG, transport or DOM belong here.
 * A move-specific original animation may override this table in later phases.
 */
const preset=(label,pose,windupMs,impactMs,recoveryMs)=>Object.freeze({
 label,pose,windupMs,impactMs,recoveryMs
});
export const ACTION_VISUAL_CATALOG=Object.freeze({
 attack:preset('こうげき','lunge',420,300,480),
 technique:preset('ようじゅつ','cast',620,350,530),
 heal:preset('かいふく','heal-cast',600,400,650),
 inspirit:preset('とりつく','inspirit-cast',520,450,630),
 guard:preset('ガード','brace',230,520,470),
 loaf:preset('サボり','loaf',320,500,580),
 poke:preset('つつく','poke',200,420,480),
 special:preset('ひっさつわざ','special',740,680,880)
});
export const ACTION_VISUAL_KINDS=Object.freeze(Object.keys(ACTION_VISUAL_CATALOG));
