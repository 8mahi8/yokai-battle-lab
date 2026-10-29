import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseMatchHost,createFirebaseMatchGuest} from '../network/firebase-match.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {matchAckMessage} from '../ui/match-feedback.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
function fakeTransport(){
 const session='1'.repeat(32),code='123456';
 const listeners={input:new Set(),state:new Set()};
 let latest=null,drop=false;
 const sent=[],saves=[];
 const host={
  active:()=>({session,roomCode:code,seat:0}),
  async readPublishedSnapshot(){return latest?clone(latest.state):null;},
  subscribeInputs(fn){listeners.input.add(fn);return()=>listeners.input.delete(fn);},
  async publishSnapshot(state){
   latest={session,revision:state.revision,state:clone(state)};
   saves.push(state.revision);
   if(!drop)for(const fn of [...listeners.state])fn(clone(latest));
   return {ok:true};
  }
 };
 const guest={
  active:()=>({session,roomCode:code,seat:1}),
  subscribeSnapshots(fn){listeners.state.add(fn);if(latest)fn(clone(latest));
   return()=>listeners.state.delete(fn);},
  async sendIntent(clientSeq,intent){
   const packet={session,clientSeq,intent:clone(intent)};sent.push(packet);
   for(const fn of [...listeners.input])fn(clone(packet));
   return {ok:true};
  }
 };
 return {host,guest,sent,saves,session,setDrop:v=>{drop=v;},
  replay:()=>{for(const fn of [...listeners.state])fn(clone(latest));},
  input:packet=>{for(const fn of [...listeners.input])fn(clone(packet));},
  state:packet=>{for(const fn of [...listeners.state])fn(clone(packet));},
  latest:()=>clone(latest)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('two independent seats rotate with exact host revision and guest ACK',async()=>{
 const bus=fakeTransport(),hostSnaps=[],guestSnaps=[],acks=[],errors=[];
 const protocol=createMatchProtocol({battleOptions:{seed:212}});
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol,
  onSnapshot:s=>hostSnaps.push(s),onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onSnapshot:s=>guestSnaps.push(s),onAck:a=>acks.push(a),onError:e=>errors.push(e.message)});
 guest.start();await host.start();await tick();
 assert.equal(guest.status().revision,0);
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.deepEqual(acks.map(a=>a.clientSeq),[1]);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(guest.status().acked,1);
 assert.equal(guestSnaps.at(-1).game.clock.teams[1].frontIds[0],'B2');
 assert.equal(host.submit({type:'rotate',direction:-1}).accepted,true);
 await tick();
 assert.equal(host.advanceAuto().ok,true);
 await tick();
 assert.equal(hostSnaps.at(-1).revision,3);
 assert.deepEqual(guestSnaps.at(-1),host.snapshot());
 assert.equal(errors.length,0);
 host.stop();guest.stop();
});
test('dropped authoritative snapshot prevents next input; retry never double-applies',async()=>{
 const bus=fakeTransport(),acks=[];
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onAck:a=>acks.push(a)});
 guest.start();await host.start();
 bus.setDrop(true);
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.equal(host.snapshot().revision,1);
 assert.equal(guest.status().pendingSequence,1);
 assert.equal(guest.submit({type:'rotate',direction:1}).reason,'pending_ack');
 assert.equal((await guest.retry()).ok,true);
 await tick();
 assert.equal(host.snapshot().revision,1);
 assert.deepEqual(bus.sent.map(p=>p.clientSeq),[1,1]);
 bus.setDrop(false);bus.replay();
 assert.equal(guest.status().acked,1);
 assert.equal(acks.length,1);
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.equal(host.snapshot().revision,2);
 assert.equal(acks.length,2);
 host.stop();guest.stop();
});
test('guest ignores wrong session, out of order revisions and old ACK',async()=>{
 const bus=fakeTransport(),views=[],acks=[];
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onSnapshot:s=>views.push(s),onAck:x=>acks.push(x)});
 guest.start();await host.start();
 const rev0=bus.latest();
 bus.state({...rev0,session:'f'.repeat(32),revision:99,state:{...rev0.state,revision:99}});
 assert.equal(guest.status().revision,0);
 assert.equal(guest.submit({type:'watch',mode:'zero'}).ok,true);
 await tick();
 assert.equal(guest.status().acked,1);
 bus.state(rev0);
 assert.equal(guest.status().revision,1);
 assert.equal(acks.length,1);
 assert.equal(views.length,2);
 host.stop();guest.stop();
});
test('reject malformed local gesture without consuming input sequence',async()=>{
 const bus=fakeTransport();
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest});
 guest.start();await host.start();
 assert.throws(()=>guest.submit({type:'purifyInput',gesture:{type:'tap',x:99,y:0}}));
 assert.equal(bus.sent.length,0);
 assert.equal(guest.submit({type:'rotate',direction:1}).clientSeq,1);
 await tick();
 host.stop();guest.stop();
});

