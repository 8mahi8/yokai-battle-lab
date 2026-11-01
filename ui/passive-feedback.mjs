/**
 * Phase48 - display-only notices for PASSIVE Yo-kai Skills.
 *
 * The host already determined whether each skill activated. Present those
 * immutable events near the corresponding action; never create new healing,
 * survive-at-1HP, or momentum effects here.
 *
 * The engine emits some skills before the action (last stand / knockout buff)
 * and others afterwards (adjacent care, momentum expiry). Match their known
 * order explicitly rather than assuming a skill event is another turn.
 */
const PRE_ACTION=new Set(['lastStand','momentum']);
const POST_ACTION=new Set(['care']);
const idOk=x=>Number.isSafeInteger(x)&&x>0;
function display(effect){
 const n=effect.skill;
 const label=n==='lastStand'?'どひょうぎわ':n==='momentum'?'まえのめり':
  n==='care'?'おせわ':'スキル';
 const result=n==='care'&&Number.isFinite(effect.amount)&&effect.amount>0
  ?' +'+effect.amount+'HP':
  effect.kind==='終了'?' 終了':' 発動';
 return Object.freeze({eventId:effect.eventId,key:'skill:'+effect.eventId,
  actorId:effect.actor??null,targetId:n==='care'?effect.targetId??null:null,
  label:label+result,kind:n});
}
/** Only effects linked to the latest canonical auto action, not older turns.
 * The events parameter must come from the host's ordered battle snapshot. */
export function passiveSkillNoticesForAction(events,actionEventId){
 if(!Array.isArray(events))throw new TypeError('events required');
 if(!idOk(actionEventId))return Object.freeze([]);
 const index=events.findIndex(e=>e?.type==='action'&&e.eventId===actionEventId);
 if(index===-1)return Object.freeze([]);
 const linked=[];
 for(let i=index-1;i>=0;i--){
  const effect=events[i];
  if(!effect||['action','poke','special'].includes(effect.type))break;
  if(effect.type==='skill'&&PRE_ACTION.has(effect.skill)&&effect.kind==='発動'&&idOk(effect.eventId))
   linked.push(display(effect));
 }
 linked.reverse();
 for(let i=index+1;i<events.length;i++){
  const effect=events[i];
  if(!effect||['action','poke','special'].includes(effect.type))break;
  if(effect.type==='skill'&&
     (POST_ACTION.has(effect.skill)||(effect.skill==='momentum'&&effect.kind==='終了'))&&
     idOk(effect.eventId))
   linked.push(display(effect));
 }
 return Object.freeze(linked.slice(0,3));
}
