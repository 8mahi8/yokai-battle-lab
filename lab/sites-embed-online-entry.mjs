/**
 * Phase24-B: one pasteable Sites snippet for two seats; cloud config is
 * build-time opt-in. Default generated HTML never authenticates or contacts
 * a server. Emulator-specific preview is hard blocked outside localhost.
 *
 * No production Firebase project, credentials or Rules are bundled here.
 */
import {createFirebaseRoomClient} from '../network/firebase-room.mjs';
import {createFirebaseMatchHost,createFirebaseMatchGuest} from '../network/firebase-match.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createMatchStage} from '../ui/match-stage.mjs';
import {matchAckMessage} from '../ui/match-feedback.mjs';
import {createHostAutoClock} from '../ui/host-auto-clock.mjs';
import {checkSitesBrowserCapabilities} from '../ui/sites-browser-capabilities.mjs';

const config=__YW_ONLINE_CONFIG__;
/**
 * Phase37 friend-only Firebase mode: same BRAWL/Shokoku project, no
 * Firebase Authentication, no Google sign-in, no anonymous signup.
 * This ID is a per-page client label, NOT proof of identity. RTDB
 * rules must explicitly support friend-mode and cannot authenticate it.
 */
function makeFriendClientId(){
 if(!window.crypto?.getRandomValues)throw Error('参加者ID用の安全な乱数が利用できません');
 const bytes=new Uint8Array(16);
 window.crypto.getRandomValues(bytes);
 return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
}
const root=document.getElementById('yw-sites-online');
if(!root)throw Error('online embed root not found');
const $=selector=>root.querySelector(selector);
let database=null,room=null,match=null,stage=null,seat=null,autoClock=null;
let localConnected=false,peerConnected=null,lastAvailable=false;
let friendsAutoStarted=false; // one-time automatic start; user pause stays paused
let friendsGuestConnectPending=false; // guards repeated Firebase phase events
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
 button.textContent=__YW_FRIENDS_MODE__?
  (enabled?(canStep?'戦闘進行中・一時停止':'戦闘一時停止中'):'戦闘を再開'):
  (enabled?(canStep?'自動進行 ON':'自動進行 一時停止'):'自動進行 OFF');
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
 // School-friends PvP should not depend on a second, non-original
 // manual "auto advance ON" action after both players are connected.
 // Start only once after the authoritative initial snapshot is published;
 // explicitly pausing the game never silently re-enables it.
 if(__YW_FRIENDS_MODE__&&seat===0&&!friendsAutoStarted&&autoClock&&
   canHostAdvance()){
  const started=autoClock.start();
  if(started.ok)friendsAutoStarted=true;
 }
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
  friendsAutoStarted=false;
  autoClock=createHostAutoClock({
   step:()=>match.advanceAuto(),
   canAdvance:canHostAdvance,
   getWinner:()=>match?.snapshot().game.winner??null,
   intervalMs:2600,onUpdate:updateAutoButton,onError:err
  });
 }else autoClock=null;
 if(__YW_FRIENDS_MODE__&&role===1){
  // On a friend-only match, join + host start is enough. The 3DS-style
  // battle should not demand a hidden extra "connect to battle" tap.
  const phaseRef=database.ref('yokaiRoomsV1/'+room.active().roomCode+'/phase');
  phaseRef.on('value',snapshot=>{
   if(seat===1&&!match&&snapshot.val()==='playing')
    void connectGuestMatch();
  },err);
 }
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
  setupSeat(1);say(__YW_FRIENDS_MODE__?
   '参加しました。ホストが試合開始すると自動で戦闘に入ります。':
   '参加しました。ホストの試合開始後に「戦闘接続」を押してください。');
 }catch(error){err(error);}
});
$('.yw-online-start').addEventListener('click',async()=>{
 try{
  const begun=await room.startRoom();if(!begun.ok)throw Error(begun.reason);
  match=createFirebaseMatchHost({roomClient:room,protocol:createMatchProtocol({battleOptions:__YW_FRIENDS_MODE__?{playtestSoulTuning:true,enableLoafing:true}:{}}),
   onSnapshot:s=>{stage.render(s);updatePresence();},onError:err});
  const initial=await match.start();
  if(!initial.ok)throw Error(initial.reason||initial.error||'snapshot_publish_failed');
  $('.yw-online-start').disabled=true;
  say('ホスト開始。ゲストの戦闘接続を待っています。'+
   (__YW_FRIENDS_MODE__?' 2人が接続すると戦闘が自動で進みます。':''));updatePresence();
 }catch(error){err(error);}
});
async function connectGuestMatch(){
 if(seat!==1||match||friendsGuestConnectPending)return;
 friendsGuestConnectPending=true;
 try{
  if(!room)throw Error('部屋未参加');
  const code=room.active().roomCode;
  const phase=(await database.ref('yokaiRoomsV1/'+code+'/phase').once('value')).val();
  if(phase!=='playing')throw Error('ホストがまだ開始していません');
  if(match)return;
  const next=createFirebaseMatchGuest({roomClient:room,
   onSnapshot:s=>{stage.render(s);updatePresence();},
   onAck:result=>{say(matchAckMessage(result));updatePresence();},
   onError:err});
  next.start();
  match=next;
  $('.yw-online-connect').disabled=true;
  say(__YW_FRIENDS_MODE__?'対戦に自動接続しました。戦況を受信しています。':
   'ゲスト接続。ホストの初期状態を待っています。');
  updatePresence();
 }catch(error){err(error);}
 finally{friendsGuestConnectPending=false;}
}
$('.yw-online-connect').addEventListener('click',()=>{void connectGuestMatch();});
// 2600 ms is a school-observed readability trial, NOT original frame timing., NOT the Nintendo 3DS step timing.
// A human host enables it deliberately after both peers have joined.
$('.yw-online-auto').addEventListener('click',()=>{
 try{
  if(seat!==0||!autoClock)throw Error('自動進行はホスト専用です');
  if(autoClock.status().enabled){
   autoClock.stop();
   say(__YW_FRIENDS_MODE__?'戦闘を一時停止しました。再開するには「戦闘を再開」を押してください。':
    '自動進行 OFF');
  }
  else{
   const state=autoClock.start();
   if(!state.ok)throw Error(state.reason||'auto_clock_unavailable');
   say(__YW_FRIENDS_MODE__?'戦闘を再開しました。切断中は自動的に一時停止します。':
     '研究用の自動進行を開始しました。切断時は一時停止します。');
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
 if(__YW_EMULATOR_MODE__&&!['localhost','127.0.0.1'].includes(location.hostname))
  throw Error('研究用エミュレーター版はlocalhost以外で起動禁止');
 const capability=checkSitesBrowserCapabilities(window);
 if(!capability.ok)
  throw Error('このブラウザではオンライン対戦を開始できません：'+capability.message);
 if(!window.firebase?.database||(!__YW_FRIENDS_MODE__&&!window.firebase?.auth))
  throw Error('Firebase SDKが読み込まれていません');
 if(__YW_FRIENDS_MODE__&&
   (!config||config.databaseURL!=='https://mygame-df915-default-rtdb.firebaseio.com/'&&
     !__YW_EMULATOR_MODE__))
  throw Error('友達対戦用の接続先が不正です');
 const app=firebase.initializeApp(config);
 if(__YW_EMULATOR_MODE__){
  if(!__YW_FRIENDS_MODE__)
   app.auth().useEmulator('http://127.0.0.1:9099',{disableWarnings:true});
  app.database().useEmulator('127.0.0.1',9000);
 }
 let uid;
 if(__YW_FRIENDS_MODE__){
  uid=makeFriendClientId();
 }else{
  const auth=app.auth();
  await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
  const signedIn=await auth.signInAnonymously();
  uid=signedIn.user.uid;
 }
 database=app.database();
 // Confirm the SDK has connected before enabling room buttons. No room read
 // is performed here, so an existing game cannot be modified accidentally.
 room=createFirebaseRoomClient({database,uid,onError:err});
 $('.yw-online-make').disabled=false;
 $('.yw-online-join').disabled=false;
 say(__YW_FRIENDS_MODE__?
  'Firebase友達対戦：認証不要。6桁のルーム番号で遊べます。':
  __YW_EMULATOR_MODE__?'ローカルFirebase試験版：匿名認証OK。2席で部屋を作成してください。':
  '匿名認証OK。2席の接続準備ができました。');
}
init().catch(err);
