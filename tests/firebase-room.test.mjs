import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseRoomClient,makeRoomCode,YOKAI_ROOM_ROOT} from '../network/firebase-room.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

function memoryDb(){
 const tree={}, watchers=new Map(),ops=[];
 const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const parts=p=>p.split('/').filter(Boolean);
 function get(p){let obj=tree;for(const k of parts(p)){if(!obj||!Object.hasOwn(obj,k))return null;obj=obj[k];}return clone(obj);}
 function set(p,value){
  const keys=parts(p),last=keys.pop();let o=tree;
  for(const k of keys)o=o[k]??(o[k]={});
  o[last]=clone(value);
  // Fire on ancestor and exact child subscriptions.
  for(const [watchPath,callbacks] of watchers)
   if(watchPath===p||p.startsWith(watchPath+'/')||watchPath.startsWith(p+'/'))
    for(const fn of [...callbacks])fn({val:()=>get(watchPath)});
 }
 class Ref{
  constructor(path){this.path=path;}
  child(part){return new Ref(this.path+'/'+part);}
  once(){return Promise.resolve({val:()=>get(this.path)});}
  on(_type,fn){let group=watchers.get(this.path);if(!group){group=new Set();watchers.set(this.path,group);}group.add(fn);fn({val:()=>get(this.path)});}
  off(_type,fn){watchers.get(this.path)?.delete(fn);}
  transaction(fn){
   const next=fn(get(this.path));
   if(next===undefined)return Promise.resolve({committed:false,snapshot:{val:()=>get(this.path)}});
   set(this.path,next);
   return Promise.resolve({committed:true,snapshot:{val:()=>get(this.path)}});
  }
  set(value){ops.push(['set',this.path,value]);set(this.path,value);return Promise.resolve();}
  onDisconnect(){return {set:async value=>{ops.push(['disconnect-arm',this.path,value]);},cancel:async()=>{}};}
 }
 return {db:{ref:path=>new Ref(path)},get,set,ops};
}
function rng(s=1){
 let seed=s;
 return size=>Uint8Array.from({length:size},()=>seed++%256);
}
function setup(){
 const mem=memoryDb(),errors=[];
 const host=createFirebaseRoomClient({database:mem.db,uid:'hostUid',randomBytes:rng(8),
  now:()=>123456,onError:e=>errors.push(e.message)});
 const guest=createFirebaseRoomClient({database:mem.db,uid:'guestUid',randomBytes:rng(19),
  now:()=>123456,onError:e=>errors.push(e.message)});
 const third=createFirebaseRoomClient({database:mem.db,uid:'thirdUid',randomBytes:rng(34)});
 return {mem,host,guest,third,errors};
}

