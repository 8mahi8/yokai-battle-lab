import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseMatchHost,createFirebaseMatchGuest} from '../network/firebase-match.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

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
 assert.equal(protocol.exportJournal().entries[1].hostRotationAtMs,1450);
 hostMs=4000;
 assert.equal(guest.submit({type:'rotate',direction:1}).ok,true);
 await tick();
 assert.equal(host.snapshot().game.clock.teams[1].frontIds[0],'B3');
 assert.equal(acks.length,3);
 assert.deepEqual(bus.latest().state.game.clock.teams[1].frontIds,
  host.snapshot().game.clock.teams[1].frontIds);
 assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 assert.deepEqual(errors,[]);
 guest.stop();host.stop();
});
