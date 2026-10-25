/**
 * Phase 13B — browser-hosted match across isolated Firebase RTDB clients.
 *
 * This binds the Phase 11 deterministic battle engine to Phase 13A RTDB
 * transport; the host alone dispatches opponent intents and publishes state.
 * A guest waits for an authoritative snapshot ACK before sending another
 * input so the single RTDB input slot cannot overwrite an unprocessed action.
 *
 * This does NOT authenticate the host's calculations, run a trusted server,
 * or prove genuine internet / Google Sites behavior. Call only after a room
 * has joined and startRoom() succeeded. No Firebase credentials here.
 */
import {createMatchProtocol,normalizeMatchCommand} from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const isInteger=x=>Number.isSafeInteger(x)&&x>=0;

function validateRoom(roomClient,seat){
 if(!roomClient||typeof roomClient.active!=='function')
  throw new TypeError('room client required');
 const room=roomClient.active();
 if(room.seat!==seat||!room.session||!room.roomCode)
  throw new Error('authenticated room seat required');
 return room;
}
function assertCallbacks(onSnapshot,onError){
 if(typeof onSnapshot!=='function'||typeof onError!=='function')
  throw new TypeError('callbacks required');
}

/**
 * Only the host browser may run the combat simulation. It serializes
 * snapshots without blocking the synchronous acceptance of guest commands.
 * Failed publishes leave dirty state for an explicit retry/reconnection.
 */
export function createFirebaseMatchHost({roomClient,protocol=createMatchProtocol(),
 onSnapshot=()=>{},onError=()=>{}}={}){
 validateRoom(roomClient,0);
 assertCallbacks(onSnapshot,onError);
 if(!protocol||['dispatch','snapshot','advanceAuto'].some(k=>typeof protocol[k]!=='function'))
  throw new TypeError('match protocol required');
 if(typeof roomClient.readPublishedSnapshot!=='function')
  throw new TypeError('room adapter must provide authoritative preflight check');
 const initialSession=roomClient.active().session;
 let started=false,stopped=false,fenced=false,unsub=null,busy=null,dirty=true;
 let lastPublished=-1,processedGuest=0;
 function check(){
  const room=validateRoom(roomClient,0);
  if(stopped||fenced||room.session!==initialSession)
   throw new Error(fenced?'existing_authoritative_state':'host session changed');
 }
 async function publish(){
  check();
  if(busy)return busy;
  busy=(async()=>{
   while(dirty&&!stopped){
    dirty=false;
    const state=protocol.snapshot();
    try{
     const receipt=await roomClient.publishSnapshot(state);
     if(!receipt.ok){
      if(receipt.reason==='stale_snapshot'){
       // An old host can never restart by pretending to be a new game.
       // Publishing revision 0 after another host's revision >0 must fence
       // this in-memory engine, not silently report success.
       fenced=true;started=false;unsub?.();unsub=null;
       throw new Error('existing_authoritative_state');
      }
      throw new Error('snapshot publish rejected: '+receipt.reason);
     }
     lastPublished=Math.max(lastPublished,state.revision);
    }catch(error){
     dirty=true;onError(error);return {ok:false,error:String(error)};
    }
   }
   return {ok:true,revision:lastPublished};
  })();
  try{return await busy;}finally{busy=null;}
 }
 function changed(){
  check();dirty=true;
  const state=protocol.snapshot();
  onSnapshot(clone(state));
  // Avoid unhandled rejections from synchronous Firebase listeners.
  void publish().catch(onError);
 }
 async function start(){
  check();
  if(started)throw new Error('host session already started');
  // A reload cannot restore the random state, event journal or timer.
  // Refuse to run a new engine against the room's existing session.
  const existing=await roomClient.readPublishedSnapshot();
  check();
  if(existing!==null){
   fenced=true;
   return {ok:false,reason:'existing_authoritative_state',revision:existing.revision};
  }
  started=true;
  const baseline=protocol.snapshot();
  processedGuest=baseline.clientSequences[1];
  // A restarted host must not silently drop the match. Restoring a running
  // game is NOT implemented; this adapter owns a fresh authoritative match.
  unsub=roomClient.subscribeInputs(packet=>{
   if(stopped||!started||packet.session!==initialSession)return;
   const seq=packet.clientSeq;
   if(seq<=processedGuest)return;
   const receipt=protocol.dispatch(1,seq,packet.intent);
   if(receipt.accepted){
    processedGuest=seq;
    changed();
   }else onError(new Error('guest intent rejected: '+(receipt.reason||'unknown')));
  });
  changed();return publish();
 }
 function submit(intent){
  check();
  if(!started)throw new Error('host match has not started');
  const seq=protocol.snapshot().clientSequences[0]+1;
  const receipt=protocol.dispatch(0,seq,normalizeMatchCommand(0,intent));
  if(receipt.accepted)changed();
  return receipt;
 }
 function advanceAuto(){
  check();
  if(!started)throw new Error('host match has not started');
  const result=protocol.advanceAuto();
  if(result.ok)changed();
  return result;
 }
 function stop(){stopped=true;unsub?.();unsub=null;}
 function status(){return {started,stopped,fenced,revision:protocol.snapshot().revision,
  lastPublished,guestSequence:processedGuest,dirty};}
 return {start,submit,advanceAuto,retryPublish:publish,stop,status,
  snapshot:()=>clone(protocol.snapshot())};
}

