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
  check(root.querySelectorAll('#mb-special-flare').length===1,
   'battle stage must have exactly one special cut-in (duplicate DOM IDs)');
  check(root.querySelectorAll('#mb-special-title').length===1,
   'special title must not have duplicate DOM IDs');
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
  check(pick('.mb-forecast-section').hidden,
   'non-original five-action debug forecast must stay hidden in reproduction-first UI');
  check(pick('#mb-turn').textContent==='0','wrong starting turn');
  const panel=pick('.mb-lower-screen');
  check(panel.getBoundingClientRect().height>=270,'lower command screen has no layout');
  check(pick('.mb-upper-screen').getBoundingClientRect().height>=200,'upper battle screen has no layout');
  check(root.querySelectorAll('#mb-ally-line .mb-fighter').length===3,'must show own three active fighters');
  check(root.querySelectorAll('#mb-foe-line .mb-fighter').length===3,'must show opponent three active fighters');
  check(!pick('#mb-team0').hidden&&pick('#mb-team1').hidden,'show only own wheel, not two competing circles');
  check(root.querySelectorAll('.mb-watch-command').length===4,'four original corner commands absent');
  check(pick('.mb-command-item').disabled,'PvP battle items must not be usable');
  pick('#mb-charge').click();
  check(pick('#mb-charge').classList.contains('mb-command-active'),
   'soultimate must require selecting a wheel medal');
  check(pick('#mb-charge').getAttribute('aria-pressed')==='true','charge button not accessible');
  check(root.querySelectorAll('#mb-team0 .mb-creature.mb-choice-eligible').length===0,
   'uncharged front medals must not falsely say わざOK');
  check(root.querySelectorAll('#mb-team0 .mb-creature.mb-choice-ineligible').length===6,
   'all six uncharged medals must remain ineligible');
  check(pick('#mb-choice-status').textContent.includes('いません'),'uncharged command should show no ready members');
  check(root.querySelectorAll('.mb-special-ready').length===0,'do not advertise わざOK without full Soul');
  pick('#mb-mode-cancel').click();
  check(!pick('#mb-charge').classList.contains('mb-command-active'),'command cancel failed');
  pick('#mb-purify').click();
  check(pick('#mb-purify').classList.contains('mb-command-active'),
   'purify must require a reserve medal selection');
  check(root.querySelectorAll('#mb-team0 .mb-creature.mb-choice-eligible').length===0,
   'purify should not present uninfected reserve as eligible');
  check(pick('#mb-choice-status').textContent.includes('いません'),
   'purify should say no eligible reserve rather than encourage invalid action');
  pick('#mb-mode-cancel').click();
  for(const team of root.querySelectorAll('.mb-team:not([hidden])')){
   const boundary=team.getBoundingClientRect();
   for(const card of team.querySelectorAll('.mb-creature')){
    const box=card.getBoundingClientRect();
    check(box.top>=boundary.top+2&&box.bottom<=boundary.bottom-2,
     'a wheel creature card is clipped by its team panel: '+card.dataset.unit);
   }
  }
  pick('#mb-target').click();
  check(pick('#mb-target').classList.contains('mb-command-active'),'target command must enter selection mode');
  check(root.querySelectorAll('#mb-foe-line .mb-fighter.mb-choice-eligible').length===3,
   'target selection must highlight three live enemies');
  check(pick('#mb-target').getAttribute('aria-pressed')==='true','target button not accessible');
  check(pick('#mb-choice-status').textContent.includes('ねらう'),'target visual instructions missing');
  pick('#mb-foe-line [data-unit="B1"]').click();
  check(pick('#mb-foe-line [data-unit="B1"]').classList.contains('mb-pinned'),
   'enemy pin did not follow canonical protocol');
  check(pick('#mb-foe-line [data-unit="B1"] .mb-pin-reticle')!==null,
   'source-recorded 3DS pin needs a visible circular crosshair on enemy');
  check(pick('#mb-foe-line [data-unit="B1"]').getAttribute('aria-label').includes('ピンでねらい中'),
   'the new aiming marker must keep an accessible pin label');
  check(root.querySelectorAll('#mb-foe-line .mb-fighter.mb-choice-eligible').length===0,
   'target selection visuals should clear after pin is accepted');
  pick('[data-rotate="1"]').click();
  check(!pick('#mb-team0 [data-unit="A4"]').classList.contains('mb-bench'),'A side wheel failed to rotate');
  check(pick('#mb-revision').textContent.includes('REV 2'),'game revision did not advance after pin and rotation');
  const wheel=pick('#mb-team0 .mb-wheel'),bounds=wheel.getBoundingClientRect();
  const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
  const radius=Math.min(bounds.width,bounds.height)*.32;
  const pointer=(type,x,y,id=81)=>new PointerEvent(type,{bubbles:true,cancelable:true,
   pointerId:id,button:0,pointerType:'pen',isPrimary:true,clientX:x,clientY:y});
  const record=x=>Number(pick('#battle-stage').dataset.stageRevision);
  const beforeDrag=record();
  wheel.dispatchEvent(pointer('pointerdown',cx+radius,cy-radius));
  pick('#battle-stage').dispatchEvent(pointer('pointermove',cx+radius,cy+radius));
  pick('#battle-stage').dispatchEvent(pointer('pointerup',cx+radius,cy+radius));
  check(record()===beforeDrag+1,'one circular drag must submit exactly one canonical rotate');
  check(!pick('#mb-team0 [data-unit="A5"]').classList.contains('mb-bench'),
   'clockwise swipe did not promote next member from bench');
  // Short unintentional movement and cancellation are not turns.
  const tiny=record();
  const afterWheel=pick('#mb-team0 .mb-wheel');
  afterWheel.dispatchEvent(pointer('pointerdown',cx+radius,cy-radius,82));
  pick('#battle-stage').dispatchEvent(pointer('pointermove',cx+radius,cy-radius*.85,82));
  pick('#battle-stage').dispatchEvent(pointer('pointerup',cx+radius,cy-radius*.85,82));
  check(record()===tiny,'short angular tap must not rotate the wheel');
  afterWheel.dispatchEvent(pointer('pointerdown',cx+radius,cy-radius,83));
  pick('#battle-stage').dispatchEvent(pointer('pointermove',cx+radius,cy+radius,83));
  pick('#battle-stage').dispatchEvent(pointer('pointercancel',cx+radius,cy+radius,83));
  check(record()===tiny,'pointercancel must not submit a rotation');
  const medal=pick('#mb-team0 [data-unit="A6"]');
  const box=medal.getBoundingClientRect(),tapX=box.left+box.width/2,tapY=box.top+box.height/2;
  medal.dispatchEvent(pointer('pointerdown',tapX,tapY,84));
  medal.dispatchEvent(pointer('pointerup',tapX,tapY,84));
  medal.click();
  check(pick('#mb-selected').textContent.includes('くろがね'),
   'normal medal tap must remain selectable immediately after a wheel drag');
  check(record()===tiny,'medal selection must not secretly rotate or advance the battle');

  // Old Safari must rotate from native finger TouchEvents, not only pen PointerEvents.
  // The wheel must remain mounted across an unrelated UI rerender during drag.
  const schoolWheel=pick('#mb-team0 .mb-wheel');
  const sr=schoolWheel.getBoundingClientRect();
  const sx=sr.left+sr.width/2,sy=sr.top+sr.height/2,rr=Math.min(sr.width,sr.height)*.32;
  const TouchCtor=root.defaultView.Touch,EventCtor=root.defaultView.TouchEvent;
  check(typeof TouchCtor==='function'&&typeof EventCtor==='function','native TouchEvent QA unsupported');
  const finger=(x,y)=>new TouchCtor({identifier:97,target:schoolWheel,
     clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y});
  const sendTouch=(target,type,touches,changedTouches)=>
   target.dispatchEvent(new EventCtor(type,{bubbles:true,cancelable:true,
      touches,targetTouches:touches,changedTouches}));
  const startFinger=finger(sx+rr,sy-rr),endFinger=finger(sx+rr,sy+rr),beforeTouch=record();
  sendTouch(schoolWheel,'touchstart',[startFinger],[startFinger]);
  sendTouch(pick('#battle-stage'),'touchmove',[endFinger],[endFinger]);
  pick('#mb-charge').click(); // calls render while the gesture is active
  check(pick('#mb-team0 .mb-wheel')===schoolWheel,
    'battle UI rerender detached wheel from Safari finger');
  sendTouch(pick('#battle-stage'),'touchend',[],[endFinger]);
  check(record()===beforeTouch+1,'native TouchEvents must submit one real wheel rotation');
  check(pick('#mb-action-callout')!==null,'action callout missing');
  const center=pick('#mb-team0 .mb-center-symbol');
  check(center.tagName==='BUTTON'&&center.dataset.act==='watch',
    'center must be an actual tappable zero Watch toggle');
  center.click();
  check(pick('#mb-watch').textContent.includes('標準ウォッチ'),'standard -> zero watch toggle failed');
  check(pick('#mb-target').textContent.includes('つつく'),'zero mode should swap target into poke');
  check(pick('#mb-charge').textContent.includes('Gわざ'),'zero mode must label special button Gわざ');
  pick('#mb-target').click();
  check(pick('#mb-choice-status').textContent.includes('つつく'),'zero poke command prompt missing');
  pick('#mb-mode-cancel').click();
  pick('#mb-step').click();
  check(pick('.mb-battle-backdrop').dataset.scenePhase==='anticipation',
    'new action must begin with wind-up, not immediately jump to impact');
  check(pick('.mb-battle-backdrop').dataset.sceneKind!=='none',
    'canonical action kind must select a visual motion');
  check(root.querySelectorAll('.mb-floating-number').length===0,
    'damage or healing number was exposed before the impact phase');
  check(Number(pick('#mb-turn').textContent)===1,'actual automatic battle action failed');
  check(!pick('#mb-action-label').textContent.includes('待機中'),'canonical actor summary not shown');
  check(root.querySelectorAll('.mb-fighter.mb-acting').length===1,'actual fighter should flash once');
  check(root.querySelectorAll('.mb-fighter.mb-hit,.mb-fighter.mb-healed').length<=1,'only one canonical target may flash');
  pick('[data-seat="1"]').click();
  check(pick('#mb-active-label').textContent.includes('PLAYER B'),'offline seat switch failed');
  check(pick('#mb-team0').hidden&&!pick('#mb-team1').hidden,'B wheel should replace A wheel');
  check(root.querySelectorAll('#mb-foe-line [data-unit^="A"]').length===3,
   'upper screen should swap enemy perspective with selected player');
  pick('[data-rotate="-1"]').click();
  check(!pick('#mb-team1 [data-unit="B6"]').classList.contains('mb-bench'),'B side wheel failed to rotate');
  check(root.querySelectorAll('.mb-creature').length===12,'both player wheel projections lost after battle actions');
  check(root.querySelectorAll('.mb-next').length===5,'forecast lost after battles');
  check(pick('#mb-modal').hidden,'touch mini-game unexpectedly visible');
  check(pick('#mb-special-flare').hidden,'special cut-in must not appear for ordinary action');
  const gFrame=document.createElement('iframe');
  gFrame.style.cssText='width:100px;height:100px;position:absolute;left:-200px';
  gFrame.addEventListener('load',()=>{
   try{
    const doc=gFrame.contentDocument;
    const ok=(selector)=>doc.querySelector(selector);
    check(ok('#battle-stage').dataset.stageReady==='true','G-ready ESM stage not ready');
    check(ok('#mb-charge').textContent.includes('Gわざ'),'zero must replace regular button with G');
    check(doc.querySelectorAll('.mb-special-ready').length===1,'G mode must have exactly one ready medal');
    check(ok('#mb-team0 [data-unit="A1"] .mb-special-ready')?.textContent==='GわざOK',
     'G ready depends on full fixed neighbours, including benched A6');
    check(!ok('#mb-team0 [data-unit="A2"] .mb-special-ready'),
     'A2 must NOT be ready without A3 Soul');
    check(ok('#mb-team0 [data-unit="A6"]').classList.contains('mb-bench'),
     'G neighbour A6 should remain on bench');
    check(ok('.mb-forecast-section').hidden,'original mode must hide five-turn forecast');
    const nFrame=document.createElement('iframe');
    nFrame.style.cssText='width:100px;height:100px;position:absolute;left:-300px';
    nFrame.addEventListener('load',()=>{
     try{
      const nd=nFrame.contentDocument;
      check(nd.querySelector('#mb-team0 [data-unit="A2"] .mb-special-ready')
       ?.textContent==='わざOK','normal full Soul must show わざOK');
      check(nd.querySelectorAll('.mb-special-ready').length===1,'normal mode one ready');
      check(nd.querySelector('#mb-charge').textContent.includes('わざ'),
       'normal mode must retain original special button');
      report.textContent='STAGE-PASS original engine gestures and source-confirmed G/normal readiness';
     }catch(error){report.textContent='STAGE-FAIL '+(error.stack||error.message);}
    });
    nFrame.src='/lab/match-stage.html?review=soul-ready';
    document.body.appendChild(nFrame);
   }catch(error){report.textContent='STAGE-FAIL '+(error.stack||error.message);}
  });
  gFrame.src='/lab/match-stage.html?review=g-soul-ready';
  document.body.appendChild(gFrame);
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
 const ipad=path.join(root,'phase16-ipad-landscape-preview.png');
 const ipadChild=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'ipad'),
  '--window-size=1024,768','--virtual-time-budget=2200',
  '--screenshot='+ipad,'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html'
 ],{stdio:['ignore','pipe','pipe']});
 let ipadError='';
 ipadChild.stderr.on('data',b=>ipadError+=String(b).slice(0,2000));
 const ipadTimeout=setTimeout(()=>ipadChild.kill('SIGKILL'),18000);
 const ipadExit=await new Promise(resolve=>ipadChild.on('close',resolve));
 clearTimeout(ipadTimeout);
 if(ipadExit!==0||!existsSync(ipad))
  throw new Error('iPad-class landscape preview capture failed: '+ipadError.slice(-400));
 console.log('SCREENSHOT-READY phase16-ipad-landscape-preview.png');
 const targetPreview=path.join(root,'phase16-target-selection-preview.png');
 const targetChild=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'target-preview'),
  '--window-size=1024,768','--virtual-time-budget=2400',
  '--screenshot='+targetPreview,
  'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html?review=target'
 ],{stdio:['ignore','pipe','pipe']});
 let targetError='';
 targetChild.stderr.on('data',b=>targetError+=String(b).slice(0,2000));
 const targetTimeout=setTimeout(()=>targetChild.kill('SIGKILL'),18000);
 const targetExit=await new Promise(resolve=>targetChild.on('close',resolve));
 clearTimeout(targetTimeout);
 if(targetExit!==0||!existsSync(targetPreview))
  throw new Error('target-selection screenshot failed: '+targetError.slice(-400));
 console.log('SCREENSHOT-READY phase16-target-selection-preview.png');
 // QA-only screenshot of the exact production stage consuming a typed
 // special battle event; no invented gameplay special execution.
 const specialShot=path.join(root,'phase17-special-cutin-preview.png');
 const specialChild=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'special-preview'),
  '--window-size=1024,768','--virtual-time-budget=550',
  '--screenshot='+specialShot,
  'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html?review=special'
 ],{stdio:['ignore','pipe','pipe']});
 let specialError='';
 specialChild.stderr.on('data',b=>specialError+=String(b).slice(0,2000));
 const specialTimeout=setTimeout(()=>specialChild.kill('SIGKILL'),18000);
 const specialExit=await new Promise(resolve=>specialChild.on('close',resolve));
 clearTimeout(specialTimeout);
 if(specialExit!==0||!existsSync(specialShot))
  throw new Error('special VFX screenshot failed: '+specialError.slice(-400));
 console.log('SCREENSHOT-READY phase17-special-cutin-preview.png');

 // User-provided original footage at 01:12-01:15 confirms an enlarged,
 // full-field Soultimate cutin followed by impact on the normal battle field.
 const originalCutiQa=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'phase49-cutin-dom'),
  '--window-size=1024,768','--virtual-time-budget=450','--dump-dom',
  'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html?review=special'
 ],{stdio:['ignore','pipe','pipe']});
 let cutiDom='',cutiErr='';
 originalCutiQa.stdout.on('data',b=>cutiDom+=String(b));
 originalCutiQa.stderr.on('data',b=>cutiErr+=String(b).slice(0,2500));
 const cutiTimer=setTimeout(()=>originalCutiQa.kill('SIGKILL'),18000);
 const cutiExit=await new Promise(resolve=>originalCutiQa.on('close',resolve));
 clearTimeout(cutiTimer);
 if(cutiExit!==0)throw Error('Source-video cutin QA failed: '+cutiErr.slice(-500));
 const cutinTag=cutiDom.match(/<div id="mb-special-flare"[^>]*>/)?.[0]||'';
 // Screenshot inspection already confirms the entire upper field is
 // replaced. DOM serialization varies (nested portrait markup/whitespace),
 // so check the semantic IDs and the actual original inline SVG evidence.
 const hasPortrait=cutiDom.includes('id="mb-special-portrait"')&&
   cutiDom.includes('data-design="embercat"');
 const hasActor=cutiDom.includes('id="mb-special-actor"');
 if(!cutinTag||/\shidden(?:\s|>|=)/.test(cutinTag)||
    !/data-creature="1"/.test(cutinTag)||!hasPortrait||!hasActor)
  throw Error('Soultimate cutin incomplete: tag='+cutinTag+
    '; portrait='+hasPortrait+' actor='+hasActor);
 console.log('PHASE49-SOURCE-VIDEO-INSPIRED-FULL-STAGE-CUTIN-PASS');
 // Phase2.2: real Chromium must OBSERVE three separate target-specific
 // damage numbers through actual DOM updates. The source JS string alone
 // cannot satisfy the check: inspect only the rendered lab-state span.
 const targetQa=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'phase22-target-dump'),
  '--window-size=1024,768','--virtual-time-budget=3100','--dump-dom',
  'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html?review=special'
 ],{stdio:['ignore','pipe','pipe']});
 let targetDom='',targetErr='';
 targetQa.stdout.on('data',b=>targetDom+=String(b));
 targetQa.stderr.on('data',b=>targetErr+=String(b).slice(0,2500));
 const targetTimer=setTimeout(()=>targetQa.kill('SIGKILL'),18000);
 const targetExit=await new Promise(resolve=>targetQa.on('close',resolve));
 clearTimeout(targetTimer);
 const renderedState=targetDom.match(/<span id="lab-state">([^<]*)<[/]span>/)?.[1];
 if(targetExit!==0||renderedState!=='PHASE22-VISUAL-TARGET-ORDER-PASS')
  throw Error('Phase2.2 separate special target paint not proven: '+
   (renderedState||'no actual DOM evidence')+' '+targetErr.slice(-450));
 console.log('PHASE22-SPECIAL-TARGET-DOM-ORDER-PASS B1/B2/B3 exactly one visual impact at a time');

 const gReadyShot=path.join(root,'phase18-g-soultimate-ready.png');
 const gReadyChild=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--hide-scrollbars',
  '--user-data-dir='+path.join(tmp,'g-ready-preview'),
  '--window-size=1024,768','--virtual-time-budget=1700',
  '--screenshot='+gReadyShot,
  'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html?review=g-soul-ready'
 ],{stdio:['ignore','pipe','pipe']});
 let gReadyError='';
 gReadyChild.stderr.on('data',b=>gReadyError+=String(b).slice(0,2000));
 const gReadyTimeout=setTimeout(()=>gReadyChild.kill('SIGKILL'),18000);
 const gReadyExit=await new Promise(resolve=>gReadyChild.on('close',resolve));
 clearTimeout(gReadyTimeout);
 if(gReadyExit!==0||!existsSync(gReadyShot))
  throw new Error('G ready screenshot failed: '+gReadyError.slice(-400));
 console.log('SCREENSHOT-READY phase18-g-soultimate-ready.png');

 // Review actual seed-resolved ordinary action before its hit and after its
 // impact, so aesthetic/fidelity regressions can be inspected as real pixels.
 for(const [label,budget] of [['windup',310],['impact',1110]]){
  const file='phase46-action-'+label+'.png',dest=path.join(root,file);
  const child=spawn(browser,[
   '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
   '--no-first-run','--disable-extensions','--hide-scrollbars',
   '--user-data-dir='+path.join(tmp,'phase46-'+label),
   '--window-size=1024,768','--virtual-time-budget='+budget,
   '--screenshot='+dest,
   'http://127.0.0.1:'+server.address().port+'/lab/match-stage.html?review=action-motion'
  ],{stdio:['ignore','pipe','pipe']});
  let error='';
  child.stderr.on('data',b=>error+=String(b).slice(0,3000));
  const timeout=setTimeout(()=>child.kill('SIGKILL'),18000);
  const code=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timeout);
  if(code!==0||!existsSync(dest))throw Error('Phase46 '+label+' screenshot failed: '+error.slice(-700));
  console.log('SCREENSHOT-READY '+file);
 }
 // A real School Friends seeded match should surface an authentic passive
 // trigger on the battle screen, not a fabricated mock event.
 const skillUrl='http://127.0.0.1:'+server.address().port+
  '/lab/match-stage.html?review=passive-skill';
 const skillCmd=['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--no-first-run','--disable-extensions',
  '--user-data-dir='+path.join(tmp,'phase48-skill-dump'),
  '--window-size=1024,768','--virtual-time-budget=1100','--dump-dom',skillUrl];
 let skillDom='',skillErr='';
 const skillChild=spawn(browser,skillCmd,{stdio:['ignore','pipe','pipe']});
 skillChild.stdout.on('data',b=>skillDom+=String(b));
 skillChild.stderr.on('data',b=>skillErr+=String(b).slice(0,3000));
 const skillTimeout=setTimeout(()=>skillChild.kill('SIGKILL'),18000);
 const skillExit=await new Promise(resolve=>skillChild.on('close',resolve));
 clearTimeout(skillTimeout);
 if(skillExit!==0||!skillDom.includes('REAL-SKILL-REVIEW')){
  throw Error('Phase48 cannot reach a REAL Skill from seeded host battle: '+
   (skillDom.match(/NO-REAL-SKILL[^<]*/)?.[0]||skillErr.slice(-500)));
 }
 const visual=skillDom.match(/<div id="mb-passive-notice"[^>]*>[^<]+<\/div>/);
 if(!visual||/\bhidden\b/.test(visual[0])||
    !/おせわ|どひょうぎわ|まえのめり/.test(visual[0]))
  throw Error('Phase48 passive skill VFX invisible at impact phase: '+
    (visual?.[0]||'missing'));
 const message=visual[0].replace(/<[^>]+>/g,'');
 for(const line of message.split(' / ')){
  if(line.includes('まえのめり')&&line.includes(' → '))
   throw Error('Phase48 misleading momentum buff target: '+line);
 }
 console.log('PHASE48-SCHOOL-REAL-SKILL-VISIBLE '+visual[0].slice(0,260));
 const skillShot=path.join(root,'phase48-real-passive-skill.png');
 const renderChild=spawn(browser,[
  ...skillCmd.filter(x=>x!=='--dump-dom').map(x=>
    x.startsWith('--user-data-dir=')?'--user-data-dir='+path.join(tmp,'phase48-skill-shot'):x)
    .filter(x=>x!==skillUrl),
   '--screenshot='+skillShot,skillUrl
 ],{stdio:['ignore','pipe','pipe']});
 let screenError='';
 renderChild.stderr.on('data',b=>screenError+=String(b).slice(0,3000));
 const screenTimeout=setTimeout(()=>renderChild.kill('SIGKILL'),18000);
 const screenExit=await new Promise(resolve=>renderChild.on('close',resolve));
 clearTimeout(screenTimeout);
 if(screenExit!==0||!existsSync(skillShot))
  throw Error('Phase48 skill screenshot failed: '+screenError.slice(-600));
 console.log('SCREENSHOT-READY phase48-real-passive-skill.png');

}finally{
 await new Promise(resolve=>server.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