test('bounded guest FIFO preserves all fast taps, draining only after host ACK',async()=>{
 const bus=fakeTransport(),acks=[];
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,maxQueuedInputs:2,
  onAck:a=>acks.push(a.clientSeq)});
 guest.start();await host.start();
 bus.setDrop(true);
 assert.equal(guest.enqueue({type:'rotate',direction:1}).queued,false);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).queued,true);
 assert.equal(guest.enqueue({type:'pin',targetId:null}).queued,true);
 assert.equal(guest.enqueue({type:'watch',mode:'standard'}).reason,'input_buffer_full');
 assert.equal(guest.status().queuedInputs,2);
 assert.equal(host.snapshot().clientSequences[1],1);
 bus.setDrop(false);
 bus.replay();await tick();await tick();
 assert.deepEqual(bus.sent.map(x=>x.clientSeq),[1,2,3]);
 assert.deepEqual(acks,[1,2,3]);
 assert.equal(guest.status().queuedInputs,0);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(host.snapshot().clientSequences[1],3);
 assert.equal(guest.status().revision,3);
 guest.stop();host.stop();
});

test('host start refuses existing authoritative room state instead of resetting match',async()=>{
 const bus=fakeTransport(),original=createFirebaseMatchHost({roomClient:bus.host});
 assert.equal((await original.start()).ok,true);
 assert.equal(original.submit({type:'rotate',direction:1}).accepted,true);
 await tick();
 const previous=bus.latest(),reloaded=createFirebaseMatchHost({roomClient:bus.host});
 const result=await reloaded.start();
 assert.deepEqual(result,{ok:false,reason:'existing_authoritative_state',revision:1});
 assert.equal(reloaded.status().fenced,true);
 assert.throws(()=>reloaded.submit({type:'watch',mode:'zero'}),/existing_authoritative_state/);
 assert.throws(()=>reloaded.advanceAuto(),/existing_authoritative_state/);
 assert.deepEqual(bus.latest(),previous);
 original.stop();reloaded.stop();
});

test('host is fenced when remote revision conflict appears after preflight',async()=>{
 const bus=fakeTransport();
 const original=createFirebaseMatchHost({roomClient:bus.host});
 await original.start();
 const staleClient={
  ...bus.host,
  readPublishedSnapshot:async()=>null,
  publishSnapshot:async()=>({ok:false,reason:'stale_snapshot'})
 };
 const errors=[];
 const parallel=createFirebaseMatchHost({roomClient:staleClient,
  onError:error=>errors.push(error.message)});
 const result=await parallel.start();
 assert.equal(result.ok,false);
 assert.equal(parallel.status().fenced,true);
 assert.ok(errors.includes('existing_authoritative_state'));
 assert.throws(()=>parallel.advanceAuto(),/existing_authoritative_state/);
 original.stop();parallel.stop();
});

test('Phase21 opt-in three-second host wheel lock survives guest Firebase bridge ACK and replay',async()=>{
 const bus=fakeTransport(),errors=[],acks=[];
 let hostMs=1000;
 const protocol=createMatchProtocol({battleOptions:{seed:212,rotationCooldownMs:3000},
  hostNowMs:()=>hostMs});
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol,
  onError:error=>errors.push(error.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onAck:a=>acks.push(a),onError:error=>errors.push(error.message)});
 guest.start();await host.start();await tick();
 const first=guest.submit({type:'rotate',direction:1});
 assert.equal(first.ok,true);await tick();
 assert.equal(host.snapshot().game.clock.teams[1].frontIds[0],'B2');
 hostMs=1450;
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.equal(host.snapshot().game.clock.teams[1].frontIds[0],'B2',
  'guest transport cannot bypass the authoritative three-second cooldown');
 assert.equal(protocol.exportJournal().entries[1].result.reason,'cooldown');
 assert.equal(acks.length,2,'guest receives revision even when host rejected the rule action');
 assert.equal(acks[0].applied,true);
 assert.equal(acks[1].applied,false,'transport ACK cannot imply valid rotation');
 assert.equal(acks[1].reason,'cooldown');
 assert.equal(acks[1].remainingMs,2550);
 assert.equal(acks[1].accepted,true,'host still consumed command sequence');
 assert.equal(protocol.snapshot().lastCommandOutcomes[1].applied,false);
 assert.equal(protocol.exportJournal().entries[1].hostRotationAtMs,1450);
 hostMs=4000;
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.equal(host.snapshot().game.clock.teams[1].frontIds[0],'B3');
 assert.equal(acks.length,3);
 assert.equal(acks[2].applied,true);
 assert.deepEqual(bus.latest().state.game.clock.teams[1].frontIds,
  host.snapshot().game.clock.teams[1].frontIds);
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,[]);
 guest.stop();host.stop();
});

