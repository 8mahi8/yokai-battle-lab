/**
 * Two-seat deterministic authoritative COMMAND ORDERING study.
 *
 * This is NOT a networking server, login, Firebase / Supabase transport,
 * anti-cheat guarantee, or a deployable Google Sites game.
 *
 * Caller must authenticate a connection and map it to side 0 or 1 ON
 * THE HOST. Never use a side claimed inside a client's JSON payload.
 * Only host advanceAuto() may cause autonomous turns; client commands
 * cannot add Soul, skip battle time, overwrite HP or force a win.
 *
 * Each seat sends monotonically increasing sequence numbers (start at 1).
 * Duplicate last request => cached ACK, no second effect; gaps/reused
 * numbers => NACK. Accepted rule-invalid commands also consume a sequence,
 * so retrying them cannot change state on a later turn.
 *
 * Full journal + deterministic seed permits reproducibility checks.
 * fnv1a32 is a quick QA fingerprint, NEVER a security MAC/hash.
 */
import {createCombat} from './combat.mjs';

const VERSION=1;
const MAX_JOURNAL=10000;
const MAX_COMMAND_JSON=500;
const ACTIONS=new Set([
  'rotate','pin','watch','chargeStart','chargeInput','chargeCancel',
  'purifyStart','purifyInput','purifyCancel','pokeStart','pokeInput','pokeCancel'
]);
const own=Object.prototype.hasOwnProperty;
const clone=x=>JSON.parse(JSON.stringify(x));

