import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createFirebaseMatchHost,createFirebaseMatchGuest} from '../network/firebase-match.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {collectNewBattleCues} from '../ui/battle-cue-sequence.mjs';
import {assessSeatMotionDelivery} from '../ui/seat-motion-delivery.mjs';
import {createSeatMotionVisibility} from '../ui/seat-motion-visibility.mjs';
import {planActionChoreography} from '../presentation/action-choreography.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const seatView=(s,seat=1)=>makeStageView(s,seat);
const fronts=(v,seat)=>v.teams[seat].frontIds;

function deferredFirebaseBus(){
 const session='1'.repeat(32),roomCode='123456',published=[];
 const listeners=new Set();
 const host={
  active:()=>({session,roomCode,seat:0}),
  async readPublishedSnapshot(){return null;},
  subscribeInputs:()=>()=>{},
  async publishSnapshot(state){
   published.push({session,revision:state.revision,state:clone(state)});
   return {ok:true};
  }
 };
 const guest={
  active:()=>({session,roomCode,seat:1}),
  subscribeSnapshots(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async sendIntent(){return {ok:true};}
 };
 const deliver=packet=>{
  const original=clone(packet);
  for(const fn of listeners)fn(clone(packet));
  assert.deepEqual(packet,original,'transport cannot mutate host packet');
 };
 return {host,guest,published,deliver};
}
function assess(prev,latest,afterId=0,{sceneActive=false}={}){
 const read=collectNewBattleCues(latest.game.events,afterId);
 return {delivery:assessSeatMotionDelivery({
  previousView:prev,currentView:seatView(latest),
  freshCues:read.cues.length,skipped:read.skipped,sceneActive
 }),read};
}

test('V3-4-21: host canonical revisions + guest delayed publish coalescing must NOT create a false full-length wheel freeze',async()=>{
 const bus=deferredFirebaseBus(),guestSnaps=[],errors=[];
 const host=createFirebaseMatchHost({roomClient:bus.host,
  protocol:createMatchProtocol({battleOptions:{seed:212}}),
  onError:e=>errors.push(e.message)});
 const started=await host.start();
 assert.equal(started.ok,true);
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onSnapshot:s=>guestSnaps.push(s),onError:e=>errors.push(e.message)});
 guest.start();bus.deliver(bus.published.at(-1));
 const baseline=guestSnaps.at(-1),before=seatView(baseline);
 assert.equal(baseline.revision,0);
 assert.deepEqual(fronts(before,0),['A1','A2','A3']);
 assert.equal(host.advanceAuto().ok,true);
 assert.equal(host.submit({type:'rotate',direction:1}).accepted,true);
 await host.retryPublish();
 const latest=bus.published.at(-1);
 assert.equal(latest.revision,2);
 // Firebase can deliver the newest snapshot without the earlier published
 // revision. No host action-start timestamp is carried by this protocol.
 bus.deliver(latest);
 const received=guestSnaps.at(-1);
 const {delivery,read}=assess(before,received);
 assert.deepEqual(read.cues.map(x=>x.key),['event:1']);
 assert.equal(delivery.reason,'revision_gap');
 assert.equal(delivery.allowOpponentHold,false);
 const gate=createSeatMotionVisibility({seat:1});
 if(delivery.allowOpponentHold)gate.begin({eventKey:read.cues[0].key,
  durationMs:planActionChoreography(read.cues[0]).durationMs,view:before});
 assert.deepEqual(fronts(gate.project(seatView(received)),0),['A2','A3','A4'],
  'stale A wheel must not be re-hidden for a full new guest animation');
 assert.deepEqual(received,host.snapshot(),'guest authoritative state unaffected');
 assert.deepEqual(errors,[]);
 host.stop();guest.stop();
});
test('V3-4-21: sequential Firebase guest sees older opponent wheel during the active visual and reveals actual host state after',async()=>{
 const bus=deferredFirebaseBus(),snaps=[];
 const host=createFirebaseMatchHost({roomClient:bus.host,
  protocol:createMatchProtocol({battleOptions:{seed:212}})});
 await host.start();
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onSnapshot:s=>snaps.push(s)});
 guest.start();bus.deliver(bus.published.at(-1));
 const before=seatView(snaps.at(-1));
 assert.equal(host.advanceAuto().ok,true);
 await host.retryPublish();bus.deliver(bus.published.at(-1));
 const current=snaps.at(-1);
 const {delivery,read}=assess(before,current);
 assert.equal(delivery.revisionGap,1);
 assert.equal(delivery.allowOpponentHold,true);
 const gate=createSeatMotionVisibility({seat:1});
 const plan=planActionChoreography(read.cues[0]);
 gate.begin({eventKey:read.cues[0].key,durationMs:plan.durationMs,view:before});
 assert.equal(host.submit({type:'rotate',direction:1}).accepted,true);
 await host.retryPublish();bus.deliver(bus.published.at(-1));
 const newest=snaps.at(-1);
 assert.deepEqual(fronts(seatView(newest),0),['A2','A3','A4']);
 assert.deepEqual(fronts(gate.project(seatView(newest)),0),['A1','A2','A3']);
 assert.deepEqual(fronts(gate.project(seatView(newest)),1),['B1','B2','B3']);
 gate.advance(plan.durationMs);
 assert.deepEqual(fronts(gate.project(seatView(newest)),0),['A2','A3','A4']);
 assert.equal(newest.hash,host.snapshot().hash);
 host.stop();guest.stop();
});
test('V3-4-21: reconnection starts from new canonical snapshot; duplicates / backwards deliveries never restore an old wheel',async()=>{
 const bus=deferredFirebaseBus(),snaps=[];
 const host=createFirebaseMatchHost({roomClient:bus.host,
  protocol:createMatchProtocol({battleOptions:{seed:212}})});
 await host.start();
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onSnapshot:s=>snaps.push(s)});
 guest.start();const baselinePacket=clone(bus.published.at(-1));
 bus.deliver(baselinePacket);
 assert.equal(host.advanceAuto().ok,true);
 assert.equal(host.submit({type:'rotate',direction:1}).accepted,true);
 await host.retryPublish();
 const latest=clone(bus.published.at(-1));
 guest.stop();
 const resumed=[],newGuest=createFirebaseMatchGuest({roomClient:bus.guest,
  onSnapshot:s=>resumed.push(s)});
 newGuest.start();bus.deliver(latest);
 assert.equal(resumed.length,1);
 assert.equal(resumed[0].revision,2);
 assert.equal(assessSeatMotionDelivery({previousView:null,
  currentView:seatView(resumed[0]),freshCues:1}).reason,'initial_attach');
 bus.deliver(baselinePacket);bus.deliver(latest);
 assert.equal(resumed.length,1,'older and duplicate Firebase packets ignored by guest');
 assert.deepEqual(fronts(seatView(resumed[0]),0),['A2','A3','A4']);
 host.stop();newGuest.stop();
});
test('V3-4-21: pure receipt contract rejects multi-event burst, overflow, queued scene and stale revision with no model changes',()=>{
 const p=createMatchProtocol({battleOptions:{seed:92}});
 const baseline=p.snapshot(),first=seatView(baseline);
 const freeze=x=>assessSeatMotionDelivery(x);
 assert.equal(freeze({previousView:null,currentView:first,freshCues:1}).reason,'initial_attach');
 assert.equal(freeze({previousView:first,currentView:first,freshCues:1}).reason,'repeat_or_rewind');
 p.advanceAuto();
 const now=seatView(p.snapshot());
 assert.equal(freeze({previousView:first,currentView:now,freshCues:1,skipped:5}).reason,'visual_history_skipped');
 assert.equal(freeze({previousView:first,currentView:now,freshCues:2}).reason,'ambiguous_action_batch');
 assert.equal(freeze({previousView:first,currentView:now,freshCues:1,sceneActive:true}).reason,'animation_already_active');
 assert.equal(freeze({previousView:first,currentView:now,freshCues:1}).allowOpponentHold,true);
 assert.throws(()=>freeze({currentView:now,freshCues:-1}),TypeError);
 assert.throws(()=>freeze({currentView:now,skipped:NaN}),TypeError);
 assert.deepEqual(seatView(p.snapshot()),now,'renderer receipt evaluator is side-effect free');
});