test('old or truncated host snapshot never yields a false-positive guest success ACK',async()=>{
 const bus=fakeTransport(),acks=[];
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onAck:a=>acks.push(a)});
 guest.start();await host.start();await tick();
 bus.setDrop(true);
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.equal(host.snapshot().revision,1);
 const oldPacket=bus.latest();
 delete oldPacket.state.lastCommandOutcomes;
 bus.state(oldPacket);
 assert.equal(acks.length,1);
 assert.equal(acks[0].accepted,true);
 assert.equal(acks[0].applied,null,'unknown receipt must not be labeled successful');
 assert.equal(acks[0].reason,undefined);
 guest.stop();host.stop();
});

const chargeGuardTeam=RENTAL_SQUAD.map(x=>({...x,soulCapacity:5,
 weights:[0,0,0,100]}));
const testChargeProtocol=()=>createMatchProtocol({battleOptions:{seed:12,
 teams:[chargeGuardTeam,chargeGuardTeam],rotationCooldownMs:0,
 researchSpecialEffects:false}});
const gaugeOf=(state,id)=>state.game.soul.teams.flat().find(x=>x.id===id).soul;

test('22C actual guest bridge: rejected chargeStart never presents a success ACK',async()=>{
 const bus=fakeTransport(),acks=[],states=[],errors=[],protocol=testChargeProtocol();
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol,
  onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onSnapshot:s=>states.push(s),onAck:a=>acks.push(a),onError:e=>errors.push(e.message)});
 guest.start();await host.start();await tick();
 assert.equal(guest.enqueue({type:'chargeStart',id:'B1'}).ok,true);
 await tick();await tick();
 assert.equal(acks.length,1);
 assert.equal(acks[0].accepted,true);
 assert.equal(acks[0].applied,false,'host consumes an invalid rule action');
 assert.equal(acks[0].reason,'soul_not_full');
 assert.equal(acks[0].completed,undefined);
 assert.equal(matchAckMessage(acks[0]),'操作は適用されませんでした：soul_not_full');
 assert.equal(makeStageView(states.at(-1),1).gesture,null);
 assert.equal(states.at(-1).lastCommandOutcomes[1].completed,undefined);
 assert.deepEqual(errors,[]);
 host.stop();guest.stop();
});

test('22C real guest command FIFO and verified charge ACK: 5 partial touches, final activation, replay',async()=>{
 const bus=fakeTransport(),acks=[],views=[],errors=[],protocol=testChargeProtocol();
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol,
  onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onAck:a=>acks.push(a),onSnapshot:s=>views.push(makeStageView(s,1)),
  onError:e=>errors.push(e.message)});
 guest.start();await host.start();await tick();
 let i=0;
 for(;i<60&&gaugeOf(host.snapshot(),'B1')<5;i++)
  assert.equal(host.advanceAuto().ok,true);
 assert.ok(i<60,'B1 must fill from legal guard actions');
 await tick();await tick();
 assert.equal(gaugeOf(guest.status().lastState,'B1'),5);
 assert.equal(views.at(-1).teams[1].members.find(x=>x.id==='B1').specialReady,true);
 assert.equal(guest.enqueue({type:'chargeStart',id:'B1'}).ok,true);
 await tick();await tick();
 assert.equal(acks.length,1);
 assert.equal(acks[0].applied,true);
 assert.equal(acks[0].commandType,'chargeStart');
 assert.equal(matchAckMessage(acks[0]),'必殺チャージを開始しました');
 assert.equal(views.at(-1).gesture.kind,'charge');
 assert.equal(views.at(-1).gesture.challenge.kind,'tap');
 assert.equal(views.at(-1).teams[1].members.find(x=>x.id==='B1').specialReady,false);

 for(let n=0;n<6;n++){
  const target=guest.status().lastState.game.guided[1].challenge.target;
  const intent={type:'chargeInput',gesture:{type:'tap',x:target[0],y:target[1]}};
  // Hide authoritative snapshots on the FIRST partial input to simulate
  // an ACK lost after the host has already accepted and applied that tap.
  if(n===0)bus.setDrop(true);
  assert.equal(guest.enqueue(intent).ok,true);
  await tick();await tick();
  if(n===0){
   assert.equal(guest.status().pendingSequence,2);
   assert.equal(protocol.snapshot().game.guided[1].challenge.count,1);
   assert.equal((await guest.retry()).ok,true);
   await tick();
   assert.equal(protocol.snapshot().game.guided[1].challenge.count,1,
    'same command sequence must never advance the charge twice');
   bus.setDrop(false);bus.replay();
   await tick();
  }
  assert.equal(acks.length,n+2);
  assert.equal(acks.at(-1).applied,true);
  assert.equal(acks.at(-1).completed,n===5);
  const lastText=matchAckMessage(acks.at(-1));
  if(n<5){
   assert.match(lastText,/まだ発動していません/);
   assert.equal(gaugeOf(host.snapshot(),'B1'),5);
   assert.equal(views.at(-1).gesture.kind,'charge');
  }else{
   assert.match(lastText,/わざを発動しました/);
   assert.equal(gaugeOf(host.snapshot(),'B1'),0);
   assert.equal(views.at(-1).gesture,null);
  }
 }
 assert.equal(acks.length,7);
 assert.deepEqual(acks.map(a=>a.clientSeq),[1,2,3,4,5,6,7]);
 assert.equal(host.snapshot().lastCommandOutcomes[1].completed,true);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(guest.status().queuedInputs,0);
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,[]);
 host.stop();guest.stop();
});


