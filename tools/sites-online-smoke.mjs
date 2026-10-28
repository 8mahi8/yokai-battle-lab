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
let qa="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\">\n<body><strong id=\"result\">ONLINE-EMBED-WAIT</strong>\n<iframe id=\"host\" style=\"width:1080px;height:750px;border:0\"></iframe>\n<iframe id=\"guest\" style=\"width:1080px;height:750px;border:0\"></iframe>\n<script>\nconst h=document.getElementById('host'),g=document.getElementById('guest');\nconst result=document.getElementById('result');\nconst doc=f=>f.contentDocument,el=(f,s)=>doc(f)?.querySelector(s);\nconst sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nconst assert=(condition,label)=>{if(!condition)throw Error(label)};\nasync function until(pred,label){\n for(let i=0;i<250;i++){if(pred())return;await sleep(90);}\n throw Error('timeout '+label+' host='+el(h,'.yw-online-status')?.textContent+\n ' guest='+el(g,'.yw-online-status')?.textContent+' guestRev='+el(g,'#mb-revision')?.textContent);\n}\n(async()=>{\n const fragment=await (await fetch('/embed')).text();\n h.srcdoc=fragment;\n if(location.search==='?setup'){\n  await until(()=>el(h,'.yw-online-status')?.textContent.includes('接続設定が未登録'),\n   'default gated status');\n  assert(el(h,'.yw-online-make').disabled,'unconfigured app incorrectly enabled room');\n  assert(doc(h).querySelectorAll('script[src],link[rel=\"stylesheet\"]').length===0,\n   'unconfigured embed included third-party SDK');\n  assert(fragment.includes('yw-sites-online'),'lost inline online controls');\n  result.textContent='SITES-ONLINE-SETUP-PASS no Firebase initialization or remote scripts without explicit config';\n  return;\n }\n g.srcdoc=fragment;\n await until(()=>el(h,'.yw-online-make')?.disabled===false&&\n  el(g,'.yw-online-join')?.disabled===false,\n  'separate anonymous Auth in two embedded iframes');\n el(h,'.yw-online-make').click();\n await until(()=>el(h,'.yw-online-role')?.textContent.includes('ホスト / 部屋'),'room created');\n const room=el(h,'.yw-online-role').textContent.match(/部屋 (\\d{6})/);\n assert(room,'6-digit match room not found');\n el(g,'.yw-online-code').value=room[1];\n el(g,'.yw-online-join').click();\n await until(()=>el(g,'.yw-online-role')?.textContent.includes('ゲスト / 部屋'),'guest joined');\n el(h,'.yw-online-start').click();\n await until(()=>el(h,'#battle-stage')?.dataset.stageReady==='true','host real battle stage');\n el(g,'.yw-online-connect').click();\n await until(()=>el(g,'#battle-stage')?.dataset.stageReady==='true','guest real battle stage');\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','both Firebase presences');\n assert(doc(g).querySelectorAll('.mb-creature').length===12,'guest missing rental 12 sprites');\n assert(doc(h).querySelectorAll('.mb-watch-command').length===4,'missing four PvP commands');\n assert(doc(h).querySelectorAll('script[src]').length===3,'online emulator needs pinned Firebase SDKs');\n assert(!doc(h).querySelector('link[rel=stylesheet]'),'CSS not inline');\n // Phase24C2: actual embedded CSS viewport, NOT an iPad Safari simulator.\n // Google Sites uses a constrained iframe: test 1024-class landscape, 820\n // split-view, narrow embed, and 390px fallback before gameplay gestures.\n for(const [width,height] of [[1024,768],[820,620],[568,520],[390,760]]){\n  g.style.width=width+'px';g.style.height=height+'px';\n  await sleep(90);\n  const d=doc(g),v=d.defaultView;\n  const root=d.documentElement,screen=el(g,'.mb-lower-screen');\n  assert(root.clientWidth===width,'wrong test iframe viewport '+width);\n  assert(root.scrollWidth<=width+3,\n   'horizontal page overflow at '+width+'px: '+root.scrollWidth);\n  assert(!!screen&&v.getComputedStyle(screen).display!=='none',\n   'lower touch screen disappeared at '+width+'px');\n  for(const selector of ['.mb-upper-screen','.mb-lower-screen',\n   '#mb-team1 .mb-wheel','[data-rotate=\"1\"]','.mb-watch-command']){\n   const item=el(g,selector),box=item?.getBoundingClientRect();\n   assert(box&&box.width>0&&box.height>0,\n    'invisible essential component '+selector+' at '+width+'px');\n   assert(box.left>=-3&&box.right<=width+3,\n    'essential component clipped horizontally '+selector+' at '+width+'px');\n  }\n  // The controls must not only exist: an actual point within them must\n  // hit the intended button, even when the embed viewport is narrow.\n  for(const selector of ['[data-rotate=\"1\"]','.mb-watch-command']){\n   const button=el(g,selector);\n   button.scrollIntoView({block:'center',inline:'nearest'});\n   const r=button.getBoundingClientRect();\n   const x=r.left+r.width/2,y=r.top+r.height/2;\n   assert(x>0&&x<width&&y>0&&y<height,\n    'touch target cannot be scrolled into iframe '+selector+' at '+width+'px');\n   const hit=d.elementFromPoint(x,y);\n   assert(hit&&(hit===button||button.contains(hit)),\n    'tap on '+selector+' intercepted by '+(hit?.className||'nothing')+\n    ' at '+width+'px');\n  }\n }\n g.style.width='1080px';g.style.height='750px';\n await sleep(70);\n assert(el(h,'#mb-step')?.hidden&&el(g,'#mb-step')?.hidden,\n  'research-only manual step must be hidden from online seats');\n el(g,'[data-rotate=\"1\"]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&\n  el(h,'#mb-revision')?.textContent.includes('B 1'),'guest authoritative command ACK');\n assert(!el(g,'#mb-team1 [data-unit=\"B2\"]').classList.contains('mb-bench'),\n  'guest front did not rotate');\n assert(!el(h,'#mb-team1 [data-unit=\"B4\"]').classList.contains('mb-bench'),\n  'host front did not rotate');\n el(g,'[data-rotate=\"1\"]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 2')&&\n  el(g,'.yw-online-status')?.textContent.includes('サークルはまだ回せません'),\n  'original wheel cooldown rejected and explained');\n assert(!el(g,'#mb-team1 [data-unit=\"B2\"]').classList.contains('mb-bench'),\n  'cooldown rule wrongly rotated guest');\n assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');\n await until(()=>el(h,'.yw-online-auto')?.disabled===false,'host auto progression ready');\n el(h,'.yw-online-auto').click();\n await until(()=>Number(el(g,'#mb-turn')?.textContent)>=1,\n  'host auto progression published to remote guest without manual step');\n assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='true',\n  'host auto clock was not enabled');\n g.contentWindow.firebase.database().goOffline();\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手が切断',\n  'host peer presence disconnect');\n const before=Number(el(h,'#mb-turn').textContent);\n await sleep(1700);\n assert(Number(el(h,'#mb-turn').textContent)===before,\n  'host research loop advanced while guest offline');\n assert(el(h,'.yw-online-auto').textContent.includes('一時停止'),\n  'disconnected host must show clock paused');\n g.contentWindow.firebase.database().goOnline();\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','guest reconnected');\n await until(()=>Number(el(g,'#mb-turn')?.textContent)>before,\n  'automatic host progression resumes on same battle after reconnect');\n el(h,'.yw-online-auto').click();\n assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='false',\n  'host OFF must stop the research interval');\n const stoppedAt=Number(el(h,'#mb-turn')?.textContent);\n await sleep(1800);\n assert(Number(el(h,'#mb-turn')?.textContent)===stoppedAt,\n  'host OFF must not advance a delayed ghost timer');\n result.textContent='SITES-ONLINE-EMULATOR-PASS real two-iframe inline HTML, auth/RTDB room, authoritative ACK, host auto clock pause and resume, four embed widths';\n})().catch(error=>{result.textContent='SITES-ONLINE-FAIL '+(error.stack||error.message)});\n</script></body></html>";
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
 qa=qa.replace('SITES-ONLINE-EMULATOR-PASS real two-iframe inline HTML, auth/RTDB',
  'SITES-FIREBASE-FRIENDS-EMULATOR-PASS real two-iframe inline HTML, no Auth/RTDB');
  // Firebase Friends: actual target selection after wheel cooldown rejection.
  // Same seeded host/guest room; never bypass the real game rules.
  qa=qa.replace("assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');","el(g,'#mb-target').click();\n el(g,'#mb-team0 [data-unit=A2]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 3')&&\n  el(h,'#mb-revision')?.textContent.includes('B 3'),\n  'guest pin command consumed by host and ACKed on both screens');\n assert(el(g,'#mb-team0 [data-unit=A2]').classList.contains('mb-pinned'),\n  'guest did not see pinned target after authoritative ACK');\n assert(el(g,'.yw-online-auto').hidden,'guest cannot control host auto progression');");

}
const server=createServer((req,res)=>{
 if(new URL(req.url,'http://localhost').pathname==='/embed'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fragment);return;
 }
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(qa);
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
}finally{await new Promise(ok=>server.close(ok));rmSync(tmp,{recursive:true,force:true});}
