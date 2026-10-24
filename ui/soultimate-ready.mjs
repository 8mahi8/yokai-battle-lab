/**
 * Source-verified "わざOK / GわざOK" selection projection.
 *
 * Reuses the existing engine/soul.mjs eligibility method. No second copy of
 * neighborhood or cost rules is introduced in UI. The true command is still
 * validated on the host by createMatchProtocol.
 *
 * Sources:
 * https://game8.jp/youkai-watch2/504498 (normal "わざOK")
 * https://gamepedia.jp/youkai-yw2/archives/1873 (G requires full caster
 * and both fixed-ring neighbours, who may be in the reserve).
 */
import {createSoulSystem} from '../engine/soul.mjs';

export function soultimateReadiness(game,side){
 if(!game||!Array.isArray(game.soul?.teams)||!Array.isArray(game.clock?.teams)||
    !Array.isArray(game.squads)||![0,1].includes(side))
  throw new TypeError('canonical battle snapshot and seat required');
 const model=createSoulSystem({teams:game.soul.teams});
 for(const index of [0,1])model.setMode(index,game.soul.modes[index]);
 const clock=game.clock.teams[side],squad=game.squads[side];
 const interrupted=Boolean(game.soul.pending[side]||game.guided?.[side]||
   game.purification?.[side]||game.poke?.active?.[side]||game.winner!==null);
 const out={};
 for(const id of clock.frontIds){
  const original=squad.find(x=>x.id===id);
  const clockMember=clock.members.find(x=>x.id===id);
  const eligible=model.eligibility({side,casterId:id,frontIds:clock.frontIds,
   alive:!!original&&original.hp>0});
  const ready=eligible.ok&&clockMember?.canAct!==false&&!interrupted;
  out[id]={ready,mode:game.soul.modes[side],
   consumers:[...(eligible.consumers||[])],
   missing:[...(eligible.missing||[])],
   reason:ready?null:interrupted?'touch_action_pending':
    clockMember?.canAct===false?'cannot_act':eligible.reason||'unavailable'};
 }
 return out;
}
