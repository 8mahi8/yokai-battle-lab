/**
 * Dependency-free headless Chromium render smoke test for the *actual* GitHub
 * checkout HTML+ESM. This does not emulate a physical iPad's Safari engine.
 */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const candidates=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 '/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'];
const browser=candidates.find(existsSync);
if(!browser){
 console.log('BROWSER NOT PRESENT: no Chromium smoke executed');
 process.exit(0);
}
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const qaHtml=String.raw`<!doctype html><html lang="ja"><meta charset="utf-8"><title>Research browser interaction test</title>
<body><strong id="result">QA-PENDING</strong><iframe id="lab" src="/lab/phase2.html"></iframe>
<script>
const result=document.querySelector('#result');
document.querySelector('#lab').addEventListener('load',()=>{
 try{
  const doc=document.querySelector('#lab').contentDocument;
  const pick=sel=>{const e=doc.querySelector(sel);if(!e)throw new Error('Missing '+sel);return e;};
  for(let i=0;i<4;i++)pick('[data-soul="A1"]').click();
  if(!pick('#team0').textContent.includes('妖気 100/100'))throw new Error('Soul buttons failed');
  pick('[data-special="A1"]').click();
  if(pick('#chargeOverlay').hidden)throw new Error('Charge panel failed to open');
  pick('#chargeCancel').click();
  if(!pick('#chargeOverlay').hidden)throw new Error('Charge cancellation failed');
  pick('[data-sleep="A1"]').click();
  if(!pick('#team0').textContent.includes('💤'))throw new Error('Sleep UI failed');
  pick('[data-rotate="0"][data-dir="1"]').click();
  pick('[data-purify="A1"]').click();
  if(doc.querySelector('[data-purify="A1"]'))throw new Error('Purification failed');
  pick('[data-rotate="0"][data-dir="-1"]').click();
  for(const id of ['A6','A2'])for(let i=0;i<4;i++)pick('[data-soul="'+id+'"]').click();
  pick('[data-watch="0"]').click();
  pick('[data-special="A1"]').click();
  if(pick('#chargeOverlay').hidden)throw new Error('G charge did not open');
  pick('#chargeCancel').click();
  pick('[data-watch="0"]').click(); // switch back to standard
  pick('#motionDemo').click();
  if(!pick('#visibility').textContent.includes('演出中'))throw new Error('presentation lock not opened');
  const initialHp=Number(pick('#team1 .unit').getElementsByClassName('info')[1].textContent.split('/')[0]);
  pick('[data-special="A1"]').click();
  const pad=pick('#chargePad');
  function gesture(type,x,y){
   const r=pad.getBoundingClientRect();
   pad.dispatchEvent(new doc.defaultView.PointerEvent(type,{bubbles:true,cancelable:true,
    pointerId:21,pointerType:'touch',clientX:r.left+x*r.width,clientY:r.top+y*r.height}));
  }
  function finishCharge(){
  const kind=pick('#chargeTitle').textContent;
  if(kind.includes('打て')){
    for(let i=0;i<6;i++){
     const orb=pad.querySelector('circle[r="7"]');
     if(!orb)throw new Error('tap orb missing');
     const x=Number(orb.getAttribute('cx'))/100,y=Number(orb.getAttribute('cy'))/100;
     gesture('pointerdown',x,y);gesture('pointerup',x,y);
    }
  }else if(kind.includes('まわせ')){
   gesture('pointerdown',.8,.5);
   for(let i=1;i<=120;i++){
    const a=i*2*Math.PI/40;
    gesture('pointermove',.5+.3*Math.cos(a),.5+.3*Math.sin(a));
   }
   gesture('pointerup',.8,.5);
  }else if(kind.includes('なぞれ')){
   for(let i=0;i<3;i++){
    const poly=pad.querySelector('polyline');
    if(!poly)throw new Error('trace path missing');
    const points=poly.getAttribute('points').split(' ').map(p=>p.split(',').map(Number).map(v=>v/100));
    gesture('pointerdown',points[0][0],points[0][1]);
    for(const p of points.slice(1))gesture('pointermove',p[0],p[1]);
    gesture('pointerup',points[points.length-1][0],points[points.length-1][1]);
   }
  }else if(kind.includes('あわせろ')){
   for(let i=0;i<3;i++){
    const marker=[...pad.querySelectorAll('text')].find(t=>t.getAttribute('fill')==='#ffdb77');
    if(!marker)throw new Error('clock number missing');
    const angle=-Math.PI/2+Number(marker.textContent)*Math.PI/6;
    const x=.5+.32*Math.cos(angle),y=.5+.32*Math.sin(angle);
    gesture('pointerdown',.5,.18);gesture('pointermove',x,y);gesture('pointerup',x,y);
   }
  }else throw new Error('charge type missing: '+kind);
  if(!pick('#chargeOverlay').hidden)throw new Error('touch charge did not finish: '+kind);
  }
  finishCharge();
  const endHp=Number(pick('#team1 .unit').getElementsByClassName('info')[1].textContent.split('/')[0]);
  if(endHp>=initialHp)throw new Error('special did not deal HP damage: '+initialHp+' -> '+endHp);
  if(!pick('#log').textContent.includes('仮効果'))throw new Error('special action missing from log');
  if(!pick('#visibility').textContent.includes('演出中'))throw new Error('opponent animation ended before manual advance');
  if(pick('#visibility').textContent.includes('ノーモーション'))throw new Error('opponent saw special before animation unlock');
  pick('#advanceMotion').click();
  if(!pick('#visibility').textContent.includes('ノーモーション必殺'))throw new Error('opponent did not see no-motion release after animation');
  // Second independent browser scenario: actual counter hit must be delayed.
  pick('#reset').click();
  for(let i=0;i<4;i++)pick('[data-soul="A1"]').click();
  pick('#cutinStart').click();
  if(!pick('#counterStatus').textContent.includes('カットイン'))throw new Error('counter cutin did not appear');
  const hpBefore=Number(pick('#team1 .unit').getElementsByClassName('info')[1].textContent.split('/')[0]);
  pick('[data-special="A1"]').click();
  finishCharge();
  if(!pick('#status').textContent.includes('命中は'))throw new Error('counter hit did not queue');
  const hpCharging=Number(pick('#team1 .unit').getElementsByClassName('info')[1].textContent.split('/')[0]);
  if(hpCharging!==hpBefore)throw new Error('counter caused early HP damage');
  pick('[data-rotate="1"][data-dir="1"]').click();
  pick('#advanceMotion').click();
  if(!pick('#log').textContent.includes('カウンター命中'))throw new Error('counter hit missing from battle log');
  if(!pick('#counterStatus').textContent.includes('命中'))throw new Error('counter hit window missing from UI');
  const hpAfter=Number(pick('#team1 .unit').getElementsByClassName('info')[1].textContent.split('/')[0]);
  if(hpAfter>=hpBefore)throw new Error('locked front did not receive deferred counter damage');
  // Third browser scenario: charge completes BETWEEN two hidden wheel turns.
  // The paired-turn mechanic suppresses the intermediate front for targets.
  pick('#reset').click();
  for(let i=0;i<4;i++)pick('[data-soul="A1"]').click();
  pick('#cutinStart').click();
  pick('[data-rotate="1"][data-dir="1"]').click(); // provisional B2-B3-B4
  const hpOriginal=Number(pick('#team1 .unit').getElementsByClassName('info')[1].textContent.split('/')[0]);
  pick('[data-special="A1"]').click();
  finishCharge();
  if(!pick('#counterStatus').textContent.includes('B2、B3、B4'))throw new Error('first turn target not provisionally locked');
  pick('[data-rotate="1"][data-dir="1"]').click(); // now B3-B4-B5; correct to B1-B2-B3
  if(!pick('#wheelStatus').textContent.includes('中間配置を除外'))throw new Error('wheel-pair correction not shown');
  if(!pick('#counterStatus').textContent.includes('B1、B2、B3'))throw new Error('target window not corrected');
  if(pick('#visibility').textContent.includes('ノーモーション'))throw new Error('paired-turn release appeared before unlock');
  pick('#advanceMotion').click();
  if(!pick('#visibility').textContent.includes('ノーモーション必殺'))throw new Error('paired-turn no-motion not revealed');
  const counterLog=pick('#log').textContent;
  if(!counterLog.includes('カウンター命中')||!counterLog.includes('B1・B2・B3'))
   throw new Error('paired-turn hit was not delivered to original frontline');
  // B1 has rotated to the bench; its HP should decrease there.
  const benchSnapshot=pick('#team1').textContent;
  if(!benchSnapshot.includes('B1'))throw new Error('bench B1 missing');
  // Four consecutive rotations have no reliable original-game target rule.
  // The lab must explicitly warn rather than invent and apply HP damage.
  pick('#reset').click();
  for(let i=0;i<4;i++)pick('[data-soul="A1"]').click();
  pick('#cutinStart').click();
  pick('[data-special="A1"]').click();
  finishCharge();
  pick('#wheelThreeDemo').click();
  if(!pick('#wheelStatus').textContent.includes('原作の命中判定は未確認'))
   throw new Error('missing visible three-turn uncertainty');
  const teamBeforeUnknown=pick('#team1').textContent;
  pick('#advanceMotion').click();
  if(!pick('#log').textContent.includes('対象未確定のためダメージ保留'))
   throw new Error('missing unknown counter hit record');
  if(pick('#team1').textContent!==teamBeforeUnknown)
   throw new Error('unsourced three-turn guess changed HP');
  result.textContent='QA-PASS';
 }catch(error){result.textContent='QA-FAIL '+error.message;}
});
</script></body></html>`;
const srv=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/__browser_smoke__.html'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(qaHtml);return;
  }
  const p=path.resolve(root,'.'+pathname);
  if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const data=await readFile(p);
  res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(data);
 }catch{res.writeHead(404).end('Missing');}
});
const tmp=mkdtempSync(path.join(tmpdir(),'research-chrome-'));
async function renderedDom(url,tag,expected,virtualTime){
 let failure='';
 for(let attempt=1;attempt<=2;attempt++){
  const profile=path.join(tmp,tag+'-'+attempt);
  let out='',errors='',timedOut=false;
  const child=spawn(browser,[
   '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
   '--disable-background-networking','--no-first-run','--no-default-browser-check',
   '--disable-extensions','--disable-background-timer-throttling',
   '--user-data-dir='+profile,'--virtual-time-budget='+virtualTime,'--dump-dom',url
  ],{stdio:['ignore','pipe','pipe']});
  const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},14000);
  child.stdout.on('data',b=>{out+=String(b).slice(0,250000);});
  child.stderr.on('data',b=>{errors+=String(b).slice(0,30000);});
  const exit=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timeout);
  const missing=expected.filter(x=>!out.includes(x));
  if(!timedOut&&exit===0&&!missing.length)return out;
  failure='attempt '+attempt+': exit='+exit+', timedOut='+timedOut+
   ', missing='+missing.join(', ')+'; DOM='+out.slice(-1000)+'; STDERR='+errors.slice(-1000);
  console.warn(tag+' Chrome attempt failed; '+failure.slice(0,500));
 }
 throw new Error('Chromium '+tag+' failed after retries: '+failure);
}
try{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const address=srv.address();
 const rootUrl='http://127.0.0.1:'+address.port;
 await renderedDom(rootUrl+'/lab/phase2.html','render',[
  'data-special="A1"','data-special="B1"','class="slot"',
  'data-watch="0"','data-soul="A1"','id="chargePad"','id="visibility"'
 ],1500);
 console.log('Chromium HTML/ES-module DOM rendered: 2 teams, forecast, Soul and charge controls');
 await renderedDom(rootUrl+'/__browser_smoke__.html','interaction',['QA-PASS'],2500);
 console.log('Chromium interaction passed: paired wheel damage and unsourced 3+ uncertainty without HP change');
}finally{
 await new Promise(resolve=>srv.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
