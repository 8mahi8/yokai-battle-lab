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
import {RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchStage} from '../ui/match-stage.mjs';
import {matchAckMessage} from '../ui/match-feedback.mjs';
import {createHostAutoClock} from '../ui/host-auto-clock.mjs';
import {checkSitesBrowserCapabilities} from '../ui/sites-browser-capabilities.mjs';

const config=__YW_ONLINE_CONFIG__;
/**
 * V3-4-22 emulator FRIENDS QA only. Compare the two iframe realms via
 * performance.timeOrigin + performance.now() inside ONE Chromium browser.
 * This measures listener->stage render, NOT Internet RTT or 2-iPad clock sync.
 * Esbuild removes every probe from the school --friends production bundle.
 */
// Local-only E2E: ?charge and ?gcharge use the existing canonical guard/
// 5-Soul fixture. ?purify uses an enemy negative-Inspirit fixture but the
// real MatchProtocol must cast it and the guest must cure it by touch.
// These are NOT school balance changes or original 3DS numbers. A srcdoc's parent opt-in is readable
// only in our localhost emulator, with build-time flags for dead-code removal.
const chargeQaMode=__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__&&(()=>{
 try{return location.href==='about:srcdoc'&&window.parent!==window&&
  ['?charge','?gcharge'].includes(window.parent.location.search);}catch{return false;}
})();
const purifyQaMode=__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__&&(()=>{
 try{return location.href==='about:srcdoc'&&window.parent!==window&&
  window.parent.location.search==='?purify';}catch{return false;}
})();
// Reproduce a whole 6v6 with actual Host action, KO, reserve replacement,
// and seat-specific result; HP/power are explicitly local QA ONLY.
const fullMatchQaMode=__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__&&(()=>{
 try{return location.href==='about:srcdoc'&&window.parent!==window&&
  window.parent.location.search==='?fullmatch';}catch{return false;}
})();
// One continuous room: negative Inspirit, guest Purify, normal special,
// legal reserve wheel swaps, Zero G, true KO/winner. All initial QA data only.
const oneGameQaMode=__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__&&(()=>{
 try{return location.href==='about:srcdoc'&&window.parent!==window&&
  window.parent.location.search==='?onegame';}catch{return false;}
})();
const touchQaMode=chargeQaMode||purifyQaMode||fullMatchQaMode||oneGameQaMode;
const motionTimingQa=__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__?[]:null;
let lastTimedActionId=0;
if(__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__)
 window.__ywMotionTimingTrace=motionTimingQa;
const motionClock=()=>performance.timeOrigin+performance.now();
function renderConfirmedSnapshot(state){
 if(!motionTimingQa){
  stage.render(state);updatePresence();return;
 }
 const actions=(state?.game?.events||[]).filter(e=>e?.type==='action'&&
  Number.isSafeInteger(e.eventId)&&e.eventId>0);
 const newest=actions.at(-1);
 let sample=null;
 if(newest&&newest.eventId>lastTimedActionId){
  const newCount=actions.filter(e=>e.eventId>lastTimedActionId).length;
  lastTimedActionId=newest.eventId;
  sample={eventId:newest.eventId,revision:state.revision,
   actionsInDelivery:newCount,receivedAt:motionClock()};
  motionTimingQa.push(sample);
  if(motionTimingQa.length>64)motionTimingQa.shift();
 }
 stage.render(state);
 if(sample){
  sample.renderedAt=motionClock();
  sample.sceneEventKey=stage.getStatus().sceneEventKey;
 }
 updatePresence();
}

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
  friendsAutoStarted=touchQaMode;
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
  // Exactly the already-tested Phase22C deterministic battle fixture.
  // Even in emulation the Host's real MatchProtocol resolves every action.
  const chargeGuard=chargeQaMode?RENTAL_SQUAD.map(unit=>({...unit,
   soulCapacity:5,weights:[0,0,0,100]})):null;
  // Purify fixture is never installed into a normal Friends match.
  // Enemy uses legitimate autonomous negative Inspirit; the guest must
  // choose a benched poisoned member and finish the real touch minigame.
  const purifyTeams=purifyQaMode?[
   RENTAL_SQUAD.map(unit=>({...unit,inspirit:'sleep',weights:[0,0,100,0]})),
   RENTAL_SQUAD.map(unit=>({...unit,weights:[0,0,0,100]}))
  ]:null;
  const fullMatchTeams=fullMatchQaMode?[
   RENTAL_SQUAD.map(unit=>({...unit,maxHp:35,defense:5,
    weights:[0,0,0,100]})),
   RENTAL_SQUAD.map(unit=>({...unit,maxHp:750,speed:450,
    strength:450,attackPower:380,weights:[100,0,0,0]}))
  ]:null;
  const oneGameTeams=oneGameQaMode?[
   RENTAL_SQUAD.map((u,i)=>({...u,maxHp:1,speed:80,
    weights:i===0?[0,0,100,0]:[0,0,0,100],inspirit:'sleep'})),
   RENTAL_SQUAD.map(u=>({...u,maxHp:700,soulCapacity:5,
    weights:[0,0,0,100]}))
  ]:null;
  const battleOptions=oneGameQaMode?{seed:12,teams:oneGameTeams,
   rotationCooldownMs:0,researchSpecialEffects:true,
   researchDamageModel:true,researchStatInspirits:true}:
   fullMatchQaMode?{seed:12,teams:fullMatchTeams,
   rotationCooldownMs:0,researchSpecialEffects:true,
   researchDamageModel:true,researchStatInspirits:true}:
   purifyQaMode?{seed:12,teams:purifyTeams,
   rotationCooldownMs:0,researchSpecialEffects:true,
   researchDamageModel:true,researchStatInspirits:true}:
   chargeQaMode?{seed:12,teams:[chargeGuard,chargeGuard],
   rotationCooldownMs:0,researchSpecialEffects:true,
   researchDamageModel:true,researchStatInspirits:true}:null;
  match=createFirebaseMatchHost({roomClient:room,protocol:touchQaMode?
   createMatchProtocol({battleOptions}):createMatchProtocol({battleOptions:__YW_FRIENDS_MODE__?{
    playtestSoulTuning:true,enableLoafing:true,
    // A finished charge must execute the six rental effects in actual
    // Friends PvP, not return effectStatus:'unimplemented' after spending Soul.
    // These are existing explicitly-labelled PLAYTEST effects (not verified
    // original 3DS power/hit odds), requiring shared stat/damage support.
    researchSpecialEffects:true,researchDamageModel:true,
    researchStatInspirits:true
   }:{}}),
   onSnapshot:s=>{renderConfirmedSnapshot(s);},onError:err});
  if(__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__&&touchQaMode){
   window.__ywFriendsChargeQa={step:()=>connected()?match.advanceAuto():
    {ok:false,reason:'peer_offline'},status:()=>match.status(),
    snapshot:()=>match.snapshot()};
  }
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
   onSnapshot:s=>{renderConfirmedSnapshot(s);},
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
 // about:srcdoc is the URL of a Google Sites-style inline HTML iframe.
 // Its same-origin LOCAL test parent may be localhost even though the
 // child location.hostname is blank. A cross-origin parent is inaccessible:
 // never let a remote site enable this test-only emulator build.
 const allowedLocalEmulatorHost=()=>{
  if(['localhost','127.0.0.1'].includes(location.hostname))return true;
  if(location.href!=='about:srcdoc'||window===window.parent)return false;
  try {
   return ['localhost','127.0.0.1'].includes(window.parent.location.hostname);
  }catch{return false;}
 };
 if(__YW_EMULATOR_MODE__&&!allowedLocalEmulatorHost())
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