/**
 * Guest input is stop-and-wait. A write completing in Firebase is NOT an ACK
 * that the battle engine consumed it: only authoritative clientSequences[1]
 * in a later snapshot can acknowledge it. A failed/timeout write may be
 * retried with the SAME number and intent, never renumbered.
 */
export function createFirebaseMatchGuest({roomClient,onSnapshot=()=>{},onAck=()=>{},
 onError=()=>{},writeTimeoutMs=6000,maxQueuedInputs=48}={}){
 validateRoom(roomClient,1);
 assertCallbacks(onSnapshot,onError);
 if(typeof onAck!=='function')throw new TypeError('onAck must be a function');
 if(!Number.isFinite(writeTimeoutMs)||writeTimeoutMs<100)
  throw new RangeError('invalid write timeout');
 if(!Number.isSafeInteger(maxQueuedInputs)||maxQueuedInputs<1||maxQueuedInputs>256)
  throw new RangeError('invalid input queue capacity');
 const initialSession=roomClient.active().session;
 let stopped=false,started=false,unsub=null,revision=-1,acked=0;
 let pending=null,attempt=0,latestState=null,queue=[];
 // UI presence (/.info/connected + peer presence) gates only NEW inputs;
 // the one already written may have reached Firebase before disconnection.
 let deliveryEnabled=true;
 function check(){
  const room=validateRoom(roomClient,1);
  if(stopped||room.session!==initialSession)throw new Error('guest session changed');
 }
 async function deliver(mark){
  if(!pending||stopped)return {ok:false,reason:'no_pending_command'};
  const current=pending,delivery=++attempt;
  let timeoutId=null;
  // Timeout releases the UI but cannot cancel a write already queued in SDK.
  const timeout=new Promise((_,reject)=>{
   timeoutId=setTimeout(()=>reject(new Error('intent_write_timeout')),writeTimeoutMs);
  });
  try{
   const result=await Promise.race([
    roomClient.sendIntent(current.clientSeq,current.intent),timeout
   ]);
   if(mark===current&&delivery===attempt&&!stopped&&pending===current&&result.ok===false){
    onError(new Error('intent_write_rejected: '+result.reason));
   }
   return result;
  }catch(error){
   if(!stopped&&pending===current)onError(error);
   return {ok:false,reason:error.message||String(error)};
  }finally{clearTimeout(timeoutId);}
 }
 function sendNormalized(intent){
  const command={clientSeq:acked+1,intent};
  pending=command;
  // Some transports deliver and ACK immediately; never reread pending here.
  void deliver(command);
  return {ok:true,queued:false,clientSeq:command.clientSeq};
 }
 function flushQueue(){
  if(!stopped&&deliveryEnabled&&started&&revision>=0&&!pending&&queue.length){
   const next=queue.shift();
   sendNormalized(next);
  }
 }
 function enqueue(intent){
  check();
  if(!started||revision<0)return {ok:false,reason:'awaiting_initial_state'};
  if(!deliveryEnabled)return {ok:false,reason:'connection_paused'};
  const normalized=normalizeMatchCommand(1,intent);
  if(!pending&&!queue.length)return sendNormalized(normalized);
  if(queue.length>=maxQueuedInputs)return {ok:false,reason:'input_buffer_full'};
  queue.push(normalized);
  return {ok:true,queued:true,position:queue.length};
 }
 // All inbound snapshots, including a direct initial fetch, MUST pass the
 // same monotonic revision, session and ACK checks. This avoids the guest
 // waiting forever if its first Realtime notification/poll is delayed.
 function receiveSnapshot(packet){
   if(stopped||packet.session!==initialSession||packet.revision<=revision)return;
   const state=packet.state,seq=state.clientSequences?.[1];
   if(!isInteger(seq))return;
   if(seq<acked)return;
   acked=seq;revision=state.revision;
   latestState=clone(state);
   if(pending&&seq>=pending.clientSeq){
    const received=pending;pending=null;
    const verdict=state.lastCommandOutcomes?.[1];
    const matched=verdict?.clientSeq===received.clientSeq;
    // ack means the authoritative host consumed this sequence. A legal
    // command may nonetheless fail its game rule (e.g. wheel cooldown).
    // Never call a missing / stale verdict successful.
    const applied=matched&&typeof verdict.applied==='boolean'?
      verdict.applied:null;
    onAck({clientSeq:received.clientSeq,revision,accepted:true,
      applied,commandType:received.intent.type,
      ...(matched&&received.intent.type==='chargeInput'&&
         typeof verdict.completed==='boolean'?
        {completed:verdict.completed}:{}),
      ...(matched&&verdict.reason?{reason:verdict.reason}:{}),
      ...(matched&&Number.isFinite(verdict.remainingMs)?
       {remainingMs:verdict.remainingMs}:{})});
   }
   onSnapshot(clone(state));
   // Drain exactly one input per authoritative ACK, preserving tap order.
   flushQueue();
  }
 function start(){
  check();
  if(started)throw new Error('guest session already started');
  started=true;
  unsub=roomClient.subscribeSnapshots(receiveSnapshot);
  // Bootstrap the existing in-page match from the authoritative database
  // once, independently of the Postgres Changes subscription and poll loop.
  // This is NOT a browser-reload restore: the host and guest are already in
  // the same live room. Delayed/stale fetches cannot roll back newer updates.
  if(typeof roomClient.readPublishedSnapshot==='function'){
    void Promise.resolve().then(()=>roomClient.readPublishedSnapshot())
     .then(state=>{
       if(state&&!stopped&&started)receiveSnapshot({
         session:initialSession,revision:state.revision,state
       });
     }).catch(error=>{if(!stopped)onError(error);});
  }
  return {ok:true};
 }
 function submit(intent){
  check();
  if(!started||revision<0)return {ok:false,reason:'awaiting_initial_state'};
  if(!deliveryEnabled)return {ok:false,reason:'connection_paused'};
  if(pending)return {ok:false,reason:'pending_ack',clientSeq:pending.clientSeq};
  return sendNormalized(normalizeMatchCommand(1,intent));
 }
 function retry(){
  check();
  if(!deliveryEnabled)return Promise.resolve({ok:false,reason:'connection_paused'});
  if(!pending)return Promise.resolve({ok:false,reason:'no_pending_command'});
  return deliver(pending);
 }
 /** Never replay a burst of stale touch/rotate commands after a disconnect.
  * Preserve the single in-flight seq for idempotent explicit retry after
  * presence is restored; its Firebase write may already be committed.
  * Setting false is idempotent so repeated presence events don't reset it.
  */
 function setDeliveryEnabled(enabled){
  check();
  if(typeof enabled!=='boolean')throw new TypeError('delivery switch must be boolean');
  if(deliveryEnabled===enabled)return {ok:true,enabled,dropped:0,
    pendingSequence:pending?.clientSeq??null};
  deliveryEnabled=enabled;
  const dropped=enabled?0:queue.length;
  if(!enabled)queue=[];
  // Do not auto-resend the in-flight write; on reconnect the player may
  // press Retry with the SAME seq, after reviewing the authoritative view.
  return {ok:true,enabled,dropped,pendingSequence:pending?.clientSeq??null};
 }
 function stop(){stopped=true;queue=[];unsub?.();unsub=null;}
 function status(){return {started,stopped,revision,acked,pendingSequence:pending?.clientSeq??null,
  deliveryEnabled,queuedInputs:queue.length,lastState:latestState===null?null:clone(latestState)};}
 return {start,submit,enqueue,retry,setDeliveryEnabled,stop,status};
}
