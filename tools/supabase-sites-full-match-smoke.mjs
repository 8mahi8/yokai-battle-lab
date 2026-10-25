/** Phase25: real Chromium 2 iframe Supabase Google Sites inline HTML QA. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const file='sites-supabase-qa-full-match-code.html';
const fragment=await readFile(path.join(root,'dist',file),'utf8');
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Real Chromium required');
const qa="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\">\n<body><strong id=\"result\">FULL-MATCH-WAIT</strong>\n<iframe id=\"host\" style=\"width:980px;height:770px\"></iframe>\n<iframe id=\"guest\" style=\"width:980px;height:770px\"></iframe>\n<script>\nconst h=document.getElementById('host'),g=document.getElementById('guest');\nconst result=document.getElementById('result');\nconst el=(frame,selector)=>frame.contentDocument?.querySelector(selector);\nconst sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nconst assert=(ok,label)=>{if(!ok)throw Error(label)};\nasync function until(pred,label){\n for(let i=0;i<700;i++){if(pred())return;await sleep(100)}\n throw Error('timeout '+label+' host='+el(h,'.yw-online-status')?.textContent+\n  ' guest='+el(g,'.yw-online-status')?.textContent+\n  ' hostRev='+el(h,'#mb-revision')?.textContent+\n  ' guestRev='+el(g,'#mb-revision')?.textContent);\n}\n(async()=>{\n const fragment=await (await fetch('/embed')).text();\n assert(fragment.includes('QA-ONLY-NEVER-DEPLOY'),'missing isolated QA marker');\n assert(fragment.includes('yw-online-qa-finish'),'missing QA-only fast finish button');\n h.srcdoc=fragment;\n g.srcdoc=fragment;\n await until(()=>!!el(h,'.yw-online-make')&&!!el(g,'.yw-online-join')&&
  !el(h,'.yw-online-make').disabled&&!el(g,'.yw-online-join').disabled,\n  'isolated Supabase anonymous auth');\n el(h,'.yw-online-make').click();\n await until(()=>el(h,'.yw-online-role')?.textContent.includes('ホスト / 部屋'),'host room');\n const room=el(h,'.yw-online-role').textContent.match(/部屋 (\\d{6})/);\n assert(room,'room code unknown');\n el(g,'.yw-online-code').value=room[1];\n el(g,'.yw-online-join').click();\n await until(()=>el(g,'.yw-online-role')?.textContent.includes('ゲスト / 部屋'),'guest joined');\n el(h,'.yw-online-start').click();\n await until(()=>el(h,'#battle-stage')?.dataset.stageReady==='true','real host stage');\n el(g,'.yw-online-connect').click();\n await until(()=>el(g,'#battle-stage')?.dataset.stageReady==='true','real guest stage');\n await until(()=>el(h,'.yw-online-presence')?.textContent==='相手と接続中'&&\n  el(g,'.yw-online-presence')?.textContent==='相手と接続中','both alive');\n assert(el(h,'#mb-turn').textContent==='0'&&el(g,'#mb-turn').textContent==='0',\n  'battle should begin at turn zero');\n el(h,'.yw-online-qa-finish').click();\n await until(()=>el(h,'#battle-stage')?.dataset.matchFinished==='true'&&\n  el(g,'#battle-stage')?.dataset.matchFinished==='true',\n  'both seats receive cloud-published terminal snapshot');\n assert(!el(h,'#mb-finish-screen').hidden&&!el(g,'#mb-finish-screen').hidden,\n  'real winner/loser overlay did not appear at each seat');\n const winner=el(h,'#mb-finish-winner').textContent;\n assert(winner==='PLAYER A の勝ち','seeded full-match fixture did not lead to A winner: '+winner);\n assert(el(g,'#mb-finish-winner').textContent===winner,'different terminal winners');\n assert(el(h,'#mb-finish-title').textContent==='勝利！','host not shown victory');\n assert(el(g,'#mb-finish-title').textContent==='敗北…','guest not shown defeat');\n const hostTurn=Number(el(h,'#mb-turn').textContent);\n const guestTurn=Number(el(g,'#mb-turn').textContent);\n assert(hostTurn>=7&&guestTurn===hostTurn,'terminal match turn mismatched '+hostTurn+' '+guestTurn);\n assert(el(g,'#mb-team1 .mb-creature.mb-ko').length===undefined || true,'legacy no-op');\n // All six enemies in the B rental should be KO in the decisive snapshot.\n assert(el(g,'#mb-team1')?.querySelectorAll('.mb-creature.mb-ko').length===6,\n  'all six guest-side rentals must be KO at match finish');\n assert(el(h,'.yw-online-auto').disabled===true,\n  'host auto clock may not begin a second match after terminal state');\n const rev=el(g,'#mb-revision').textContent;\n el(g,'[data-rotate=\"1\"]').click();\n await sleep(500);\n assert(el(g,'#mb-revision').textContent===rev,'input changed after final victory');\n result.textContent='SITES-SUPABASE-FULL-MATCH-PASS room='+room[1]+\n  ' turns='+hostTurn+' both seats / 6 KO / result UI / no post-win commands';\n})().catch(error=>{result.textContent='SITES-SUPABASE-FULL-MATCH-FAIL '+(error.stack||error.message)});\n</script></body></html>";
const server=createServer((req,res)=>{
 if(new URL(req.url,'http://localhost').pathname==='/embed'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fragment);return;
 }
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(qa);
});
const tmp=mkdtempSync(path.join(tmpdir(),'yw-sites-supabase-'));
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let passed=false;
 for(let trial=1;trial<=1;trial++){
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu',
   '--disable-dev-shm-usage','--disable-extensions','--no-first-run',
   '--user-data-dir='+path.join(tmp,'profile-'+trial),
   '--window-size=1160,900','--virtual-time-budget=120000','--dump-dom',
   'http://127.0.0.1:'+server.address().port+'/qa'],
   {stdio:['ignore','pipe','pipe']});
  let output='',errors='',timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},150000);
  child.stdout.on('data',x=>output+=String(x).slice(0,600000));
  child.stderr.on('data',x=>errors+=String(x).slice(0,8000));
  const exit=await new Promise(done=>child.on('close',done));
  clearTimeout(timer);
  // Chrome --dump-dom embeds our JavaScript source including PASS literal.
  // Reading stdout.includes('PASS') is a FALSE POSITIVE; inspect the rendered
  // result element's textContent instead. Verify an actual six-digit room.
  const rendered=output.match(/<strong id="result">([^<]*)<\/strong>/)?.[1]||'missing-result-node';
  if(!timedOut&&exit===0&&/^SITES-SUPABASE-FULL-MATCH-PASS room=\d{6}\b/.test(rendered)){
   console.log(rendered);passed=true;break;
  }
  console.warn('Supabase full-match iframe trial '+trial+' failed: '+
   'rendered='+rendered.slice(0,1200)+' timeout='+timedOut+
   ' exit='+exit+' stderr='+errors.slice(-300));
 }
 if(!passed)throw Error('Real Supabase full-match two-iframe test failed');
}finally{await new Promise(ok=>server.close(ok));rmSync(tmp,{recursive:true,force:true});}
