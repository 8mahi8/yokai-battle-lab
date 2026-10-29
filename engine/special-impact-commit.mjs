/**
 * V3-2: authoritative, source-plan-checked Soultimate impact COMMIT boundary.
 *
 * The existing resolver still determines targets, hit counts, magnitude,
 * resistance RNG, cut-in timing, Soul, KO and interruption. This module only
 * validates planned impact families and routes pre-resolved HP effects through
 * the existing EffectCommitter. It must not add random draws, infer unknown
 * hit counts or split one revive-heal impact into two writes.
 */
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const damaging=new Set(['damage','drain','damage-status']);
const recovering=new Set(['heal','revive']);
const word=x=>typeof x==='string'&&x.length>0;

function stageFor(plan,impact){
 if(!object(plan)||plan.version!==1||plan.slot!=='soultimate'||
    !Array.isArray(plan.stages)||!object(impact))
  throw new TypeError('compiled Soultimate plan and impact required');
 const {kind}=impact;
 let stage;
 switch(plan.category){
 case 'damage':
  if(kind==='damage')stage=plan.stages.find(s=>s.type==='damage');
  break;
 case 'drain':
  if(kind==='drain')stage=plan.stages.find(s=>s.type==='damage');
  if(kind==='heal'&&impact.linkedDrain===true)
   stage=plan.stages.find(s=>s.type==='heal-from-actual-damage');
  break;
 case 'damage-status':
  if(kind==='damage-status')stage=plan.stages.find(s=>s.type==='damage');
  break;
 case 'buff':
  if(kind==='buff')stage=plan.stages.find(s=>s.type==='status');
  break;
 case 'debuff':
  if(kind==='debuff')stage=plan.stages.find(s=>s.type==='status');
  break;
 case 'revive-heal':
  if(recovering.has(kind)&&impact.linkedReviveHeal===true)
   stage=plan.stages.find(s=>s.type==='combined-revive-heal');
  break;
 case 'heal':
  if(kind==='heal')stage=plan.stages.find(s=>s.type==='heal');
  break;
 case 'revive':
  if(kind==='revive')stage=plan.stages.find(s=>s.type==='revive');
  break;
 default:break;
 }
 if(!stage)throw new RangeError('Soultimate impact not permitted by authored plan');
 return stage;
}

/**
 * Fail closed BEFORE the host consumes any RNG or commits an impact.
 * The original-game frame/level ordering is still unknown, so this checks
 * only safe source catalog structure and already-chosen team membership.
 */
export function assertPlannedSpecialImpact(plan,impact,{casterSide,target}={}){
 const stage=stageFor(plan,impact);
 if(!object(target)||!word(target.id)||target.id!==impact.targetId||
    !Number.isInteger(casterSide)||![0,1].includes(casterSide)||
    !Number.isInteger(target.side)||![0,1].includes(target.side))
  throw new TypeError('Soultimate impact has invalid target context');
 const scope=stage.targetScope;
 const allied=['single_ally','ally_front','ally_team','self'].includes(scope);
 const hostile=['single_enemy','enemy_front'].includes(scope);
 if((!allied&&!hostile)||
    (allied&&target.side!==casterSide)||
    (hostile&&target.side===casterSide))
  throw new RangeError('Soultimate impact violates authored target side');
 // Validate HP payloads for the entire planned impact set BEFORE any
 // previous impact can commit. Never wait until mid-combo to reject bad data.
 if(damaging.has(impact.kind)&&
    (!Number.isSafeInteger(impact.amount)||impact.amount<0))
  throw new TypeError('Soultimate damage amount invalid');
 if(recovering.has(impact.kind)&&
    (!Number.isSafeInteger(impact.hpAfter)||
     !Number.isSafeInteger(target.hp)||!Number.isSafeInteger(target.maxHp)||
     impact.hpAfter<target.hp||impact.hpAfter>target.maxHp))
  throw new TypeError('Soultimate recovery amount invalid');
 if(['buff','debuff','damage-status'].includes(plan.category)){
  const statusStage=plan.stages.find(s=>
   s.type==='status'||s.type==='status-on-surviving-target');
  if(!statusStage||impact.statusEffect!==statusStage.statusEffect||
     impact.statusSign!==statusStage.sign||
     !Number.isInteger(impact.statusLevel)||
     impact.statusLevel<statusStage.level||impact.statusLevel>4)
   throw new TypeError('Soultimate status violates authored effect');
 }
 return stage;
}

/** Returns the existing commit result; the caller retains all event and KO order. */
export function commitPlannedSpecialHp({plan,impact,target,casterSide,effects}={}){
 const stage=assertPlannedSpecialImpact(plan,impact,{casterSide,target});
 if(!object(effects))throw new TypeError('EffectCommitter required');
 if(damaging.has(impact.kind)){
  if(stage.type!=='damage'||typeof effects.commitDamage!=='function'||
     !Number.isSafeInteger(impact.amount)||impact.amount<0)
   throw new TypeError('Soultimate damage commit mismatch');
  return effects.commitDamage(target,impact.amount);
 }
 if(recovering.has(impact.kind)){
  if(!['heal','revive','heal-from-actual-damage','combined-revive-heal']
     .includes(stage.type)||typeof effects.commitHeal!=='function'||
     !Number.isSafeInteger(impact.hpAfter)||!Number.isSafeInteger(target.hp)||
     impact.hpAfter<target.hp||impact.hpAfter>target.maxHp)
   throw new TypeError('Soultimate recovery commit mismatch');
  return effects.commitHeal(target,Math.max(0,impact.hpAfter-target.hp));
 }
 throw new RangeError('status-only Soultimate cannot commit HP');
}

