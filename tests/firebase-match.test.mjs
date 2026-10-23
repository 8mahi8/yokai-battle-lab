import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseMatchHost,createFirebaseMatchGuest} from '../network/firebase-match.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
function fakeTransport(){
 const session='1'.repeat(32),code='123456';
 const listeners={input:new Set(),state:new Set()};
 let latest=null,drop=false;
 const sent=[],saves=[];
 const host={
  active:()=>({session,roomCode:code,seat:0}),
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