test('secure six digit room codes always retain leading zero and length',()=>{
 assert.equal(makeRoomCode(()=>Uint8Array.from([0,0,0,1])),'000001');
 assert.match(makeRoomCode(rng(1)),/^[0-9]{6}$/);
 assert.throws(()=>makeRoomCode(()=>[999,0,0,0]));
});
test('two players join isolated room; third and host duplicate join rejected',async()=>{
 const {mem,host,guest,third}=setup();
 const created=await host.createRoom({code:'012345'});
 assert.equal(created.ok,true);assert.equal(created.seat,0);
 assert.equal(created.code,'012345');
 assert.equal(mem.get(YOKAI_ROOM_ROOT+'/012345').hostUid,'hostUid');
 assert.equal((await guest.joinRoom('012345')).ok,true);
 assert.equal((await third.joinRoom('012345')).reason,'room_full');
 assert.equal((await host.startRoom()).ok,true);
 assert.equal(mem.get(YOKAI_ROOM_ROOT+'/012345').phase,'playing');
 assert.equal((await third.joinRoom('012345')).reason,'room_not_joinable');
});
test('room code collision cannot overwrite prior host',async()=>{
 const x=setup();
 assert.equal((await x.host.createRoom({code:'000001'})).ok,true);
 x.guest.leaveLocal();
 assert.equal((await x.guest.createRoom({code:'000001'})).reason,'room_code_collision');
 assert.equal(x.mem.get(YOKAI_ROOM_ROOT+'/000001').hostUid,'hostUid');
});
test('the host cannot start before another UID takes guest seat',async()=>{
 const x=setup();await x.host.createRoom({code:'123456'});
 assert.equal((await x.host.startRoom()).reason,'guest_not_ready');
 assert.equal((await x.third.joinRoom('123456')).ok,true);
 assert.equal((await x.host.startRoom()).ok,true);
 await assert.rejects(x.third.startRoom(),/only host/);
});
test('real combat protocol, independent guest input and authoritative host snapshot',async()=>{
 const x=setup();await x.host.createRoom({code:'123456'});await x.guest.joinRoom('123456');
 const m=createMatchProtocol({battleOptions:{seed:212}});
 const guestInputs=[],states=[];
 x.host.subscribeInputs(p=>guestInputs.push(p));
 x.guest.subscribeSnapshots(p=>states.push(p));
 const a=await x.guest.sendIntent(1,{type:'rotate',direction:1});
 assert.equal(a.ok,true);assert.equal(guestInputs.length,1);
 const ack=m.dispatch(1,guestInputs[0].clientSeq,guestInputs[0].intent);
 assert.equal(ack.accepted,true);
 const published=await x.host.publishSnapshot(m.snapshot());
 assert.equal(published.ok,true);assert.equal(states.length,1);
 assert.equal(states[0].revision,1);
 assert.equal(states[0].state.game.clock.teams[1].frontIds[0],'B2');
 assert.equal(states[0].session,x.host.active().session);
});
test('duplicate and stale guest intent are safe; snapshot revision never rewinds',async()=>{
 const x=setup();await x.host.createRoom({code:'777777'});await x.guest.joinRoom('777777');
 const events=[];x.host.subscribeInputs(v=>events.push(v));
 assert.equal((await x.guest.sendIntent(1,{type:'rotate',direction:1})).ok,true);
 assert.equal((await x.guest.sendIntent(1,{type:'rotate',direction:1})).ok,true);
 assert.equal((await x.guest.sendIntent(1,{type:'rotate',direction:-1})).ok,false);
 assert.equal((await x.guest.sendIntent(2,{type:'rotate',direction:-1})).ok,true);
 assert.equal((await x.guest.sendIntent(1,{type:'rotate',direction:1})).ok,false);
 assert.deepEqual(events.map(x=>x.clientSeq),[1,2]);
 const proto=createMatchProtocol();
 const a=proto.snapshot();
 assert.equal((await x.host.publishSnapshot(a)).ok,true);
 assert.equal((await x.host.publishSnapshot(a)).ok,false);
 proto.dispatch(0,1,{type:'rotate',direction:1});
 assert.equal((await x.host.publishSnapshot(proto.snapshot())).ok,true);
 assert.equal((await x.host.publishSnapshot(a)).ok,false);
});
test('callbacks ignore stale session payloads and unregister on local leave',async()=>{
 const x=setup();await x.host.createRoom({code:'123123'});await x.guest.joinRoom('123123');
 const seen=[];x.guest.subscribeSnapshots(v=>seen.push(v));
 const existing=x.host.active().session;
 x.mem.set(YOKAI_ROOM_ROOT+'/123123/state',{session:'0'.repeat(32),revision:999,state:{revision:999}});
 assert.equal(seen.length,0);
 x.mem.set(YOKAI_ROOM_ROOT+'/123123/state',{session:existing,revision:1,state:{revision:1}});
 x.mem.set(YOKAI_ROOM_ROOT+'/123123/state',{session:existing,revision:0,state:{revision:0}});
 assert.equal(seen.length,1);
 x.guest.leaveLocal();
 x.mem.set(YOKAI_ROOM_ROOT+'/123123/state',{session:existing,revision:3,state:{revision:3}});
 assert.equal(seen.length,1);
});
test('Firebase presence arms onDisconnect before reporting online',async()=>{
 const x=setup();await x.host.createRoom({code:'121212'});
 const online=[];x.host.watchPresence(v=>online.push(v));
 x.mem.set('.info/connected',true);
 for(let i=0;i<8;i++)await Promise.resolve();
 const acts=x.mem.ops.map(a=>a[0]);
 assert.ok(acts.includes('disconnect-arm'));
 assert.ok(acts.includes('set'));
 assert.ok(acts.indexOf('disconnect-arm')<acts.indexOf('set'));
 assert.equal(x.mem.get(YOKAI_ROOM_ROOT+'/121212/presence/host'),true);
 assert.deepEqual(online,[false,true]);
 x.mem.set('.info/connected',false);
 assert.deepEqual(online,[false,true,false]);
});
test('only host publishes match state and unattached client cannot send',async()=>{
 const x=setup();await x.host.createRoom({code:'202020'});
 await x.guest.joinRoom('202020');
 await assert.rejects(x.guest.publishSnapshot({revision:0}),/only host/);
 await assert.rejects(x.third.sendIntent(1,{type:'rotate',direction:1}),/not in a room/);
 await assert.rejects(x.guest.sendIntent(1,{type:'rotate',extra:'x'.repeat(10000)}),/oversized/);
 assert.equal(x.mem.get(YOKAI_ROOM_ROOT+'/202020/inputs/guest'),null);
});