test('23A presence loss clears unsent rapid-touch FIFO while preserving one in-flight authoritative ACK',async()=>{
 const bus=fakeTransport(),acks=[],errors=[];
 const host=createFirebaseMatchHost({roomClient:bus.host,onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onAck:a=>acks.push(a),
  onError:e=>errors.push(e.message)});
 guest.start();await host.start();
 bus.setDrop(true);
 assert.equal(guest.enqueue({type:'rotate',direction:1}).clientSeq,1);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).queued,true);
 assert.equal(guest.enqueue({type:'watch',mode:'standard'}).queued,true);
 assert.equal(guest.status().queuedInputs,2);
 assert.equal(host.snapshot().clientSequences[1],1);
 const paused=guest.setDeliveryEnabled(false);
 assert.deepEqual(paused,{ok:true,enabled:false,dropped:2,pendingSequence:1});
 assert.equal(guest.status().deliveryEnabled,false);
 assert.equal(guest.status().queuedInputs,0);
 assert.equal(guest.setDeliveryEnabled(false).dropped,0);
 assert.equal(guest.enqueue({type:'pin',targetId:null}).reason,'connection_paused');
 assert.equal(guest.submit({type:'rotate',direction:1}).reason,'connection_paused');
 bus.setDrop(false);bus.replay();await tick();
 assert.deepEqual(acks.map(x=>x.clientSeq),[1]);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(host.snapshot().clientSequences[1],1);
 assert.equal(host.snapshot().game.soul.modes[1],'standard',
  'stale offline Watch-zero input was never dispatched');
 assert.deepEqual(bus.sent.map(x=>x.clientSeq),[1]);
 assert.equal(guest.setDeliveryEnabled(true).pendingSequence,null);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).clientSeq,2);
 await tick();await tick();
 assert.deepEqual(acks.map(x=>x.clientSeq),[1,2]);
 assert.equal(host.snapshot().game.soul.modes[1],'zero');
 assert.deepEqual(errors,[]);
 guest.stop();host.stop();
});

test('23A an uncertain in-flight write can be retried with its ORIGINAL seq only after presence restores',async()=>{
 const bus=fakeTransport(),acks=[],protocol=createMatchProtocol();
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onAck:a=>acks.push(a)});
 guest.start();await host.start();
 bus.setDrop(true);
 assert.equal(guest.enqueue({type:'rotate',direction:1}).clientSeq,1);
 await tick();
 const hash=host.snapshot().hash;
 assert.equal(host.snapshot().revision,1);
 assert.equal(guest.setDeliveryEnabled(false).pendingSequence,1);
 assert.deepEqual(await guest.retry(),{ok:false,reason:'connection_paused'});
 assert.deepEqual(bus.sent.map(p=>p.clientSeq),[1]);
 assert.equal(guest.setDeliveryEnabled(true).pendingSequence,1);
 assert.equal((await guest.retry()).ok,true);
 await tick();
 assert.deepEqual(bus.sent.map(p=>p.clientSeq),[1,1]);
 assert.equal(host.snapshot().hash,hash,'retransmission cannot rotate twice');
 assert.equal(host.snapshot().revision,1);
 bus.setDrop(false);bus.replay();await tick();
 assert.deepEqual(acks.map(x=>x.clientSeq),[1]);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(guest.status().acked,1);
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).clientSeq,2);
 await tick();
 assert.equal(guest.status().acked,2);
 host.stop();guest.stop();
});

