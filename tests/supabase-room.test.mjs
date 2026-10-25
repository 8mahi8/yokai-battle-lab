import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createSupabaseRoomClient} from '../network/supabase-room.mjs';

// No real account, database, network, or service_role tokens in these tests.
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const hostUid='11111111-1111-4111-8111-111111111111';
const guestUid='22222222-2222-4222-8222-222222222222';
const buildFake=()=>{
 const rows={yw_rooms_v1:[],yw_states_v1:[],yw_inputs_v1:[],yw_presence_v1:[]};
 const client=uid=>({
  from(table){
   const q={fields:'*',conditions:[],set:null,orderKey:null,limitN:null};
   function selected(){let r=[...rows[table]];
    for(const [op,key,value] of q.conditions){
     if(op==='eq')r=r.filter(x=>x[key]===value);
     if(op==='gt')r=r.filter(x=>x[key]>value);
     if(op==='is')r=r.filter(x=>x[key]===value);
     if(op==='not')r=r.filter(x=>x[key]!==value);
    }
    if(q.orderKey)r.sort((a,b)=>a[q.orderKey]-b[q.orderKey]);
    if(q.limitN!==null)r=r.slice(0,q.limitN);
    return r.map(row=>{
     if(q.fields==='*')return {...row};
     const allowed=q.fields.split(',');return Object.fromEntries(
      Object.entries(row).filter(([k])=>allowed.includes(k)));
    });
   }
   const builder={
    select(fields='*'){q.fields=fields;return builder;},
    eq(key,v){q.conditions.push(['eq',key,v]);return builder;},
    gt(key,v){q.conditions.push(['gt',key,v]);return builder;},
    is(key,v){q.conditions.push(['is',key,v]);return builder;},
    not(key,op,v){assert.equal(op,'is');q.conditions.push(['not',key,v]);return builder;},
    order(key){q.orderKey=key;return builder;},
    limit(n){q.limitN=n;return Promise.resolve({data:selected(),error:null});},
    maybeSingle(){
     if(q.set){
      const matches=selected();
      const old=rows[table].find(x=>Object.entries(matches[0]||{}).every(
       ([k,v])=>x[k]===v)); // selected filters before updating
      if(old)Object.assign(old,q.set);
     }
     const results=selected();
     return Promise.resolve({data:results[0]||null,error:null});
    },
    insert(row){
     const id=table==='yw_rooms_v1'?['code']:
      table==='yw_inputs_v1'?['room_code','client_seq']:
      table==='yw_presence_v1'?['room_code','seat']:['room_code'];
     if(rows[table].some(x=>id.every(k=>x[k]===row[k])))
      return Promise.resolve({error:{code:'23505'}});
     rows[table].push({...row});return Promise.resolve({error:null});
    },
    update(value){q.set=value;return builder;},
    upsert(row){
     let old=rows[table].find(x=>x.room_code===row.room_code&&
      (!row.seat||x.seat===row.seat));
     if(old){
      if(table==='yw_states_v1'&&row.revision<=old.revision)
       return Promise.resolve({error:{code:'stale_snapshot'}});
      Object.assign(old,row);
     }else rows[table].push({...row});
     return Promise.resolve({error:null});
    }
   };return builder;
  },
  channel(name){return {on(){return this},subscribe(){return this}};},
  removeChannel(){return Promise.resolve()}
 });
 return {rows,client};
};
test('25A rejects non-authenticated room client and bad room numbers',async()=>{
 assert.throws(()=>createSupabaseRoomClient({client:{},uid:hostUid}),/authenticated/);
 const fake=buildFake(),a=createSupabaseRoomClient({client:fake.client(hostUid),uid:hostUid});
 await assert.rejects(a.createRoom({code:'12345'}),/six-digit/);
 await assert.rejects(a.joinRoom('broken'),/six-digit/);
});
test('25A host makes one six-digit room; duplicate code cannot replace room',async()=>{
 const f=buildFake();
 const a=createSupabaseRoomClient({client:f.client(hostUid),uid:hostUid});
 const b=createSupabaseRoomClient({client:f.client(guestUid),uid:guestUid});
 const result=await a.createRoom({code:'123456'});
 assert.equal(result.ok,true);
 assert.equal(a.active().seat,0);
 assert.equal(result.session.length,32);
 assert.equal((await b.createRoom({code:'123456'})).reason,'room_code_collision');
 assert.equal(f.rows.yw_rooms_v1.length,1);
 a.leaveLocal();b.leaveLocal();
});
test('25A guest joins host, starts 1v1, sends one intent, receives snapshot preflight',async()=>{
 const f=buildFake(),a=createSupabaseRoomClient({client:f.client(hostUid),uid:hostUid}),
 b=createSupabaseRoomClient({client:f.client(guestUid),uid:guestUid});
 await a.createRoom({code:'123456'});
 const joined=await b.joinRoom('123456');
 assert.equal(joined.ok,true);assert.equal(joined.seat,1);
 assert.equal(b.active().session,a.active().session);
 assert.equal((await a.startRoom()).ok,true);
 assert.equal(await b.readPhase(),'playing');
 const payload={version:1,revision:0,clientSequences:[0,0],game:{winner:null}};
 assert.equal((await a.readPublishedSnapshot()),null);
 assert.equal((await a.publishSnapshot(payload)).ok,true);
 assert.deepEqual(await b.readPublishedSnapshot(),payload);
 assert.equal((await a.publishSnapshot(payload)).ok,false,'replayed revision should be rejected');
 const command={type:'rotate',direction:1};
 assert.equal((await b.sendIntent(1,command)).ok,true);
 assert.equal((await b.sendIntent(1,command)).reason,'already_stored');
 assert.equal((await b.sendIntent(1,{type:'rotate',direction:-1})).ok,false);
 assert.equal(f.rows.yw_inputs_v1.length,1);
 a.leaveLocal();b.leaveLocal();
});
test('25A payload over 2KB refused before database writes',async()=>{
 const f=buildFake(),a=createSupabaseRoomClient({client:f.client(hostUid),uid:hostUid});
 await a.createRoom({code:'234567'});
 await assert.rejects(a.sendIntent(1,{type:'rotate',extra:'x'.repeat(3000)}),/payload too large/);
 assert.equal(f.rows.yw_inputs_v1.length,0);
 a.leaveLocal();
});