/**
 * Apply a validated special status through the SAME existing canonical
 * Inspirit function. The caller still decides whether the status resisted
 * and whether a damaged target survived; moving those RNG rolls here would
 * change battle behavior. This only removes duplicate host status routing.
 */
export function commitPlannedSpecialStatus({
 plan,impact,target,casterSide,casterId,applyStatus
}={}){
 assertPlannedSpecialImpact(plan,impact,{casterSide,target});
 if(!['buff','debuff','damage-status'].includes(impact.kind)||
    !word(casterId)||typeof applyStatus!=='function')
  throw new TypeError('Soultimate status commit requires a status stage');
 if(target.hp<=0)
  throw new RangeError('Soultimate status cannot apply to a KO member');
 return applyStatus({id:target.id,sign:impact.statusSign,
  effect:impact.statusEffect,level:impact.statusLevel,source:casterId});
}

/**
 * Validate all effects from the custom/reference research planner BEFORE
 * the first HP/status write. Unlike the authored six-Soultimate plan, there
 * is no source-defined stage catalog for these fixtures. Keep this as a
 * structural/sidedness guard, never a source of original YW2 mechanics.
 */
export function assertResearchSpecialImpact(impact,{casterSide,target}={}){
 if(!object(impact)||!object(target)||!word(target.id)||
    impact.targetId!==target.id||
    !Number.isSafeInteger(target.hp)||!Number.isSafeInteger(target.maxHp)||
    target.maxHp<1||target.hp<0||target.hp>target.maxHp||
    ![0,1].includes(target.side)||![0,1].includes(casterSide))
  throw new TypeError('valid canonical research impact target required');
 const kind=impact.kind;
 const allied=kind==='heal'||kind==='revive'||kind==='buff';
 const hostile=damaging.has(kind)||kind==='debuff';
 if((!allied&&!hostile)||
    (allied&&target.side!==casterSide)||
    (hostile&&target.side===casterSide))
  throw new RangeError('research impact kind or target side invalid');
 if(damaging.has(kind)&&
    (!Number.isSafeInteger(impact.amount)||impact.amount<0))
  throw new TypeError('research impact damage must be a nonnegative integer');
 if(recovering.has(kind)&&
    (!Number.isSafeInteger(impact.hpAfter)||
     impact.hpAfter<target.hp||impact.hpAfter>target.maxHp))
  throw new TypeError('research recovery HP out of range');
 if(['buff','debuff','damage-status'].includes(kind)){
  const sign=kind==='buff'?'positive':'negative';
  if(target.hp<=0||impact.statusSign!==sign||
     !word(impact.statusEffect)||
     !Number.isInteger(impact.statusLevel)||
     impact.statusLevel<1||impact.statusLevel>4)
   throw new TypeError('research status impact invalid');
 }
 return true;
}

/**
 * Research-only status impact adapter. Keeps the original host resistance RNG
 * and event order but prevents custom moves from bypassing target, sign and
 * status magnitude validation before the canonical Inspirit ledger commit.
 * These checks are NOT claims about original YW2 status priority.
 */
export function commitResearchSpecialStatus({
 impact,target,casterSide,casterId,applyStatus
}={}){
 if(!object(impact)||!object(target)||!word(target.id)||
    target.id!==impact.targetId||
    !Number.isInteger(target.side)||![0,1].includes(target.side)||
    !Number.isInteger(casterSide)||![0,1].includes(casterSide)||
    !word(casterId)||typeof applyStatus!=='function'||
    !Number.isInteger(target.hp)||target.hp<=0)
  throw new TypeError('valid living research special status context required');
 const {kind,statusEffect,statusSign,statusLevel}=impact;
 const expected=kind==='buff'?'positive':
   ['debuff','damage-status'].includes(kind)?'negative':null;
 if(!expected||statusSign!==expected||
    (kind==='buff'&&target.side!==casterSide)||
    (kind!=='buff'&&target.side===casterSide)||
    !word(statusEffect)||!Number.isInteger(statusLevel)||
    statusLevel<1||statusLevel>4)
  throw new RangeError('invalid research special status impact');
 return applyStatus({id:target.id,sign:statusSign,effect:statusEffect,
  level:statusLevel,source:casterId});
}

/**
 * V3-2 legacy/reference Soultimate HP commit. Unlike authored rental plans,
 * custom and reference research fixtures have no validated catalog plan.
 * Validate their already-resolved HP impact and use the SAME authoritative
 * EffectCommitter as planned Soultimates. Never infer move values or hits.
 *
 * The host retains impact ordering, status resistance, RNG, interruption,
 * passive skill and KO policy. Buff/debuff are status-only, not HP impacts.
 */
export function commitResearchSpecialHp({impact,target,effects}={}){
 if(!object(impact)||!object(target)||!word(target.id)||
    target.id!==impact.targetId||
    !Number.isSafeInteger(target.hp)||!Number.isSafeInteger(target.maxHp)||
    target.hp<0||target.maxHp<1||target.hp>target.maxHp||
    !object(effects))
  throw new TypeError('valid resolved research special HP context required');
 if(damaging.has(impact.kind)){
  if(!Number.isSafeInteger(impact.amount)||impact.amount<0||
     typeof effects.commitDamage!=='function')
   throw new TypeError('valid research special damage commit required');
  return effects.commitDamage(target,impact.amount);
 }
 if(recovering.has(impact.kind)){
  if(!Number.isSafeInteger(impact.hpAfter)||
     impact.hpAfter<target.hp||impact.hpAfter>target.maxHp||
     typeof effects.commitHeal!=='function')
   throw new TypeError('valid research special recovery commit required');
  return effects.commitHeal(target,impact.hpAfter-target.hp);
 }
 throw new RangeError('unsupported research special HP impact kind');
}