test('23A FIFO presence toggle validates boolean and does not deliver speculative offline commands',async()=>{
 const bus=fakeTransport(),protocol=createMatchProtocol();
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest});
 guest.start();await host.start();
 assert.throws(()=>guest.setDeliveryEnabled('no'),TypeError);
 assert.equal(guest.setDeliveryEnabled(false).dropped,0);
 assert.equal(guest.setDeliveryEnabled(true).dropped,0);
 assert.equal(guest.setDeliveryEnabled(false).dropped,0);
 assert.equal(guest.status().deliveryEnabled,false);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).reason,'connection_paused');
 assert.deepEqual(bus.sent,[]);
 assert.equal(protocol.snapshot().revision,0);
 assert.equal(guest.setDeliveryEnabled(true).enabled,true);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).clientSeq,1);
 await tick();
 assert.equal(protocol.snapshot().revision,1);
 assert.equal(protocol.snapshot().game.soul.modes[1],'zero');
 host.stop();guest.stop();
});


test('23B transient host snapshot failure: duplicate guest resend does not recover ACK, host republish does',async()=>{
 const bus=fakeTransport(),errors=[],acks=[];
 let failNext=false;
 const transport={...bus.host,async publishSnapshot(state){
  if(failNext){failNext=false;throw new Error('test_transient_publish_failure');}
  return bus.host.publishSnapshot(state);
 }};
 const protocol=createMatchProtocol({battleOptions:{seed:301}});
 const host=createFirebaseMatchHost({roomClient:transport,protocol,
  onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onAck:a=>acks.push(a)});
 guest.start();assert.equal((await host.start()).ok,true);
 failNext=true;
 assert.equal(guest.submit({type:'watch',mode:'zero'}).clientSeq,1);
 await tick();await tick();
 assert.equal(host.snapshot().revision,1,'host has already applied the command');
 assert.equal(host.snapshot().game.soul.modes[1],'zero');
 assert.equal(host.status().dirty,true,'failed authoritative publish is still dirty');
 assert.equal(host.status().lastPublished,0);
 assert.equal(guest.status().pendingSequence,1);
 assert.equal(acks.length,0,'no transport ACK without a published authoritative snapshot');
 const hash=host.snapshot().hash;
 assert.equal((await guest.retry()).ok,true);
 await tick();
 assert.equal(host.snapshot().hash,hash,'duplicate guest retry cannot reapply the command');
 assert.equal(host.snapshot().revision,1);
 assert.equal(acks.length,0,'guest retry alone cannot force host snapshot publication');
 const republished=await host.retryPublish();
 assert.equal(republished.ok,true);
 assert.equal(republished.revision,1);
 assert.equal(host.status().dirty,false);
 assert.equal(host.status().lastPublished,1);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(acks.length,1);
 assert.equal(acks[0].clientSeq,1);
 assert.equal(acks[0].applied,true);
 assert.deepEqual(guest.status().lastState,host.snapshot());
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,['test_transient_publish_failure']);
 host.stop();guest.stop();
});

test('23B long guard-only battle coalesces 120 host changes while one Firebase write is delayed',async()=>{
 const bus=fakeTransport(),views=[];
 let blockNext=false,release=null,blocked=false;
 const delayed={...bus.host,async publishSnapshot(state){
  if(blockNext){blockNext=false;blocked=true;await new Promise(resolve=>{release=resolve;});}
  return bus.host.publishSnapshot(state);
 }};
 const protocol=testChargeProtocol();
 const host=createFirebaseMatchHost({roomClient:delayed,protocol});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,onSnapshot:s=>views.push(s)});
 guest.start();assert.equal((await host.start()).ok,true);
 blockNext=true;
 assert.equal(host.submit({type:'watch',mode:'zero'}).accepted,true);
 assert.equal(blocked,true);
 const initialGuestRevision=guest.status().revision;
 for(let n=0;n<120;n++)assert.equal(host.advanceAuto().ok,true);
 const expected=host.snapshot();
 assert.equal(expected.revision,121);
 assert.equal(guest.status().revision,initialGuestRevision,
  'unpublished local host state must not pretend to be a remote view');
 assert.equal(host.status().dirty,true);
 assert.equal(host.status().lastPublished,0);
 release();
 for(let i=0;i<8&&host.status().lastPublished<121;i++)await tick();
 assert.equal(host.status().lastPublished,121);
 assert.equal(host.status().dirty,false);
 assert.equal(guest.status().revision,121);
 assert.deepEqual(guest.status().lastState,host.snapshot());
 assert.ok(bus.saves.length<=3,'coalescing cannot write 120 stale intermediate snapshots');
 assert.ok(views.length<=3);
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 guest.stop();host.stop();
});

