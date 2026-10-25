/** Phase24B: actual inline Sites HTML online acceptance via Chromium srcdoc. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const emulator=process.argv.includes('--emulator');
if(emulator&&!/^(127\.0\.0\.1|localhost):9000$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''))
 throw Error('Online Sites E2E refuses all nonlocal Firebase');
const root=fileURLToPath(new URL('../',import.meta.url));
const file=emulator?'sites-online-emulator-qa-code.html':'sites-online-setup-code.html';
const fragment=await readFile(path.join(root,'dist',file),'utf8');
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Real Chromium required');
const qa="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\">\n<body><strong id=\"result\">ONLINE-EMBED-WAIT</strong>\n<iframe id=\"host\" style=\"width:1080px;height:750px\"></iframe>\n<iframe id=\"guest\" style=\"width:1080px;height:750px\"></iframe>\n<script>\nconst h=document.getElementById('host'),g=document.getElementById('guest');\nconst result=document.getElementById('result');\nconst doc=f=>f.contentDocument,el=(f,s)=>doc(f)?.querySelector(s);\nconst sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nconst assert=(condition,label)=>{if(!condition)throw Error(label)};\nasync function until(pred,label){\n for(let i=0;i<250;i++){if(pred())return;await sleep(90);}\n throw Error('timeout '+label+' host='+el(h,'.yw-online-status')?.textContent+\n ' guest='+el(g,'.yw-online-status')?.textContent+' guestRev='+el(g,'#mb-revision')?.textContent);\n}\n(async()=>{\n const fragment=await (await fetch('/embed')).text();\n h.srcdoc=fragment;\n if(location.search==='?setup'){\n  await until(()=>el(h,'.yw-online-status')?.textContent.includes('接続設定が未登録'),\n   'default gated status');\n  assert(el(h,'.yw-online-make').disabled,'unconfigured app incorrectly enabled room');\n  assert(doc(h).querySelectorAll('script[src],link[rel=\"stylesheet\"]').length===0,\n   'unconfigured embed included third-party SDK');\n  assert(fragment.includes('yw-sites-online'),'lost inline online controls');\n  result.textContent='SITES-ONLINE-SETUP-PASS no Firebase initialization or remote scripts without explicit config';\n  return;\n }\n g.srcdoc=fragment;\n await until(()=>!el(h,'.yw-online-make')?.disabled&&!el(g,'.yw-online-join')?.disabled,\n  'separate anonymous Auth in two embedded iframes');\n el(h,'.yw-online-make').click();\n await until(()=>el(h,'.yw-online-role')?.textContent.includes('ホスト / 部屋'),'room created');\n const room=el(h,'.yw-online-role').textContent.match(/部屋 (\\d{6})/);\n assert(room,'6-digit match room not found');\n el(g,'.yw-online-code').value=room[1];\n el(g,'.yw-online-join').click();\n await until(()=>el(g,'.yw-online-role')?.textContent.includes('ゲスト / 部屋'),'guest joined');\n el(h,'.yw-online-start').click();\n await until(()=>el(h,'#battle-stage')?.dataset.stageReady==='true','host real battle stage');\n el(g,'.yw-online-connect').click();\n await until(()=>el(g,'#battle-stage')?.dataset.stageReady==='true','guest real battle stage');\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','both Firebase presences');\n assert(doc(g).querySelectorAll('.mb-creature').length===12,'guest missing rental 12 sprites');\n assert(doc(h).querySelectorAll('.mb-watch-command').length===4,'missing four PvP commands');\n assert(doc(h).querySelectorAll('script[src]').length===3,'online emulator needs pinned Firebase SDKs');\n assert(!doc(h).querySelector('link[rel=stylesheet]'),'CSS not inline');\n el(g,'[data-rotate=\"1\"]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&\n  el(h,'#mb-revision')?.textContent.includes('B 1'),'guest authoritative command ACK');\n assert(!el(g,'#mb-team1 [data-unit=\"B2\"]').classList.contains('mb-bench'),\n  'guest front did not rotate');\n assert(!el(h,'#mb-team1 [data-unit=\"B4\"]').classList.contains('mb-bench'),\n  'host front did not rotate');\n el(g,'[data-rotate=\"1\"]').click();\n await until(()=>el(g,'#mb-revision')?.textContent.includes('B 2')&&\n  el(g,'.yw-online-status')?.textContent.includes('サークルはまだ回せません'),\n  'original wheel cooldown rejected and explained');\n assert(!el(g,'#mb-team1 [data-unit=\"B2\"]').classList.contains('mb-bench'),\n  'cooldown rule wrongly rotated guest');\n el(h,'#mb-step').click();\n await until(()=>el(g,'#mb-turn')?.textContent==='1','host auto turn visible on guest');\n g.contentWindow.firebase.database().goOffline();\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手が切断',\n  'host peer presence disconnect');\n const before=el(h,'#mb-turn').textContent;\n el(h,'#mb-step').click();\n assert(el(h,'#mb-turn').textContent===before,'host must pause while guest away');\n g.contentWindow.firebase.database().goOnline();\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','guest reconnected');\n el(h,'#mb-step').click();\n await until(()=>el(g,'#mb-turn')?.textContent==='2','same battle resumes');\n result.textContent='SITES-ONLINE-EMULATOR-PASS real two-iframe inline HTML, auth/RTDB room, authoritative ACK, cooldown and reconnection';\n})().catch(error=>{result.textContent='SITES-ONLINE-FAIL '+(error.stack||error.message)});\n</script></body></html>";
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
 for(let trial=1;trial<=2;trial++){
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu',
   '--disable-dev-shm-usage','--disable-extensions','--no-first-run',
   '--user-data-dir='+path.join(tmp,'profile-'+trial),
   '--window-size=1160,900','--virtual-time-budget=35000','--dump-dom',
   'http://127.0.0.1:'+server.address().port+'/qa'+(emulator?'':'?setup')],
   {stdio:['ignore','pipe','pipe']});
  let output='',errors='',timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},47000);
  child.stdout.on('data',x=>output+=String(x).slice(0,600000));
  child.stderr.on('data',x=>errors+=String(x).slice(0,8000));
  const exit=await new Promise(done=>child.on('close',done));
  clearTimeout(timer);
  const sentinel=emulator?'SITES-ONLINE-EMULATOR-PASS':'SITES-ONLINE-SETUP-PASS';
  if(!timedOut&&exit===0&&output.includes(sentinel)){console.log(sentinel);passed=true;break;}
  console.warn('Online Sites iframe trial '+trial+' failed: '+
   (output.match(/SITES-ONLINE-FAIL[^<]*/)?.[0]||
    'timeout='+timedOut+' exit='+exit+' '+output.slice(-600)+' '+errors.slice(-250)));
 }
 if(!passed)throw Error('Actual Chromium inline online Sites test failed');
}finally{await new Promise(ok=>server.close(ok));rmSync(tmp,{recursive:true,force:true});}
