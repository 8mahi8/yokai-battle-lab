/** Phase24B: actual inline Sites HTML online acceptance via Chromium srcdoc. */
import {createServer} from 'node:http';
import {runRealtimeQa} from './chrome-realtime-qa.mjs';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const friends=process.argv.includes('--emulator-friends');
const emulator=process.argv.includes('--emulator')||friends;
if(emulator&&!/^(127\.0\.0\.1|localhost):9000$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''))
 throw Error('Online Sites E2E refuses all nonlocal Firebase');
const root=fileURLToPath(new URL('../',import.meta.url));
const file=friends?'sites-online-emulator-friends-qa-code.html':
 emulator?'sites-online-emulator-qa-code.html':'sites-online-setup-code.html';
const fragment=await readFile(path.join(root,'dist',file),'utf8');
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Real Chromium required');
let qa="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\">\n<body><strong id=\"result\">ONLINE-EMBED-WAIT</strong>\n<iframe id=\"host\" style=\"width:1080px;height:750px;border:0\"></iframe>\n<iframe id=\"guest\" style=\"width:1080px;height:750px;border:0\"></iframe>\n<script>\nconst h=document.getElementById('host'),g=document.getElementById('guest');\nconst result=document.getElementById('result');\nconst doc=f=>f.contentDocument,el=(f,s)=>doc(f)?.querySelector(s);\nconst sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nconst assert=(condition,label)=>{if(!condition)throw Error(label)};\nasync function until(pred,label){\n for(let i=0;i<250;i++){if(pred())return;await sleep(90);}\n throw Error('timeout '+label+' host='+el(h,'.yw-online-status')?.textContent+\n ' guest='+el(g,'.yw-online-status')?.textContent+' guestRev='+el(g,'#mb-revision')?.textContent);\n}\n(async()=>{\n const fragment=await (await fetch('/embed')).text();\n h.srcdoc=fragment;\n if(location.search==='?setup'){\n  await until(()=>el(h,'.yw-online-status')?.textContent.includes('接続設定が未登録'),\n   'default gated status');\n  assert(el(h,'.yw-online-make').disabled,'unconfigured app incorrectly enabled room');\n  assert(doc(h).querySelectorAll('script[src],link[rel=\"stylesheet\"]').length===0,\n   'unconfigured embed included third-party SDK');\n  assert(fragment.includes('yw-sites-online'),'lost inline online controls');\n  result.textContent='SITES-ONLINE-SETUP-PASS no Firebase initialization or remote scripts without explicit config';\n  return;\n }\n g.srcdoc=fragment;\n await until(()=>el(h,'.yw-online-make')?.disabled===false&&\n  el(g,'.yw-online-join')?.disabled===false,\n  'separate anonymous Auth in two embedded iframes');\n el(h,'.yw-online-make').click();\n await until(()=>el(h,'.yw-online-role')?.textContent.includes('ホスト / 部屋'),'room created');\n const room=el(h,'.yw-online-role').textContent.match(/部屋 (\\d{6})/);\n assert(room,'6-digit match room not found');\n el(g,'.yw-online-code').value=room[1];\n el(g,'.yw-online-join').click();\n await until(()=>el(g,'.yw-online-role')?.textContent.includes('ゲスト / 部屋'),'guest joined');\n el(h,'.yw-online-start').click();\n await until(()=>el(h,'#battle-stage')?.dataset.stageReady==='true','host real battle stage');\n el(g,'.yw-online-connect').click();\n await until(()=>el(g,'#battle-stage')?.dataset.stageReady==='true','guest real battle stage');\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','both Firebase presences');\n assert(doc(g).querySelectorAll('.mb-creature').length===12,'guest missing rental 12 sprites');\n assert(doc(h).querySelectorAll('.mb-watch-command').length===4,'missing four PvP commands');\n assert(doc(h).querySelectorAll('script[src]').length===3,'online emulator needs pinned Firebase SDKs');\n assert(!doc(h).querySelector('link[rel=stylesheet]'),'CSS not inline');\n // Phase24C2: actual embedded CSS viewport, NOT an iPad Safari simulator.\n // Google Sites uses a constrained iframe: test 1024-class landscape, 820\n // split-view, narrow embed, and 390px fallback before gameplay gestures.\n for(const [width,height] of [[1024,768],[820,620],[568,520],[390,760]]){\n  g.style.width=width+'px';g.style.height=height+'px';\n  await sleep(90);\n  const d=doc(g),v=d.defaultView;\n  const root=d.documentElement,screen=el(g,'.mb-lower-screen');\n  assert(v.innerWidth===width,'wrong test iframe width '+width+' actual='+v.innerWidth);\n  assert(root.clientWidth>=width-24&&root.clientWidth<=width,\n   'wrong scrollable viewport '+width+' actual='+root.clientWidth);\n  assert(root.scrollWidth<=root.clientWidth+3,\n   'horizontal page overflow at '+width+'px: '+root.scrollWidth+' viewport='+root.clientWidth);\n  assert(!!screen&&v.getComputedStyle(screen).display!=='none',\n   'lower touch screen disappeared at '+width+'px');\n  for(const selector of ['.mb-upper-screen','.mb-lower-screen',\n   '#mb-team1 .mb-wheel','[data-rotate=\"1\"]','.mb-watch-command']){\n   const item=el(g,selector),box=item?.getBoundingClientRect();\n   assert(box&&box.width>0&&box.height>0,\n    'invisible essential component '+selector+' at '+width+'px');\n   assert(box.left>=-3&&box.right<=root.clientWidth+3,\n    'essential component clipped horizontally '+selector+' at '+width+'px');\n  }\n  // The controls must not only exist: an actual point within them must\n  // hit the intended button, even when the embed viewport is narrow.\n  for(const selector of ['[data-rotate=\"1\"]','.mb-watch-command']){\n   const button=el(g,selector);\n   button.scrollIntoView({block:'center',inline:'nearest'});\n   const r=button.getBoundingClientRect();\n   const x=r.left+r.width/2,y=r.top+r.height/2;\n   assert(x>0&&x<width&&y>0&&y<height,\n    'touch target cannot be scrolled into iframe '+selector+' at '+width+'px');\n   const hit=d.elementFromPoint(x,y);\n   assert(hit&&(hit===button||button.contains(hit)),\n    'tap on '+selector+' intercepted by '+(hit?.className||'nothing')+\n    ' at '+width+'px');\n  }\n }\n g.style.width='1080px';g.style.height='750px';\n await sleep(70);\n assert(el(h,'#mb-step')?.hidden&&el(g,'#mb-step')?.hidden,\n  'research-only manual step must be hidden from online seats');\n el(g,'[data-rotate=\"1\"]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&\n  el(h,'#mb-revision')?.textContent.includes('B 1'),'guest authoritative command ACK');\n assert(!el(g,'#mb-team1 [data-unit=\"B2\"]').classList.contains('mb-bench'),\n  'guest front did not rotate');\n assert(!el(h,'#mb-team1 [data-unit=\"B4\"]').classList.contains('mb-bench'),\n  'host front did not rotate');\n el(g,'[data-rotate=\"1\"]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 2')&&\n  el(g,'.yw-online-status')?.textContent.includes('サークルはまだ回せません'),\n  'original wheel cooldown rejected and explained');\n assert(!el(g,'#mb-team1 [data-unit=\"B2\"]').classList.contains('mb-bench'),\n  'cooldown rule wrongly rotated guest');\n assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');\n await until(()=>el(h,'.yw-online-auto')?.disabled===false,'host auto progression ready');\n el(h,'.yw-online-auto').click();\n await until(()=>Number(el(g,'#mb-turn')?.textContent)>=1,\n  'host auto progression published to remote guest without manual step');\n assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='true',\n  'host auto clock was not enabled');\n g.contentWindow.firebase.database().goOffline();\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手が切断',\n  'host peer presence disconnect');\n const before=Number(el(h,'#mb-turn').textContent);\n await sleep(1700);\n assert(Number(el(h,'#mb-turn').textContent)===before,\n  'host research loop advanced while guest offline');\n assert(el(h,'.yw-online-auto').textContent.includes('一時停止'),\n  'disconnected host must show clock paused');\n g.contentWindow.firebase.database().goOnline();\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','guest reconnected');\n await until(()=>Number(el(g,'#mb-turn')?.textContent)>before,\n  'automatic host progression resumes on same battle after reconnect');\n el(h,'.yw-online-auto').click();\n assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='false',\n  'host OFF must stop the research interval');\n const stoppedAt=Number(el(h,'#mb-turn')?.textContent);\n await sleep(1800);\n assert(Number(el(h,'#mb-turn')?.textContent)===stoppedAt,\n  'host OFF must not advance a delayed ghost timer');\n result.textContent='SITES-ONLINE-EMULATOR-PASS real two-iframe inline HTML, auth/RTDB room, authoritative ACK, host auto clock pause and resume, four embed widths';\n})().catch(error=>{result.textContent='SITES-ONLINE-FAIL '+(error.stack||error.message)});\n</script></body></html>";
// Friend mode uses the same full 2-frame real-Chromium interactions but only
// firebase-app + firebase-database. No anonymous Firebase Auth is required.
if(friends){
 qa=qa.replace(
  "assert(doc(h).querySelectorAll('script[src]').length===3,'online emulator needs pinned Firebase SDKs');",
  "assert(doc(h).querySelectorAll('script[src]').length===2,'friends build must have only app and database SDKs');"+
  "assert(typeof h.contentWindow.firebase.auth==='undefined','friend mode unexpectedly loaded Firebase Auth');");
 qa=qa.replace(
  "await until(()=>el(h,'.yw-online-auto')?.disabled===false,'host auto progression ready');\n el(h,'.yw-online-auto').click();",
  "await until(()=>el(h,'.yw-online-auto')?.getAttribute('aria-pressed')==='true','friends host automatic match start');"
 );
 qa=qa.replace(
  "el(g,'.yw-online-connect').click();",
  "await until(()=>el(g,'.yw-online-connect')?.disabled,'friends guest joined battle without extra connect tap');"
 );

 qa=qa.replace(
  "assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='true',",
  "assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='true',"
 );
 // V3-4-22: ONE Chromium browser and TWO real Firebase RTDB emulator iframe
 // listeners. Probe is compiled only into --emulator-friends, NOT --friends.
 // Absolute same-browser Performance timestamps allow pairing by host eventId.
 qa=qa.replace(
  "assert(!doc(h).querySelector('link[rel=stylesheet]'),'CSS not inline');",
  "assert(!doc(h).querySelector('link[rel=stylesheet]'),'CSS not inline');\n"+
  "const trace=f=>f.contentWindow.__ywMotionTimingTrace;\n"+
  "assert(Array.isArray(trace(h))&&Array.isArray(trace(g)),\n"+
  " 'emulator-only event trace not installed in both iframe receivers');\n"+
  "const pairs=()=>{\n"+
  " const b=new Map(trace(g).map(e=>[e.eventId,e]));\n"+
  " return trace(h).filter(a=>b.has(a.eventId))\n"+
  "  .map(a=>({eventId:a.eventId,host:a,guest:b.get(a.eventId)}));\n"+
  "};\n"
 );
 qa=qa.replace(
  "'host auto progression published to remote guest without manual step');",
  "'host auto progression published to remote guest without manual step');\n"+
  "await until(()=>pairs().length>=2,'two paired host/guest action timestamps');\n"
 );
 qa=qa.replace(
  "'automatic host progression resumes on same battle after reconnect');",
  "'automatic host progression resumes on same battle after reconnect');\n"+
  "await until(()=>pairs().length>=3,'three paired host/guest action timestamps');\n"+
  "const motionSamples=pairs().map(({eventId,host,guest})=>{\n"+
  " assert(Number.isFinite(host.receivedAt)&&Number.isFinite(guest.receivedAt),\n"+
  "  'receipt timestamp missing for event '+eventId);\n"+
  " assert(host.renderedAt>=host.receivedAt&&guest.renderedAt>=guest.receivedAt,\n"+
  "  'render finished before receipt on event '+eventId);\n"+
  " return {eventId,hostRenderMs:Math.round(host.renderedAt-host.receivedAt),\n"+
  "  guestRenderMs:Math.round(guest.renderedAt-guest.receivedAt),\n"+
  "  receiptLagMs:Math.round(guest.receivedAt-host.receivedAt),\n"+
  "  displayLagMs:Math.round(guest.renderedAt-host.renderedAt),\n"+
  "  hostSceneMatched:host.sceneEventKey==='event:'+eventId,\n"+
  "  guestSceneMatched:guest.sceneEventKey==='event:'+eventId,\n"+
  "  hostBatched:host.actionsInDelivery>1,guestBatched:guest.actionsInDelivery>1};\n"+
  "});\n"+
  "const lagValues=motionSamples.map(x=>x.displayLagMs).sort((a,b)=>a-b);\n"+
  "const motionSummary={sampleCount:motionSamples.length,\n"+
  " medianDisplayLagMs:lagValues[Math.floor(lagValues.length/2)],\n"+
  " minDisplayLagMs:lagValues[0],maxDisplayLagMs:lagValues.at(-1),\n"+
  " sameEventId:motionSamples.every(x=>x.eventId>0),samples:motionSamples.slice(0,8)};\n"+
  "assert(motionSummary.sampleCount>=3,'insufficient true host/guest event pairs');\n"+
  "window.__ywMotionTimingReport=motionSummary;\n"
 );
 qa=qa.replace('SITES-ONLINE-EMULATOR-PASS real two-iframe inline HTML, auth/RTDB',
  'SITES-FIREBASE-FRIENDS-EMULATOR-PASS real two-iframe inline HTML, no Auth/RTDB');
 qa=qa.replace(
  "result.textContent='SITES-FIREBASE-FRIENDS-EMULATOR-PASS real two-iframe inline HTML, no Auth/RTDB room, authoritative ACK, host auto clock pause and resume, four embed widths';",
  "result.textContent='SITES-FIREBASE-FRIENDS-EMULATOR-PASS real two-iframe inline HTML, no Auth/RTDB room, authoritative ACK, host auto clock pause and resume, four embed widths MOTION-METRICS '+JSON.stringify(window.__ywMotionTimingReport);"
 );
  // Firebase Friends: actual target selection after wheel cooldown rejection.
  // Same seeded host/guest room; never bypass the real game rules.
  qa=qa.replace("assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');","el(g,'#mb-target').click();\n el(g,'#mb-team0 [data-unit=A2]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 3')&&\n  el(h,'#mb-revision')?.textContent.includes('B 3'),\n  'guest pin command consumed by host and ACKed on both screens');\n assert(el(g,'#mb-team0 [data-unit=A2]').classList.contains('mb-pinned'),\n  'guest did not see pinned target after authoritative ACK');\n assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');");
  // V3-5: actual touch-like DOM commands over the real RTDB room:
  // Zero Watch / G / Poke mode, and returning to Standard. Guest cannot
  // update the Host's authoritative Watch state locally.
  qa=qa.replace(
  "assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');",
  "const watch=el(g,'#mb-team1 .mb-center-symbol');\n"+
  "assert(watch&&!watch.disabled,'guest own Watch center missing');\n"+
  "watch.click();\n"+
  "await until(()=>el(g,'#mb-revision')?.textContent.includes('B 4')&&\n"+
  " el(h,'#mb-revision')?.textContent.includes('B 4'),\n"+
  " 'Zero Watch change not host ACKed on both seats');\n"+
  "assert(el(g,'#mb-target span').textContent==='つつく'&&\n"+
  " el(g,'#mb-charge span').textContent==='Gわざ',\n"+
  " 'guest Zero Watch commands not visible');\n"+
  "assert(el(h,'#mb-team1 .mb-center-symbol').textContent==='零式',\n"+
  " 'host failed to mirror guest Watch mode');\n"+
  "el(g,'#mb-target').click();\n"+
  "assert(el(g,'#mb-choice-status').textContent.includes('つつく')&&\n"+
  " el(g,'#mb-target').getAttribute('aria-pressed')==='true',\n"+
  " 'Zero Watch Poke target mode missing');\n"+
  "el(g,'#mb-mode-cancel').click();\n"+
  "el(g,'#mb-team1 .mb-center-symbol').click();\n"+
  "await until(()=>el(g,'#mb-revision')?.textContent.includes('B 5')&&\n"+
  " el(h,'#mb-revision')?.textContent.includes('B 5'),\n"+
  " 'return to Standard Watch not host ACKed on both seats');\n"+
  "assert(el(g,'#mb-target span').textContent==='ねらう'&&\n"+
  " el(g,'#mb-charge span').textContent==='わざ',\n"+
  " 'guest Standard Watch commands not restored');\n"+
  "assert(el(h,'#mb-team1 .mb-center-symbol').textContent==='標準',\n"+
  " 'host did not reflect Standard Watch return');\n"+
  "assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');"
  );

}