export function stateFingerprint(value){
 const string=JSON.stringify(value);
 let h=2166136261;
 for(let i=0;i<string.length;i++){
  h=Math.imul(h^string.charCodeAt(i),16777619)>>>0;
 }
 return h.toString(16).padStart(8,'0');
}
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);}
function exact(command,keys){
 if(!plain(command)||Object.keys(command).sort().join('|')!==keys.sort().join('|'))
  throw new TypeError('unexpected command fields');
}
function idOf(x,side=null){
 if(typeof x!=='string'||!(/^[AB][1-6]$/).test(x)||
   (side!==null&&x[0]!==['A','B'][side]))
  throw new TypeError('invalid or non-owned member ID');
 return x;
}
function normalizeGesture(e){
 exact(e,['type',...(e.type==='up'?[]:['x','y'])]);
 if(!['down','move','tap','up'].includes(e.type))
  throw new RangeError('unrecognized touch gesture');
 if(e.type==='up')return {type:'up'};
 if(!Number.isFinite(e.x)||!Number.isFinite(e.y)||
   e.x<0||e.x>1||e.y<0||e.y>1)
  throw new RangeError('touch coordinates outside [0,1]');
 return {type:e.type,x:e.x,y:e.y};
}
export function normalizeMatchCommand(side,command){
 if(side!==0&&side!==1)throw new RangeError('untrusted seat');
 if(!plain(command)||!ACTIONS.has(command.type)||
   JSON.stringify(command).length>MAX_COMMAND_JSON)
  throw new TypeError('unknown or oversized action');
 const t=command.type;
 if(t==='rotate'){
  exact(command,['type','direction']);
  if(command.direction!==-1&&command.direction!==1)
   throw new RangeError('direction must be -1 or 1');
  return {type:t,direction:command.direction};
 }
 if(t==='pin'){
  exact(command,['type','targetId']);
  const targetId=command.targetId===null?null:idOf(command.targetId,1-side);
  return {type:t,targetId};
 }
 if(t==='watch'){
  exact(command,['type','mode']);
  if(!['standard','zero'].includes(command.mode))
   throw new RangeError('watch mode is not recognized');
  return {type:t,mode:command.mode};
 }
 if(['chargeStart','purifyStart'].includes(t)){
  exact(command,['type','id']);return {type:t,id:idOf(command.id,side)};
 }
 if(t==='pokeStart'){
  exact(command,['type','targetId']);
  return {type:t,targetId:idOf(command.targetId,1-side)};
 }
 if(t.endsWith('Input')){
  exact(command,['type','gesture']);return {type:t,gesture:normalizeGesture(command.gesture)};
 }
 exact(command,['type']);
 return {type:t};
}
function applyCommand(game,side,cmd){
 switch(cmd.type){
  case 'rotate':return game.rotate(side,cmd.direction);
  case 'pin':game.pin(side,cmd.targetId);return {ok:true,targetId:cmd.targetId};
  case 'watch':return {ok:true,mode:game.setWatchMode(side,cmd.mode)};
  case 'chargeStart':return game.beginGuidedCharge(side,cmd.id);
  case 'chargeInput':return game.chargeInput(side,cmd.gesture);
  case 'chargeCancel':return game.cancelGuidedCharge(side);
  case 'purifyStart':return game.beginPurify(side,cmd.id);
  case 'purifyInput':return game.purifyInput(side,cmd.gesture);
  case 'purifyCancel':return game.cancelPurify(side);
  case 'pokeStart':return game.beginPoke(side,cmd.targetId);
  case 'pokeInput':return game.pokeInput(side,cmd.gesture);
  case 'pokeCancel':return game.cancelPoke(side);
  default:throw new Error('unsupported canonical command');
 }
}
function checkOptions(options){
 if(!plain(options))throw new TypeError('initial options must be a plain object');
 // No lab injections, Flash Soul, counter timing, or other unfinished
 // competitive glitches may enter the initial online contract.
 const allow=new Set(['seed','teams','autoRotateReserves','enableLoafing',
  'researchSoulRecoveryMode','researchDamageModel','researchMultiHit',
  'researchTurnInspirits','researchHealingVariance','researchSpecialEffects']);
 for(const key of Object.keys(options))if(!allow.has(key))
  throw new RangeError('initial online contract forbids option '+key);
 // Direct debugging / bypass values and lab Soul fixtures are not exposed.
 if(options.researchSoulRecoveryMode!==undefined&&
    !['none','owner-nonattack'].includes(options.researchSoulRecoveryMode))
  throw new RangeError('unknown owner Soul mode');
}
export function createMatchProtocol({battleOptions={}}={}){
 checkOptions(battleOptions);
 const options=clone(battleOptions);
 function newBattle(){return createCombat(options);}
 const game=newBattle();
 let revision=0;
 const sequence=[0,0],lastReceipt=[null,null],journal=[];
 function append(event){
  if(journal.length>=MAX_JOURNAL)throw new RangeError('test journal limit reached');
  revision++;
  const log=clone({...event,revision,hash:stateFingerprint(game.snapshot())});
  journal.push(log);
  return log;
 }
 function dispatch(side,clientSeq,intent){
  if(side!==0&&side!==1)throw new RangeError('seat must be validated by host');
  if(!Number.isSafeInteger(clientSeq)||clientSeq<1)
   return {ok:false,reason:'invalid_client_sequence',expected:sequence[side]+1};
  // Normalize BEFORE touching replay/cache state to prohibit altered or
  // oversized retransmissions from being treated as old requests.
  let command;
  try{command=normalizeMatchCommand(side,intent);}
  catch(error){return {ok:false,reason:'invalid_command',detail:error.message};}
  const raw=JSON.stringify(command);
  if(clientSeq===sequence[side]){
   const prev=lastReceipt[side];
   if(prev&&prev.commandJson===raw)
    return {...clone(prev.receipt),duplicate:true};
   return {ok:false,reason:'sequence_conflict',expected:sequence[side]+1};
  }
  if(clientSeq<=sequence[side])
   return {ok:false,reason:'stale_sequence',expected:sequence[side]+1};
  if(clientSeq!==sequence[side]+1)
   return {ok:false,reason:'sequence_gap',expected:sequence[side]+1};
  if(journal.length>=MAX_JOURNAL)
   return {ok:false,reason:'research_journal_full'};
  let result;
  try{result=applyCommand(game,side,command);}
  catch(error){result={ok:false,reason:'rule_exception',detail:error.message};}
  if(!plain(result))result={ok:true,result:result??null};
  sequence[side]=clientSeq;
  const event=append({kind:'player',side,clientSeq,command,result:clone(result)});
  const receipt={ok:result.ok!==false,accepted:true,side,clientSeq,
    revision:event.revision,hash:event.hash,result:clone(result)};
  lastReceipt[side]={commandJson:raw,receipt:clone(receipt)};
  return clone(receipt);
 }
 function advanceAuto(){
  if(journal.length>=MAX_JOURNAL)
   return {ok:false,reason:'research_journal_full'};
  let outcome;
  try{outcome=game.step();}
  catch(error){return {ok:false,reason:'auto_step_exception',detail:error.message};}
  const event=append({kind:'auto',result:clone(outcome)});
  return {ok:true,revision:event.revision,hash:event.hash,result:clone(outcome)};
 }
 function snapshot(){
  return clone({version:VERSION,revision,clientSequences:sequence,
    hash:stateFingerprint(game.snapshot()),game:game.snapshot()});
 }
 function exportJournal(){return clone({version:VERSION,initialOptions:options,
  entries:journal,hash:stateFingerprint(game.snapshot())});}
 return {dispatch,advanceAuto,snapshot,exportJournal};
}
/**
 * Re-execute accepted host-order events. This verifies that a transcript is
 * sufficient for deterministic replay within the SAME version of this engine.
 * It is not a cryptographically authenticated replay or a net synchronizer.
 */
export function replayMatchJournal(exported){
 if(!plain(exported)||exported.version!==VERSION||
  !Array.isArray(exported.entries)||exported.entries.length>MAX_JOURNAL)
  return {ok:false,reason:'invalid_journal'};
 let match;
 try{match=createMatchProtocol({battleOptions:exported.initialOptions});}
 catch(error){return {ok:false,reason:'invalid_initial_options'};}
 for(let i=0;i<exported.entries.length;i++){
  const saved=exported.entries[i];
  if(!plain(saved)||!['auto','player'].includes(saved.kind))
   return {ok:false,reason:'invalid_event',index:i};
  const now=saved.kind==='auto'?match.advanceAuto():
   match.dispatch(saved.side,saved.clientSeq,saved.command);
  if(!now.accepted&&saved.kind==='player')
   return {ok:false,reason:'replay_command_rejected',index:i,detail:now.reason};
  if(now.revision!==saved.revision||now.hash!==saved.hash||
    JSON.stringify(now.result)!==JSON.stringify(saved.result))
   return {ok:false,reason:'replay_divergence',index:i};
 }
 const result=match.snapshot();
 if(exported.hash!==result.hash)
  return {ok:false,reason:'final_hash_mismatch'};
 return {ok:true,revision:result.revision,hash:result.hash};
}
