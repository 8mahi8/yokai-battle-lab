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
function applyCommand(game,side,cmd,{rotationAtMs=0}={}){
 switch(cmd.type){
  case 'rotate':return game.rotate(side,cmd.direction,rotationAtMs);
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
 const allow=new Set(['seed','teams','autoRotateReserves','enableLoafing','rotationCooldownMs',
  'researchSoulRecoveryMode','researchDamageModel','researchMultiHit',
  'researchStatInspirits','researchTurnInspirits','researchHealingVariance','researchSpecialEffects',
  'playtestSoulTuning']);
 for(const key of Object.keys(options))if(!allow.has(key))
  throw new RangeError('initial online contract forbids option '+key);
 // The user-approved playtest option is a boolean; individual gain values
 // live in the fixed, auditable preset file and never in network commands.
 if(options.playtestSoulTuning!==undefined&&typeof options.playtestSoulTuning!=='boolean')
  throw new TypeError('playtestSoulTuning must be boolean');
 // Direct debugging / bypass values and lab Soul fixtures are not exposed.
 if(options.researchSoulRecoveryMode!==undefined&&
    !['none','owner-nonattack'].includes(options.researchSoulRecoveryMode))
  throw new RangeError('unknown owner Soul mode');
}
export function createMatchProtocol({battleOptions={},hostNowMs=()=>performance.now()}={}){
 checkOptions(battleOptions);
 // Host-side monotonic clock only; the network command never supplies a
 // timestamp. When the 3-second research mode is OFF, no wall time is read.
 if(typeof hostNowMs!=='function')throw new TypeError('trusted host clock required');
 // The no-attack +5 owner-turn recovery is the one Soul-gain amount
 // supported by direct YW2 player experiments. Attacking gain remains
 // unverified; the friendly-match Sites build opts into a labelled temporary
 // playtest preset while the research default remains unchanged.
 // Phase20 source-audited integration:
 // Standard attack/technique HP now uses the Phase9 YW2 formula study, while
 // Phase10 processes separate hit/critical/interruption rolls when the
 // configured rental move actually has N>1 hits. Both have been independently
 // researched and tested. Exact move power, hit chance modifiers, individual
 // rental stats and ±random rounding are NOT guaranteed original parity.
 //
 // Original-style stat-down Inspirits are independent of speculative HP-loss.
 // Keep speculative own-turn HP-loss 5% scaling, healing base/variance and
 // incomplete no-motion counter windows disabled. Allow explicit overrides
 // for controlled legacy comparisons and seeded journal reproduction.
 // Soultimates remain separately flagged research-fixture (not original moves).
 // Preserve earlier explicit legacy comparisons: turning OFF the YW2
 // damage model also defaults its dependent stat research OFF unless the
 // caller explicitly requests an invalid combination (which must throw).
 // Official-rule PvP: use the researched 3s wheel rotation lock in
 // real standard matches. The exact original frame origin remains unknown;
 // the authoritative browser host applies a per-seat monotonic timestamp.
 // Explicit rotationCooldownMs:0 remains available for legacy lab studies.
 const options=clone({rotationCooldownMs:3000,
   researchSoulRecoveryMode:'owner-nonattack',
   researchDamageModel:true,researchMultiHit:true,
   researchStatInspirits:battleOptions.researchDamageModel===false?false:true,
   researchSpecialEffects:true,...battleOptions});
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
  // Capture time only AFTER duplicate/stale/gap checks so a retransmission
  // cannot shift the wheel cooldown. The journal must record the exact
  // trusted timestamp used, enabling byte-for-byte deterministic replay.
  let hostRotationAtMs=null;
  if(command.type==='rotate'&&options.rotationCooldownMs>0){
   hostRotationAtMs=hostNowMs();
   if(!Number.isFinite(hostRotationAtMs)||hostRotationAtMs<0)
    return {ok:false,reason:'invalid_host_clock'};
  }
  try{result=applyCommand(game,side,command,
   {rotationAtMs:hostRotationAtMs??0});}
  catch(error){result={ok:false,reason:'rule_exception',detail:error.message};}
  if(!plain(result))result={ok:true,result:result??null};
  sequence[side]=clientSeq;
  const event=append({kind:'player',side,clientSeq,command,result:clone(result),
   ...(hostRotationAtMs===null?{}:{hostRotationAtMs})});
  const receipt={ok:result.ok!==false,accepted:true,side,clientSeq,
    revision:event.revision,hash:event.hash,result:clone(result)};
  lastReceipt[side]={commandJson:raw,commandType:command.type,receipt:clone(receipt)};
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
  // Model-based next-action forecast for both browser seats. These values are
  // provisional and may change after rotation, KO or status effects.
  return clone({version:VERSION,revision,clientSequences:sequence,
    // A revision is a transport ACK, not proof the rule action succeeded.
    // Each side only needs its latest result: guests use stop-and-wait, so
    // a rejected wheel rotation cannot silently look successful.
    lastCommandOutcomes:lastReceipt.map(last=>last?{
      clientSeq:last.receipt.clientSeq,commandType:last.commandType,
      applied:last.receipt.result?.ok!==false,
      // Phase22C: transport ACK alone never means the Soultimate fired.
      // Only the authoritative result of the FINAL valid touch may state
      // that charge input completed. Do not invent success for old/unknown
      // receipts, non-charge commands or rejected gestures.
      ...(last.commandType==='chargeInput'&&
         typeof last.receipt.result?.completed==='boolean'?
        {completed:last.receipt.result.completed}:{}),
      ...(last.receipt.result?.reason?{reason:last.receipt.result.reason}:{}),
      ...(Number.isFinite(last.receipt.result?.remainingMs)?
        {remainingMs:last.receipt.result.remainingMs}:{})
    }:null),
    hash:stateFingerprint(game.snapshot()),forecast:game.preview(5),game:game.snapshot()});
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
 // Event times are already trusted host observations from the original run.
 // A replay must NEVER consult its current physical clock.
 let replayRotationAtMs=0;
 try{match=createMatchProtocol({battleOptions:exported.initialOptions,
  hostNowMs:()=>replayRotationAtMs});}
 catch(error){return {ok:false,reason:'invalid_initial_options'};}
 for(let i=0;i<exported.entries.length;i++){
  const saved=exported.entries[i];
  if(!plain(saved)||!['auto','player'].includes(saved.kind))
   return {ok:false,reason:'invalid_event',index:i};
  if(saved.kind==='player'&&saved.command?.type==='rotate'&&
     exported.initialOptions.rotationCooldownMs>0){
   if(!Number.isFinite(saved.hostRotationAtMs)||saved.hostRotationAtMs<0)
    return {ok:false,reason:'invalid_replay_host_time',index:i};
   replayRotationAtMs=saved.hostRotationAtMs;
  }
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
