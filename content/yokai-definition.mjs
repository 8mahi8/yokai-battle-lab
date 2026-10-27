/**
 * Schema V1: one Yo-kai-like character, without mutable match state.
 * This is an authoring/validation contract, NOT an authoritative battle rule.
 * Video/guide sources establish the four actions, passive skill, five stats,
 * tribe/rank, serious+attitude personality, and optional equipment.
 * Unknown game-specific facts stay null, never guessed.
 */
export const YOKAI_DEFINITION_SCHEMA=1;
export const YOKAI_ACTION_SLOTS=Object.freeze([
 'attack','technique','inspirit','soultimate'
]);
export const YOKAI_EVIDENCE_LEVELS=Object.freeze([
 'observed','documented','fixture','unknown'
]);
const SCOPE=new Set(['single_enemy','enemy_front','single_ally','ally_front',
 'ally_team','self','unknown']);
const PATTERN=new Set(['single','multi','none','unknown']);
const CATEGORY=new Set(['physical_damage','technique_damage','heal',
 'status_positive','status_negative','damage','drain','buff','debuff',
 'damage-status','revive','revive-heal']);
const evidence=new Set(YOKAI_EVIDENCE_LEVELS);
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0;
const int=x=>Number.isSafeInteger(x);
const unknownOrText=x=>x===null||text(x);
function fail(message){throw new TypeError('yokai definition: '+message);}
function validateSourceRefs(refs,level,label){
 if(!Array.isArray(refs)||refs.some(x=>!text(x)))fail(label+' sourceRefs');
 if(['observed','documented'].includes(level)&&refs.length===0)
  fail(label+' confirmed evidence requires sourceRefs');
}
function freezeDeep(value){
 if(value&&typeof value==='object'){
  for(const v of Object.values(value))freezeDeep(v);
  Object.freeze(value);
 }
 return value;
}
function checkMove(move,slot){
 if(!object(move)||move.slot!==slot||!text(move.id))fail('missing '+slot+' move');
 if(!unknownOrText(move.displayName))fail(slot+' displayName');
 if(!CATEGORY.has(move.category))fail(slot+' category');
 if(move.power!==null&&(!int(move.power)||move.power<0))fail(slot+' power');
 if(!unknownOrText(move.element))fail(slot+' element');
 if(!SCOPE.has(move.targetScope))fail(slot+' targetScope');
 if(!unknownOrText(move.statusEffect))fail(slot+' statusEffect');
 if(!evidence.has(move.evidence))fail(slot+' evidence');
 validateSourceRefs(move.sourceRefs,move.evidence,slot);
 const h=move.hitPattern;
 if(!object(h)||!PATTERN.has(h.type))fail(slot+' hitPattern');
 if(h.type==='unknown'&&h.count!==null)fail(slot+' unknown count must be null');
 if(h.type==='none'&&h.count!==0)fail(slot+' non-hit count must be 0');
 if(h.type==='single'&&h.count!==1)fail(slot+' single hit count must be 1');
 if(h.type==='multi'&&(!int(h.count)||h.count<2))fail(slot+' multi count must be >= 2');
}
/** Throws if a record could silently conflate a multi-target move with hits. */
export function validateYokaiDefinition(definition){
 const d=definition;
 if(!object(d)||d.schema!==YOKAI_DEFINITION_SCHEMA||!text(d.id)||!text(d.name))
  fail('schema, id or name');
 for(const k of ['tribe','rank','faction'])
  if(!unknownOrText(d[k]))fail(k);
 if(!object(d.stats))fail('stats');
 for(const k of ['hp','strength','spirit','defense','speed'])
  if(!int(d.stats[k])||d.stats[k]<(k==='hp'?1:0))fail('stats.'+k);
 if(d.resistances!==null){
  if(!object(d.resistances))fail('resistances');
  for(const v of Object.values(d.resistances))
   if(typeof v!=='number'||!Number.isFinite(v)||v<0)fail('resistance value');
 }
 if(d.equipment!==null&&!object(d.equipment))fail('equipment');
 const p=d.personality;
 if(!object(p)||!(p.seriousnessTier===null||
  (int(p.seriousnessTier)&&p.seriousnessTier>=1&&p.seriousnessTier<=7)))
  fail('seriousnessTier');
 if(!text(p.attitude)||!Array.isArray(p.actionWeights)||
  p.actionWeights.length!==4||p.actionWeights.some(v=>!int(v)||v<0)||
  p.actionWeights.reduce((a,b)=>a+b,0)!==100)
  fail('attitude and actionWeights');
 if(p.loafChancePercent!==null&&
  (typeof p.loafChancePercent!=='number'||!Number.isFinite(p.loafChancePercent)||
   p.loafChancePercent<0||p.loafChancePercent>100))fail('loafChancePercent');
 if(!object(d.moves)||Object.keys(d.moves).length!==4)fail('four move slots');
 const ids=[];
 for(const slot of YOKAI_ACTION_SLOTS){
  checkMove(d.moves[slot],slot);
  ids.push(d.moves[slot].id);
 }
 if(new Set(ids).size!==4)fail('move IDs must be unique');
 const s=d.skill;
 if(!object(s)||!text(s.id)||!unknownOrText(s.displayName)||
  !unknownOrText(s.trigger)||!unknownOrText(s.effect)||
  !evidence.has(s.evidence))fail('skill');
 validateSourceRefs(s.sourceRefs,s.evidence,'skill');
 if(!object(d.provenance))fail('provenance');
 for(const k of ['identity','stats','moves','skill','personality','tribe',
  'rank','faction','resistances','equipment']){
  if(!evidence.has(d.provenance[k]))fail('provenance.'+k);
  if(!object(d.fieldSourceRefs))fail('fieldSourceRefs');
  validateSourceRefs(d.fieldSourceRefs[k],d.provenance[k],k);
 }
 return true;
}
/** A frozen copy prevents schema consumers from altering the active roster. */
export function defineYokai(definition){
 validateYokaiDefinition(definition);
 return freezeDeep(JSON.parse(JSON.stringify(definition)));
}
