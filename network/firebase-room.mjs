/**
 * Firebase Realtime Database room adapter for the isolated Phase 13 prototype.
 *
 * Dependency-injected Firebase compat Database (database.ref(path)) plus a
 * Firebase Anonymous Auth UID. This is NOT a server: a player/browser host can
 * cheat or disconnect. Real RTDB Rules must bind UID -> seat and protect writes.
 * Sharing an existing Firebase PROJECT is fine (BRAWL and Shokoku do).
 * Keep the yokaiRoomsV1 namespace and merge its own Auth/RTDB rules into
 * existing rules without replacing or weakening the other games' paths.
 *
 * No Firebase URL or keys, imports, billing actions, or production mutations.
 */
export const YOKAI_ROOM_ROOT='yokaiRoomsV1';
export const YOKAI_ROOM_VERSION=13;
const own=Object.prototype.hasOwnProperty;
const clone=x=>JSON.parse(JSON.stringify(x));
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validCode=code=>typeof code==='string'&&/^[0-9]{6}$/.test(code);
const validUid=uid=>typeof uid==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(uid);
const validSession=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
const validSeq=n=>Number.isSafeInteger(n)&&n>0;
const validRev=n=>Number.isSafeInteger(n)&&n>=0;
const MAX_PACKET=2048;
const MAX_STATE_BYTES=131072;

function secureHex(randomBytes,size){
 const a=randomBytes(size);
 if(!a||a.length!==size||Array.from(a).some(x=>!Number.isInteger(x)||x<0||x>255))
  throw new Error('secure random bytes required');
 return Array.from(a,n=>n.toString(16).padStart(2,'0')).join('');
}
function defaultRandomBytes(size){
 if(typeof crypto==='undefined'||typeof crypto.getRandomValues!=='function')
  throw new Error('crypto.getRandomValues required');
 const a=new Uint8Array(size);crypto.getRandomValues(a);return a;
}
export function makeRoomCode(randomBytes=defaultRandomBytes){
 // Rejection sampling avoids modulo bias in 6-digit room IDs.
 const limit=4294000000; // floor(2^32/1000000)*1000000
 for(let i=0;i<16;i++){
  const x=randomBytes(4);
  if(!x||x.length!==4||Array.from(x).some(b=>!Number.isInteger(b)||b<0||b>255))
   throw new Error('invalid random source');
  const n=((x[0]*0x1000000)+(x[1]<<16)+(x[2]<<8)+x[3])>>>0;
  if(n<limit)return String(n%1000000).padStart(6,'0');
 }
 throw new Error('random room code generation failed');
}
export function makeRoomSeed(hostUid,randomBytes=defaultRandomBytes,createdAt=Date.now()){
 if(!validUid(hostUid))throw new TypeError('authenticated host UID required');
 if(!Number.isSafeInteger(createdAt)||createdAt<0)throw new TypeError('invalid time');
 return {version:YOKAI_ROOM_VERSION,phase:'lobby',hostUid,
  session:secureHex(randomBytes,16),createdAt};
}
function parseRoom(value){
 if(!plain(value)||value.version!==YOKAI_ROOM_VERSION||
  !['lobby','playing','finished'].includes(value.phase)||
  !validUid(value.hostUid)||!validSession(value.session)||
  (value.guestUid!==undefined&&value.guestUid!==null&&!validUid(value.guestUid)))
  throw new Error('incompatible or malformed room');
 return value;
}
// Firebase RTDB can reorder object keys when values are read back.
// Compare nested command payloads canonically; JSON text order is not wire identity.
function stableCommandJSON(value){
 if(Array.isArray(value))return '['+value.map(stableCommandJSON).join(',')+']';
 if(plain(value))return '{'+Object.keys(value).sort().map(k=>
  JSON.stringify(k)+':'+stableCommandJSON(value[k])).join(',')+'}';
 return JSON.stringify(value);
}

function packetSize(packet){
 try{return new TextEncoder().encode(JSON.stringify(packet)).length;}
 catch(_){return Infinity;}
}

