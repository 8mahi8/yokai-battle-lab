import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchRelay,createMatchClientSync} from '../engine/match-relay.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

function setup(){
 const packets=[];let t=10000;
 const protocol=createMatchProtocol({battleOptions:{seed:301}});
 const relay=createMatchRelay({protocol,now:()=>t,send:(id,p)=>packets.push({id,p})});
 const views={A:[],B:[]},presence={A:[],B:[]};
 const clients={};
 for(const id of ['A','B'])clients[id]=createMatchClientSync({
  send:p=>relay.receive(id,p),onSnapshot:p=>views[id].push(p),
  onPresence:p=>presence[id].push(p)
 });
 const flush=(id,reverse=false)=>{
  const found=packets.filter(m=>m.id===id);for(let i=packets.length-1;i>=0;i--)
   if(packets[i].id===id)packets.splice(i,1);
  if(reverse)found.reverse();
  return found.map(m=>clients[id].receive(m.p));
 };
 const connect=()=>{assert.equal(relay.connect('A',0).ok,true);
  assert.equal(relay.connect('B',1).ok,true);flush('A');flush('B');};
 return {relay,protocol,clients,views,presence,packets,flush,connect,
  advance:ms=>t+=ms};
}
const rotate = direction=>({type:'rotate',direction});

test('authenticated adapter assigns seats; packet cannot impersonate another seat',()=>{
 const x=setup();x.connect();
 assert.equal(x.clients.A.status().seat,0);assert.equal(x.clients.B.status().seat,1);
 const before=x.protocol.snapshot();
 assert.equal(x.relay.receive('A',{type:'command',side:1,clientSeq:1,intent:rotate(1)}).reason,'invalid_packet_shape');
 assert.equal(x.relay.receive('A',{type:'command',clientSeq:1,intent:{...rotate(1),side:1}}).reason,'invalid_command');
 assert.deepEqual(x.protocol.snapshot(),before);
 assert.equal(x.clients.A.submit(rotate(1)).ok,true);x.flush('A');x.flush('B');
 assert.equal(x.protocol.snapshot().game.clock.teams[0].frontIds[0],'A2');
 assert.equal(x.protocol.snapshot().game.clock.teams[1].frontIds[0],'B1');
 assert.deepEqual(x.protocol.snapshot().clientSequences,[1,0]);
});

test('two independent clients see ordered authoritative snapshots and host auto turns',()=>{
 const x=setup();x.connect();
 x.clients.A.submit(rotate(1));x.flush('A');x.flush('B');
 x.clients.B.submit(rotate(-1));x.flush('A');x.flush('B');
 x.relay.advanceAuto();x.flush('A');x.flush('B');
 assert.equal(x.protocol.snapshot().revision,3);
 assert.equal(x.clients.A.status().revision,3);
 assert.equal(x.clients.B.status().revision,3);
 assert.equal(x.protocol.snapshot().game.clock.turn,1);
 assert.deepEqual(x.views.A.at(-1),x.views.B.at(-1));
});

test('lost ACK retransmission is deduplicated and not rebroadcast',()=>{
 const x=setup();x.connect();x.clients.A.submit(rotate(1));
 const rev=x.protocol.snapshot().revision;
 // Simulate lost ACK but later arrival of an ordinary full snapshot.
 const keep=x.packets.filter(m=>m.id==='B');
 x.packets.splice(0,x.packets.length,...keep);
 assert.equal(x.clients.A.retry(),true);
 assert.equal(x.protocol.snapshot().revision,rev);
 const a=x.packets.filter(m=>m.id==='A');
 assert.equal(a.length,1);assert.equal(a[0].p.type,'ack');
 assert.equal(a[0].p.receipt.duplicate,true);
 x.flush('A');assert.equal(x.clients.A.status().pendingSequence,null);
});

test('out-of-order delayed full snapshot cannot roll back guest rendering',()=>{
 const x=setup();x.connect();x.clients.A.submit(rotate(1));x.clients.A.submit(rotate(1));
 // The second submit stays blocked while ACK has not arrived.
 assert.equal(x.protocol.snapshot().revision,1);
 const prior=x.packets.find(m=>m.id==='B'&&m.p.type==='snapshot').p;
 x.relay.advanceAuto();
 x.flush('B',true);
 const latest=x.clients.B.status().revision;
 assert.equal(latest,2);
 assert.equal(x.clients.B.receive(prior).reason,'stale_snapshot');
 assert.equal(x.clients.B.status().revision,latest);
});

test('reconnect retains server sequence and resynchronizes after missed ACK',()=>{
 const x=setup();x.connect();x.clients.A.submit(rotate(1));
 x.packets.splice(0);
 assert.equal(x.relay.disconnect('A'),true);
 // Server's connection ID changes but seat is re-authorized by trusted adapter.
 x.clients.A=createMatchClientSync({send:p=>x.relay.receive('A2',p),onSnapshot:s=>x.views.A.push(s)});
 assert.equal(x.relay.connect('A2',0).ok,true);
 const greet=x.packets.find(m=>m.id==='A2'&&m.p.type==='welcome').p;
 x.clients.A.receive(greet);
 assert.equal(x.clients.A.status().lastSequence,1);
 x.clients.A.submit(rotate(1));
 assert.deepEqual(x.protocol.snapshot().clientSequences,[2,0]);
});

test('nack sequence mismatch requests resync, and invalid packets do not advance',()=>{
 const x=setup();x.connect();const before=x.protocol.snapshot();
 for(const p of [
  {type:'auto'},
  {type:'command',clientSeq:1,intent:rotate(1),seat:1},
  {type:'command',clientSeq:1,intent:rotate(1),note:'x'.repeat(5000)},
  {type:'command',clientSeq:0,intent:rotate(1)},
  {type:'ping',side:0}
 ])assert.equal(x.relay.receive('A',p).ok,false);
 assert.equal(x.relay.receive('unknown',{type:'ping'}).reason,'not_connected');
 assert.deepEqual(x.protocol.snapshot(),before);
 assert.equal(x.relay.receive('A',{type:'command',clientSeq:3,intent:rotate(1)}).reason,'sequence_gap');
 assert.equal(x.protocol.snapshot().revision,0);
 assert.ok(x.packets.some(m=>m.id==='A'&&m.p.type==='snapshot'));
});

test('idle timeout drops seat; heartbeat keeps other seat alive; seat collision rejected',()=>{
 const x=setup();x.connect();x.advance(20000);
 x.relay.receive('B',{type:'ping'});x.advance(11000);
 assert.equal(x.relay.sweep(),1);
 assert.deepEqual(x.relay.status().connected,[false,true]);
 assert.equal(x.relay.connect('B2',1).reason,'seat_or_connection_in_use');
 assert.equal(x.relay.connect('A2',0).ok,true);
});

test('duplicate snapshots and missing heartbeat do not invent client commands',()=>{
 const x=setup();x.connect();
 const snapshot=x.packets.find(m=>m.id==='A'&&m.p.type==='welcome');
 assert.equal(x.clients.A.receive(snapshot?.p??{type:'bogus'}).ok,false);
 const rev=x.protocol.snapshot().revision;
 x.clients.A.ping();x.clients.A.resync();x.flush('A');
 assert.equal(x.protocol.snapshot().revision,rev);
 assert.equal(x.clients.A.status().lastSequence,0);
});
