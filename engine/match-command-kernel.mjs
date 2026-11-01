/**
 * V3-1 command boundary, extracted from the existing source-backed
 * authoritative match protocol WITHOUT changing any canonical semantics.
 *
 * Input: seat is bound by Firebase host, not trusted client JSON.
 * Output: normalized intent and the combat engine's own rule result.
 * This module owns no networking, host time, presentation or RNG.
 * Future shared match core uses this entry instead of adding UI/network
 * command-to-rule copies.
 */
const MAX_COMMAND_JSON=500;
const ACTIONS=new Set([
  'rotate','pin','watch','chargeStart','chargeInput','chargeCancel',
  'purifyStart','purifyInput','purifyCancel','pokeStart','pokeInput','pokeCancel'
]);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);

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
export function applyMatchCommand(game,side,cmd,{rotationAtMs=0}={}){
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
