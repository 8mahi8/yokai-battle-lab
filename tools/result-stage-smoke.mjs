/** Browser-side result UX smoke. Full combat proof stays in full-match test. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Chromium required for match result smoke');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const qa=String.raw\`<!doctype html><html lang="ja"><meta charset="utf-8">
<body><strong id="result">RESULT-QA-WAIT</strong>
<iframe id="win" src="/lab/match-stage.html?review=winner-a" style="width:980px;height:800px"></iframe>
<iframe id="lose" src="/lab/match-stage.html?review=winner-b" style="width:980px;height:800px"></iframe>
<script>
const result=document.querySelector('#result');
const el=(id,s)=>document.getElementById(id).contentDocument?.querySelector(s);
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test,label){
 for(let i=0;i<200;i++){if(test())return;await sleep(40)}
 throw Error('timeout '+label);
}
(async()=>{
 await until(()=>el('win','#battle-stage')?.dataset.stageReady==='true'&&
  el('lose','#battle-stage')?.dataset.stageReady==='true'&&
  !el('win','#mb-finish-screen')?.hidden&&!el('lose','#mb-finish-screen')?.hidden,
  'both terminal stage views');
 assert(el('win','#battle-stage').dataset.matchFinished==='true','winner not finished');
 assert(el('lose','#battle-stage').dataset.matchFinished==='true','loser not finished');
 assert(el('win','#mb-finish-title').textContent==='勝利！','winner headline incorrect');
 assert(el('lose','#mb-finish-title').textContent==='敗北…','loser headline incorrect');
 for(const seat of ['win','lose']){
  assert(el(seat,'#mb-finish-winner').textContent==='PLAYER A の勝ち',
    'authoritative winner diverges');
  const overlay=el(seat,'#mb-finish-screen');
  assert(overlay.getAttribute('role')==='status','non-accessible result');
  assert(overlay.getBoundingClientRect().height>=250,'overlay clipped');
  const btn=el(seat,'[data-act="result-close"]');
  assert(btn.getBoundingClientRect().height>=44,'close touch area too small');
  const revision=el(seat,'#mb-revision').textContent;
  btn.click();
  assert(overlay.hidden,'close result did not reveal battle');
  el(seat,'#mb-watch').click();
  el(seat,'[data-rotate="1"]').click();
  el(seat,'#mb-charge').click();
  assert(el(seat,'#mb-revision').textContent===revision,
   'finished match accepted player input');
  assert(overlay.hidden,'finish screen reopened after input');
 }
 result.textContent='MATCH-RESULT-PASS same winner, opposite results, read-only';
})().catch(err=>{result.textContent='MATCH-RESULT-FAIL '+(err.stack||err.message)});
</script></body></html>\`;
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/qa'){res.writeHead(200,{'Content-Type':mime['.html']}).end(qa);return;}
  const full=path.resolve(root,'.'+name);
  if(!full.startsWith(root+path.sep))throw Error('path out of root');
  const bytes=await readFile(full);
  res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'text/plain'}).end(bytes);
 }catch(_){res.writeHead(404).end('not found');}
});
const tmp=mkdtempSync(path.join(tmpdir(),'result-stage-'));
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/qa';
 let passed=false;
 for(let n=1;n<=2;n++){
  let output='',errors='',timedOut=false;
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
   '--disable-gpu','--no-first-run','--disable-extensions',
   '--user-data-dir='+path.join(tmp,'chrome-'+n),
   '--virtual-time-budget=20000','--window-size=1120,900','--dump-dom',url],
   {stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},25000);
  child.stdout.on('data',buf=>output+=String(buf).slice(0,180000));
  child.stderr.on('data',buf=>errors+=String(buf).slice(0,2000));
  const code=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timer);
  if(!timedOut&&code===0&&output.includes('MATCH-RESULT-PASS')){
   console.log('MATCH-RESULT-PASS actual Chromium result UI, both perspectives, input lock');
   passed=true;break;
  }
  console.warn('result UI attempt '+n+' failed: '+(output.match(/MATCH-RESULT-FAIL[^<]+/)?.[0]||
    ('exit='+code+' timedOut='+timedOut+' '+errors.slice(-500))));
 }
 if(!passed)throw Error('match result Chromium QA failed');
}finally{
 await new Promise(resolve=>server.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
