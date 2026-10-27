/**
 * Read-only event -> short visual cue projection. Never synthesizes combat
 * outcomes and never modifies match protocol, battle state or prediction.
 */
export function latestBattleCue(events){
 if(!Array.isArray(events))throw new TypeError('battle events array required');
 for(let i=events.length-1;i>=0;i--){
  const event=events[i];
  if(!event||!['action','special','poke'].includes(event.type))continue;
  if(event.type==='poke'){
   const reward=event.reward||{};
   const kind=reward.kind||'unresolved';
   const damaging=kind==='playtest-damage'||kind==='playtest-heavy-hit';
   const targets=damaging?[{id:event.targetId,kind:'damage',
     amount:reward.amount??0,hit:true}]:[];
   return {key:Number.isSafeInteger(event.eventId)&&event.eventId>0?'event:'+event.eventId:'poke:'+i+':'+JSON.stringify(event),type:'poke',
    kind:'poke',actor:null,side:event.side,mode:null,rewardKind:kind,
    targets,target:event.targetId,amount:reward.amount??0};
  }
  if(event.type==='special'){
   const targets=Array.isArray(event.impacts)?event.impacts.filter(x=>x&&
    typeof x.targetId==='string'&&Number.isFinite(x.amount)).map(x=>({
     id:x.targetId,amount:x.amount,kind:['heal','revive','buff','debuff'].includes(x.kind)?x.kind:'damage',
     hit:x.kind==='buff'||x.kind==='debuff'?x.applied!==false:true
    })):[];
   return {key:Number.isSafeInteger(event.eventId)&&event.eventId>0?'event:'+event.eventId:'special:'+i+':'+JSON.stringify(event),type:'special',actor:event.actor,
    mode:event.mode,kind:'special',targets,target:targets[0]?.id??null,
    amount:targets[0]?.amount??0};
  }
  if(!Number.isFinite(event.turn))continue;
  return {key:Number.isSafeInteger(event.eventId)&&event.eventId>0?'event:'+event.eventId:'action:'+event.turn,type:'action',actor:event.actor,
   kind:event.kind,targets:event.target?[{id:event.target,
    amount:Number.isFinite(event.amount)?event.amount:0,
    kind:event.kind==='heal'?'heal':event.kind==='inspirit'?'status':'damage',hit:event.hit!==false}]:[],
   target:event.target||null,amount:event.amount??0,hit:event.hit!==false,
   // Already validated against the actual host rental squad by makeStageView.
   // This is presentation metadata and never a second damage calculation.
   ...(event.attackProjection?{moveId:event.attackProjection.moveId,
     hitResults:event.attackProjection.hitResults}:{} ),
   // New canonical-shaped read-only result travels beside old event data.
   // The actual host v1 protocol/HP state is still the sole authority.
   ...(event.actionOutcomeV2?{actionOutcomeV2:event.actionOutcomeV2}:{} )};
 }
 return null;
}


/** One visual reaction across wheel medals and field fighters. Always
 * resolve MISS before the intended effect type. Presentation only. */
export function visualReactionClass(impact){
 if(!impact)return '';
 if(impact.hit===false)return 'mb-missed';
 if(['heal','revive','buff'].includes(impact.kind))return 'mb-healed';
 if(impact.kind==='status')return 'mb-inspirited';
 return 'mb-hit';
}
