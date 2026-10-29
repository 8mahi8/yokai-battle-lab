/**
 * V3-4-5: A source-cited YW2 RESEARCH intake, separate from the live fixture
 * CombatCatalog. Names/stats/move facts here are not battle-ready definitions.
 *
 * A disagreement between guides is recorded as CONFLICT, never reduced to a
 * guessed power/hit count. No fields silently become a playable skill or move.
 * No copyrighted sprites, descriptions or third-party source contents.
 */
export const YW2_SOURCE_INTAKE_SCHEMA=1;
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const MOVE_SLOTS=Object.freeze(['attack','technique','inspirit','soultimate']);
const factKinds=Object.freeze(['documented','disputed','unknown']);
const copy=x=>JSON.parse(JSON.stringify(x));
const deepFreeze=x=>{
 if(x&&typeof x==='object'){
  for(const v of Object.values(x))deepFreeze(v);
  Object.freeze(x);
 }
 return x;
};
const hasOwn=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const validUrl=x=>{
 if(typeof x!=='string'||!/^https:\/\/[^\s/]+\//.test(x))return false;
 return !/[\s<>]/.test(x);
};
function validateFact(f,sources,label){
 if(!obj(f)||!factKinds.includes(f.status)||
    !Array.isArray(f.sourceIds)||f.sourceIds.length<1||
    new Set(f.sourceIds).size!==f.sourceIds.length||
    !f.sourceIds.every(id=>hasOwn(sources,id))||
    !Array.isArray(f.claims))
  throw new TypeError(label+': invalid provenance/status');
 if(f.status==='documented'){
  if(f.claims.length!==1||!obj(f.claims[0])||
     !hasOwn(f.claims[0],'value')||
     f.claims[0].value===null||
     !Array.isArray(f.claims[0].sourceIds)||
     f.claims[0].sourceIds.length<1||
     !f.claims[0].sourceIds.every(id=>f.sourceIds.includes(id)))
   throw new TypeError(label+': documented fact needs one sourced value');
 }else if(f.status==='disputed'){
  const values=new Set(f.claims.map(c=>JSON.stringify(c?.value)));
  if(f.claims.length<2||values.size<2||
    f.claims.some(c=>!obj(c)||c.value===null||
     !Array.isArray(c.sourceIds)||c.sourceIds.length<1||
     c.sourceIds.some(id=>!f.sourceIds.includes(id))))
   throw new TypeError(label+': disputed fact requires 2+ sourced conflicting claims');
 }else if(f.claims.length!==0)
  throw new TypeError(label+': unknown fact cannot carry a guessed value');
}
function readDocumented(f){return f.status==='documented'?f.claims[0].value:null;}
export function createYw2SourceIndex({sources,characters}={}){
 if(!obj(sources)||Object.keys(sources).length===0||
    Object.entries(sources).some(([id,url])=>!text(id)||!validUrl(url))||
    !Array.isArray(characters)||!characters.length)
  throw new TypeError('valid YW2 sources and characters required');
 const byId=new Map();
 for(const entry of characters){
  if(!obj(entry)||entry.schema!==YW2_SOURCE_INTAKE_SCHEMA||
     !text(entry.id)||!entry.id.startsWith('yw2:')||
     !text(entry.name)||entry.game!=='yw2'||
     byId.has(entry.id)||!text(entry.rank)||!text(entry.tribe)||
     !Array.isArray(entry.identitySourceIds)||
     entry.identitySourceIds.length<1||
     entry.identitySourceIds.some(id=>!hasOwn(sources,id))||
     !obj(entry.moves)||Object.keys(entry.moves).length!==4||
     !obj(entry.skill)||!obj(entry.stats))
   throw new TypeError('invalid or repeated YW2 research character');
  for(const slot of MOVE_SLOTS){
   const move=entry.moves[slot];
   if(!obj(move)||!text(move.label)||
      !Array.isArray(move.labelSourceIds)||move.labelSourceIds.length<1||
      move.labelSourceIds.some(id=>!hasOwn(sources,id))||
      !obj(move.power)||
      !obj(move.hits)||!obj(move.element)||!obj(move.effect))
    throw new TypeError('missing YW2 move slot fact: '+slot);
   for(const k of ['power','hits','element','effect'])
    validateFact(move[k],sources,entry.id+'/'+slot+'/'+k);
   if(move.level!==undefined){
    if(slot!=='inspirit')throw new TypeError('only Inspirit moves may carry status level');
    validateFact(move.level,sources,entry.id+'/'+slot+'/level');
    const level=readDocumented(move.level);
    if(level!==null&&(!Number.isSafeInteger(level)||level<1||level>4))
     throw new TypeError('invalid YW2 Inspirit level');
   }
  }
  for(const k of ['label','effect'])validateFact(entry.skill[k],sources,
    entry.id+'/skill/'+k);
  for(const k of ['hp','strength','spirit','defense','speed']){
   validateFact(entry.stats[k],sources,entry.id+'/stats/'+k);
   const value=readDocumented(entry.stats[k]);
   if(value!==null&&!integer(value))throw new TypeError('invalid base stat');
  }
  const immutable=deepFreeze(copy(entry));
  byId.set(entry.id,immutable);
 }
 const list=Object.freeze([...byId.values()]);
 const sourceUrls=deepFreeze(copy(sources));
 return Object.freeze({
  schema:YW2_SOURCE_INTAKE_SCHEMA,characters:list,sources:sourceUrls,
  getCharacter:id=>byId.get(id)??null,
  /**
   * Read-only UI strings and explicitly provisional information.
   * Rendering must never imply that this character can already join PvP.
   */
  getPreview:id=>{
   const c=byId.get(id);
   if(!c)return null;
   const fields=Object.fromEntries(MOVE_SLOTS.map(slot=>[
    slot,c.moves[slot].label]));
   const conflicts=[];
   for(const slot of MOVE_SLOTS)for(const k of ['power','hits','element','effect'])
    if(c.moves[slot][k].status==='disputed')
     conflicts.push(slot+'.'+k);
   const stats=Object.fromEntries(['hp','strength','spirit','defense','speed']
    .map(k=>[k,readDocumented(c.stats[k])]));
   return deepFreeze({id:c.id,name:c.name,rank:c.rank,tribe:c.tribe,
    moveLabels:fields,skillLabel:readDocumented(c.skill.label),
    level99Stats:stats,conflicts,
    // No adapter from original facts to the provisional game formulas.
    battleReady:false,
    note:'research-only; not a playable rental or verified YW2 simulator'});
  }
 });
}
