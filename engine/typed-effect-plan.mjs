/**
 * Engine V3-2: compile the EXISTING immutable move catalog into a strictly
 * typed, immutable effect plan. This is a SOURCE/SHAPE contract, not a new
 * YW2 damage formula or a second roster of move values.
 *
 * Only the three ordinary move categories are supported in this slice:
 * attack, technique, inspirit. Soultimates can combine multiple target and
 * hit stages; reject them instead of pretending that an unknown hit count
 * is one hit. Unknown YW2 formulae remain the legacy resolver's concern.
 */
export const TYPED_EFFECT_PLAN_VERSION=1;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const int=x=>Number.isSafeInteger(x)&&x>=0;
const word=x=>typeof x==='string'&&x.length>0;

function damageEffect(move,kind){
 const h=move.hitPattern;
 if(!int(move.power)||move.targetScope!=='single_enemy'||
    !object(h)||!['single','multi'].includes(h.type)||
    !Number.isSafeInteger(h.count)||h.count<1||h.count>9||
    (h.type==='single')!==(h.count===1))
  throw new TypeError('invalid catalog damage shape');
 if(kind==='technique'&&!word(move.element))
  throw new TypeError('damage technique requires an element');
 return Object.freeze({type:'damage',kind,power:move.power,
  hits:h.count,element:kind==='attack'?'neutral':move.element});
}
function healEffect(move){
 if(!int(move.power)||move.targetScope!=='single_ally'||
    move.hitPattern?.type!=='none'||move.hitPattern.count!==0)
  throw new TypeError('invalid catalog healing shape');
 return Object.freeze({type:'heal',power:move.power});
}
function statusEffect(move,sign){
 if(!word(move.statusEffect)||
    move.targetScope!==(sign==='positive'?'single_ally':'single_enemy')||
    move.hitPattern?.type!=='none'||move.hitPattern.count!==0)
  throw new TypeError('invalid catalog status shape');
 return Object.freeze({type:'status',sign,statusId:move.statusEffect});
}

/** Reject unmodeled combinations BEFORE they reach the authoritative host. */
export function compileTypedEffectPlan(move){
 if(!object(move)||!word(move.id)||!word(move.slot)||
    !word(move.category)||!word(move.targetScope)||
    !['fixture','unknown','documented','observed'].includes(move.evidence)||
    !Array.isArray(move.sourceRefs))
  throw new TypeError('invalid authored move');
 let effect;
 if(move.slot==='attack'&&move.category==='physical_damage')
  effect=damageEffect(move,'attack');
 else if(move.slot==='technique'&&move.category==='technique_damage')
  effect=damageEffect(move,'technique');
 else if(move.slot==='technique'&&move.category==='heal')
  effect=healEffect(move);
 else if(move.slot==='inspirit'&&move.category==='status_positive')
  effect=statusEffect(move,'positive');
 else if(move.slot==='inspirit'&&move.category==='status_negative')
  effect=statusEffect(move,'negative');
 else throw new RangeError('typed effect category not yet supported: '+move.slot+'/'+move.category);
 return Object.freeze({version:TYPED_EFFECT_PLAN_VERSION,
  moveId:move.id,slot:move.slot,targetScope:move.targetScope,
  evidence:move.evidence,effect});
}

/**
 * The computed amount or validated status is supplied by the pre-existing
 * authoritative resolver. The plan proves that this KIND of commit is
 * permitted by its move; it never chooses targets or spends RNG itself.
 * No opponent-facing snapshot or event schema is changed here.
 */
export function commitTypedEffect(plan,committer,{target,amount,statusSpec}={}){
 if(!object(plan)||plan.version!==TYPED_EFFECT_PLAN_VERSION||
    !object(plan.effect)||!object(committer)||!object(target)||
    !word(target.id))throw new TypeError('valid typed effect commit required');
 const type=plan.effect.type;
 if(type==='damage'||type==='heal'){
  if(!int(amount)||statusSpec!==undefined)
   throw new TypeError('amount-only typed effect required');
  const method=type==='damage'?'commitDamage':'commitHeal';
  if(typeof committer[method]!=='function')
   throw new TypeError('effect committer missing '+method);
  return committer[method](target,amount);
 }
 if(type==='status'){
  if(amount!==undefined||!object(statusSpec)||
     statusSpec.id!==target.id||
     statusSpec.sign!==plan.effect.sign||
     statusSpec.effect!==plan.effect.statusId||
     typeof committer.commitStatus!=='function')
   throw new TypeError('status effect does not match authored plan');
  return committer.commitStatus(statusSpec);
 }
 throw new RangeError('unsupported typed effect');
}
