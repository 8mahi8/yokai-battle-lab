/**
 * Phase22C real two-iframe Chromium / Firebase Auth+RTDB emulator QA.
 * One host and one independent guest account, with localhost-only
 * five-point guard fixture. No production Firebase, no Google Sites edits.
 */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(!/^(127\.0\.0\.1|localhost):9000$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''))
 throw Error('Real browser charge QA only accepts local Firebase emulator');
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Chromium required; cannot silently skip browser QA');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const qa="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\">\n<body><strong id=\"result\">FIREBASE-CHARGE-WAIT</strong>\n<iframe id=\"host\" src=\"/lab/firebase-match-stage.html?phase22c=1\" style=\"width:1050px;height:700px\"></iframe>\n<iframe id=\"guest\" src=\"/lab/firebase-match-stage.html\" style=\"width:1050px;height:700px\"></iframe>\n<script>\nconst result=document.getElementById('result');\nconst host=document.getElementById('host'),guest=document.getElementById('guest');\nfunction doc(frame){return frame.contentDocument;}\nfunction el(frame,id){return doc(frame)?.getElementById(id);}\nconst sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nasync function until(predicate,label){\n for(let n=0;n<200;n++){\n  if(predicate())return;\n  await sleep(85);\n }\n throw Error('timeout '+label+'; host='+el(host,'remote-status')?.textContent+\n  '; guest='+el(guest,'remote-status')?.textContent+\n  '; guest revision='+el(guest,'mb-revision')?.textContent);\n}\nfunction check(condition,label){if(!condition)throw Error(label);}\nfunction soulBar(frame,id){\n const node=doc(frame)?.querySelector('#mb-team'+(id[0]==='A'?0:1)+\n  ' [data-unit=\"'+id+'\"] .mb-soulbar i');\n return node?.style.width;\n}\n(async()=>{\n await until(()=>!el(host,'make')?.disabled&&!el(guest,'join')?.disabled,'independent Firebase logins');\n el(host,'make').click();\n await until(()=>el(host,'role')?.textContent.includes('ホスト / 部屋'),'room created');\n const room=el(host,'role').textContent.match(/部屋 (\\d{6})/);\n check(!!room,'6 digit code missing');\n el(guest,'code').value=room[1];el(guest,'join').click();\n await until(()=>el(guest,'role')?.textContent.includes('ゲスト / 部屋'),'guest joined');\n el(host,'start').click();\n await until(()=>el(host,'battle-stage')?.dataset.stageReady==='true','host stage');\n el(guest,'connect').click();\n await until(()=>el(guest,'battle-stage')?.dataset.stageReady==='true','guest stage');\n await until(()=>el(host,'link-state')?.textContent==='相手と接続中'&&\n  el(guest,'link-state')?.textContent==='相手と接続中','both seats online');\n // No debug giveSoul command: only canonical engine auto turns recover Soul.\n let turns=0;\n while(soulBar(guest,'B1')!=='100%'&&turns<80){\n  el(host,'mb-step').click();turns++;\n  await sleep(40);\n }\n await until(()=>soulBar(guest,'B1')==='100%'&&soulBar(host,'B1')==='100%',\n  'guest B1 gauge full after guard auto turns');\n check(soulBar(guest,'A1')!=='undefined','two teams remain rendered');\n el(guest,'mb-charge').click();\n const medal=doc(guest).querySelector('#mb-team1 [data-unit=\"B1\"]');\n check(!!medal&&medal.classList.contains('mb-choice-eligible'),'B1 not selectable in guest wheel');\n medal.click();\n await until(()=>el(guest,'remote-status')?.textContent==='必殺チャージを開始しました'&&\n  !el(guest,'mb-modal').hidden,'real guest charge started + modal');\n check(el(guest,'mb-gesture-help')?.textContent.includes('タップ'),'seed12 B1 expected tap fixture');\n check(soulBar(guest,'B1')==='100%','start should not consume B1 Soul');\n\n for(let i=0;i<6;i++){\n  const pad=el(guest,'mb-touch-pad');\n  const dot=doc(guest).querySelector('#mb-touch-points .mb-touch-target');\n  check(!!dot,'missing authoritative tap target #'+i);\n  const box=dot.getBoundingClientRect();\n  check(box.width>0&&box.height>0,'tap point invisible #'+i);\n  const x=box.left+box.width/2,y=box.top+box.height/2;\n  const ptr={bubbles:true,cancelable:true,button:0,pointerType:'touch',\n   pointerId:100+i,isPrimary:true,clientX:x,clientY:y};\n  pad.dispatchEvent(new PointerEvent('pointerdown',ptr));\n  pad.dispatchEvent(new PointerEvent('pointerup',ptr));\n  const text=i===5?'必殺チャージ完了：わざを発動しました':\n   'チャージ操作を反映しました（まだ発動していません）';\n  await until(()=>el(guest,'remote-status')?.textContent===text&&\n   el(guest,'mb-revision')?.textContent.includes('B '+(i+2)),\n   'authoritative ACK for touch '+i);\n  if(i<5){\n   check(soulBar(guest,'B1')==='100%','partial ACK consumed Soul prematurely');\n   check(!el(guest,'mb-modal').hidden,'partial ACK closed charge modal');\n  }\n }\n await until(()=>el(guest,'mb-modal').hidden&&soulBar(guest,'B1')==='0%'&&\n  soulBar(host,'B1')==='0%','complete only after sixth host-confirmed touch');\n check(el(guest,'remote-status').textContent.includes('わざを発動しました'),\n  'final guest message lost');\n // Simulate an actual Firebase Web SDK disconnection after the confirmed\n // charge. A locally-rendered stale tap must never mutate the host, and\n // the same tab must recover without restarting the authoritative battle.\n const revisionBeforeDisconnect=el(guest,'mb-revision').textContent;\n const lineupBefore=[...doc(host).querySelectorAll('#mb-team1 [data-unit]')]\n  .filter(u=>!u.classList.contains('mb-bench')).map(u=>u.dataset.unit);\n check(lineupBefore.length===3,'host must show three frontline medals before disconnect');\n guest.contentWindow.firebase.database().goOffline();\n await until(()=>el(guest,'link-state')?.textContent==='回線オフライン'&&\n  el(guest,'mb-connection')?.textContent==='2P PAUSE',\n  'guest offline presence blocks stage');\n doc(guest).querySelector('[data-rotate=\"1\"]').click();\n await sleep(190);\n check(el(guest,'mb-revision').textContent===revisionBeforeDisconnect,\n  'offline wheel input advanced guest revision');\n check(JSON.stringify([...doc(host).querySelectorAll('#mb-team1 [data-unit]')]\n  .filter(u=>!u.classList.contains('mb-bench')).map(u=>u.dataset.unit))===\n  JSON.stringify(lineupBefore),'offline wheel input changed host formation');\n guest.contentWindow.firebase.database().goOnline();\n await until(()=>el(guest,'link-state')?.textContent==='相手と接続中'&&\n  el(host,'link-state')?.textContent==='相手と接続中'&&\n  el(guest,'mb-connection')?.textContent==='2P ONLINE',\n  'both seats reconnected');\n doc(guest).querySelector('[data-rotate=\"1\"]').click();\n await until(()=>el(guest,'mb-revision')?.textContent.includes('B 8')&&\n  el(guest,'mb-revision')?.textContent!==revisionBeforeDisconnect,\n  'fresh guest action gets authoritative ACK after reconnect');\n result.textContent='FIREBASE-CHARGE-PASS guest six charge ACKs, two synchronized gauges, physical SDK offline pause and reconnect action ACK';\n})().catch(e=>{result.textContent='FIREBASE-CHARGE-FAIL '+(e.stack||e.message)});\n</script></body></html>";
const srv=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/qa'){res.writeHead(200,{'Content-Type':mime['.html']}).end(qa);return;}
  const abs=path.resolve(root,'.'+pathname);
  if(!abs.startsWith(root+path.sep))throw Error('not allowed');
  const bytes=await readFile(abs);
  res.writeHead(200,{'Content-Type':mime[path.extname(abs)]||'text/plain'}).end(bytes);
 }catch(_){res.writeHead(404).end('Not found');}
});
const tmp=mkdtempSync(path.join(tmpdir(),'firebase-charge-chrome-'));
try{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 let ok=false;
 for(let n=1;n<=2;n++){
  let output='',errors='',timedOut=false;
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
   '--disable-gpu','--no-first-run','--disable-extensions',
   '--user-data-dir='+path.join(tmp,'profile-'+n),
   '--window-size=1120,900','--virtual-time-budget=30000','--dump-dom',
   'http://127.0.0.1:'+srv.address().port+'/qa'],{stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},42000);
  child.stdout.on('data',b=>output+=String(b).slice(0,450000));
  child.stderr.on('data',b=>errors+=String(b).slice(0,6000));
  const exit=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timer);
  if(!timedOut&&exit===0&&output.includes('FIREBASE-CHARGE-PASS')){
   console.log('FIREBASE-CHARGE-PASS: real local Auth/RTDB two-browser host/guest charge from six authoritative ACKs');
   ok=true;break;
  }
  console.warn('browser charge trial '+n+' failed',
   output.match(/FIREBASE-CHARGE-FAIL[^<]+/)?.[0]||
   'timeout='+timedOut+' exit='+exit+' '+output.slice(-600)+' '+errors.slice(-250));
 }
 if(!ok)throw Error('real Firebase charge browser QA failed');
}finally{await new Promise(resolve=>srv.close(resolve));rmSync(tmp,{recursive:true,force:true});}
