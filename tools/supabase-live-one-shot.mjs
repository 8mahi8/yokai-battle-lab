// Phase25 one-shot LIVE Supabase smoke via GitHub Actions.
// Opt-in via exact env, only two anonymous users and one short-lived room.
// Never uses service-role keys. Browser/Google Sites Safari remain untested.
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {createSupabaseRoomClient} from '../network/supabase-room.mjs';
import {createFirebaseMatchHost,createFirebaseMatchGuest}
 from '../network/firebase-match.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

if(process.env.YW_SUPABASE_LIVE_QA_APPROVED!=='1')
 throw Error('Explicit live QA opt-in required');
const config=JSON.parse(readFileSync('supabase/yw_pvp_public_config.json','utf8'));
if(config.projectRef!=='itqimlgnrjikaamstdlp'||
 !config.publishableKey?.startsWith('sb_publishable_'))
 throw Error('Live smoke config invalid');
const makeClient=()=>createClient(config.url,config.publishableKey,{
 auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}
});
const a=makeClient(),b=makeClient(),warnings=[];
const onError=e=>{warnings.push(String(e?.message||e));};
const wait=ms=>new Promise(done=>setTimeout(done,ms));
async function until(pred,label,limit=22000){
 const start=Date.now();while(Date.now()-start<limit){
  if(pred())return;await wait(250);
 }
 throw Error('Timeout in '+label+'; '+warnings.slice(-3).join('; '));
}
let host=null,guest=null,hostMatch=null,guestMatch=null;
let latestHost=null,latestGuest=null,acked=0;
let code=null;
try{
 const [aa,bb]=await Promise.all([
  a.auth.signInAnonymously(),
  b.auth.signInAnonymously()
 ]);
 if(aa.error||bb.error||!aa.data?.user?.id||!bb.data?.user?.id)
  throw Error('Supabase anonymous provider not available: '+
   (aa.error?.message||bb.error?.message||'missing UID'));
 if(aa.data.user.id===bb.data.user.id)throw Error('Anonymous sessions not distinct');
 console.log('LIVE-AUTH-PASS two distinct anonymous accounts');
 host=createSupabaseRoomClient({client:a,uid:aa.data.user.id,onError,pollMs:600});
 guest=createSupabaseRoomClient({client:b,uid:bb.data.user.id,onError,pollMs:600});
 const opened=await host.createRoom();
 if(!opened.ok)throw Error('host create failed '+opened.reason);
 code=opened.code;
 console.log('LIVE-ROOM-CODE',code,'(short-lived cleanup required)');
 const joined=await guest.joinRoom(code);
 if(!joined.ok||joined.session!==opened.session)throw Error('guest join failed '+joined.reason);
 const started=await host.startRoom();
 if(!started.ok||await guest.readPhase()!=='playing')throw Error('match start failed');
 hostMatch=createFirebaseMatchHost({
  roomClient:host,protocol:createMatchProtocol(),
  onSnapshot:s=>{latestHost=s;},onError
 });
 const hr=await hostMatch.start();
 if(!hr.ok)throw Error('host state publication failed '+(hr.reason||hr.error));
 guestMatch=createFirebaseMatchGuest({
  roomClient:guest,onSnapshot:s=>{latestGuest=s;},
  onAck:()=>{acked++;},onError
 });
 guestMatch.start();
 await until(()=>latestGuest?.revision===0,'guest initial snapshot');
 console.log('LIVE-SNAPSHOT-PASS revision 0');
 const result=guestMatch.enqueue({type:'watch',mode:'zero'});
 if(!result.ok)throw Error('guest watch input failed '+result.reason);
 await until(()=>acked>=1&&latestGuest?.revision>=1,'host authoritative ACK',25000);
 if(latestGuest.clientSequences[1]!==1)
  throw Error('host did not ACK guest clientSeq 1');
 const before=latestGuest.revision;
 const auto=hostMatch.advanceAuto();
 if(!auto.ok)throw Error('host did not advanceAuto');
 await until(()=>latestGuest?.revision>before,'host new revision delivered',25000);
 console.log('LIVE-ONLINE-1V1-PASS room/auth/join/host-only-state/guest-input/ACK/auto-turn');
}catch(error){
 console.error('LIVE-ONLINE-1V1-FAIL',error.message);
 throw error;
}finally{
 try{guestMatch?.stop();hostMatch?.stop();guest?.leaveLocal();host?.leaveLocal();}
 catch(error){console.warn('local cleanup warning',String(error?.message||error));}
 await Promise.allSettled([a.auth.signOut(),b.auth.signOut()]);
 if(code)console.log('LIVE-CLEANUP-TARGET',code);
}
