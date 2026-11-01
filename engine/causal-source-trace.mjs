/**
 * Engine V3-3 -> V3-4 read-only causal SOURCE trace.
 *
 * The host owns its existing event order and presentation journal.
 * This adapter joins a verified actor identity to the immutable authored
 * move/skill catalog by ID, WITHOUT modifying battle snapshots, hashes,
 * event IDs, action order, RNG or opponent-visible animation.
 *
 * Canonical event IDs and presentation sequences belong to DIFFERENT logs.
 * A timestamp/sequence in one domain never proves an exact 3DS frame or a
 * one-to-one correspondence in the other domain. No synthetic pairing.
 */
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const nonneg=x=>Number.isSafeInteger(x)&&x>=0;
const word=x=>typeof x==='string'&&x.length>0;
const freeze=x=>Object.freeze(x);
const slotForEvent=e=>e.type==='special'?'soultimate':
 e.type==='action'?e.kind==='heal'?'technique':
  ['attack','technique','inspirit'].includes(e.kind)?e.kind:null:null;

/**
 * Rental source IDs are assigned explicitly at the match boundary, NEVER
 * guessed from a look-alike custom team's nickname, 3DS art, or stats.
 * `teamCharacterIds` is null for custom rosters with no verified IDs.
 */
export function inspectCausalSourceTrace({
 battleSnapshot,catalog=null,teamCharacterIds=null
}={}){
 if(!obj(battleSnapshot)||!Array.isArray(battleSnapshot.squads)||
    battleSnapshot.squads.length!==2||
    !battleSnapshot.squads.every(team=>Array.isArray(team)&&team.length===6)||
    !Array.isArray(battleSnapshot.events))
  throw new TypeError('canonical two-team battle snapshot required');
 if((catalog===null)!==(teamCharacterIds===null))
  throw new TypeError('source catalog and explicit actor IDs must be supplied together');
 const bound=new Map();
 if(catalog!==null){
  if(typeof catalog.getCharacter!=='function'||!Array.isArray(teamCharacterIds)||
     teamCharacterIds.length!==2||!teamCharacterIds.every(ids=>
      Array.isArray(ids)&&ids.length===6&&ids.every(word)))
   throw new TypeError('six explicit character source IDs per side required');
  for(let side=0;side<2;side++){
   for(let i=0;i<6;i++){
    const member=battleSnapshot.squads[side][i];
    const character=catalog.getCharacter(teamCharacterIds[side][i]);
    if(!character||!obj(member)||member.id!==(side===0?'A':'B')+(i+1)||
       member.name!==character.name||
       member.maxHp!==character.stats.hp||
       member.strength!==character.stats.strength||
       member.spirit!==character.stats.spirit||
       member.defense!==character.stats.defense||
       member.speed!==character.stats.speed||
       'skill:'+member.skill!==character.skill.id)
     throw new TypeError('source character does not match authoritative roster slot');
    bound.set(member.id,character);
   }
  }
 }
 const canonical=battleSnapshot.events.map(event=>{
  if(!obj(event)||!nonneg(event.eventId)||event.eventId<1||!word(event.type))
   throw new TypeError('invalid authoritative event');
  const actor=word(event.actor)?event.actor:null;
  const character=actor?bound.get(actor)??null:null;
  const slot=slotForEvent(event);
  const move=slot&&character?character.moves?.[slot]:null;
  if(character&&slot&&!move)
   throw new TypeError('authored move reference is missing for '+slot);
  return freeze({
   eventId:event.eventId,type:event.type,actorId:actor,
   characterId:character?.id??null,
   moveId:move?.id??null,moveSlot:move?slot:null,
   passiveSkillId:character?.skill?.id??null,
   evidence:move?.evidence??null,
   // Source order and status are *not* equal to animation timestamp.
   domain:'canonical-commit'
  });
 });
 let lastId=0;
 for(const e of canonical){
  if(e.eventId<=lastId)throw new TypeError('event IDs must be strictly increasing');
  lastId=e.eventId;
 }
 let visible=null,buffered=null;
 if(battleSnapshot.presentation!==undefined){
  const p=battleSnapshot.presentation;
  if(!obj(p)||!nonneg(p.now)||!Array.isArray(p.visible)||
     !Array.isArray(p.buffered))
   throw new TypeError('invalid presentation snapshot');
  const presentationEvent=(e,isVisible)=>{
   if(!obj(e)||!nonneg(e.sequence)||e.sequence<1||
      !nonneg(e.at)||!word(e.kind)||!Number.isInteger(e.side)||
      ![0,1].includes(e.side))
    throw new TypeError('invalid presentation event');
   if(isVisible&&(!nonneg(e.visibleAt)||e.visibleAt>p.now))
    throw new TypeError('invalid visible timestamp');
   return freeze({sequence:e.sequence,kind:e.kind,side:e.side,
    actorId:word(e.memberId)?e.memberId:null,
    recordedAtMs:e.at,visibleAtMs:isVisible?e.visibleAt:null,
    delayed:isVisible?e.delayed===true:null,
    domain:'presentation-research-ms'});
  };
  visible=freeze(p.visible.map(e=>presentationEvent(e,true)));
  buffered=freeze(p.buffered.map(e=>presentationEvent(e,false)));
 }
 return freeze({
  version:1,
  canonical:freeze(canonical),
  visible,buffered,
  // No implied equation from eventId to sequence/at/visibleAt.
  pairing:'not-inferred',
  source:'catalog-identity-or-unbound'
 });
}
