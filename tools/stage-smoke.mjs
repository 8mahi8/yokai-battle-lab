/**
 * Actual Chromium DOM interaction smoke for Phase 14 original-engine stage.
 * Self-contained, no external network, no production Firebase.
 */
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
if(!browser)throw new Error('Chromium required: refusing false-green UI test');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const qa=String.raw`<!doctype html><html lang="ja"><meta charset="utf-8">
<body><strong id="result">STAGE-WAIT</strong>
<iframe id="frame" src="/lab/match-stage.html" style="width:1120px;height:740px;border:0"></iframe>
<script>
const report=document.getElementById('result');
document.getElementById('frame').addEventListener('load',()=>{
 try {
  const root=document.getElementById('frame').contentDocument;
  const pick=x=>{let a=root.querySelector(x);if(!a)throw Error('missing '+x);return a;};
  const check=(condition,message)=>{if(!condition)throw Error(message);};
  check(pick('#battle-stage').dataset.stageReady==='true','ESM stage not ready');
  check(root.querySelectorAll('.mb-creature').length===12,'not 12 original rental creatures');
  check(root.querySelectorAll('.mb-character-art:not(.mb-mini-art)').length===12,
   'all 12 original SVG characters must render in battle');
  check(root.querySelectorAll('.mb-mini-art').length===5,'forecast must reuse SVG portraits');
  const aDesigns=[...root.querySelectorAll('#mb-team0 .mb-character-art')].map(x=>x.dataset.design);
  const bDesigns=[...root.querySelectorAll('#mb-team1 .mb-character-art')].map(x=>x.dataset.design);
  check(new Set(aDesigns).size===6,'characters are not visually distinguishable');
  check(JSON.stringify(aDesigns)===JSON.stringify(bDesigns),'rentals differ between two seats');
  check(root.querySelectorAll('.mb-creature image,.mb-creature img,.mb-creature filter').length===0,
   'original art must be local filter-free vectors');
  const firstArt=pick('#mb-team0 [data-unit="A1"] .mb-character-art');
  const firstBox=firstArt.getBoundingClientRect();
  check(firstBox.width>=40&&firstBox.width<=60&&firstBox.height>=40,
   'portrait is not readable at intended iPad card size');
  check(root.querySelectorAll('.mb-next').length===5,'missing 5 predicted actions');
  check(pick('#mb-turn').textContent==='0','wrong starting turn');
  const panel=pick('#mb-team0');
  check(Number.parseFloat(getComputedStyle(panel).minHeight)>=290,'battle stage has no layout');
  for(const team of root.querySelectorAll('.mb-team')){
   const boundary=team.getBoundingClientRect();
   for(const card of team.querySelectorAll('.mb-creature')){
    const box=card.getBoundingClientRect();
    check(box.top>=boundary.top+2&&box.bottom<=boundary.bottom-2,
     'a wheel creature card is clipped by its team panel: '+card.dataset.unit);
   }
  }
  pick('#mb-team1 [data-unit="B1"]').click();
  check(pick('#mb-team1 [data-unit="B1"]').classList.contains('mb-pinned'),'enemy pin did not follow canonical protocol');
  pick('[data-rotate="1"]').click();
  check(!pick('#mb-team0 [data-unit="A4"]').classList.contains('mb-bench'),'A side wheel failed to rotate');
  check(pick('#mb-revision').textContent.includes('REV 2'),'game revision did not advance after pin and rotation');
  pick('#mb-watch').click();
  check(pick('#mb-watch').textContent.includes('標準ウォッチ'),'standard -> zero watch toggle failed');
  pick('#mb-step').click();
  check(Number(pick('#mb-turn').textContent)===1,'actual automatic battle action failed');
  check(!pick('#mb-action-label').textContent.includes('待機中'),'canonical actor summary not shown');
  check(root.querySelectorAll('.mb-acting').length===1,'actual actor should flash once');
  check(root.querySelectorAll('.mb-hit,.mb-healed').length<=1,'only one canonical target may flash');
  pick('[data-seat="1"]').click();
  check(pick('#mb-active-label').textContent.includes('PLAYER B'),'offline seat switch failed');
  pick('[data-rotate="-1"]').click();
  check(!pick('#mb-team1 [data-unit="B6"]').classList.contains('mb-bench'),'B side wheel failed to rotate');
  check(root.querySelectorAll('.mb-creature').length===12,'cards lost after battle actions');
  check(root.querySelectorAll('.mb-next').length===5,'forecast lost after battles');
  check(pick('#mb-modal').hidden,'touch mini-game unexpectedly visible');
  report.textContent='STAGE-PASS canonical engine wheel pin watch host tick seat selection and five forecasts';
 }catch(error){report.textContent='STAGE-FAIL '+(error.stack||error.message);}
});
</script></body></html>`;
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/qa'){res.writeHead(200,{'Content-Type':mime['.html']}).end(qa);return;}
  const target=path.resolve(root,'.'+name);
  if(!target.startsWith(root+path.sep))throw Error('out of tree');
  const buffer=await readFile(target);
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'text/plain'}).end(buffer);
 }catch(error){res.writeHead(404).end('Not found');}
});
const tmp=mkdtempSync(path.join(tmpdir(),'stage-chromium-'));
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint='http://127.0.0.1:'+server.address().port+'/qa';
 let success=false;
 for(let i=1;i<=2;i++){
  const profile=path.join(tmp,'chrome-'+i);
  const cmd=['--headless=new','--no-sandbox','--disable-dev-shm-usage',
   '--disable-gpu','--disable-background-networking','--no-first-run',
   '--no-default-browser-check','--disable-extensions',
   '--user-data-dir='+profile,'--window-size=1180,900',
   '--virtual-time-budget=3000','--dump-dom',endpoint];
  let stdout='',stderr='',timedOut=false;
  const child=spawn(browser,cmd,{stdio:['ignore','pipe','pipe']});
  const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},16000);
  child.stdout.on('data',b=>stdout+=String(b).slice(0,250000));
  child.stderr.on('data',b=>stderr+=String(b).slice(0,5000));
  const exit=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timeout);
  if(!timedOut&&exit===0&&stdout.includes('STAGE-PASS')){
   console.log('STAGE-PASS: canonical combat, 2 wheel seats, pinned enemy, watch, actual turn and five forecasts');
   success=true;break;
  }
  const problem=stdout.match(/STAGE-FAIL[^<]+/)?.[0]||stdout.slice(-700)||stderr.slice(-700);
  console.warn('Stage browser smoke attempt '+i+' failed: '+problem);
 }
 if(!success)throw Error('Phase14 real Chromium stage interaction did not pass');
 // Create a visual review artifact from the actual ESM app (not a mock image).
 const shot=path.join(root,'phase14-stage-preview.png');
 const child=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'visual'),
  '--window-size=1200,880','--virtual-time-budget=2200',
  '--screenshot='+shot,'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html'
 ],{stdio:['ignore','pipe','pipe']});
 let errors='';
 child.stderr.on('data',b=>errors+=String(b).slice(0,10000));
 const timeout=setTimeout(()=>child.kill('SIGKILL'),18000);
 const exit=await new Promise(resolve=>child.on('close',resolve));
 clearTimeout(timeout);
 if(exit!==0||!existsSync(shot))throw Error('Stage image capture failed: '+errors.slice(-500));
 console.log('SCREENSHOT-READY phase14-stage-preview.png');
 const galleryShot=path.join(root,'phase15-character-gallery.png');
 const galleryChild=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'gallery'),
  '--window-size=1140,1010','--virtual-time-budget=2200',
  '--screenshot='+galleryShot,'http://127.0.0.1:'+server.address().port+'/lab/character-gallery.html'
 ],{stdio:['ignore','pipe','pipe']});
 let galleryError='';
 galleryChild.stderr.on('data',b=>galleryError+=String(b).slice(0,2000));
 const galleryTimeout=setTimeout(()=>galleryChild.kill('SIGKILL'),18000);
 const galleryExit=await new Promise(resolve=>galleryChild.on('close',resolve));
 clearTimeout(galleryTimeout);
 if(galleryExit!==0||!existsSync(galleryShot))
  throw new Error('Character gallery image capture failed: '+galleryError.slice(-400));
 console.log('SCREENSHOT-READY phase15-character-gallery.png');
}finally{
 await new Promise(resolve=>server.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