/**
 * V3-5-2: second, isolated real Friends srcdoc + local RTDB scenario.
 * Host uses the canonical match engine with the SAME 5-Soul guard fixture as
 * tools/firebase-charge-smoke.mjs, but NO Auth SDK. Every touch is sent
 * through Guest -> SDK -> room -> Host -> published snapshot -> Guest ACK.
 * Never inject fake snapshot/HP or alter a production/school HTML build.
 */
const chargeQa=String.raw`<!doctype html><html lang="ja"><meta charset="utf-8">
<body><strong id="result">SITES-FRIENDS-CHARGE-WAIT</strong>
<iframe id="host" style="width:1080px;height:750px"></iframe>
<iframe id="guest" style="width:1080px;height:750px"></iframe>
<script>
const h=document.getElementById('host'),g=document.getElementById('guest');
const result=document.getElementById('result');
const doc=f=>f.contentDocument,el=(f,s)=>doc(f)?.querySelector(s);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(test,reason){if(!test)throw Error(reason);}
async function until(pred,label){
 for(let i=0;i<250;i++){if(pred())return;await sleep(75);}
 throw Error('timeout '+label+' host='+el(h,'.yw-online-status')?.textContent+
  ' guest='+el(g,'.yw-online-status')?.textContent+
  ' rev='+el(g,'#mb-revision')?.textContent);
}
function gauge(frame,id){
 return el(frame,'#mb-team'+(id[0]==='A'?0:1)+
 ' [data-unit="'+id+'"] .mb-soulbar i')?.style.width;
}
(async()=>{
 const fragment=await (await fetch('/embed')).text();
 h.srcdoc=fragment;g.srcdoc=fragment;
 await until(()=>!el(h,'.yw-online-make')?.disabled&&
  !el(g,'.yw-online-join')?.disabled,'two Friends embeds online');
 check(doc(h).querySelectorAll('script[src]').length===2,
  'no-Auth Friends must load only app+database SDK');
 check(typeof h.contentWindow.firebase.auth==='undefined',
  'Friends QA silently depended on anonymous Auth');
 el(h,'.yw-online-make').click();
 await until(()=>el(h,'.yw-online-role')?.textContent.includes('ホスト / 部屋'),
  'six-digit host room');
 const room=el(h,'.yw-online-role').textContent.match(/部屋 (\d{6})/);
 check(!!room,'missing host six-digit room code');
 el(g,'.yw-online-code').value=room[1];
 el(g,'.yw-online-join').click();
 await until(()=>el(g,'.yw-online-role')?.textContent.includes('ゲスト / 部屋'),
  'guest joined room');
 el(h,'.yw-online-start').click();
 await until(()=>el(h,'#battle-stage')?.dataset.stageReady==='true',
  'host canonical battle stage');
 await until(()=>el(g,'#battle-stage')?.dataset.stageReady==='true',
  'guest auto-connect without extra tap');
 await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&
  el(g,'.yw-online-presence')?.textContent==='相手と接続中','both peer presences');
 const hostQa=h.contentWindow.__ywFriendsChargeQa;
 check(hostQa&&typeof hostQa.step==='function'&&
  typeof hostQa.snapshot==='function','localhost-only charge driver absent');
 check(el(h,'.yw-online-auto')?.getAttribute('aria-pressed')==='false',
  'charge-only fixture should not enable the wall-time auto clock');
 let turns=0;
 while(gauge(g,'B1')!=='100%'&&turns<80){
  const status=hostQa.status();
  await until(()=>{const x=hostQa.status();return x.lastPublished>=x.revision&&
   !x.dirty;},'previous authoritative snapshot published');
  const a=hostQa.step();
  check(a.ok,'canonical guard step '+turns+' '+a.reason);
  turns++;
  const revision=hostQa.status().revision;
  await until(()=>el(g,'#mb-revision')?.textContent.startsWith('REV '+revision+' /'),
   'guest receives real guard action '+revision);
 }
 await until(()=>gauge(g,'B1')==='100%'&&gauge(h,'B1')==='100%',
  'B1 full gauge confirmed on both genuine seats');
 check(!el(g,'#mb-team1 [data-unit="B1"]').classList.contains('mb-bench'),
  'B1 lost its frontline before real charge');
 const hpBefore=hostQa.snapshot().game.squads[0].map(x=>x.hp);
 el(g,'#mb-charge').click();
 check(el(g,'#mb-charge').classList.contains('mb-command-active'),
  'guest charge button not selecting medals');
 const medal=el(g,'#mb-team1 [data-unit="B1"]');
 check(medal&&medal.classList.contains('mb-choice-eligible'),
  'B1 with full Soul was not eligible for charging');
 medal.click();
 await until(()=>!el(g,'#mb-modal').hidden&&
  el(g,'#mb-revision')?.textContent.includes('B 1'),
  'Host ACK of guest chargeStart and touch panel');
 check(el(g,'#mb-gesture-help')?.textContent.includes('タップ'),
  'existing seed12 guest B1 fixture should be tap; original weights unverified');
 check(gauge(g,'B1')==='100%',
  'chargeStart consumed Soul before completing touch');
 for(let i=0;i<6;i++){
  const dot=el(g,'#mb-touch-points .mb-touch-target');
  const pad=el(g,'#mb-touch-pad');
  check(dot&&!pad.closest('[hidden]'), 'host touch target not rendered '+i);
  const box=dot.getBoundingClientRect();
  check(box.width>0&&box.height>0,'zero-sized touch target '+i);
  const ptr={bubbles:true,cancelable:true,button:0,pointerType:'touch',
   pointerId:100+i,isPrimary:true,clientX:box.left+box.width/2,
   clientY:box.top+box.height/2};
  pad.dispatchEvent(new PointerEvent('pointerdown',ptr));
  pad.dispatchEvent(new PointerEvent('pointerup',ptr));
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B '+(i+2))&&
   el(h,'#mb-revision')?.textContent.includes('B '+(i+2)),
   'host+guest authoritative ACK for touch #'+(i+1));
  if(i<5){
   check(!el(g,'#mb-modal').hidden,'touch prematurely finished charge '+i);
   check(gauge(g,'B1')==='100%'&&gauge(h,'B1')==='100%',
    'partial tap consumed host Soul '+i);
  }
 }
 await until(()=>el(g,'#mb-modal').hidden&&
  gauge(g,'B1')==='0%'&&gauge(h,'B1')==='0%',
  'charge completed by host, Soul consumed on both screens');
 const latest=hostQa.snapshot().game.events.filter(e=>e.type==='special').at(-1);
 check(!!latest&&latest.actor==='B1','real host did not emit the B1 special');
 check(hostQa.snapshot().game.squads[0].some((x,i)=>x.hp!==hpBefore[i]),
  'real guest special did not change opponent HP');
 // Two independently rendered, event-driven cut-ins, not fake local alerts.
 await until(()=>!el(h,'#mb-special-flare').hidden&&
  !el(g,'#mb-special-flare').hidden,
  'both seats display the host-confirmed special cut-in');
 check(el(h,'#mb-special-title').textContent===
  el(g,'#mb-special-title').textContent,
  'host and guest disagree on the same special title');
 check(el(g,'.yw-online-status')?.textContent.includes('わざを発動しました'),
  'guest never received successful final touch ACK');
 result.textContent='SITES-FRIENDS-CHARGE-PASS '+turns+
  ' canonical Soul actions, 6 real Guest touch ACK, host B1 Special and both cut-ins';
})().catch(error=>{result.textContent='SITES-FRIENDS-CHARGE-FAIL '+(error.stack||error.message)});
<\/script></body></html>`;