test('23B queued guest commands neither overtake blocked host ACK nor drop sequential revisions',async()=>{
 const bus=fakeTransport(),ack=[],errors=[],protocol=testChargeProtocol();
 const host=createFirebaseMatchHost({roomClient:bus.host,protocol,
  onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,maxQueuedInputs:128,
  onAck:a=>ack.push(a),onError:e=>errors.push(e.message)});
 guest.start();assert.equal((await host.start()).ok,true);
 bus.setDrop(true);
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).clientSeq,1);
 for(let n=0;n<90;n++){
  const intent=n%2===0?{type:'watch',mode:'standard'}:{type:'watch',mode:'zero'};
  assert.equal(guest.enqueue(intent).queued,true);
 }
 assert.equal(host.snapshot().revision,1);
 assert.equal(guest.status().queuedInputs,90);
 bus.setDrop(false);bus.replay();
 for(let i=0;i<110&&guest.status().pendingSequence!==null;i++)await tick();
 assert.equal(guest.status().queuedInputs,0);
 assert.equal(guest.status().pendingSequence,null);
 assert.deepEqual(ack.map(a=>a.clientSeq),Array.from({length:91},(_,i)=>i+1));
 assert.equal(protocol.snapshot().clientSequences[1],91);
 assert.equal(guest.status().revision,91);
 assert.equal(protocol.snapshot().game.soul.modes[1],'zero');
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,[]);
 guest.stop();host.stop();
});

test('guest one-shot bootstrap directly reads published host state when live subscription misses initial row',async()=>{
 const bus=fakeTransport();
 const host=createFirebaseMatchHost({roomClient:bus.host});
 assert.equal((await host.start()).ok,true);
 // Deliberately simulate a Realtime/poll subscription that has NOT delivered
 // the initial row. The one-time authoritative fetch restores live UI.
 const guestAdapter={
  ...bus.guest,
  subscribeSnapshots:()=>()=>{},
  async readPublishedSnapshot(){return clone(bus.latest().state);}
 };
 const got=[],errors=[];
 const guest=createFirebaseMatchGuest({roomClient:guestAdapter,
  onSnapshot:x=>got.push(x),onError:error=>errors.push(error.message)});
 assert.equal(guest.start().ok,true);
 await tick();await tick();
 assert.equal(guest.status().revision,0);
 assert.equal(got.length,1);
 assert.equal(got[0].revision,0);
 assert.equal(guest.submit({type:'watch',mode:'zero'}).ok,true);
 await tick();
 assert.equal(host.snapshot().clientSequences[1],1);
 assert.deepEqual(errors,[]);
 host.stop();guest.stop();
});

test('slow guest bootstrap cannot overwrite newer live snapshot or repeat an ACK',async()=>{
 const bus=fakeTransport();
 const host=createFirebaseMatchHost({roomClient:bus.host});
 await host.start();
 const older=clone(bus.latest().state);
 let resolveRead;
 const pendingRead=new Promise(resolve=>resolveRead=resolve);
 const adapter={...bus.guest,readPublishedSnapshot:()=>pendingRead};
 const views=[],acks=[];
 const guest=createFirebaseMatchGuest({roomClient:adapter,
  onSnapshot:x=>views.push(x),onAck:x=>acks.push(x)});
 guest.start();
 await tick();
 assert.equal(guest.status().revision,0);
 assert.equal(guest.submit({type:'watch',mode:'zero'}).ok,true);
 await tick();await tick();
 assert.equal(guest.status().revision,1);
 assert.equal(acks.length,1);
 resolveRead(older);
 await tick();await tick();
 assert.equal(guest.status().revision,1,'late snapshot must not roll back live revision');
 assert.equal(views.length,2,'one baseline and one authoritative command ACK');
 assert.equal(acks.length,1,'late bootstrap never repeats the ACK');
 host.stop();guest.stop();
});

