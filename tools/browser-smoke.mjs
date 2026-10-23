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

  // DOM-driven synthetic PointerEvents exercise the browser wiring for the
  // selected challenge. This is not a substitute for real touchscreen input.
  pick('[data-watch="0"]').click(); // zero -> standard
  pick('[data-special="A1"]').click();
  if(pick('#chargeOverlay').hidden)throw new Error('special touch layer was not opened');
  const pad=pick('#chargePad');
  pad.setPointerCapture=()=>{}; // synthetic dispatch has no physical pointer handle
  const win=doc.defaultView;
  const touch=(type,x,y)=>{
   const rect=pad.getBoundingClientRect();
   const e=new win.PointerEvent('pointer'+type,{
    bubbles:true,pointerId:314,pointerType:'touch',isPrimary:true,
    clientX:rect.left+rect.width*x,clientY:rect.top+rect.height*y
   });
   pad.dispatchEvent(e);
  };
  const kind=pick('#chargeTitle').textContent;
  if(kind.startsWith('打て')){
   for(let i=0;i<6;i++){
    const circle=pick('#chargePad circle[r="7"]');
    const x=Number(circle.getAttribute('cx'))/100,y=Number(circle.getAttribute('cy'))/100;
    touch('down',x,y);touch('up',x,y);
   }
  }else if(kind.startsWith('なぞれ')){
   for(let repetition=0;repetition<3;repetition++){
    const poly=pick('#chargePad polyline');
    const points=poly.getAttribute('points').split(' ').map(x=>x.split(',').map(v=>Number(v)/100));
    touch('down',points[0][0],points[0][1]);
    for(const p of points.slice(1))touch('move',p[0],p[1]);
    touch('up',points[points.length-1][0],points[points.length-1][1]);
   }
  }else if(kind.startsWith('あわせろ')){
   for(let repetition=0;repetition<3;repetition++){
    const line=pick('#chargePad line'),hi=pick('#chargePad text[fill="#ffdb77"]');
    const x=Number(line.getAttribute('x2'))/100,y=Number(line.getAttribute('y2'))/100;
    const number=Number(hi.textContent);
    const angle=-Math.PI/2+number*Math.PI/6;
    const targetX=.5+.32*Math.cos(angle),targetY=.5+.32*Math.sin(angle);
    touch('down',x,y);touch('move',targetX,targetY);touch('up',targetX,targetY);
   }
  }else if(kind.startsWith('まわせ')){
    touch('down',.8,.5);
    for(let i=1;i<=125;i++){
      const a=i*Math.PI*2/40;
      touch('move',.5+.3*Math.cos(a),.5+.3*Math.sin(a));
    }
    touch('up',.8,.5);
  }else throw new Error('unknown charge gesture kind: '+kind);
  if(!pick('#chargeOverlay').hidden)throw new Error('touch charge failed to complete: '+kind);
  if(!pick('#log').textContent.includes('✨'))throw new Error('successful charge did not log real fixture effect');
  if(!pick('#team1').textContent.includes('HP'))throw new Error('target squad UI missing after charge');
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
  'data-watch="0"','data-soul="A1"','id="chargePad"'
 ],1500);
 console.log('Chromium HTML/ES-module DOM rendered: 2 teams, forecast, Soul and charge controls');
 await renderedDom(rootUrl+'/__browser_smoke__.html','interaction',['QA-PASS'],2500);
 console.log('Chromium interactive smoke passed: Soul buttons, Soultimate cancel, sleep/purify, G charge');
}finally{
 await new Promise(resolve=>srv.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
