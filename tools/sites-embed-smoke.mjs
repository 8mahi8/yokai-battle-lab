/**
 * Actual Chromium acceptance for Phase24-A:
 * load the GENERATED Google Sites HTML snippet as iframe.srcdoc (not via
 * relative file URL or module imports); run canonical 1-device 2-seat actions.
 * This verifies the embed fragment format, not real Google Sites or Safari.
 */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const fragment=await readFile(path.join(root,'dist/sites-embed-code.html'),'utf8');
if(!fragment.includes('LOCAL ONLY')||/firebase\.initializeApp|useEmulator|<script[^>]+src=/i.test(fragment))
 throw Error('Sites snippet must be self-contained and explicitly offline-only');
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Real Chromium required - cannot fake embedded HTML QA');
const qa=String.raw`<!doctype html><html lang="ja"><meta charset="utf-8">
<body><strong id="verdict">SITES-EMBED-WAIT</strong><iframe id="site" width="1100" height="820"></iframe>
<script>
const verdict=document.querySelector('#verdict');
const frame=document.querySelector('#site');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const req=async()=>await (await fetch('/embed')).text();
const choose=(doc,q)=>{const node=doc.querySelector(q);if(!node)throw Error('missing '+q);return node;};
const must=(yes,message)=>{if(!yes)throw Error(message);};
(async()=>{
 const embedded=await req();frame.srcdoc=embedded;
 for(let i=0;i<200;i++){
  if(frame.contentDocument?.querySelector('#battle-stage')?.dataset.stageReady==='true')break;
  await sleep(65);
 }
 const d=frame.contentDocument;
 must(choose(d,'#battle-stage').dataset.stageReady==='true','bundled iframe stage failed to initialize');
 must(d.querySelectorAll('.mb-creature').length===12,'missing both six-member rental sets');
 must(d.querySelectorAll('.mb-watch-command').length===4,'missing original four commands');
 must(d.querySelectorAll('.mb-character-art:not(.mb-mini-art)').length===12,
  'original 12 art icons did not load inline');
 must(!d.querySelector('#mb-team0').hidden&&d.querySelector('#mb-team1').hidden,
  'one local wheel seat must be visible initially');
 must(d.querySelector('#mb-connection').textContent==='LOCAL ONLY',
  'this preview must never look like a live online room');
 must(d.querySelector('.yw-sites-trial-bar').textContent.includes('オンライン対戦・ルーム接続は未搭載'),
  'offline limitation must remain prominent');
 const styles=frame.contentWindow.getComputedStyle(d.querySelector('.mb-lower-screen'));
 must(styles.position==='relative','original dual-screen CSS not present');
 const turn=choose(d,'#mb-turn');
 must(turn.textContent==='0','expected battle turn zero');
 choose(d,'#mb-step').click();
 must(turn.textContent==='1','inline bundled canonical host step failed');
 choose(d,'#mb-seat-switch button[data-seat="1"]').click();
 must(d.querySelector('#mb-team1').hidden===false,'B seat did not become the controllable local wheel');
 const before=[...d.querySelectorAll('#mb-team1 .mb-creature:not(.mb-bench)')]
  .map(x=>x.dataset.unit).join(',');
 must(before.split(',').length===3,'must have B three front medals');
 choose(d,'#mb-team1 button[data-unit="B1"]');
 choose(d,'[data-rotate="1"]').click();
 const after=[...d.querySelectorAll('#mb-team1 .mb-creature:not(.mb-bench)')]
  .map(x=>x.dataset.unit).join(',');
 must(after!==before,'B seat wheel did not rotate via real bundled match engine');
 choose(d,'.yw-sites-reset').click();
 must(choose(d,'#mb-turn').textContent==='0','reset did not create new match protocol');
 must(d.querySelectorAll('.mb-creature').length===12,'reset lost inline portraits');
 must(d.querySelectorAll('script[src],link[rel="stylesheet"]').length===0,
  'generated snippet unexpectedly uses external resources');
 verdict.textContent='SITES-EMBED-PASS srcdoc single-html CSS+IIFE, both original wheels, auto step, rotation, restart, no Firebase';
})().catch(error=>{verdict.textContent='SITES-EMBED-FAIL '+String(error.stack||error.message)});
</script></body></html>`;
const server=createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/embed'){
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fragment);
  return;
 }
 response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(qa);
});
const tmp=mkdtempSync(path.join(tmpdir(),'yw-sites-embed-chrome-'));
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let ok=false;
 for(let trial=1;trial<=2;trial++){
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-extensions','--no-first-run','--user-data-dir='+path.join(tmp,'run-'+trial),
   '--window-size=1170,900','--virtual-time-budget=25000','--dump-dom',
   'http://127.0.0.1:'+server.address().port+'/qa'];
  const child=spawn(browser,args,{stdio:['ignore','pipe','pipe']});
  let html='',errors='',timedOut=false;
  const kill=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},38000);
  child.stdout.on('data',x=>{html+=String(x).slice(0,500000)});
  child.stderr.on('data',x=>{errors+=String(x).slice(0,3000)});
  const exit=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(kill);
  if(!timedOut&&exit===0&&html.includes('SITES-EMBED-PASS')){
   console.log('SITES-EMBED-PASS: inline Google Sites code fragment runs locally inside a Chromium iframe');
   ok=true;break;
  }
  console.warn('Phase24A Chromium trial '+trial+' failed:',
   html.match(/SITES-EMBED-FAIL[^<]*/)?.[0]||
   'timeout='+timedOut+' exit='+exit+' '+html.slice(-250)+' '+errors.slice(-350));
 }
 if(!ok)throw Error('Phase24A browser embedded fragment smoke did not pass');
}finally{
 await new Promise(resolve=>server.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