const server=createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost');
 if(route.pathname==='/embed'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fragment);return;
 }
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(
  friends&&route.search==='?charge'?chargeQa:qa);
});
const tmp=mkdtempSync(path.join(tmpdir(),'yw-sites-online-'));
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let passed=false;
 const sentinel=friends?'SITES-FIREBASE-FRIENDS-EMULATOR-PASS':
  emulator?'SITES-ONLINE-EMULATOR-PASS':'SITES-ONLINE-SETUP-PASS';
 for(let trial=1;trial<=2;trial++){
  // Remote Firebase/auth I/O is asynchronous wall-clock work. Chrome
  // --virtual-time-budget used to advance JS timeouts *before* network
  // responses completed, falsely failing an otherwise healthy room.
  const proof=await runRealtimeQa({
   browser,profile:path.join(tmp,'profile-'+trial),
   url:'http://127.0.0.1:'+server.address().port+'/qa'+(emulator?'':'?setup'),
   sentinel,timeoutMs:90000
  });
  if(proof.ok){console.log(proof.rendered);passed=true;break;}
  console.warn('Online Sites iframe trial '+trial+' failed: '+
   'rendered='+String(proof.rendered).slice(0,1000)+
   ' reason='+proof.reason+' stderr='+String(proof.stderr||'').slice(-250));
 }
 if(!passed)throw Error('Actual Chromium inline online Sites test failed');
 if(friends){
  const proof=await runRealtimeQa({
   browser,profile:path.join(tmp,'charge-profile'),
   url:'http://127.0.0.1:'+server.address().port+'/qa?charge',
   sentinel:'SITES-FRIENDS-CHARGE-PASS',timeoutMs:90000
  });
  if(!proof.ok)throw Error('V3-5-2 actual two-seat Friends charge failed: '+
   String(proof.rendered||proof.reason).slice(0,1400));
  console.log(proof.rendered);
 }
}finally{await new Promise(ok=>server.close(ok));rmSync(tmp,{recursive:true,force:true});}
