/**
 * V1: immutable, data-only descriptions of the six CURRENT PLAYTEST skills.
 *
 * Their legacy effect identifiers mirror the existing engine behavior, not
 * established original Yo-kai Watch 2 values. All are fixtures. This module
 * DOES NOT run skill effects, choose targets, or read a battle clock.
 */
export const SKILL_CATALOG_SCHEMA=1;
export const SKILL_TRIGGER_TYPES=Object.freeze([
 'after_ko','before_lethal_damage','on_critical_roll',
 'on_defender_critical_roll','on_guarded_physical_hit',
 'after_any_action'
]);
export const SKILL_EFFECT_TYPES=Object.freeze([
 'temporary_strength_stage','survive_at_one_hp_once',
 'bonus_critical_units','prevent_critical',
 'ignore_physical_guard','adjacent_ally_heal'
]);
const triggers=new Set(SKILL_TRIGGER_TYPES);
const effects=new Set(SKILL_EFFECT_TYPES);
const has=Object.prototype.hasOwnProperty;
const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const word=x=>typeof x==='string'&&x.length>0;
const levels=new Set(['observed','documented','fixture','unknown']);

export function validateSkillEntry(entry){
 if(!isObject(entry)||entry.schema!==SKILL_CATALOG_SCHEMA||
   !/^skill:[A-Za-z][A-Za-z0-9]*$/.test(entry.id??'')||
   !word(entry.legacyKey)||entry.id!=='skill:'+entry.legacyKey||
   !word(entry.displayName))throw new TypeError('invalid skill identity');
 if(!triggers.has(entry.trigger)||!effects.has(entry.effect))
  throw new TypeError('invalid skill trigger/effect');
 if(!levels.has(entry.evidence)||!Array.isArray(entry.sourceRefs)||
   entry.sourceRefs.some(x=>!word(x)))
  throw new TypeError('invalid skill evidence');
 if(['observed','documented'].includes(entry.evidence)&&
   entry.sourceRefs.length===0)
  throw new TypeError('documented skill requires a source');
 if(!isObject(entry.parameters)||Object.keys(entry.parameters).some(x=>
   !word(x)||typeof entry.parameters[x]!=='string'))
  throw new TypeError('skill parameter placeholders must be strings');
 return true;
}
const fixture=(legacyKey,displayName,trigger,effect,parameters={})=>{
 const result={schema:SKILL_CATALOG_SCHEMA,id:'skill:'+legacyKey,
  legacyKey,displayName,trigger,effect,
  // Only references to existing *engine-owned* trial constants. Do NOT copy
  // numeric percentages/turn counts into the authoring registry.
  parameters,evidence:'fixture',sourceRefs:[]};
 validateSkillEntry(result);
 return Object.freeze({...result,parameters:Object.freeze({...parameters}),
  sourceRefs:Object.freeze([])});
};
/**
 * Trigger/effect labels describe the existing prototype, not exact YW2 data.
 * Game semantics continue to be owned by engine/skill-effects.mjs.
 */
export const PLAYTEST_SKILL_CATALOG=Object.freeze([
 fixture('momentum','まえのめり型','after_ko','temporary_strength_stage',
  {stage:'SKILL_TRIAL.momentumStages',turns:'SKILL_TRIAL.momentumOwnerTurns'}),
 fixture('care','おせわ型','after_any_action','adjacent_ally_heal',
  {fraction:'SKILL_TRIAL.careMaxHpFraction'}),
 fixture('sharpCrit','いっせん型','on_critical_roll','bonus_critical_units',
  {bonus:'SKILL_TRIAL.sharpCritBonusUnits'}),
 fixture('critImmune','つやつやボディー型','on_defender_critical_roll','prevent_critical'),
 fixture('lastStand','どひょうぎわ型','before_lethal_damage','survive_at_one_hp_once'),
 fixture('guardBreak','ガードくずし型','on_guarded_physical_hit','ignore_physical_guard')
]);

export function findSkill(catalog,id){
 if(!Array.isArray(catalog)||!word(id))return null;
 return catalog.find(x=>x.id===id)??null;
}
