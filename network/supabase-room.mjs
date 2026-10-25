/**
 * Phase25: Supabase Postgres Changes + poll-fallback room client.
 * Implements the roomClient interface already used by FirebaseMatchHost/Guest.
 * All seat authority is RLS + room mutation fences in yw_pvp_security_v2.sql.
 * Supabase anonymous Auth is an actual authenticated user; no service key.
 * Full browser reload restores neither match RNG nor active session.
 */
import {makeRoomCode} from './firebase-room.mjs';

const ROOMS='yw_rooms_v1',STATES='yw_states_v1',INPUTS='yw_inputs_v1',
 PRESENCE='yw_presence_v1';
const clone=v=>JSON.parse(JSON.stringify(v));
const validCode=c=>typeof c==='string'&&/^[0-9]{6}$/.test(c);
const uuid=u=>typeof u==='string'&&/^[0-9a-f-]{36}$/i.test(u);
const seq=n=>Number.isSafeInteger(n)&&n>0;
const hex=()=>{
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
};
const fail=(error,fallback)=>{
 if(error)throw new Error(fallback+': '+String(error.code||error.message||error));
};
const jsonSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function createSupabaseRoomClient({client,uid,now=()=>Date.now(),onError=()=>{},
 pollMs=1500}={}){
 if(!client?.from||!client?.channel||!uuid(uid))throw new TypeError('authenticated Supabase client and UID required');
 if(typeof onError!=='function'||!Number.isInteger(pollMs)||pollMs<200)
  throw new TypeError('invalid Supabase transport callbacks/poll');
 let roomCode=null,seat=null,session=null,epoch=0;
 const releases=[];
 function active(){return {roomCode,seat,session,epoch};}
 function ensure(){
  if(!roomCode||seat===null||!session)throw new Error('not in authenticated room');
 }
 function register(fn){releases.push(fn);return fn;}
 function tick(fn,ms=pollMs){
  let busy=false,alive=true;
  const run=async()=>{if(!alive||busy)return;busy=true;
   try{await fn();}catch(error){if(alive)onError(error);}
   finally{busy=false;}
  };
  void run();
  const timer=setInterval(run,ms);
  return register(()=>{alive=false;clearInterval(timer);});
 }
 function realtime(table,event,fn){
  ensure();
  const expectedEpoch=epoch;
  const channel=client.channel('yw:'+table+':'+roomCode+':'+hex().slice(0,8));
  channel.on('postgres_changes',{event,schema:'public',table,filter:'room_code=eq.'+roomCode},
   payload=>{if(expectedEpoch===epoch)void Promise.resolve().then(()=>fn(payload)).catch(onError);})
   .subscribe();
  return register(()=>{void client.removeChannel(channel);});
 }
 async function createRoom({code=null,maxAttempts=8}={}){
  if(roomCode!==null)throw Error('already in room');
  if(code!==null&&!validCode(code))throw TypeError('six-digit room code required');
  for(let i=0;i<(code?1:maxAttempts);i++){
   const chosen=code??makeRoomCode();
   const generated=hex();
   const {error}=await client.from(ROOMS).insert({
    code:chosen,session:generated,host_uid:uid,phase:'lobby'
   });
   if(error){
    if(error.code==='23505'){if(code)return {ok:false,reason:'room_code_collision'};continue;}
    fail(error,'room_create_failed');
   }
   roomCode=chosen;session=generated;seat=0;epoch++;
   return {ok:true,code:chosen,seat,session};
  }
  return {ok:false,reason:'room_code_collision'};
 }
 async function joinRoom(code){
  if(roomCode!==null)throw Error('already in room');
  if(!validCode(code))throw TypeError('six-digit room code required');
  const {data,error}=await client.from(ROOMS).select('code,session,host_uid,guest_uid,phase')
   .eq('code',code).maybeSingle();
  fail(error,'room_lookup_failed');
  if(!data||data.phase!=='lobby'||data.host_uid===uid||
   (data.guest_uid&&data.guest_uid!==uid))return {ok:false,reason:'room_not_joinable'};
  if(!data.guest_uid){
   const {data:claimed,error:claimError}=await client.from(ROOMS)
    .update({guest_uid:uid}).eq('code',code).eq('phase','lobby')
    .is('guest_uid',null).select('code,session,guest_uid').maybeSingle();
   if(claimError||!claimed||claimed.session!==data.session||claimed.guest_uid!==uid)
    return {ok:false,reason:'room_full_or_changed'};
  }
  roomCode=code;session=data.session;seat=1;epoch++;
  return {ok:true,code,seat,session};
 }
 async function startRoom(){
  ensure();if(seat!==0)throw Error('only host starts');
  const {data,error}=await client.from(ROOMS).update({phase:'playing'})
   .eq('code',roomCode).eq('session',session).eq('phase','lobby')
   .not('guest_uid','is',null).select('code').maybeSingle();
  if(error||!data)return {ok:false,reason:'guest_not_ready_or_start_rejected'};
  return {ok:true};
 }
 async function sendIntent(clientSeq,intent){
  ensure();if(!seq(clientSeq)||!intent||typeof intent.type!=='string')
   throw TypeError('invalid input');
  const wireIntent=intent.type==='pin'&&intent.targetId===null?
   {...intent,targetId:'__clear__'}:intent;
  const payload={room_code:roomCode,session,client_seq:clientSeq,
   sender_uid:uid,intent:clone(wireIntent)};
  if(new TextEncoder().encode(JSON.stringify(payload)).length>2048)
   throw RangeError('input payload too large');
  const {error}=await client.from(INPUTS).insert(payload);
  if(!error)return {ok:true};
  if(error.code==='23505'){
   const {data, error:readError}=await client.from(INPUTS)
    .select('session,intent,sender_uid').eq('room_code',roomCode)
    .eq('client_seq',clientSeq).maybeSingle();
   if(!readError&&data?.sender_uid===uid&&data.session===session&&
      jsonSame(data.intent,wireIntent))return {ok:true,reason:'already_stored'};
   return {ok:false,reason:'stale_or_conflicting_input'};
  }
  return {ok:false,reason:'input_write_failed'};
 }
 async function publishSnapshot(snapshot){
  ensure();if(seat!==0)throw Error('only host publishes');
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)
   throw TypeError('invalid snapshot');
  const stateJson=JSON.stringify(snapshot);
  if(new TextEncoder().encode(stateJson).length>131072)
   throw RangeError('snapshot too large');
  const payload={room_code:roomCode,session,revision:snapshot.revision,
   state_json:stateJson,author_uid:uid};
  const {error}=await client.from(STATES).upsert(payload,{onConflict:'room_code'});
  if(error)return {ok:false,reason:'stale_snapshot_or_write_denied'};
  return {ok:true};
 }
 async function readPublishedSnapshot(){
  ensure();
  const {data,error}=await client.from(STATES).select('session,revision,state_json')
   .eq('room_code',roomCode).maybeSingle();
  fail(error,'snapshot_preflight_failed');
  if(!data)return null;
  if(data.session!==session)throw Error('foreign_snapshot_session');
  let state;try{state=JSON.parse(data.state_json);}catch{throw Error('bad_published_state');}
  if(state?.revision!==data.revision||!Array.isArray(state.clientSequences))
   throw Error('invalid_published_state');
  return state;
 }
 function subscribeInputs(handler){
  ensure();if(seat!==0||typeof handler!=='function')throw Error('host input listener required');
  const expected=epoch;let last=0;
  async function collect(){
   if(expected!==epoch)return;
   const {data,error}=await client.from(INPUTS).select('session,client_seq,intent')
    .eq('room_code',roomCode).eq('session',session).gt('client_seq',last)
    .order('client_seq',{ascending:true}).limit(20);
   fail(error,'input_poll_failed');
   for(const item of data||[]){
    if(item.client_seq<=last)continue;
    last=item.client_seq;
    const command=clone(item.intent);
    if(command.type==='pin'&&command.targetId==='__clear__')command.targetId=null;
    handler({session,clientSeq:item.client_seq,intent:command});
   }
  }
  realtime(INPUTS,'INSERT',collect);
  tick(collect);
  return ()=>{}; // Removed on leaveLocal(); match.stop stops only callbacks via epoch fence.
 }
 function subscribeSnapshots(handler){
  ensure();if(typeof handler!=='function')throw Error('snapshot listener required');
  const expected=epoch;let last=-1;
  async function collect(){
   if(expected!==epoch)return;
   const {data,error}=await client.from(STATES).select('session,revision,state_json')
    .eq('room_code',roomCode).maybeSingle();
   fail(error,'snapshot_poll_failed');
   if(!data||data.session!==session||data.revision<=last)return;
   let state;try{state=JSON.parse(data.state_json);}catch{return;}
   if(state?.revision!==data.revision)return;
   last=data.revision;handler({session,revision:last,state});
  }
  realtime(STATES,'*',collect);
  tick(collect);
  return ()=>{};
 }
 function watchPresence(handler=()=>{}){
  ensure();
  const expected=epoch,mySeat=seat===0?'host':'guest';let alive=true;
  async function heartbeat(){
   if(!alive||expected!==epoch)return;
   if(typeof navigator!=='undefined'&&navigator.onLine===false){handler(false);return;}
   const {error}=await client.from(PRESENCE).upsert({
    room_code:roomCode,seat:mySeat,owner_uid:uid
   },{onConflict:'room_code,seat'});
   if(!alive||expected!==epoch)return;
   handler(!error);
   if(error)onError(new Error('presence_write_failed'));
  }
  void heartbeat();
  const timer=setInterval(heartbeat,4000);
  register(()=>{alive=false;clearInterval(timer);});
  return ()=>{alive=false;clearInterval(timer);};
 }
 function watchPeerPresence(handler){
  ensure();if(typeof handler!=='function')throw TypeError('peer presence callback required');
  const expected=epoch,peer=seat===0?'guest':'host';
  let previous=undefined;
  return tick(async()=>{
   if(expected!==epoch)return;
   const {data,error}=await client.from(PRESENCE).select('last_seen')
    .eq('room_code',roomCode).eq('seat',peer).maybeSingle();
   fail(error,'peer_presence_failed');
   // Heartbeat 4s; consider a peer offline after 12s without a server write.
   const age=data?now()-Date.parse(data.last_seen):Infinity;
   const value=data===null?null:Number.isFinite(age)&&age>-30000&&age<12000;
   if(value!==previous){previous=value;handler(value);}
  },1300);
 }
 function leaveLocal(){
  for(const release of releases.splice(0))release();
  roomCode=null;session=null;seat=null;epoch++;
 }
 return {active,createRoom,joinRoom,startRoom,sendIntent,publishSnapshot,
  readPublishedSnapshot,subscribeInputs,subscribeSnapshots,
  watchPresence,watchPeerPresence,leaveLocal};
}
