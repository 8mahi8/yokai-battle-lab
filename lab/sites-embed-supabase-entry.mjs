/**
 * Phase24-B: one pasteable Sites snippet for two seats; cloud config is
 * build-time opt-in. Default generated HTML never authenticates or contacts
 * a server. Emulator-specific preview is hard blocked outside localhost.
 *
 * No production Supabase project, credentials or Rules are bundled here.
 */
import {createSupabaseRoomClient} from '../network/supabase-room.mjs';
import {createFirebaseMatchHost,createFirebaseMatchGuest} from '../network/firebase-match.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createMatchStage} from '../ui/match-stage.mjs';
import {matchAckMessage} from '../ui/match-feedback.mjs';
import {createHostAutoClock} from '../ui/host-auto-clock.mjs';
import {checkSitesBrowserCapabilities} from '../ui/sites-browser-capabilities.mjs';

const config=__YW_SUPABASE_CONFIG__;
const root=document.getElementById('yw-sites-online');
if(!root)throw Error('online embed root not found');
const $=selector=>root.querySelector(selector);
let client=null,room=null,match=null,stage=null,seat=null,autoClock=null;
let localConnected=false,peerConnected=null,lastAvailable=false;
const say=message=>{
 $('.yw-online-status').textContent=String(message);
 if(stage)stage.alert(String(message));
};
function err(error){
 say('通信エラー：'+(error?.message||String(error)));
 updatePresence();
}
const connected=()=>localConnected&&peerConnected===true;
function canHostAdvance(){
 const state=match?.status?.();
 return seat===0&&connected()&&!document.hidden&&state?.started===true&&
  !state.dirty&&!state.fenced&&!state.stopped&&
  state.lastPublished>=state.revision&&match.snapshot().game.winner===null;
}
function updateAutoButton(){
 const button=$('.yw-online-auto');
 if(!button)return;
 if(seat!==0){button.hidden=true;return;}
 button.hidden=false;
 const enabled=autoClock?.status().enabled===true;
 const canStep=canHostAdvance();
 button.disabled=!enabled&&!canStep;
 button.textContent=enabled?(canStep?'自動進行 ON':'自動進行 一時停止'):'自動進行 OFF';
 button.setAttribute('aria-pressed',String(enabled));
}
function updatePresence(){
 const ready=connected(),reconnected=ready&&!lastAvailable;
 lastAvailable=ready;
 $('.yw-online-presence').textContent=!localConnected?'オフライン':
  peerConnected===true?'相手と接続中':peerConnected===false?'相手が切断':'相手の接続待ち';
 if(stage)stage.setConnection(ready?'2P ONLINE':'2P PAUSE');
 if(seat===1&&match?.setDeliveryEnabled){
  const update=match.setDeliveryEnabled(ready);
  if(update.dropped>0)say('回線断で未送信'+update.dropped+'件を破棄しました。送信済み操作はACK待ちです。');
 }
 if(seat===0&&reconnected&&match?.status?.().started&&match.status().dirty){
  void match.retryPublish().then(result=>{
   if(!result.ok)err(new Error(result.error||'snapshot_publish_failed'));
   updatePresence();
  }).catch(err);
 }
 const status=match?.status?.();
 $('.yw-online-retry').textContent=seat===0?'未反映の戦況を再送':'未確定入力を再送';
 $('.yw-online-retry').disabled=!ready||!status||
  (seat===0?!status.started||!status.dirty:
   seat!==1||!status.pendingSequence);
 updateAutoButton();
}
function guard(){
 return !localConnected?{ok:false,reason:'connection_offline'}:
  peerConnected!==true?{ok:false,reason:'opponent_offline_or_waiting'}:null;
}
function setupSeat(role){
 seat=role;
 $('.yw-online-role').textContent=(role===0?'ホスト':'ゲスト')+' / 部屋 '+room.active().roomCode;
 $('.yw-online-make').disabled=true;
 $('.yw-online-join').disabled=true;
 $('.yw-online-start').disabled=role!==0;
 $('.yw-online-connect').disabled=role!==1;
 stage=createMatchStage({element:$('#battle-stage'),seat:role,onError:err,
  onAction:(_side,intent)=>{
   if(!match)return {ok:false,reason:'battle_not_started'};
   const blocked=guard();if(blocked)return blocked;
   const receipt=role===0?match.submit(intent):match.enqueue(intent);
   updatePresence();return receipt;
  },
  onStep:()=>({ok:false,reason:'online_research_step_disabled'})});
 // In actual online Sites embeds the research-only manual turn button is not
 // a gameplay command; the host clock owns autonomous actions exclusively.
 const debugStep=$('#mb-step');
 if(debugStep){debugStep.hidden=true;debugStep.setAttribute('aria-hidden','true');}
 if(role===0){
  autoClock=createHostAutoClock({
   step:()=>match.advanceAuto(),
   canAdvance:canHostAdvance,
   getWinner:()=>match?.snapshot().game.winner??null,
   intervalMs:1500,onUpdate:updateAutoButton,onError:err
  });
 }else autoClock=null;
 room.watchPresence(v=>{localConnected=v;updatePresence();});
 room.watchPeerPresence(v=>{peerConnected=v;updatePresence();});
 updatePresence();
}
$('.yw-online-make').addEventListener('click',async()=>{
 try{
  const result=await room.createRoom();
  if(!result.ok)throw Error(result.reason);
  setupSeat(0);say('部屋番号 '+result.code+' を相手へ伝えてください。');
 }catch(error){err(error);}
});
$('.yw-online-join').addEventListener('click',async()=>{
 try{
  const result=await room.joinRoom($('.yw-online-code').value.trim());
  if(!result.ok)throw Error(result.reason);
  setupSeat(1);say('参加しました。ホストの試合開始後に「戦闘接続」を押してください。');
 }catch(error){err(error);}
});
$('.yw-online-start').addEventListener('click',async()=>{
 try{
  const begun=await room.startRoom();if(!begun.ok)throw Error(begun.reason);
  match=createFirebaseMatchHost({roomClient:room,
   protocol:createMatchProtocol({battleOptions:{playtestSoulTuning:true}}),
   onSnapshot:s=>{stage.render(s);updatePresence();},onError:err});
  const initial=await match.start();
  if(!initial.ok)throw Error(initial.reason||initial.error||'snapshot_publish_failed');
  $('.yw-online-start').disabled=true;
  say('ホスト開始。ゲストの戦闘接続を待っています。');updatePresence();
 }catch(error){err(error);}
});
$('.yw-online-connect').addEventListener('click',async()=>{
 try{
  if(!room)throw Error('部屋未参加');
   const phase=await room.readPhase();
  if(phase!=='playing')throw Error('ホストがまだ開始していません');
  match=createFirebaseMatchGuest({roomClient:room,
   onSnapshot:s=>{stage.render(s);updatePresence();},
   onAck:result=>{say(matchAckMessage(result));updatePresence();},
   onError:err});
  match.start();
  $('.yw-online-connect').disabled=true;
  say('ゲスト接続。ホストの初期状態を待っています。');updatePresence();
 }catch(error){err(error);}
});
// 1500 ms is only a research-pilot cadence, NOT the Nintendo 3DS step timing.
// A human host enables it deliberately after both peers have joined.
$('.yw-online-auto').addEventListener('click',()=>{
 try{
  if(seat!==0||!autoClock)throw Error('自動進行はホスト専用です');
  if(autoClock.status().enabled){autoClock.stop();say('自動進行 OFF');}
  else{
   const state=autoClock.start();
   if(!state.ok)throw Error(state.reason||'auto_clock_unavailable');
   say('研究用の自動進行を開始しました。切断時は一時停止します。');
  }
  updateAutoButton();
 }catch(error){err(error);}
});
document.addEventListener('visibilitychange',updateAutoButton);
$('.yw-online-retry').addEventListener('click',async()=>{
 try{
  if(!match)throw Error('対戦未開始');
  const blocked=guard();if(blocked)throw Error(blocked.reason);
  if(seat===0){
   if(!match.status().dirty)throw Error('再配信する戦況なし');
   const result=await match.retryPublish();
   if(!result.ok)throw Error(result.error||'snapshot_publish_failed');
   say('最新の戦況を再配信しました。');
  }else if(seat===1){
   const result=await match.retry();
   if(!result.ok)throw Error(result.reason);
   say('同じ操作番号を再送しました。');
  }
  updatePresence();
 }catch(error){err(error);}
});
async function init(){
 if(!config){
  say('接続設定が未登録です。オンライン通信を行わない確認用ビルドです。');
  return;
 }
 const capability=checkSitesBrowserCapabilities(window);
 if(!capability.ok)
  throw Error('このブラウザではオンライン対戦を開始できません：'+capability.message);
 if(!window.supabase?.createClient)
  throw Error('Supabase SDKを読み込めません。学校のネットワーク制限を確認してください');
 if(config.projectRef!=='itqimlgnrjikaamstdlp'||
    config.url!=='https://itqimlgnrjikaamstdlp.supabase.co'||
    !/^sb_publishable_/.test(config.publishableKey))
  throw Error('接続設定が正しくありません');
 client=window.supabase.createClient(config.url,config.publishableKey,{
   auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}
 });
 const {data,error:authError}=await client.auth.signInAnonymously();
 if(authError||!data?.user?.id){
  const disabled=String(authError?.message||'').toLowerCase().includes('anonymous sign-ins are disabled');
  throw Error(disabled?
   'このSupabaseでは匿名ログインが無効です。管理者がAuthのAnonymousを有効にするまで部屋を作成できません。':
   '匿名認証できません：'+(authError?.message||'接続設定が未完了です'));
 }
 room=createSupabaseRoomClient({client,uid:data.user.id,onError:err});
 $('.yw-online-make').disabled=false;
 $('.yw-online-join').disabled=false;
 say('Supabase匿名認証OK。2席の接続準備ができました。');
}
init().catch(err);
