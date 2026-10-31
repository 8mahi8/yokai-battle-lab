/**
 * Engine V3-4-20: optional, RENDER-ONLY two-seat opponent visibility.
 *
 * The original YW2 PvP opponent may not observe wheel/charge changes until
 * the *current action motion* ends. A stage owns its own presentation clock;
 * MatchCore, host timing and canonical Firebase snapshots are NEVER delayed.
 *
 * All durations are the existing playtest choreography durations, NOT
 * verified original 3DS timing. No independent requestAnimationFrame/timer,
 * local storage, network messages or combat action gates.
 */
import {createPresentationTimeline} from '../engine/presentation-timeline.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const sideOf=view=>view?.side;
function checkView(view,seat){
 if(sideOf(view)!==seat||!Array.isArray(view.teams)||
    view.teams.length!==2||!Array.isArray(view.teams[1-seat]?.members)||
    view.teams[1-seat].members.length!==6||
    !Array.isArray(view.teams[1-seat].frontIds)||
    view.teams[1-seat].frontIds.length!==3)
  throw new TypeError('own-seat battle view with a complete opponent required');
}
/**
 * Begin with the LAST seat-visible view preceding the host event. During the
 * motion, ONLY opposing wheel placement and charge/Soul visual fields are
 * pinned; opponent HP, KO, debuffs, event metadata and the owner's entire
 * visible view continue to come from the current canonical host projection.
 * This avoids turning rendering into a second combat state owner.
 */
export function createSeatMotionVisibility({seat}={}){
 if(seat!==0&&seat!==1)throw new RangeError('valid seat 0 or 1 required');
 const timeline=createPresentationTimeline({maxLog:8});
 let key=null,freeze=null,elapsedMs=0,endMs=0;
 function finish(){
  if(key!==null){
   const delta=Math.max(0,endMs-elapsedMs);
   if(delta)timeline.advance(delta);
  }
  key=null;freeze=null;elapsedMs=0;endMs=0;
 }
 function begin({eventKey,durationMs,view}={}){
  checkView(view,seat);
  if(typeof eventKey!=='string'||!eventKey||
     !Number.isSafeInteger(durationMs)||durationMs<=0||durationMs>60000)
   throw new TypeError('motion eventKey and positive fixture duration required');
  finish();
  timeline.beginMotion({durationMs,kind:'action',actorId:null});
  const enemy=view.teams[1-seat];
  // Snapshot ONLY fields for which the original opponent-view delay is
  // supported by PvP research. Keep status/HP and winner authoritative.
  freeze={frontIds:[...enemy.frontIds],benchIds:[...enemy.benchIds],
   mode:enemy.mode,members:Object.fromEntries(enemy.members.map(m=>[
    m.id,{front:m.front,slot:m.slot,soul:m.soul,
     capacity:m.capacity,specialReady:m.specialReady}
   ]))};
  key=eventKey;endMs=durationMs;
  return status();
 }
 function advance(elapsed){
  if(!Number.isFinite(elapsed)||elapsed<0)
   throw new RangeError('elapsed motion time must be nonnegative');
  if(key===null)return status();
  const next=Math.min(endMs,Math.max(elapsedMs,Math.floor(elapsed)));
  if(next>elapsedMs)timeline.advance(next-elapsedMs);
  elapsedMs=next;
  if(elapsedMs>=endMs)finish();
  return status();
 }
 function project(view){
  checkView(view,seat);
  if(key===null||!timeline.snapshot().isBlocked)return view;
  const enemy=view.teams[1-seat];
  const members=enemy.members.map(m=>{
   const prior=freeze.members[m.id];
   if(!prior)throw new TypeError('opponent roster changed mid-motion');
   return {...m,...prior};
  });
  const teams=[...view.teams];
  teams[1-seat]={...enemy,frontIds:[...freeze.frontIds],
   benchIds:[...freeze.benchIds],mode:freeze.mode,members};
  return {...view,teams};
 }
 function status(){
  return {seat,active:key!==null,eventKey:key,
   elapsedMs,remainingMs:key===null?0:endMs-elapsedMs,
   blocked:key!==null&&timeline.snapshot().isBlocked};
 }
 return {begin,advance,finish,project,status};
}
