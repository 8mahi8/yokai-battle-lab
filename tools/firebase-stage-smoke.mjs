/**
 * Real Chromium two-iframe authenticated Firebase SDK browser smoke.
 * Must run ONLY inside demo-yokai-lab RTDB+Auth emulators. Never live cloud.
 * Two same-origin iframes use Auth.Persistence.NONE for separate UIDs.
 */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(!/^(127\.0\.0\.1|localhost):9000$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''))
 throw Error('Refusing browser integration outside local RTDB emulator');
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Chromium required; browser QA cannot falsely pass as skipped');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const qa=String.raw`<!doctype html><html lang="ja"><meta charset="utf-8">
<body><strong id="result">FIREBASE-STAGE-WAIT</strong>
<iframe id="host" src="/lab/firebase-match-stage.html" style="width:1050px;height:700px"></iframe>
<iframe id="guest" src="/lab/firebase-match-stage.html" style="width:1050px;height:700px"></iframe>
<script>
const result=document.getElementById('result');
const host=document.getElementById('host'),guest=document.getElementById('guest');
function doc(frame){return frame.contentDocument;}
function el(frame,id){return doc(frame)?.getElementById(id);}
async function until(predicate,label){
 for(let n=0;n<170;n++){
  if(predicate())return;
  await new Promise(done=>setTimeout(done,90));
 }
 throw Error('timeout '+label+'; host='+el(host,'remote-status')?.textContent+
  '; guest='+el(guest,'remote-status')?.textContent);
}
(async()=>{
 await until(()=>!el(host,'make')?.disabled&&!el(guest,'join')?.disabled,'auth SDK signed in');
 el(host,'make').click();
 await until(()=>el(host,'role')?.textContent.includes('ホスト / 部屋'),'create room');
 const match=el(host,'role').textContent.match(/部屋 (\d{6})/);
 if(!match)throw Error('room code not generated');
 el(guest,'code').value=match[1];
 el(guest,'join').click();
 await until(()=>el(guest,'role')?.textContent.includes('ゲスト / 部屋'),'join guest');
 el(host,'start').click();
 await until(()=>el(host,'battle-stage')?.dataset.stageReady==='true','host stage');
 el(guest,'connect').click();
 await until(()=>el(guest,'battle-stage')?.dataset.stageReady==='true','guest stage');
 await until(()=>el(host,'link-state')?.textContent==='相手と接続中'&&
  el(guest,'link-state')?.textContent==='相手と接続中',
  'both devices report peer presence');
 if(doc(host).querySelectorAll('.mb-creature').length!==12||
    doc(guest).querySelectorAll('.mb-creature').length!==12)
  throw Error('battle stage lost 6v6 rental rosters');
 if(doc(guest).querySelectorAll('.mb-next').length!==5)throw Error('guest forecast absent');
 doc(guest).querySelector('[data-rotate="1"]').click();
 await until(()=>el(guest,'mb-revision')?.textContent.includes('B 1')&&
  el(host,'mb-revision')?.textContent.includes('B 1'),'guest ACK -> host canonical revision');
 if(doc(guest).querySelector('#mb-team1 [data-unit="B2"]').classList.contains('mb-bench'))
  throw Error('guest wheel rotation did not reflect on B2');
 if(doc(host).querySelector('#mb-team1 [data-unit="B4"]').classList.contains('mb-bench'))
  throw Error('host did not reflect guest wheel B4');
 doc(host).querySelector('[data-rotate="1"]').click();
 await until(()=>el(guest,'mb-revision')?.textContent.includes('A 1'),'guest receives host action');
 el(host,'mb-step').click();
 await until(()=>Number(el(guest,'mb-turn')?.textContent)===1,'guest receives authoritative time advance');
 if(doc(host).querySelector('#mb-turn').textContent!=='1')throw Error('host turn not 1');
 // Drop the guest transport. The server should run the guest's registered
 // onDisconnect(false), host must pause controls, then guest reconnects.
 guest.contentWindow.firebase.database().goOffline();
 await until(()=>el(host,'link-state')?.textContent==='相手が切断','host sees actual peer drop');
 const turnBefore=Number(el(host,'mb-turn').textContent);
 el(host,'mb-step').click();
 if(Number(el(host,'mb-turn').textContent)!==turnBefore)
  throw Error('host advanced battle while guest offline');
 guest.contentWindow.firebase.database().goOnline();
 await until(()=>el(host,'link-state')?.textContent==='相手と接続中'&&
  el(guest,'link-state')?.textContent==='相手と接続中','peer reconnected');
 el(host,'mb-step').click();
 await until(()=>Number(el(guest,'mb-turn')?.textContent)===turnBefore+1,
  'battle resumes on same host engine after guest transport reconnect');
 result.textContent='FIREBASE-STAGE-PASS room sync, actual guest disconnect, host pause, transport resume';
})().catch(e=>{result.textContent='FIREBASE-STAGE-FAIL '+(e.stack||e.message)});
</script></body></html>`;
const srv=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/qa'){res.writeHead(200,{'Content-Type':mime['.html']}).end(qa);return;}
  const absolute=path.resolve(root,'.'+pathname);
  if(!absolute.startsWith(root+path.sep))throw Error('not allowed');
  const bytes=await readFile(absolute);
  res.writeHead(200,{'Content-Type':mime[path.extname(absolute)]||'text/plain'}).end(bytes);
 }catch(_){res.writeHead(404).end('Not found');}
});
const tmp=mkdtempSync(path.join(tmpdir(),'firebase-stage-chrome-'));
try{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 let ok=false;
 for(let i=1;i<=2;i++){
  let output='',errors='',timedOut=false;
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
   '--disable-gpu','--no-first-run','--disable-extensions',
   '--user-data-dir='+path.join(tmp,'profile-'+i),
   '--window-size=1120,900','--virtual-time-budget=19000','--dump-dom',
   'http://127.0.0.1:'+srv.address().port+'/qa'],{stdio:['ignore','pipe','pipe']});
  const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},27000);
  child.stdout.on('data',b=>output+=String(b).slice(0,350000));
  child.stderr.on('data',b=>errors+=String(b).slice(0,10000));
  const exit=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timeout);
  if(!timedOut&&exit===0&&output.includes('FIREBASE-STAGE-PASS')){
   console.log('FIREBASE-STAGE-PASS: separate anonymous browser tabs + real emulators + canonical battle stage');
   ok=true;break;
  }
  console.warn('browser trial '+i+' failed',output.match(/FIREBASE-STAGE-FAIL[^<]+/)?.[0]||
   'timeout='+timedOut+' exit='+exit+' '+output.slice(-800)+' '+errors.slice(-300));
 }
 if(!ok)throw Error('real Firebase emulator browser stage did not pass');
}finally{await new Promise(resolve=>srv.close(resolve));rmSync(tmp,{recursive:true,force:true});}
