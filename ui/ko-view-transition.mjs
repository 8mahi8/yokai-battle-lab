/**
 * V3-4-25 — read-only KO / frontline-change presentation evidence.
 *
 * This is deliberately NOT a second KO or automatic-rotation rule. The only
 * truth comes from two adjacent confirmed MatchProtocol snapshots plus a new
 * host damage event. Do not invent KO for MISS, guard, healing, status ticks,
 * duplicate packets, batched catch-up or someone who was already at 0 HP.
 * Frontline arrivals are observed from the host wheel; their cause (manual
 * versus compulsory) cannot always be inferred from snapshots.
 */
const isUnit=x=>typeof x==='string'&&/^[AB][1-6]$/.test(x);
const nothing=()=>Object.freeze({knockouts:Object.freeze([]),
 arrivals:Object.freeze([])});

function confirmedDamageKO(event,id){
 if(!event||!Number.isSafeInteger(event.eventId)||event.eventId<1)
  return false;
 if(event.type==='action')
  return event.target===id&&event.hit!==false&&
   Number.isFinite(event.amount)&&event.amount>0&&event.targetHp===0;
 if(event.type==='special')
  return Array.isArray(event.impacts)&&event.impacts.some(x=>
   x?.targetId===id&&Number.isFinite(x.amount)&&x.amount>0&&x.hpAfter===0);
 if(event.type==='poke')
  return event.targetId===id&&event.targetHpAfter===0&&
   Number.isFinite(event.amount)&&event.amount>0;
 return false;
}

export function projectKoViewChange(before,after){
 if(!after||!Number.isSafeInteger(after.revision)||
    after.revision<0||!Array.isArray(after.teams)||after.teams.length!==2)
  throw new TypeError('valid current seat view required');
 if(before===null||before===undefined)return nothing();
 if(!Number.isSafeInteger(before.revision)||before.revision<0||
    !Array.isArray(before.teams)||before.teams.length!==2)
  throw new TypeError('valid prior seat view required');
 if(after.revision-before.revision!==1||after.revision===0)return nothing();

 const last=before.events?.reduce((n,e)=>Math.max(n,e?.eventId||0),0)??0;
 const fresh=(after.events||[]).filter(e=>Number.isSafeInteger(e?.eventId)&&
  e.eventId>last);
 const knockouts=[],arrivals=[];
 for(let side=0;side<2;side++){
  const old=before.teams[side],next=after.teams[side];
  if(!old||!next||!Array.isArray(old.frontIds)||!Array.isArray(next.frontIds)||
     !Array.isArray(old.members)||!Array.isArray(next.members))
   throw new TypeError('invalid seat team projection');
  const oldMembers=new Map(old.members.map(u=>[u.id,u]));
  const nextMembers=new Map(next.members.map(u=>[u.id,u]));
  for(const [position,id] of old.frontIds.entries()){
   if(!isUnit(id))continue;
   const was=oldMembers.get(id),now=nextMembers.get(id);
   if(!was||!now||!(was.hp>0)||now.hp!==0)continue;
   const event=fresh.find(e=>confirmedDamageKO(e,id));
   if(event)knockouts.push(Object.freeze({id,side,position,
    eventId:event.eventId}));
  }
  const changed=old.frontIds.some((id,i)=>id!==next.frontIds[i]);
  // Only the existing host compulsory-switch condition is evidenced here:
  // ALL three previous front members are already KO. Ordinary voluntary
  // rotation is not a "reserve rescue" animation.
  if(changed&&old.frontIds.every(id=>oldMembers.get(id)?.hp===0)){
   // An entering reserve can be KOed by the SAME host action that
   // performed the compulsory swap. Require it to have been alive BEFORE,
   // not still alive in the already-resolved latest snapshot.
   const entered=next.frontIds.filter(id=>!old.frontIds.includes(id)&&
    oldMembers.get(id)?.hp>0);
   const action=fresh.findLast(e=>e.type==='action');
   if(entered.length&&action){
    arrivals.push(Object.freeze({side,eventId:action.eventId,
     ids:Object.freeze([...entered]),
     frontIds:Object.freeze([...next.frontIds])}));
   }
  }
 }
 return Object.freeze({knockouts:Object.freeze(knockouts),
  arrivals:Object.freeze(arrivals)});
}