test('failed guest one-shot bootstrap reports error but does not break normal subscription',async()=>{
 const bus=fakeTransport(),errors=[],views=[];
 const adapter={...bus.guest,readPublishedSnapshot:async()=>{throw Error('temporary_poll_error')}};
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:adapter,
  onSnapshot:x=>views.push(x),onError:e=>errors.push(e.message)});
 guest.start();await host.start();await tick();await tick();
 assert.equal(guest.status().revision,0);
 assert.ok(errors.includes('temporary_poll_error'));
 assert.equal(views.length,1,'live subscription remains usable after bootstrap error');
 host.stop();guest.stop();
});


test('V3-3: stale failed Firebase write after a newer retry cannot show a phantom error',async()=>{
 const bus=fakeTransport(),errors=[],acks=[];
 let oldReject=null,calls=0;
 const adapter={...bus.guest,sendIntent(clientSeq,intent){
  calls++;
  if(calls===1)return new Promise((_,reject)=>{oldReject=reject;});
  return bus.guest.sendIntent(clientSeq,intent);
 }};
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:adapter,
  onError:e=>errors.push(e.message),onAck:a=>acks.push(a)});
 guest.start();await host.start();
 bus.setDrop(true);
 assert.equal(guest.submit({type:'rotate',direction:1}).clientSeq,1);
 await tick();
 assert.equal(typeof oldReject,'function');
 assert.equal(guest.status().pendingSequence,1);
 assert.equal((await guest.retry()).ok,true);
 await tick();
 assert.equal(host.snapshot().clientSequences[1],1);
 assert.equal(host.snapshot().revision,1);
 oldReject(new Error('delayed_old_attempt_failed'));
 await tick();await tick();
 assert.deepEqual(errors,[],'a superseded old retry must not surface a false connection error');
 assert.equal(guest.status().pendingSequence,1);
 bus.setDrop(false);bus.replay();await tick();
 assert.deepEqual(acks.map(x=>x.clientSeq),[1]);
 assert.equal(acks[0].applied,true);
 assert.equal(guest.status().pendingSequence,null);
 assert.equal(host.snapshot().revision,1,'stale retry never applies a second rotate');
 guest.stop();host.stop();
});

test('V3-3: inconsistent revision and foreign snapshots cannot forge guest ACK',async()=>{
 const bus=fakeTransport(),acks=[],errors=[],views=[];
 const host=createFirebaseMatchHost({roomClient:bus.host});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onAck:a=>acks.push(a),onError:e=>errors.push(e.message),
  onSnapshot:s=>views.push(s)});
 guest.start();await host.start();await tick();
 assert.equal(guest.status().revision,0);
 bus.setDrop(true);
 assert.equal(guest.submit({type:'rotate',direction:1}).clientSeq,1);
 await tick();
 const actual=bus.latest();
 assert.equal(actual.revision,1);
 bus.state({session:bus.session,revision:2,
  state:{...actual.state,revision:1}});
 bus.state({session:bus.session,revision:2,
  state:{...actual.state,revision:2,clientSequences:[0,3]}});
 bus.state({session:bus.session,revision:1,state:null});
 bus.state({session:'f'.repeat(32),revision:2,
  state:{...actual.state,revision:2}});
 assert.equal(guest.status().revision,0);
 assert.equal(guest.status().pendingSequence,1);
 assert.deepEqual(acks,[]);
 assert.equal(views.length,1);
 bus.setDrop(false);bus.replay();await tick();
 assert.equal(guest.status().revision,1);
 assert.deepEqual(acks.map(x=>x.clientSeq),[1]);
 assert.equal(acks[0].applied,true);
 assert.deepEqual(errors,[]);
 guest.stop();host.stop();
});


