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
 // Inspect actual rendered targets, not just CSS rules or disabled button
 // properties. All checks execute inside a real embedded Chromium iframe at
 // 1024x768, 820x620, 568x520 and 390x760 BEFORE the live match inputs.

 // In Friends baseline, actually DRAG the six-medal dial using browser
 // TouchEvent dispatch, not a shortcut click on the rotation button.
 // The subsequent canonical Firebase ACK / cooldown assertions stay intact.
 qa=qa.replace(
  "el(g,'[data-rotate=\"1\"]').click();",
  `const wheel=el(g,'#mb-team1 .mb-wheel'),rect=wheel.getBoundingClientRect();
 const radius=Math.min(rect.width,rect.height)*.5;
 const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const from=new Touch({identifier:17,target:wheel,
  clientX:cx+radius*.75,clientY:cy});
 const to=new Touch({identifier:17,target:wheel,
  clientX:cx+radius*.35,clientY:cy+radius*.66});
 const finger=(type,t,active)=>wheel.dispatchEvent(new TouchEvent(type,{
  bubbles:true,cancelable:true,touches:active?[t]:[],
  targetTouches:active?[t]:[],changedTouches:[t]}));
 finger('touchstart',from,true);
 finger('touchmove',to,true);
 finger('touchend',to,false);`);
 qa=qa.replace(
  "  // The controls must not only exist:",
  `  // V3-5-7 school touch acceptance: dial prevents accidental page pan,
  // but outside the dial the document remains scrollable.
  const dial=el(g,'#mb-team1 .mb-wheel');
  assert(v.getComputedStyle(dial).touchAction==='none',
   'wheel drag can trigger browser page scrolling at '+width+'px');
  assert(v.getComputedStyle(screen).touchAction==='auto',
   'entire lower screen wrongly disables document scroll at '+width+'px');
  for(const selector of ['[data-rotate="-1"]','[data-rotate="1"]',
   '#mb-mode-cancel','#mb-charge','#mb-purify','#mb-target',
   '#mb-team1 .mb-center-symbol','#mb-team1 [data-unit="B1"]',
   '#mb-team1 [data-unit="B4"]']){
   const button=el(g,selector);
   assert(button,'Friends touch target missing: '+selector);
   button.scrollIntoView({block:'center',inline:'nearest'});
   const rect=button.getBoundingClientRect();
   assert(rect.width>=44&&rect.height>=44,
    'Friends hit target smaller than 44px: '+selector+' '+
    Math.round(rect.width)+'x'+Math.round(rect.height)+' at '+width+'px');
   const px=rect.left+rect.width/2,py=rect.top+rect.height/2;
   assert(px>=0&&px<width&&py>=0&&py<height,
    'Friends target cannot be scrolled into iframe: '+selector+
    ' at '+width+'px');
   const hit=d.elementFromPoint(px,py);
   assert(hit&&(hit===button||button.contains(hit)),
    'Friends touch target obscured: '+selector+' hit='+
    (hit?.className||'none')+' at '+width+'px');
  }
  // The controls must not only exist:`);
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
  // V3-5-9: in real two-seat Chromium, after the Host ACKs the pin,
  // validate the actual field reticle, not only the medal's mb-pinned class.
  // And inspect the read-only skill notification's computed color without
  // forcing a fake combat event or changing a real Host snapshot.
  qa=qa.replace(
   " 'guest did not see pinned target after authoritative ACK');",
   " 'guest did not see pinned target after authoritative ACK');\\n"+
   "const reticle=el(g,'.mb-foe-line [data-unit=A2] .mb-pin-reticle');\\n"+
   "assert(reticle,'the visible enemy pin circle is missing');\\n"+
   "const pinRGB=doc(g).defaultView.getComputedStyle(reticle).borderTopColor.match(/\\d+/g).map(Number);\\n"+
   "assert(pinRGB[0]>pinRGB[1]+65&&pinRGB[0]>pinRGB[2]+55,\\n"+
   " 'enemy pin reticle is not clearly red: '+pinRGB);\\n"+
   "for(const frame of [h,g]){\\n"+
   " const skill=el(frame,'#mb-passive-notice');\\n"+
   " assert(skill,'original-style skill notice container missing');\\n"+
   " const rgba=doc(frame).defaultView.getComputedStyle(skill).backgroundColor.match(/\\d+/g).map(Number);\\n"+
   " assert(rgba[1]>rgba[0]+25&&rgba[1]>rgba[2],\\n"+
   "  'skill notice is not green-tinted: '+rgba);\\n"+
   "}\\n"
  );
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
const isG=location.search==='?gcharge';
const isPurify=location.search==='?purify';
const isFull=location.search==='?fullmatch';
const isOneGame=location.search==='?onegame';
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
 await until(()=>el(h,'.yw-online-make')?.disabled===false&&
  el(g,'.yw-online-join')?.disabled===false,'two Friends embeds online');
 check(doc(h).querySelectorAll('script[src]').length===2,
  'no-Auth Friends must load only app+database SDK: actual '+
  doc(h).querySelectorAll('script[src]').length+' '+[...doc(h).querySelectorAll('script[src]')].map(x=>x.src).join(','));
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
 // V3-5-6: the school Friends layout is playable, not a debug dashboard.
 // Wire IDs stay in the DOM for QA ACKs but are hidden to a human player.
 for(const frame of [h,g]){
  check(el(frame,'.mb-disclaimer')?.hidden===true,
   'school Friends is displaying a research disclaimer');
  check(el(frame,'#mb-revision')?.hidden===true,
   'school Friends is displaying internal network revisions');
  check(el(frame,'.mb-title-group small')?.hidden===true,
   'school Friends is displaying a developer caption');
  check(el(frame,'#mb-purify')?.hidden===false&&
   el(frame,'#mb-charge')?.hidden===false,
   'hiding development labels accidentally disabled player commands');
 }
 check(doc(h).querySelector('.yw-online-bar strong')?.textContent==='輪戦｜友達対戦',
  'Friends page retains the old research header');
 const hostQa=h.contentWindow.__ywFriendsChargeQa;
 check(hostQa&&typeof hostQa.step==='function'&&
  typeof hostQa.snapshot==='function','localhost-only charge driver absent');
 check(el(h,'.yw-online-auto')?.getAttribute('aria-pressed')==='false',
  'charge-only fixture should not enable the wall-time auto clock');



 // V3-5-5: one real connected match carries EVERY major manual system.
 // Unlike separate synthetic acceptance screens, no state or result is set
 // by the browser: only canonical commands and Host auto actions mutate it.
 if(isOneGame){
  const snap=()=>hostQa.snapshot();
  const negative=id=>snap().game.inspirits[id].some(t=>t.sign==='negative');
  let seqA=0,seqB=0,actions=0;
  async function ack(side,label){
   const n=side===0?++seqA:++seqB;
   await until(()=>el(g,'#mb-revision')?.textContent.includes(
    (side===0?'A ':'B ')+n)&&
    el(h,'#mb-revision')?.textContent.includes(
     (side===0?'A ':'B ')+n),label+' ACK '+n);
  }
  async function step(){
   await until(()=>{const a=hostQa.status();return a.lastPublished>=a.revision&&!a.dirty;},
    'previous Host action published');
   const result=hostQa.step();
   check(result.ok,'true Host auto step failed: '+JSON.stringify(result));
   actions++;
   const rev=hostQa.status().revision;
   await until(()=>el(g,'#mb-revision')?.textContent.startsWith('REV '+rev+' /')&&
    el(h,'#mb-revision')?.textContent.startsWith('REV '+rev+' /'),
    'both seats received Host action '+actions);
  }
  async function tapTargets(kind,count){
   for(let i=0;i<count;i++){
    const pad=el(g,'#mb-touch-pad');
    const dot=el(g,'#mb-touch-points')?.querySelectorAll('.mb-touch-target')[kind==='pop'?i:0];
    check(pad&&dot,'missing actual '+kind+' touch target '+i);
    const box=dot.getBoundingClientRect();
    check(box.width>0&&box.height>0,'invisible '+kind+' target '+i);
    const ptr={bubbles:true,cancelable:true,button:0,pointerType:'touch',
     pointerId:(kind==='pop'?310:kind==='normal'?330:350)+i,isPrimary:true,
     clientX:box.left+box.width/2,clientY:box.top+box.height/2};
    pad.dispatchEvent(new PointerEvent('pointerdown',ptr));
    pad.dispatchEvent(new PointerEvent('pointerup',ptr));
    await ack(1,kind+' physical Pointer tap '+(i+1));
    if(i<count-1)check(!el(g,'#mb-modal').hidden,kind+' closed too soon');
   }
  }
  // Phase 1: a REAL negative Inspirit from the first Host fighter.
  el(h,'#mb-target').click();
  el(h,'.mb-fighter[data-unit="B1"]').click();
  await ack(0,'Host opponent pin B1');
  while(!negative('B1')&&actions<100)await step();
  check(negative('B1')&&snap().game.events.some(e=>
   e.type==='action'&&e.kind==='inspirit'&&e.target==='B1'&&e.hit),
   'the B1 negative Inspirit was not caused by an enemy action');
  check(el(g,'#mb-team1 [data-unit="B1"] .mb-unit-stat')?.textContent.includes('⚠'),
   'guest missing real negative status');

  // Phase 2: guest wheel B1 to bench; 5 true Guest touch ACKs cleanse it.
  el(g,'[data-rotate="1"]').click();
  await ack(1,'guest benches B1');
  check(el(g,'#mb-team1 [data-unit="B1"]').classList.contains('mb-bench'),
   'B1 was not benched');
  el(g,'#mb-purify').click();
  const affected=el(g,'#mb-team1 [data-unit="B1"]');
  check(affected.classList.contains('mb-choice-eligible'),'cannot select afflicted bench');
  affected.click();
  await ack(1,'Purify start B1');
  check(el(g,'#mb-gesture-help')?.textContent.includes('紫の玉をタップ'),
   'first genuine Purify challenge is not expected pop');
  check(negative('B1'),'Purify start erased status');
  await tapTargets('pop',5);
  await until(()=>el(g,'#mb-modal').hidden&&!negative('B1')&&
   !el(g,'#mb-team1 [data-unit="B1"] .mb-unit-stat')?.textContent.includes('⚠'),
   'Host did not clear B1 from real guest Purify');
  check(snap().game.events.filter(e=>e.type==='purification').length===1,
   'no canonical Purify completion event');

  // Phase 3: standard B2 has EARNED Soul from real Guard actions.
  let b2Steps=0;
  while(gauge(g,'B2')!=='100%'&&b2Steps<80){await step();b2Steps++;}
  check(gauge(g,'B2')==='100%'&&gauge(h,'B2')==='100%',
   'B2 did not earn genuine Soul');
  check(!negative('B2'),'B2 cannot cast while sleeping');
  el(g,'#mb-charge').click();
  const b2=el(g,'#mb-team1 [data-unit="B2"]');
  check(b2.classList.contains('mb-choice-eligible'),'B2 normal Soultimate not eligible');
  b2.click();
  await ack(1,'real B2 standard charge start');
  check(el(g,'#mb-gesture-help')?.textContent.includes('タップ'),
   'seed12 first real charge trial not tap');
  await tapTargets('normal',6);
  await until(()=>el(g,'#mb-modal').hidden&&
   snap().game.events.some(x=>x.type==='special'&&
    x.actor==='B2'&&x.mode==='soultimate'),
   'normal Soultimate did not resolve on Host');
  check(snap().game.squads[0].filter(x=>x.hp===0).length===3&&
   snap().game.winner===null,
   'B2 ordinary special did not KO the real first trio');

  // Phase 4: Host responds with THREE legal circle commands, no HP hacks.
  for(let i=0;i<3;i++){
   el(h,'[data-rotate="1"]').click();
   await ack(0,'Host enters reserve member '+(i+1));
  }
  check(['A4','A5','A6'].every(id=>snap().game.clock.teams[0].frontIds.includes(id)),
   'real reserve rotation did not expose remaining enemy trio');
  for(let i=0;i<2;i++){
   el(g,'[data-rotate="-1"]').click();
   await ack(1,'Guest rotates toward Zero G trio '+(i+1));
  }
  check(['B6','B1','B2'].every(id=>snap().game.clock.teams[1].frontIds.includes(id)),
   'B6 B1 B2 not all in G circle');
  el(g,'#mb-team1 .mb-center-symbol').click();
  await ack(1,'Guest switches to Zero');
  check(el(g,'#mb-charge span').textContent==='Gわざ',
   'Zero Watch G button not visible');
  let gSteps=0;
  while(!['B6','B1','B2'].every(id=>gauge(g,id)==='100%'&&
   gauge(h,id)==='100%')&&gSteps<120){await step();gSteps++;}
  check(['B6','B1','B2'].every(id=>gauge(g,id)==='100%'),
   'G triple Soul not earned from real Guard actions');
  el(g,'#mb-charge').click();
  const b1=el(g,'#mb-team1 [data-unit="B1"]');
  check(b1.classList.contains('mb-choice-eligible'),'G caster B1 ineligible');
  b1.click();
  await ack(1,'Guest B1 Zero G charge');
  check(el(g,'#mb-gesture-help').textContent.includes('タップ'),
   'seed12 second real charge unexpectedly changed input kind');
  await tapTargets('g',6);
  await until(()=>el(g,'#mb-modal').hidden&&
   ['B6','B1','B2'].every(id=>gauge(g,id)==='0%'&&gauge(h,id)==='0%'),
   'G did not consume all three real Soul gauges');

  const ending=snap(),specials=ending.game.events.filter(x=>x.type==='special');
  check(ending.game.winner===1&&ending.game.squads[0].every(x=>x.hp===0),
   'Host did not really KO six opponents and declare guest winner');
  check(specials.length===2&&
   specials[0].mode==='soultimate'&&specials[0].actor==='B2'&&
   specials[1].mode==='g-tech'&&specials[1].actor==='B1',
   'normal and G must be consecutive legitimate Host special outcomes');
  let ended=false;
  for(let i=0;i<840;i++){
   if(el(h,'#mb-finish-screen')?.hidden===false&&
      el(g,'#mb-finish-screen')?.hidden===false){ended=true;break;}
   await sleep(80);
  }
  check(ended,'one-room result overlays never appeared after final scene');
  check(el(h,'#mb-finish-title')?.textContent==='敗北…'&&
   el(g,'#mb-finish-title')?.textContent==='勝利！',
   'final same-room opponent seats disagree on the winner');
  check(el(g,'#mb-revision')?.textContent.startsWith('REV '+ending.revision+' /'),
   'guest failed to apply final one-room snapshot');
  result.textContent='SITES-FRIENDS-ONE-GAME-PASS '+actions+
   ' real Host actions, negative Inspirit, bench Purify 5 pointer ACK, '+
   'normal B2 6 touch, Host 3 legal reserve rotations, Zero G B1 6 touch, '+
   'all six KO and opposite two-seat results';
  return;
 }
 // V3-5-5: ONE actual authoritative 6v6, not a fake result overlay.
 // Set only initial localhost roster stats. Every KO and substitution must
 // arise from normal Host attack actions and real RTDB snapshot delivery.
 if(isFull){
  const before=hostQa.snapshot();
  check(before.game.squads.every(team=>team.length===6),'not six versus six');
  el(g,'#mb-target').click();
  const target=el(g,'.mb-fighter[data-unit="A2"]');
  check(target&&target.classList.contains('mb-choice-eligible'),
   'guest opponent pin cannot select A2');
  target.click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&
   el(h,'#mb-revision')?.textContent.includes('B 1'),
   'guest pin target host ACK');
  check(hostQa.snapshot().game.pins[1]==='A2','pin absent on canonical Host');

  el(g,'[data-rotate="1"]').click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 2')&&
   el(h,'#mb-revision')?.textContent.includes('B 2'),
   'guest actual rotation host ACK');
  check(hostQa.snapshot().game.clock.teams[1].offset!==before.game.clock.teams[1].offset,
   'guest rotation did not change Host front');

  el(g,'#mb-team1 .mb-center-symbol').click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 3')&&
   el(h,'#mb-revision')?.textContent.includes('B 3'),
   'guest zero watch host ACK');
  check(el(g,'#mb-charge span')?.textContent==='Gわざ',
   'G command missing in the same match');
  el(g,'#mb-team1 .mb-center-symbol').click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 4')&&
   el(h,'#mb-revision')?.textContent.includes('B 4'),
   'guest returned to standard watch');
  check(el(g,'#mb-charge span')?.textContent==='わざ',
   'standard command not restored');

  let actions=0,hostSubstitutions=0,hostKos=0;
  let prior=hostQa.snapshot();
  while(hostQa.snapshot().game.winner===null&&actions<90){
   await until(()=>{const p=hostQa.status();
    return p.lastPublished>=p.revision&&!p.dirty;},
    'previous legitimate Host revision published');
   const next=hostQa.step();
   check(next.ok,'Host stopped normal auto combat at '+actions+': '+
    JSON.stringify(next));
   actions++;
   const revision=hostQa.status().revision;
   await until(()=>el(g,'#mb-revision')?.textContent.startsWith('REV '+revision+' /')&&
    el(h,'#mb-revision')?.textContent.startsWith('REV '+revision+' /'),
    'true guest+host delivery for action '+actions);
   const now=hostQa.snapshot();
   check(now.game.clock.turn>=prior.game.clock.turn,
    'Host battle time reversed');
   for(const team of now.game.squads){
    check(team.every(u=>u.hp>=0&&u.hp<=u.maxHp),
     'normal action produced invalid HP');
   }
   hostKos=Math.max(hostKos,now.game.squads[0].filter(x=>x.hp===0).length);
   if(now.game.clock.teams[0].offset!==prior.game.clock.teams[0].offset)
    hostSubstitutions++;
   prior=now;
  }
  const final=hostQa.snapshot();
  check(final.game.winner===1,'regular 6v6 did not end with guest victory after '+
   actions+' actions, winner='+final.game.winner);
  check(final.game.squads[0].filter(x=>x.hp===0).length===6,
   'victory did not truly KO all six opponent units');
  check(hostKos===6&&hostSubstitutions>=1,
   'did not observe KO and actual reserve replacement');
  check(final.game.events.filter(e=>e.type==='action'&&e.kind==='attack').length>=6,
   'winner came from a shortcut rather than real attack events');
  // The winner is canonical immediately, but existing battle animations are
  // allowed to finish before the actual victory/defeat overlay appears.
  let overlayReady=false;
  for(let i=0;i<600;i++){
   if(el(h,'#mb-finish-screen')?.hidden===false&&
      el(g,'#mb-finish-screen')?.hidden===false){
    overlayReady=true;break;
   }
   await sleep(90);
  }
  check(overlayReady,
   'final action scenes never completed or one seat never got result overlay');
  check(el(h,'#mb-finish-title')?.textContent==='敗北…'&&
   el(g,'#mb-finish-title')?.textContent==='勝利！',
   'Host/Guest must see opposite results, not the same winner');
  check(el(h,'#battle-stage')?.dataset.matchFinished==='true'&&
   el(g,'#battle-stage')?.dataset.matchFinished==='true',
   'match result arrived on one seat only');
  check(el(g,'#mb-revision')?.textContent.startsWith('REV '+final.revision+' /'),
   'last Host canonical revision not visible on the Guest');
  result.textContent='SITES-FRIENDS-FULL-MATCH-PASS '+actions+
   ' real Host actions, six KO, '+hostSubstitutions+
   ' reserve substitutions, guest pin/rotation/Zero/Standard ACK, '+
   'both final overlays and identical final revision';
  return;
 }
 // V3-5-4: real negative Inspirit (no debug status write), then genuine
 // guest wheel/purification gestures and authoritative two-seat ACK.
 if(isPurify){
  el(h,'#mb-target').click();
  const foe=el(h,'.mb-fighter[data-unit="B1"]');
  check(foe&&foe.classList.contains('mb-choice-eligible'),
   'Host pin must target the real enemy front B1');
  foe.click();
  await until(()=>el(h,'#mb-revision')?.textContent.includes('A 1')&&
   el(g,'#mb-revision')?.textContent.includes('A 1'),
   'real Host pin B1 published to both clients');
  check(el(h,'.mb-fighter[data-unit="B1"]').classList.contains('mb-pinned'),
   'Host did not display B1 pin');

  let turns=0;
  const negative=()=>hostQa.snapshot().game.inspirits.B1.some(x=>x.sign==='negative');
  while(!negative()&&turns<35){
   await until(()=>{const status=hostQa.status();
    return status.lastPublished>=status.revision&&!status.dirty;},
    'published previous canonical action');
   const advanced=hostQa.step();
   check(advanced.ok,'real auto Inspirit failed at step '+turns+': '+advanced.reason);
   turns++;
   const rev=hostQa.status().revision;
   await until(()=>el(g,'#mb-revision')?.textContent.startsWith('REV '+rev+' /'),
    'guest received canonical Inspirit action '+rev);
  }
  check(negative(),'enemy never gave B1 a genuine negative status');
  check(el(g,'#mb-team1 [data-unit="B1"] .mb-unit-stat')?.textContent.includes('⚠'),
   'Guest cannot see the Host-confirmed negative Inspirit');
  check(el(h,'.mb-fighter[data-unit="B1"] .mb-condition-icon'),
   'Host did not render the actual negative Inspirit');

  // B1 starts front. A legal one-step right rotation moves it to bench.
  el(g,'[data-rotate="1"]').click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&
   el(h,'#mb-revision')?.textContent.includes('B 1'),
   'Guest bench rotation not confirmed on both seats');
  check(el(g,'#mb-team1 [data-unit="B1"]').classList.contains('mb-bench'),
   'negative subject did not enter bench');

  el(g,'#mb-purify').click();
  const subject=el(g,'#mb-team1 [data-unit="B1"]');
  check(subject.classList.contains('mb-choice-eligible'),
   'real negative bench subject not selectable for Purify');
  subject.click();
  await until(()=>!el(g,'#mb-modal').hidden&&
   el(g,'#mb-revision')?.textContent.includes('B 2')&&
   el(h,'#mb-revision')?.textContent.includes('B 2'),
   'Host ACK did not begin guest Purification gesture');
  check(el(g,'#mb-gesture-help')?.textContent.includes('紫の玉をタップ'),
   'first canonical Purify trial should be pop, not an invented shortcut');
  check(negative(),'Purify start illegally cleared negative status');
  const initial=hostQa.snapshot().game.purification[1];
  check(initial?.challenge?.kind==='pop'&&initial.challenge.total===5,
   'actual Host Purify challenge differs from visible pop fixture');

  for(let i=0;i<5;i++){
   const target=el(g,'#mb-touch-points')?.querySelectorAll('.mb-touch-target')[i];
   const pad=el(g,'#mb-touch-pad');
   check(target&&pad&&!pad.closest('[hidden]'),
    'real Purify target not rendered '+i);
   const box=target.getBoundingClientRect();
   check(box.width>0&&box.height>0,'zero-sized purification target '+i);
   const ptr={bubbles:true,cancelable:true,button:0,pointerType:'touch',
    pointerId:220+i,isPrimary:true,
    clientX:box.left+box.width/2,clientY:box.top+box.height/2};
   pad.dispatchEvent(new PointerEvent('pointerdown',ptr));
   pad.dispatchEvent(new PointerEvent('pointerup',ptr));
   await until(()=>el(g,'#mb-revision')?.textContent.includes('B '+(3+i))&&
    el(h,'#mb-revision')?.textContent.includes('B '+(3+i)),
    'Host/Guest purification touch ACK '+(i+1));
   if(i<4){
    check(negative(),'partial Purify touch illegally removed status '+i);
    check(!el(g,'#mb-modal').hidden,'Purify closed too early '+i);
   }
  }
  await until(()=>el(g,'#mb-modal').hidden&&!negative()&&
   !el(g,'#mb-team1 [data-unit="B1"] .mb-unit-stat')?.textContent.includes('⚠')&&
   !el(h,'.mb-fighter[data-unit="B1"] .mb-condition-icon'),
   'real Purify not cleared in authoritative Host and both client UIs');
  const events=hostQa.snapshot().game.events.filter(x=>x.type==='purification');
  const last=events.at(-1);
  check(events.length===1&&last.targetId==='B1'&&last.side===1&&
   last.removed.some(x=>x.sign==='negative'),
   'Host purification event missing or not causally tied to B1');
  await until(()=>!el(g,'#mb-purify-complete').hidden&&
   el(g,'#mb-purify-complete').dataset.eventId===String(last.eventId),
   'Guest did not render confirmed Purify success feedback');
  result.textContent='SITES-FRIENDS-PURIFY-PASS '+turns+
   ' canonical enemy actions, Host negative Inspirit, guest bench rotation, '+
   '5 real Pointer taps and ACK, authoritative status removal and UI feedback';
  return;
 }
 // G uses the SAME authoritative guard actions, with a legal guest rotation
 // to put the left neighbor B6 in front. Neither Soul nor HP is injected.
 if(isG){
  el(g,'[data-rotate="-1"]').click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&
   el(h,'#mb-revision')?.textContent.includes('B 1'),'G left rotation ACK');
  check(['B6','B1','B2'].every(id=>!
   el(g,'#mb-team1 [data-unit="'+id+'"]').classList.contains('mb-bench')),
   'G caster and both ring neighbors must be in reachable front');
  el(g,'#mb-team1 .mb-center-symbol').click();
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 2')&&
   el(h,'#mb-revision')?.textContent.includes('B 2'),'Zero Watch ACK');
  check(el(g,'#mb-charge span').textContent==='Gわざ',
   'Zero Watch must actually expose G move');
  check(el(h,'#mb-team1 .mb-center-symbol').textContent==='零式',
   'host did not mirror guest Zero Watch');
 }
 const startSeq=isG?3:1;
 const consumers=isG?['B6','B1','B2']:['B1'];
 const gaugesFull=()=>consumers.every(id=>
  gauge(g,id)==='100%'&&gauge(h,id)==='100%');
 let turns=0;
 while(!gaugesFull()&&turns<120){
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
 await until(gaugesFull,'all real consumer Soul gauges full in both seats');
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
  el(g,'#mb-revision')?.textContent.includes('B '+startSeq),
  'Host ACK of guest chargeStart and touch panel');
 check(el(g,'#mb-gesture-help')?.textContent.includes('タップ'),
  'existing seed12 guest B1 fixture should be tap; original weights unverified');
 check(gauge(g,'B1')==='100%',
  'chargeStart consumed Soul before completing touch');
 check(!el(g,'#mb-gesture-progress')?.textContent.includes('試験用'),
  'visible Friends touch progress still reveals laboratory-only text');
 // V3-5-8: this original-style gesture dialog belongs to the LOWER
 // screen, not the full iframe viewport. In a short Sites embed the page
 // may scroll to that lower screen; the panel itself must not overflow and
 // both Cancel and illuminated target must be reachable by a user.
 for(const [width,height] of [[568,320],[390,360],[820,390]]){
  g.style.width=width+'px';g.style.height=height+'px';
  await sleep(80);
  const lower=el(g,'.mb-lower-screen'),modal=el(g,'#mb-modal'),
   surface=el(g,'.mb-modal-surface');
  lower.scrollIntoView({block:'center',inline:'nearest'});
  const lowerRect=lower.getBoundingClientRect(),
   modalRect=modal.getBoundingClientRect(),
   surfaceRect=surface.getBoundingClientRect();
  check(!modal.hidden&&
   Math.abs(modalRect.top-lowerRect.top)<=4&&
   Math.abs(modalRect.bottom-lowerRect.bottom)<=4,
   'gesture overlay not anchored to LOWER original screen '+width+'x'+height);
  check(surfaceRect.top>=modalRect.top-4&&
   surfaceRect.bottom<=modalRect.bottom+4,
   'gesture panel overflows the LOWER screen '+width+'x'+height+
   ' surface='+Math.round(surfaceRect.top)+'..'+Math.round(surfaceRect.bottom)+
   ' lower='+Math.round(modalRect.top)+'..'+Math.round(modalRect.bottom));
  const cancel=el(g,'#mb-modal [data-act="cancel"]');
  cancel.scrollIntoView({block:'center',inline:'nearest'});
  let r=cancel.getBoundingClientRect();
  let x=r.left+r.width/2,y=r.top+r.height/2;
  let hit=doc(g).elementFromPoint(x,y);
  check(x>=0&&x<width&&y>=0&&y<height&&
   (hit===cancel||cancel.contains(hit)),
   'gesture cancel cannot be tapped after scrolling '+width+'x'+height);
  const dot=el(g,'#mb-touch-points .mb-touch-target');
  check(dot,'gesture target missing at '+width+'x'+height);
  dot.scrollIntoView({block:'center',inline:'nearest'});
  r=dot.getBoundingClientRect();
  x=r.left+r.width/2;y=r.top+r.height/2;
  hit=doc(g).elementFromPoint(x,y);
  const pad=el(g,'#mb-touch-pad');
  check(x>=0&&x<width&&y>=0&&y<height&&
   (hit===pad||pad.contains(hit)),
   'gesture target cannot be tapped after scrolling '+width+'x'+height);
 }
 g.style.width='1080px';g.style.height='750px';
 await sleep(80);

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
  await until(()=>el(g,'#mb-revision')?.textContent.includes('B '+(startSeq+i+1))&&
   el(h,'#mb-revision')?.textContent.includes('B '+(startSeq+i+1)),
   'host+guest authoritative ACK for touch #'+(i+1));
  if(i<5){
   check(!el(g,'#mb-modal').hidden,'touch prematurely finished charge '+i);
   check(gaugesFull(),'partial tap consumed a G/normal consumer Soul '+i);
  }
 }
 await until(()=>el(g,'#mb-modal').hidden&&
  consumers.every(id=>gauge(g,id)==='0%'&&gauge(h,id)==='0%'),
  'charge completed by host, every consumer spent Soul on both screens');
 const latest=hostQa.snapshot().game.events.filter(e=>e.type==='special').at(-1);
 check(!!latest&&latest.actor==='B1'&&
  latest.mode===(isG?'g-tech':'soultimate'),
  'real host did not emit the selected normal/G B1 special: '+
  JSON.stringify(hostQa.snapshot().game.events.slice(-7))+' guest '+
  el(g,'.yw-online-status')?.textContent);
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
 result.textContent=(isG?'SITES-FRIENDS-G-CHARGE-PASS ':'SITES-FRIENDS-CHARGE-PASS ')+turns+
  ' canonical Soul actions, 6 real Guest touch ACK, host B1 '+(isG?
   'Zero G 3-Soul 2x-power':'normal')+' Special and both cut-ins';
})().catch(error=>{result.textContent='SITES-FRIENDS-CHARGE-FAIL '+(error.stack||error.message)});
</script></body></html>`;

const server=createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost');
 if(route.pathname==='/embed'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fragment);return;
 }
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(
  friends&&['?charge','?gcharge','?purify','?fullmatch','?onegame'].includes(route.search)?chargeQa:qa);
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
  // Run an independent fresh two-seat session after baseline Friends QA.
  // Charge actions are never replayed into the school production room.
  if(!chargeQa.includes('SITES-FRIENDS-CHARGE-PASS'))
   throw Error('charge acceptance page marker missing');
  const proof=await runRealtimeQa({
   browser,profile:path.join(tmp,'charge-profile'),
   url:'http://127.0.0.1:'+server.address().port+'/qa?charge',
   sentinel:'SITES-FRIENDS-CHARGE-PASS',timeoutMs:90000
  });
  if(!proof.ok)throw Error('V3-5-2 actual two-seat Friends charge failed: '+
   String(proof.rendered||proof.reason).slice(0,1400));
  console.log(proof.rendered);

  const gProof=await runRealtimeQa({
   browser,profile:path.join(tmp,'gcharge-profile'),
   url:'http://127.0.0.1:'+server.address().port+'/qa?gcharge',
   sentinel:'SITES-FRIENDS-G-CHARGE-PASS',timeoutMs:90000
  });
  if(!gProof.ok)throw Error('V3-5-3 real 3-Soul Zero G charge failed: '+
   String(gProof.rendered||gProof.reason).slice(0,1400));
  console.log(gProof.rendered);
  const pProof=await runRealtimeQa({
   browser,profile:path.join(tmp,'purify-profile'),
   url:'http://127.0.0.1:'+server.address().port+'/qa?purify',
   sentinel:'SITES-FRIENDS-PURIFY-PASS',timeoutMs:90000
  });
  if(!pProof.ok)throw Error('V3-5-4 real 2-seat Friends Purify failed: '+
   String(pProof.rendered||pProof.reason).slice(0,1500));
  console.log(pProof.rendered);
  const full=await runRealtimeQa({
   browser,profile:path.join(tmp,'fullmatch-profile'),
   url:'http://127.0.0.1:'+server.address().port+'/qa?fullmatch',
   sentinel:'SITES-FRIENDS-FULL-MATCH-PASS',timeoutMs:120000
  });
  if(!full.ok)throw Error('V3-5-5 canonical 6v6 online result failed: '+
   String(full.rendered||full.reason).slice(0,1600));
  console.log(full.rendered);
  const integrated=await runRealtimeQa({
   browser,profile:path.join(tmp,'onegame-profile'),
   url:'http://127.0.0.1:'+server.address().port+'/qa?onegame',
   sentinel:'SITES-FRIENDS-ONE-GAME-PASS',timeoutMs:150000
  });
  if(!integrated.ok)throw Error('V3-5-5 same-room Friends full match failed: '+
   String(integrated.rendered||integrated.reason).slice(0,1800));
  console.log(integrated.rendered);
 }
}finally{await new Promise(ok=>server.close(ok));rmSync(tmp,{recursive:true,force:true});}
