/**
 * V3-2: compile one original-rental Soultimate definition to a strict,
 * source-preserving sequence of typed semantic stages.
 *
 * This is NOT a damage/HP resolver, and "stage" is a legacy research
 * dependency, not a verified YW2 frame priority. Do not silently interpret
 * an unknown hit count as one hit, and do not split combined revive+heal
 * into two additive HP writes.
 */
import {validateSpecialSpec} from './special-effects.mjs';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const word=x=>typeof x==='string'&&x.length>0;
const categories=new Set(['damage','drain','buff','debuff',
 'damage-status','revive-heal','heal','revive','dispel']);
const attackKinds=new Set(['damage','drain','damage-status']);
const statusKinds=new Set(['buff','debuff','damage-status']);
const noHitKinds=new Set(['buff','debuff','revive','revive-heal','heal','dispel']);
const freeze=x=>Object.freeze(x);
const clonePattern=pattern=>freeze({type:pattern.type,count:pattern.count});
function scopeOf(spec){
 if(spec.kind==='revive-heal')return 'ally_team';
 if(spec.kind==='revive')return 'single_ally';
 if(spec.kind==='heal'||spec.kind==='buff')return 'ally_front';
 return spec.scope==='one'?'single_enemy':'enemy_front';
}
function stage(type,fields={}){return freeze({type,...fields});}

/**
 * A move from the immutable move master plus its one existing special rule.
 * Do not introduce another move roster or copy test-fixture power values.
 */
export function compileSoultimateEffectPlan(move,rawDefinition){
 if(!object(move)||move.slot!=='soultimate'||!word(move.id)||
   !categories.has(move.category)||!object(move.hitPattern)||
   !['fixture','unknown','observed','documented'].includes(move.evidence)||
   !Array.isArray(move.sourceRefs)||move.sourceRefs.some(x=>!word(x))||
   (['documented','observed'].includes(move.evidence)&&move.sourceRefs.length===0))
  throw new TypeError('invalid Soultimate source move');
 const rule=validateSpecialSpec(rawDefinition);
 if(move.category!==rule.kind||move.targetScope!==scopeOf(rule)||
    move.power!==((statusKinds.has(rule.kind)&&rule.kind!=='damage-status')||rule.kind==='dispel'
     ?null:rule.power)||
    move.statusEffect!==(statusKinds.has(rule.kind)?rule.effect:null))
  throw new TypeError('Soultimate source and existing effect rules disagree');
 const pattern=move.hitPattern;
 if(attackKinds.has(rule.kind)){
  if(!(
   (pattern.type==='unknown'&&pattern.count===null)||
   (pattern.type==='single'&&pattern.count===1)||
   (pattern.type==='multi'&&Number.isSafeInteger(pattern.count)&&pattern.count>=2&&pattern.count<=99)
  ))throw new TypeError('invalid damaging Soultimate hit pattern');
 }else if(!noHitKinds.has(rule.kind)||
   pattern.type!=='none'||pattern.count!==0)
  throw new TypeError('invalid non-damage Soultimate hit pattern');

 const targetScope=move.targetScope;
 let stages;
 const damage=()=>stage('damage',{targetScope,
  damageKind:rule.damageKind,hitPattern:clonePattern(pattern),
  power:rule.power});
 const status=sign=>stage('status',{targetScope,statusEffect:rule.effect,
  sign,level:rule.level});
 switch(rule.kind){
 case 'damage': stages=[damage()];break;
 case 'drain': stages=[damage(),stage('heal-from-actual-damage',{
  targetScope:'ally_front',dependency:'actual-hp-drained',
  formula:'existing-playtest-resolver'})];break;
 case 'damage-status': stages=[damage(),stage('status-on-surviving-target',{
  targetScope,statusEffect:rule.effect,sign:'negative',
  level:rule.level,dependency:'after-damage-survivor'})];break;
 case 'buff':stages=[status('positive')];break;
 case 'debuff':stages=[status('negative')];break;
 case 'revive-heal':stages=[stage('combined-revive-heal',{
  targetScope,components:freeze(['revive','heal']),
  atomicPerTarget:true,power:rule.power})];break;
 case 'revive':stages=[stage('revive',{targetScope,power:rule.power})];break;
 case 'heal':stages=[stage('heal',{targetScope,power:rule.power})];break;
 case 'dispel':stages=[stage('remove-status',{targetScope,sign:'positive'})];break;
 default:throw new RangeError('unsupported Soultimate effect');
 }
 return freeze({version:1,moveId:move.id,slot:'soultimate',
  category:rule.kind,targetScope,evidence:move.evidence,
  sourceRefs:freeze([...move.sourceRefs]),
  originalHitCount:pattern.type==='unknown'?null:pattern.count,
  hitPattern:clonePattern(pattern),stages:freeze(stages),
  // This is a semantic plan ONLY. No new in-battle hook order is established.
  ruleSignature:JSON.stringify(rule),
  orderEvidence:'legacy-playtest-only'});
}

/** Reject mismatched executable specs before entering the legacy resolver. */
export function assertSoultimatePlanMatches(plan,rawDefinition){
 if(!object(plan)||plan.version!==1||plan.slot!=='soultimate'||
    !word(plan.moveId)||!Array.isArray(plan.stages))
  throw new TypeError('invalid compiled Soultimate plan');
 const rule=validateSpecialSpec(rawDefinition);
 if(plan.category!==rule.kind||plan.targetScope!==scopeOf(rule)||
    plan.ruleSignature!==JSON.stringify(rule))
  throw new TypeError('Soultimate execution and authored plan disagree');
 return true;
}
