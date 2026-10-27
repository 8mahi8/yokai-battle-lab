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
 attack:preset('こうげき','lunge',500,370,830),
 technique:preset('ようじゅつ','cast',700,480,800),
 heal:preset('かいふく','heal-cast',650,470,850),
 inspirit:preset('とりつく','inspirit-cast',650,450,860),
 guard:preset('ガード','brace',400,630,650),
 loaf:preset('サボり','loaf',600,600,690),
 poke:preset('つつく','poke',360,470,610),
 special:preset('ひっさつわざ','special',850,680,920)
});
export const ACTION_VISUAL_KINDS=Object.freeze(Object.keys(ACTION_VISUAL_CATALOG));
