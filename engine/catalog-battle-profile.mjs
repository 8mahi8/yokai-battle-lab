/**
 * V3-4-3: EXPLICIT source-backed (or labelled fixture) execution profile.
 * Authoring identity and moves come exclusively from the existing catalog.
 * A profile supplies only the fields that catalog schema V1 does not encode:
 * Soul rank/capacity, Inspirit level and Soultimate composite specification.
 *
 * This does not add a new effect interpreter or support arbitrary skills.
 * Current battle's fixed skill/status/Soultimate handlers remain authoritative.
 */
import {soulCapacityForRank} from './soul.mjs';
import {validateSpecialSpec} from './special-effects.mjs';
import {validateRentalSkill,RENTAL_SKILLS}
 from './skill-effects.mjs';
import {PLAYTEST_SKILL_CATALOG}
 from '../content/skill-catalog.mjs';
import {inspiritEffectById}
 from '../content/inspirit-effect-master.mjs';
import {ELEMENTS} from './damage-model.mjs';
import {compileSoultimateEffectPlan} from './soultimate-effect-plan.mjs';

export const BATTLE_EXECUTION_PROFILE_SCHEMA=1; // legacy explicit-special profile
export const BATTLE_EXECUTION_PROFILE_SCHEMA_V2=2; // move-owned execution only
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const string=x=>typeof x==='string'&&x.length>0;
const integer=x=>Number.isSafeInteger(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const expectedScope=spec=>spec.kind==='revive-heal'?'ally_team':
 spec.kind==='revive'?'single_ally':
 spec.kind==='heal'||spec.kind==='buff'?'ally_front':
 spec.scope==='one'?'single_enemy':'enemy_front';
const powerOf=spec=>spec.kind==='buff'||spec.kind==='debuff'?null:spec.power;
const effectOf=spec=>['buff','debuff','damage-status'].includes(spec.kind)
 ?spec.effect:null;
const frozenMember=member=>Object.freeze({...member,
 weights:Object.freeze([...member.weights]),
 special:Object.freeze({...member.special})});

export function validateBattleExecutionProfile(profile){
 if(!object(profile)||![BATTLE_EXECUTION_PROFILE_SCHEMA,
    BATTLE_EXECUTION_PROFILE_SCHEMA_V2].includes(profile.schema)||
    !string(profile.characterId)||
    !['fixture','documented','observed'].includes(profile.evidence)||
    !Array.isArray(profile.sourceRefs)||
    !profile.sourceRefs.every(string)||
    (profile.evidence!=='fixture'&&profile.sourceRefs.length===0))
  throw new TypeError('invalid execution profile identity/evidence');
 // Unexpected fields must never become implicit combat modifiers.
 const fields=['schema','characterId','evidence','sourceRefs',
  'soultimateRank','soulCapacity','inspiritLevel',
  ...(profile.schema===BATTLE_EXECUTION_PROFILE_SCHEMA?['special']:[])];
 if(Object.keys(profile).some(key=>!fields.includes(key))||
    fields.some(key=>!own(profile,key)))
  throw new TypeError('execution profile must explicitly declare all supported fields');
 if(!integer(profile.soultimateRank)||profile.soultimateRank<1||
    profile.soultimateRank>4||
    profile.soulCapacity!==soulCapacityForRank(profile.soultimateRank)||
    !integer(profile.inspiritLevel)||profile.inspiritLevel<1||
    profile.inspiritLevel>4)
  throw new RangeError('invalid explicit Soul capacity or Inspirit level');
 if(profile.schema===BATTLE_EXECUTION_PROFILE_SCHEMA)
  validateSpecialSpec(profile.special);
 return true;
}

/**
 * Compile exactly one character for the current battle implementation.
 * Caller must supply a fully built immutable CombatCatalog and a separately
 * supplied profile with matching characterId. Never identify by appearance,
 * nickname, base-stat similarity or a fallback 'rental slot'.
 */
export function compileBattleProfileCharacter({catalog,characterId,profile}={}){
 validateBattleExecutionProfile(profile);
 if(!catalog||typeof catalog.getCharacter!=='function'||
    typeof catalog.getMove!=='function'||typeof catalog.getSkill!=='function'||
    !string(characterId)||profile.characterId!==characterId)
  throw new TypeError('battle profile must bind one explicit catalog character ID');
 const character=catalog.getCharacter(characterId);
 if(!character)throw new RangeError('character ID absent from catalog: '+characterId);
 const [attack,technique,inspirit,soultimate]=[
  'attack','technique','inspirit','soultimate'].map(slot=>{
   const move=character.moves?.[slot];
   if(!move||catalog.getMove(move.id)!==move)
    // Built-in catalog validation defensively clones move records; they are
    // equivalent frozen data, not necessarily the same JS object instance.
    {if(!move||!same(catalog.getMove(move.id),move))
      throw new TypeError('missing/mismatched authored move '+slot);}
   return move;
  });
 const skill=catalog.getSkill(character.skill.id);
 const builtin=PLAYTEST_SKILL_CATALOG.find(x=>x.id===skill?.id);
 if(!builtin||!same(skill,builtin)||
    !same({id:character.skill.id,displayName:character.skill.displayName,
      trigger:character.skill.trigger,effect:character.skill.effect,
      evidence:character.skill.evidence,sourceRefs:character.skill.sourceRefs},
      {id:builtin.id,displayName:builtin.displayName,
       trigger:builtin.trigger,effect:builtin.effect,
       evidence:builtin.evidence,sourceRefs:builtin.sourceRefs})||
    !own(RENTAL_SKILLS,builtin.legacyKey))
  throw new TypeError('battle engine does not implement authored passive skill');
 validateRentalSkill(builtin.legacyKey);
 const hit=x=>integer(x?.hitPattern?.count)&&x.hitPattern.count>=1&&
  x.hitPattern.count<=9&&
  (x.hitPattern.type==='single')===(x.hitPattern.count===1);
 if(attack.category!=='physical_damage'||attack.targetScope!=='single_enemy'||
    !integer(attack.power)||attack.power<0||!hit(attack))
  throw new TypeError('unsupported physical move execution shape');
 const techniqueKind=technique.category==='heal'?'heal':
   technique.category==='technique_damage'?'damage':null;
 if(techniqueKind===null||!integer(technique.power)||technique.power<0||
    !ELEMENTS.includes(technique.element)||
    (techniqueKind==='heal'?
     technique.targetScope!=='single_ally'||
       technique.hitPattern?.type!=='none'||technique.hitPattern.count!==0:
     technique.targetScope!=='single_enemy'||!hit(technique)))
  throw new TypeError('unsupported Technique execution shape');
 const inspiritSpec=inspiritEffectById(inspirit.statusEffect);
 if(!inspiritSpec||
    inspirit.category!==(inspiritSpec.sign==='positive'?
     'status_positive':'status_negative')||
    inspirit.targetScope!==(inspiritSpec.sign==='positive'?
     'single_ally':'single_enemy')||
    inspirit.hitPattern?.type!=='none'||inspirit.hitPattern.count!==0)
  throw new TypeError('unsupported Inspirit execution shape');
 // V2 avoids copying any execution parameters outside the move master.
 // V1 remains importable, but cannot silently conflict with an authored
 // move-owned rule once one is present.
 if(profile.schema===BATTLE_EXECUTION_PROFILE_SCHEMA_V2&&
    !soultimate.execution)
  throw new TypeError('Soultimate move execution definition required for V2 profile');
 const sourceSpecial=soultimate.execution?
  validateSpecialSpec(soultimate.execution):null;
 const special=profile.schema===BATTLE_EXECUTION_PROFILE_SCHEMA_V2?
  sourceSpecial:validateSpecialSpec(profile.special);
 if(sourceSpecial&&JSON.stringify(special)!==JSON.stringify(sourceSpecial))
  throw new TypeError('Soultimate profile and move execution disagree');
 // Existing typed plan supplies one additional independent semantic check.
 if(sourceSpecial)compileSoultimateEffectPlan(soultimate,sourceSpecial);
 if(soultimate.category!==special.kind||
    soultimate.targetScope!==expectedScope(special)||
    soultimate.power!==powerOf(special)||
    soultimate.statusEffect!==effectOf(special)||
    !['none','unknown'].includes(soultimate.hitPattern?.type)||
    (soultimate.hitPattern.type==='none')!==
      (['buff','debuff','heal','revive','revive-heal'].includes(special.kind)))
  throw new TypeError('Soultimate move and executable composite spec disagree');
 if(soultimate.hitPattern.type==='none'&&soultimate.hitPattern.count!==0||
    soultimate.hitPattern.type==='unknown'&&soultimate.hitPattern.count!==null)
  throw new TypeError('unsupported Soultimate hit multiplicity');
 const personality=character.personality,stats=character.stats;
 if(!integer(personality?.loafChancePercent)||
    personality.loafChancePercent<0||personality.loafChancePercent>100||
    !string(personality.attitude)||!Array.isArray(personality.actionWeights)||
    personality.actionWeights.length!==4||
    personality.actionWeights.some(x=>!integer(x)||x<0)||
    personality.actionWeights.reduce((a,b)=>a+b,0)!==100||
    !object(stats)||!['hp','strength','spirit','defense','speed'].every(k=>
      integer(stats[k])&&stats[k]>=(k==='hp'||k==='speed'?1:0)))
  throw new TypeError('unsupported personality/stats in battle profile');
 const member={
  name:character.name,skill:builtin.legacyKey,
  maxHp:stats.hp,strength:stats.strength,spirit:stats.spirit,
  defense:stats.defense,speed:stats.speed,
  attitude:personality.attitude,
  weights:[...personality.actionWeights],
  loafChance:personality.loafChancePercent,
  soultimateRank:profile.soultimateRank,
  soulCapacity:profile.soulCapacity,
  attackPower:attack.power,
  ...(attack.hitPattern.count===1?{}:{attackHits:attack.hitPattern.count}),
  techniquePower:technique.power,technique:techniqueKind,
  ...(techniqueKind==='damage'&&technique.hitPattern.count>1?
    {techniqueHits:technique.hitPattern.count}:{}),
  ...(technique.element==='neutral'?{}:
    {techniqueElement:technique.element}),
  inspirit:inspirit.statusEffect,
  ...(profile.inspiritLevel===1?{}:{inspiritLevel:profile.inspiritLevel}),
  special
 };
 return frozenMember(member);
}