test('V3-3-4: blocked host publication keeps guest screen/ACK old while 24 auto actions coalesce, then catches up',async()=>{
 const bus=fakeTransport(),acks=[],guestViews=[],errors=[],hostViews=[];
 let freeze=false,release=null,publishing=false,writes=0;
 const hostRoom={...bus.host,async publishSnapshot(state){
  writes++;
  if(freeze){
   freeze=false;publishing=true;
   await new Promise(resolve=>{release=resolve;});
  }
  return bus.host.publishSnapshot(state);
 }};
 const protocol=createMatchProtocol({battleOptions:{seed:212,playtestSoulTuning:true}});
 const host=createFirebaseMatchHost({roomClient:hostRoom,protocol,
  onSnapshot:s=>hostViews.push(s),onError:e=>errors.push('host:'+e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onSnapshot:s=>guestViews.push(s),onAck:a=>acks.push(a),
  onError:e=>errors.push('guest:'+e.message)});
 guest.start();assert.equal((await host.start()).ok,true);await tick();
 assert.equal(guest.status().revision,0);
 assert.equal(guestViews.length,1);
 freeze=true;
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).clientSeq,1);
 await tick();await tick();
 assert.equal(publishing,true);
 assert.equal(host.snapshot().revision,1);
 assert.equal(guest.status().revision,0);
 assert.equal(acks.length,0);
 assert.equal(guest.enqueue({type:'watch',mode:'standard'}).queued,true);
 for(let i=0;i<24;i++)assert.equal(host.advanceAuto().ok,true);
 assert.equal(host.snapshot().revision,25);
 assert.equal(host.status().lastPublished,0);
 assert.equal(guest.status().revision,0,'local host progress is not guest rendered state');
 assert.equal(guest.status().pendingSequence,1);
 assert.equal(guest.status().queuedInputs,1);
 assert.equal(bus.sent.length,1,'second tap must wait for canonical ACK');
 assert.equal(acks.length,0);
 const preview=guestViews.at(-1);
 assert.equal(makeStageView(preview,1).teams[1].members.length,6);
 assert.equal(preview.game.clock.turn,0,'guest UI cannot expose uncommitted auto turns');
 const finalBefore=host.snapshot().hash;
 release();
 for(let i=0;i<30&&guest.status().acked!==2;i++)await tick();
 assert.equal(guest.status().acked,2);
 assert.deepEqual(acks.map(a=>a.clientSeq),[1,2]);
 assert.ok(acks.every(x=>x.accepted&&x.applied===true));
 assert.equal(host.snapshot().revision,26);
 assert.notEqual(host.snapshot().hash,finalBefore);
 assert.equal(guest.status().queuedInputs,0);
 assert.equal(guest.status().pendingSequence,null);
 assert.deepEqual(guest.status().lastState,host.snapshot());
 assert.deepEqual(guestViews.at(-1),host.snapshot());
 assert.deepEqual(bus.sent.map(x=>x.clientSeq),[1,2]);
 assert.equal(host.status().dirty,false);
 assert.equal(host.status().lastPublished,26);
 assert.ok(writes<=4,'do not publish one intermediate snapshot per auto action');
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,[]);
 host.stop();guest.stop();
});

test('V3-3-4: error and recovery of host publish never exposes a false guest success',async()=>{
 const bus=fakeTransport(),acks=[],guestViews=[],errors=[];
 let failNext=false,publishAttempts=0;
 const hostRoom={...bus.host,async publishSnapshot(state){
  publishAttempts++;
  if(failNext){failNext=false;throw Error('injected_publish_failure');}
  return bus.host.publishSnapshot(state);
 }};
 const protocol=createMatchProtocol({battleOptions:{seed:17}});
 const host=createFirebaseMatchHost({roomClient:hostRoom,protocol,
  onError:e=>errors.push(e.message)});
 const guest=createFirebaseMatchGuest({roomClient:bus.guest,
  onAck:a=>acks.push(a),onSnapshot:s=>guestViews.push(s)});
 guest.start();await host.start();await tick();
 failNext=true;
 assert.equal(guest.enqueue({type:'watch',mode:'zero'}).clientSeq,1);
 await tick();await tick();
 assert.equal(host.snapshot().revision,1);
 assert.equal(host.status().dirty,true);
 assert.equal(guest.status().revision,0);
 assert.equal(acks.length,0);
 assert.equal(guestViews.at(-1).game.soul.modes[1],'standard');
 for(let i=0;i<6;i++)assert.equal(host.advanceAuto().ok,true);
 await tick();
 assert.equal(host.snapshot().revision,7);
 assert.equal(guest.status().pendingSequence,1);
 assert.equal(guest.status().acked,0);
 // A host auto action normally retries dirty state without forcing stale
 // guest commands to be redelivered; guest only reacts to canonical state.
 const next=host.snapshot();
 assert.equal(guest.status().lastState?.revision<=next.revision,true);
 if(guest.status().acked===0)assert.equal((await host.retryPublish()).ok,true);
 for(let i=0;i<20&&guest.status().revision<next.revision;i++)await tick();
 assert.deepEqual(guest.status().lastState,host.snapshot());
 assert.deepEqual(acks.map(x=>x.clientSeq),[1]);
 assert.equal(acks[0].applied,true);
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,['injected_publish_failure']);
 assert.ok(publishAttempts>=2);
 guest.stop();host.stop();
});
