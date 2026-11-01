/**
 * Phase24C - HOST-ONLY transport-aware auto step *pilot*.
 * 1500 ms is a deliberately tunable UI research cadence, NOT a verified YW2
 * timing constant. Never advance engine from the guest or a hidden/disconnected
 * host, and never create overlapping timer loops.
 */
export function createHostAutoClock({step,canAdvance,getWinner,
 intervalMs=1500,schedule=setInterval,cancel=clearInterval,
 onUpdate=()=>{},onError=()=>{}}={}){
 if([step,canAdvance,getWinner,schedule,cancel,onUpdate,onError].some(f=>typeof f!=='function'))
  throw new TypeError('host clock callbacks are required');
 if(!Number.isSafeInteger(intervalMs)||intervalMs<250||intervalMs>10000)
  throw new RangeError('host research clock interval must be 250..10000 ms');
 let enabled=false,disposed=false,handle=null;
 function status(){
  return {enabled,disposed,paused:enabled&&!canAdvance(),
   intervalMs,running:handle!==null};
 }
 function report(){onUpdate(status());}
 function stop(){
  if(handle!==null){cancel(handle);handle=null;}
  enabled=false;
  report();return status();
 }
 function pulse(){
  if(!enabled||disposed)return {ok:false,reason:'clock_disabled'};
  if(getWinner()!==null){stop();return {ok:false,reason:'match_finished'};}
  if(!canAdvance())return {ok:false,reason:'clock_paused'};
  try{
   const result=step();
   if(!result||result.ok!==true){
    stop();
    onError(new Error(result?.reason||'host_auto_step_failed'));
    return {ok:false,reason:result?.reason||'host_auto_step_failed'};
   }
   if(getWinner()!==null)stop();
   else report();
   return result;
  }catch(error){stop();onError(error);return {ok:false,reason:'host_auto_step_exception'};}
 }
 function start(){
  if(disposed)return {ok:false,reason:'clock_disposed'};
  if(getWinner()!==null)return {ok:false,reason:'match_finished'};
  if(!canAdvance())return {ok:false,reason:'clock_paused'};
  if(enabled)return {ok:true,...status()};
  enabled=true;
  handle=schedule(pulse,intervalMs);
  report();
  return {ok:true,...status()};
 }
 function dispose(){stop();disposed=true;}
 return {start,stop,pulse,status,report,dispose};
}
