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
   return {key:'poke:'+i+':'+JSON.stringify(event),type:'poke',
    kind:'poke',actor:null,side:event.side,mode:null,rewardKind:kind,
    targets,target:event.targetId,amount:reward.amount??0};
  }
  if(event.type==='special'){
   const targets=Array.isArray(event.impacts)?event.impacts.filter(x=>x&&
    typeof x.targetId==='string'&&Number.isFinite(x.amount)).map(x=>({
     id:x.targetId,amount:x.amount,kind:['heal','revive','buff','debuff'].includes(x.kind)?x.kind:'damage',
     hit:x.kind==='buff'||x.kind==='debuff'?x.applied!==false:true
    })):[];
   return {key:'special:'+i+':'+JSON.stringify(event),type:'special',actor:event.actor,
    mode:event.mode,kind:'special',targets,target:targets[0]?.id??null,
    amount:targets[0]?.amount??0};
  }
  if(!Number.isFinite(event.turn))continue;
  return {key:'action:'+event.turn,type:'action',actor:event.actor,
   kind:event.kind,targets:event.target?[{id:event.target,
    amount:Number.isFinite(event.amount)?event.amount:0,
    kind:event.kind==='heal'?'heal':'damage',hit:event.hit!==false}]:[],
   target:event.target||null,amount:event.amount??0,hit:event.hit!==false};
 }
 return null;
}