/** Calls compat SDK methods once per operation; all writes require RTDB Rules. */
export function createFirebaseRoomClient({database,uid,randomBytes=defaultRandomBytes,
 now=()=>Date.now(),onError=()=>{}}={}){
 if(!database||typeof database.ref!=='function')throw new TypeError('Firebase database required');
 if(!validUid(uid))throw new TypeError('Firebase Auth UID required');
 if(typeof randomBytes!=='function'||typeof now!=='function'||typeof onError!=='function')
  throw new TypeError('invalid client dependencies');
 let roomCode=null,seat=null,session=null,epoch=0;
 const handlers=[];
 function roomRef(){
  if(roomCode===null)throw new Error('not in a room');
  return database.ref(YOKAI_ROOM_ROOT+'/'+roomCode);
 }
 function active(){
  return {roomCode,seat,session,epoch};
 }
 function attach(ref,fn){
  ref.on('value',fn,onError);
  const release=()=>ref.off('value',fn);
  handlers.push(release);return release;
 }
 function clearWatchers(){
  while(handlers.length)handlers.pop()();
 }
 async function createRoom({code=null,maxAttempts=8}={}){
  if(roomCode!==null)throw new Error('already in a room');
  if(code!==null&&!validCode(code))throw new TypeError('room code must be six digits');
  const attempts=code===null?maxAttempts:1;
  for(let i=0;i<attempts;i++){
   const candidate=code===null?makeRoomCode(randomBytes):code;
   const ref=database.ref(YOKAI_ROOM_ROOT+'/'+candidate);
   // Prime Firebase's local transaction cache; an occupied code is not an
   // unexpected permissions error just because the first updater saw null.
   if((await ref.once('value')).val()!==null)continue;
   // Never mutate external state in a retryable transaction callback.
   const seed=makeRoomSeed(uid,randomBytes,now());
   let txn;
   try{txn=await ref.transaction(before=>before===null?clone(seed):undefined,undefined,false);}
   catch(error){
    if((await ref.once('value')).val()!==null)continue;
    throw error;
   }
   if(txn.committed){
    roomCode=candidate;seat=0;session=seed.session;epoch++;
    return {ok:true,code:candidate,seat,session};
   }
  }
  return {ok:false,reason:'room_code_collision'};
 }
 async function joinRoom(code){
  if(roomCode!==null)throw new Error('already in a room');
  if(!validCode(code))throw new TypeError('room code must be six digits');
  const ref=database.ref(YOKAI_ROOM_ROOT+'/'+code);
  const first=parseRoom((await ref.once('value')).val());
  if(first.phase!=='lobby'||first.hostUid===uid)
   return {ok:false,reason:'room_not_joinable'};
  if(first.guestUid&&first.guestUid!==uid)return {ok:false,reason:'room_full'};
  let txn;
  try{txn=await ref.child('guestUid').transaction(before=>
   before===null?uid:before===uid?uid:undefined,undefined,false);}
  catch(error){
   const current=(await ref.once('value')).val();
   if(current?.guestUid&&current.guestUid!==uid)
    return {ok:false,reason:'room_full'};
   throw error;
  }
  if(!txn.committed)return {ok:false,reason:'room_full'};
  // Do not accept a stale pre-transaction room or foreign room generation.
  const latest=parseRoom((await ref.once('value')).val());
  if(latest.session!==first.session||latest.guestUid!==uid||latest.phase!=='lobby')
   return {ok:false,reason:'room_changed'};
  roomCode=code;seat=1;session=latest.session;epoch++;
  return {ok:true,code,seat,session};
 }
 async function startRoom(){
  if(seat!==0)throw new Error('only host starts');
  const ref=roomRef();
  const first=parseRoom((await ref.once('value')).val());
  if(first.session!==session||!first.guestUid)
   return {ok:false,reason:'guest_not_ready'};
  // Firebase may invoke a transaction updater with null while hydrating its
  // local cache, even if the parent room was just read. Prime the exact ref,
  // then use the inspected phase as a fallback for that optimistic first call.
  const phaseRef=ref.child('phase');
  await phaseRef.once('value');
  let t;
  try{
   t=await phaseRef.transaction(before=>
    (before===null?first.phase:before)==='lobby'?'playing':undefined,
    undefined,false);
  }catch(error){
   const current=(await phaseRef.once('value')).val();
   if(current!=='lobby')return {ok:false,reason:'start_rejected'};
   throw error;
  }
  return {ok:t.committed,reason:t.committed?null:'start_rejected'};
 }
 async function sendIntent(clientSeq,intent){
  if(seat===null)throw new Error('not in a room');
  // RTDB deletes null children: reserve a wire sentinel for "clear pin".
  // The host must decode this marker before dispatching to match-protocol.
  const wireIntent=intent?.type==='pin'&&intent.targetId===null?
   {...intent,targetId:'__clear__'}:intent;
  const command={type:'command',clientSeq,intent:wireIntent};
  if(!validSeq(clientSeq)||!plain(intent)||packetSize(command)>MAX_PACKET)
   throw new TypeError('invalid or oversized command');
  const ref=roomRef().child('inputs/'+(seat===0?'host':'guest'));
  const payload={session,clientSeq,intent:clone(wireIntent)};
  // Repeated sends of the SAME command are idempotent, but the Rules
  // must never permit a client to change the payload under an old sequence.
  // Read-before-write avoids requiring repeated equal-sequence writes.
  const same=old=>plain(old)&&old.session===session&&
   old.clientSeq===clientSeq&&stableCommandJSON(old.intent)===stableCommandJSON(wireIntent);
  const current=(await ref.once('value')).val();
  if(same(current))return {ok:true,reason:'already_stored'};
  if(plain(current)&&current.session===session&&current.clientSeq>=clientSeq)
   return {ok:false,reason:'stale_or_conflicting_input'};
  let t;
  try{
   t=await ref.transaction(previous=>{
    if(plain(previous)&&previous.session===session&&previous.clientSeq>=clientSeq)
     return undefined;
    return payload;
   },undefined,false);
  }catch(error){
   // Another concurrent writer may have stored the identical command in
   // the meantime. Only that byte-for-byte matching command is accepted.
   const latest=(await ref.once('value')).val();
   if(same(latest))return {ok:true,reason:'already_stored'};
   if(plain(latest)&&latest.session===session&&latest.clientSeq>=clientSeq)
    return {ok:false,reason:'stale_or_conflicting_input'};
   throw error;
  }
  if(!t.committed){
   const latest=(await ref.once('value')).val();
   if(same(latest))return {ok:true,reason:'already_stored'};
  }
  return {ok:t.committed,reason:t.committed?null:'stale_or_conflicting_input'};
 }
 async function publishSnapshot(snapshot){
  if(seat!==0)throw new Error('only host publishes state');
  if(!plain(snapshot)||!validRev(snapshot.revision)||!Array.isArray(snapshot.clientSequences))
   throw new TypeError('invalid match snapshot');
  // RTDB removes null-valued object children, which would corrupt battle
  // snapshots (winner=null, pin=null). A JSON string preserves their meaning.
  const stateJson=JSON.stringify(snapshot);
  if(new TextEncoder().encode(stateJson).length>MAX_STATE_BYTES)
   throw new RangeError('state exceeds research transport limit');
  const payload={session,revision:snapshot.revision,stateJson};
  const ref=roomRef().child('state');
  const t=await ref.transaction(previous=>{
   if(previous&&previous.session===session&&previous.revision>=payload.revision)
    return undefined;
   return payload;
  },undefined,false);
  return {ok:t.committed,reason:t.committed?null:'stale_snapshot'};
 }
 /**
  * Read the remote authoritative game baseline before allowing a new host
  * engine to start. Null means no snapshot has ever been published.
  * Existing state is NEVER interpreted as a resumable in-memory engine:
  * replay/restoration of a host's RNG/journal is not available yet.
  */
 async function readPublishedSnapshot(){
  if(seat===null)throw new Error('not in room');
  const currentSession=session,joinEpoch=epoch;
  const state=(await roomRef().child('state').once('value')).val();
  if(joinEpoch!==epoch||currentSession!==session)
   throw new Error('room changed during remote snapshot check');
  if(state===null)return null;
  if(!plain(state)||state.session!==currentSession||!validRev(state.revision)||
    typeof state.stateJson!=='string')
   throw new Error('invalid_or_foreign_remote_state');
  let payload;
  try{payload=JSON.parse(state.stateJson);}catch(_){throw new Error('malformed_remote_state');}
  if(!plain(payload)||payload.revision!==state.revision||
    !Array.isArray(payload.clientSequences))
   throw new Error('malformed_remote_state');
  return clone(payload);
 }
 /**
  * Observe ONLY the other seat's presence. This is advisory presence, not
  * an authenticated trust proof or a host-restart recovery protocol.
  * null = no evidence yet, true = connected, false = disconnected.
  */
 function watchPeerPresence(handler){
  if(seat===null)throw new Error('not in room');
  if(typeof handler!=='function')throw new TypeError('presence handler required');
  const roomEpoch=epoch;
  return attach(roomRef().child('presence/'+(seat===0?'guest':'host')),snapshot=>{
   if(epoch!==roomEpoch)return;
   const value=snapshot.val();
   handler(value===true?true:value===false?false:null);
  });
 }
 function subscribeInputs(handler){
  if(seat!==0)throw new Error('only host receives guest input');
  if(typeof handler!=='function')throw new TypeError('handler required');
  const currentSession=session,joinEpoch=epoch;
  let last=0;
  return attach(roomRef().child('inputs/guest'),snap=>{
   if(epoch!==joinEpoch)return;
   const p=snap.val();
   if(!plain(p)||p.session!==currentSession||!validSeq(p.clientSeq)||p.clientSeq<=last)
    return;
   last=p.clientSeq;
   const decoded=clone(p);
   if(decoded.intent?.type==='pin'&&decoded.intent.targetId==='__clear__')
    decoded.intent.targetId=null;
   handler(decoded);
  });
 }
 function subscribeSnapshots(handler){
  if(seat===null)throw new Error('not in room');
  if(typeof handler!=='function')throw new TypeError('handler required');
  const currentSession=session,joinEpoch=epoch;let last=-1;
  return attach(roomRef().child('state'),snap=>{
   if(epoch!==joinEpoch)return;
   const p=snap.val();
   if(!plain(p)||p.session!==currentSession||!validRev(p.revision)||
    typeof p.stateJson!=='string'||p.revision<=last)return;
   let state;
   try{state=JSON.parse(p.stateJson);}catch(_){return;}
   if(!plain(state)||state.revision!==p.revision)return;
   last=p.revision;handler({session:p.session,revision:p.revision,state});
  });
 }
 /**
  * Register onDisconnect before publishing presence=true. Re-arm after each
  * /.info/connected transition; merely reusing an old registration is unsafe.
  */
 function watchPresence(handler=()=>{}){
  if(seat===null)throw new Error('not in room');
  const currentSession=session,joinEpoch=epoch;
  const path=roomRef().child('presence/'+(seat===0?'host':'guest'));
  let connectionEpoch=0;
  return attach(database.ref('.info/connected'),snap=>{
   if(epoch!==joinEpoch)return;
   const ticket=++connectionEpoch;
   if(snap.val()!==true){handler(false);return;}
   Promise.resolve().then(async()=>{
    const current=parseRoom((await roomRef().once('value')).val());
    if(current.session!==currentSession||
      current[seat===0?'hostUid':'guestUid']!==uid)throw new Error('seat changed');
    await path.onDisconnect().set(false);
    if(ticket!==connectionEpoch||joinEpoch!==epoch)return;
    await path.set(true);
    if(ticket===connectionEpoch&&joinEpoch===epoch)handler(true);
   }).catch(onError);
  });
 }
 function leaveLocal(){
  clearWatchers();roomCode=null;seat=null;session=null;epoch++;
 }
 return {createRoom,joinRoom,startRoom,sendIntent,publishSnapshot,
  subscribeInputs,subscribeSnapshots,watchPresence,watchPeerPresence,
  readPublishedSnapshot,leaveLocal,active};
}
