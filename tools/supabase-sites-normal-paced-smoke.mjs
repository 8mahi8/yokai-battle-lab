/** Phase25: real Chromium 2 iframe Supabase Google Sites inline HTML QA. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const file='sites-supabase-online-code.html';
const fragment=await readFile(path.join(root,'dist',file),'utf8');
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Real Chromium required');
const qa="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\">\n<body><strong id=\"result\">PACED-MATCH-WAIT</strong>\n<iframe id=\"host\" style=\"width:1000px;height:790px\"></iframe>\n<iframe id=\"guest\" style=\"width:1000px;height:790px\"></iframe>\n<script>\nconst h=document.getElementById('host'),g=document.getElementById('guest');\nconst result=document.getElementById('result');\nconst report=text=>{result.textContent=text;\n fetch('/qa-report?value='+encodeURIComponent(text),{keepalive:true}).catch(()=>{});};\nconst el=(f,s)=>f.contentDocument?.querySelector(s);\nconst turn=f=>Number(el(f,'#mb-turn')?.textContent||0);\nconst finished=f=>el(f,'#battle-stage')?.dataset.matchFinished==='true';\nconst sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nconst assert=(ok,why)=>{if(!ok)throw Error(why)};\nasync function until(pred,label,attempts=1500){\n for(let i=0;i<attempts;i++){if(pred())return;await sleep(100);}\n throw Error('timeout '+label+\n  ' hTurn='+turn(h)+' gTurn='+turn(g)+\n  ' hostStatus='+el(h,'.yw-online-status')?.textContent+\n  ' guestStatus='+el(g,'.yw-online-status')?.textContent+\n  ' hRev='+el(h,'#mb-revision')?.textContent+\n  ' gRev='+el(g,'#mb-revision')?.textContent);\n}\nasync function checkpoint(target){\n await until(()=>turn(g)>=target||(finished(h)&&finished(g)),\n  'normal-speed guest reaches turn '+target);\n const hTurn=turn(h),gTurn=turn(g);\n assert(gTurn<=hTurn,'guest cannot simulate more turns than the host');\n assert(hTurn-gTurn<=6,'guest fell over six turns behind: '+hTurn+' vs '+gTurn);\n assert(el(g,'#mb-team0')?.querySelectorAll('.mb-creature').length===6,\n  'guest lost rental roster A');\n assert(el(g,'#mb-team1')?.querySelectorAll('.mb-creature').length===6,\n  'guest lost rental roster B');\n return gTurn;\n}\n(async()=>{\n const fragment=await (await fetch('/embed')).text();\n assert(!fragment.includes('QA-ONLY-NEVER-DEPLOY')&&!fragment.includes('yw-online-qa-finish'),\n  'normal rental simulation must NEVER use synthetic fast-kill QA code');\n h.srcdoc=fragment;g.srcdoc=fragment;\n await until(()=>el(h,'.yw-online-make')&&!el(h,'.yw-online-make').disabled&&\n  el(g,'.yw-online-join')&&!el(g,'.yw-online-join').disabled,\n  'both real anonymous auth',400);\n el(h,'.yw-online-make').click();\n await until(()=>el(h,'.yw-online-role')?.textContent.includes('ホスト / 部屋'),'room');\n const room=el(h,'.yw-online-role').textContent.match(/部屋 (\\d{6})/);\n assert(room,'6 digit room missing');\n el(g,'.yw-online-code').value=room[1];el(g,'.yw-online-join').click();\n await until(()=>el(g,'.yw-online-role')?.textContent.includes('ゲスト / 部屋'),'join');\n el(h,'.yw-online-start').click();\n await until(()=>el(h,'.yw-online-status')?.textContent.includes('ホスト開始'),\n  'host initial snapshot persisted');\n await until(()=>el(h,'#battle-stage')?.dataset.stageReady==='true','host stage');\n el(g,'.yw-online-connect').click();\n await until(()=>el(g,'#battle-stage')?.dataset.stageReady==='true','guest stage');\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','both online');\n assert(turn(h)===0&&turn(g)===0,'normal initial turn not zero');\n assert(el(h,'#mb-team0')?.querySelectorAll('.mb-creature').length===6,'missing six A');\n assert(el(g,'#mb-team1')?.querySelectorAll('.mb-creature').length===6,'missing six B');\n await until(()=>!el(h,'.yw-online-auto').disabled,'clock ready');\n el(h,'.yw-online-auto').click();\n assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='true','clock did not start');\n let checked=await checkpoint(15);\n if(!finished(h)){\n  // Try guest input during an active battle, NOT only in the idle lobby.\n  el(g,'[data-rotate=\"1\"]').click();\n  await until(()=>el(g,'#mb-revision')?.textContent.includes('B 1')&&\n   el(h,'#mb-revision')?.textContent.includes('B 1'),\n   'guest rotation ACK while auto battle is running');\n }\n checked=await checkpoint(30);\n if(!finished(h)){checked=await checkpoint(45);}\n if(!finished(h)){checked=await checkpoint(60);}\n if(!finished(h)){\n  assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='true',\n   'host auto clock stopped before 60 turns');\n  el(h,'.yw-online-auto').click();\n  assert(el(h,'.yw-online-auto').getAttribute('aria-pressed')==='false',\n   'host clock did not stop by user control');\n }\n await until(()=>turn(h)===turn(g) &&\n  el(h,'#mb-revision')?.textContent===el(g,'#mb-revision')?.textContent,\n  'final authoritative revision, both six-member rosters and turn agree');\n const final=turn(h);\n assert(final>=30,'insufficient paced real-match duration: '+final);\n if(finished(h)||finished(g)){\n  assert(finished(h)&&finished(g),'terminal winner not delivered to both seats');\n  assert(el(h,'#mb-finish-winner').textContent===\n   el(g,'#mb-finish-winner').textContent,'winner mismatch');\n  assert(el(h,'#mb-finish-title').textContent!==\n   el(g,'#mb-finish-title').textContent,'same win/lose on both seats');\n }\n await sleep(1900);\n assert(turn(h)===final&&turn(g)===final,\n  'ghost turns after clock stop or terminal victory');\n report('SITES-SUPABASE-PACED-PASS room='+room[1]+\n  ' normalRentals=6v6 guestCommand=ACK syncedTurns='+final+\n  ' checkpoints='+checked+' win='+finished(h));\n})().catch(error=>{report('SITES-SUPABASE-PACED-FAIL '+(error.stack||error.message))});\n</script></body></html>";
let finishReport;
const reportReady=new Promise(resolve=>{finishReport=resolve;});
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/qa-report'){
  // A client-side outcome is sent from the real Chromium page. Unlike
  // --dump-dom, no long virtual-time budget has to expire before inspecting
  // a result. The route is localhost-only, not a remote telemetry endpoint.
  const status=u.searchParams.get('value')||'report_empty';
  res.writeHead(200,{'Content-Type':'text/plain'}).end('received');
  finishReport(status);return;
 }
 if(u.pathname==='/embed'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fragment);return;
 }
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(qa);
});
const tmp=mkdtempSync(path.join(tmpdir(),'yw-pacing-cloud-'));
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port+'/qa';
 let stderr='';
 const child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--disable-extensions','--no-first-run',
  '--user-data-dir='+path.join(tmp,'profile'),
  '--window-size=1160,900','--virtual-time-budget=130000','--dump-dom',url],
  {stdio:['ignore','ignore','pipe']});
 child.stderr.on('data',x=>{stderr+=String(x).slice(-1000);
  if(stderr.length>4000)stderr=stderr.slice(-4000);});
 child.on('error',e=>finishReport('CHROME-LAUNCH-ERROR '+String(e)));
 child.on('close',(code)=>finishReport('CHROME-EXIT code='+code));
 let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;finishReport('TIMEOUT 175s')},175000);
 const reported=await reportReady;
 clearTimeout(timer);
 child.kill('SIGKILL');
 await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();
  else child.once('close',resolve);});
 if(!/^SITES-SUPABASE-PACED-PASS room=\d{6}\b/.test(reported))
  throw new Error('normal-rental cloud pacing failed: '+reported.slice(0,1200)+
    ' timedOut='+timedOut+' stderr='+stderr.slice(-500));
 console.log(reported);
}finally{
 await new Promise(resolve=>server.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
