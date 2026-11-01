/**
 * Phase 12: transport-independent two-connection room adapter.
 *
 * SECURITY BOUNDARY: connectionId and seat are both supplied by a TRUSTED
 * transport host, never read from client JSON. The host must authenticate
 * and authorize its connections before calling connect(). This module does
 * not implement authentication, storage, matchmaking, encryption, or a public
 * network service. A player-browser host is not a trusted anti-cheat server.
 *
 * No timers, DOM, Node built-ins or external dependencies (old Safari ESM).
 */
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
 (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const keysAre = (o, names) => isObject(o) && Object.keys(o).length === names.length &&
 names.every(k => Object.prototype.hasOwnProperty.call(o,k));
const duplicate = x => JSON.parse(JSON.stringify(x));

/** Own one authoritative match. Callers must route real sockets by server ID. */
export function createMatchRelay({protocol,send,now=()=>Date.now(),
 maxInboundBytes=2048,idleTimeoutMs=30000}={}) {
 if (!protocol || !['dispatch','snapshot','advanceAuto'].every(k=>typeof protocol[k]==='function'))
  throw new TypeError('authoritative match protocol required');
 if (typeof send!=='function' || typeof now!=='function')
  throw new TypeError('send and now functions required');
 if (!Number.isSafeInteger(maxInboundBytes)||maxInboundBytes<600||maxInboundBytes>65536)
  throw new RangeError('invalid inbound cap');
 if (!Number.isFinite(idleTimeoutMs)||idleTimeoutMs<1000)
  throw new RangeError('invalid idle timeout');
 const clients = new Map(), seats = [null,null];
 const delivered = (id,message) => {
  try {send(id,duplicate(message));return true;}
  catch (_) {return false;} // dropped delivery is recovered by retry/resync
 };
 const connected = ()=>seats.map(id=>id!==null);
 const presence = ()=>{
  const packet={type:'presence',connected:connected(),revision:protocol.snapshot().revision};
  for(const id of seats)if(id!==null)delivered(id,packet);
 };
 const sendState = (id,type='snapshot') => {
  const state=protocol.snapshot(),side=clients.get(id).seat;
  const packet={type,seat:side,revision:state.revision,
   nextClientSeq:state.clientSequences[side]+1,state};
  delivered(id,packet);
  return packet;
 };
 const broadcast = () => {for(const id of seats)if(id!==null)sendState(id);};
 function connect(connectionId,seat){
  if(typeof connectionId!=='string'||connectionId.length<1||connectionId.length>128)
   throw new TypeError('trusted connection identifier required');
  if(seat!==0&&seat!==1)throw new RangeError('trusted seat required');
  if(clients.has(connectionId)||seats[seat]!==null)
   return {ok:false,reason:'seat_or_connection_in_use'};
  clients.set(connectionId,{seat,lastSeen:now()});seats[seat]=connectionId;
  sendState(connectionId,'welcome');presence();
  return {ok:true,seat};
 }
 function disconnect(connectionId){
  const client=clients.get(connectionId);
  if(!client)return false;
  clients.delete(connectionId);
  if(seats[client.seat]===connectionId)seats[client.seat]=null;
  presence();return true;
 }
 function receive(connectionId,packet){
  const client=clients.get(connectionId);
  if(!client)return {ok:false,reason:'not_connected'};
  let wire;
  try{wire=JSON.stringify(packet);}catch(_){return {ok:false,reason:'invalid_packet'};}
  if(typeof wire!=='string'||new TextEncoder().encode(wire).length>maxInboundBytes||!isObject(packet))
   return {ok:false,reason:'invalid_or_oversized_packet'};
  let action;
  if(keysAre(packet,['type'])&&(packet.type==='ping'||packet.type==='resync'))
   action=packet.type;
  else if(keysAre(packet,['type','clientSeq','intent'])&&packet.type==='command' &&
   Number.isSafeInteger(packet.clientSeq)&&packet.clientSeq>=1)
   action='command';
  else return {ok:false,reason:'invalid_packet_shape'};
  client.lastSeen=now();
  if(action==='ping'){
   delivered(connectionId,{type:'pong',revision:protocol.snapshot().revision});
   return {ok:true};
  }
  if(action==='resync'){
   sendState(connectionId);
   return {ok:true};
  }
  // Absolutely never read a seat from the incoming message. Even commands
  // with an embedded side are rejected by the match protocol itself.
  const before=protocol.snapshot().revision;
  const receipt=protocol.dispatch(client.seat,packet.clientSeq,packet.intent);
  delivered(connectionId,{type:'ack',clientSeq:packet.clientSeq,receipt});
  if(receipt.accepted && protocol.snapshot().revision>before)broadcast();
  else if(!receipt.accepted && (receipt.reason==='sequence_gap'||receipt.reason==='stale_sequence'
    ||receipt.reason==='sequence_conflict'))sendState(connectionId);
  return duplicate(receipt);
 }
 function advanceAuto(){
  const before=protocol.snapshot().revision;
  const result=protocol.advanceAuto();
  if(result.ok && protocol.snapshot().revision>before)broadcast();
  return result;
 }
 function sweep(){
  const current=now();let expired=0;
  for(const [id,client] of clients){
   if(current-client.lastSeen>=idleTimeoutMs){disconnect(id);expired++;}
  }
  return expired;
 }
 function status(){return {revision:protocol.snapshot().revision,connected:connected()};}
 return {connect,disconnect,receive,advanceAuto,sweep,status};
}

/** Single-seat browser sync. Wire it to any real ordered/unordered message bus. */
export function createMatchClientSync({send,onSnapshot=()=>{},onPresence=()=>{}}={}){
 if(typeof send!=='function'||typeof onSnapshot!=='function'||typeof onPresence!=='function')
  throw new TypeError('callbacks required');
 let seat=null,revision=-1,lastSequence=0,pending=null,hasWelcome=false;
 function transmit(packet){send(duplicate(packet));}
 function receive(packet){
  if(!isObject(packet)||typeof packet.type!=='string')
   return {ok:false,reason:'invalid_message'};
  if(packet.type==='welcome'||packet.type==='snapshot'){
   if(![0,1].includes(packet.seat)||!Number.isSafeInteger(packet.revision)||
    packet.revision<0||!Number.isSafeInteger(packet.nextClientSeq)||
    packet.nextClientSeq<1||!isObject(packet.state)||
    packet.state.revision!==packet.revision||
    !Array.isArray(packet.state.clientSequences)||
    packet.state.clientSequences[packet.seat]+1!==packet.nextClientSeq)
    return {ok:false,reason:'invalid_snapshot'};
   if(hasWelcome && packet.seat!==seat)
    return {ok:false,reason:'seat_changed'};
   // Ignore stale snapshots even when they arrive after a retransmission.
   if(packet.revision<revision)return {ok:false,reason:'stale_snapshot'};
   seat=packet.seat;hasWelcome=true;
   lastSequence=Math.max(lastSequence,packet.nextClientSeq-1);
   if(pending&&packet.nextClientSeq>pending.clientSeq)pending=null;
   const changed=packet.revision>revision;
   revision=packet.revision;
   if(changed||packet.type==='welcome')onSnapshot(duplicate(packet.state));
   return {ok:true,changed};
  }
  if(packet.type==='ack'){
   if(!pending||packet.clientSeq!==pending.clientSeq||!isObject(packet.receipt))
    return {ok:false,reason:'unexpected_ack'};
   if(packet.receipt.accepted===true){
    lastSequence=Math.max(lastSequence,pending.clientSeq);
    pending=null;
    return {ok:true,accepted:true,receipt:duplicate(packet.receipt)};
   }
   if(['sequence_gap','stale_sequence','sequence_conflict'].includes(packet.receipt.reason)){
    transmit({type:'resync'});
   }
   // Rejected schema does NOT consume a sequence: allow a fixed command.
   // Sequence-related rejections stay pending until a fresh snapshot arrives.
   if(packet.receipt.reason==='invalid_command'||
      packet.receipt.reason==='invalid_client_sequence')pending=null;
   return {ok:false,reason:packet.receipt.reason||'rejected'};
  }
  if(packet.type==='presence'&&Array.isArray(packet.connected)&&packet.connected.length===2&&
   packet.connected.every(x=>typeof x==='boolean')){
   onPresence(duplicate(packet.connected));return {ok:true};
  }
  if(packet.type==='pong')return {ok:true};
  return {ok:false,reason:'unknown_message'};
 }
 function submit(intent){
  if(!hasWelcome)return {ok:false,reason:'not_joined'};
  if(pending)return {ok:false,reason:'pending_command'};
  pending={type:'command',clientSeq:lastSequence+1,intent:duplicate(intent)};
  transmit(pending);
  return {ok:true,clientSeq:pending.clientSeq};
 }
 function retry(){if(!pending)return false;transmit(pending);return true;}
 function resync(){transmit({type:'resync'});}
 function ping(){transmit({type:'ping'});}
 function status(){return {seat,revision,lastSequence,pendingSequence:pending?.clientSeq??null,hasWelcome};}
 return {receive,submit,retry,resync,ping,status};
}
