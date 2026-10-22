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
let timeout;
try{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const address=srv.address();
 const url='http://127.0.0.1:'+address.port+'/lab/phase2.html';
 let out='',errors='';
 const child=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--disable-background-networking','--no-first-run','--no-default-browser-check',
  '--user-data-dir='+tmp,'--virtual-time-budget=1000','--dump-dom',url
 ],{stdio:['ignore','pipe','pipe']});
 timeout=setTimeout(()=>child.kill('SIGKILL'),18000);
 child.stdout.on('data',b=>{out+=String(b).slice(0,250000);});
 child.stderr.on('data',b=>{errors+=String(b).slice(0,20000);});
 const exit=await new Promise(resolve=>child.on('close',resolve));
 const expected=[
  ['front A1','data-special="A1"'],['front B1','data-special="B1"'],
  ['research forecast','class="slot"'],['Watch mode','data-watch="0"'],
  ['Soul button','data-soul="A1"'],['touch charge layer','id="chargePad"']
 ];
 const missing=expected.filter(([_,marker])=>!out.includes(marker)).map(([label])=>label);
 if(exit!==0||missing.length){
  throw new Error('Chromium DOM smoke failed: exit='+exit+', missing='+missing.join(', ')+
   '\nDOM ending: '+out.slice(-1000)+'\nSTDERR: '+errors.slice(-1200));
 }
 console.log('Chromium HTML/ES-module DOM rendered: 2 teams, forecast, Soul and charge controls');
 const qaProfile=path.join(tmp,'interaction');
 const qaUrl='http://127.0.0.1:'+address.port+'/__browser_smoke__.html';
 let qaOut='',qaErr='';
 const qa=spawn(browser,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--disable-background-networking','--no-first-run',
  '--user-data-dir='+qaProfile,'--virtual-time-budget=1600','--dump-dom',qaUrl
 ],{stdio:['ignore','pipe','pipe']});
 clearTimeout(timeout);
 timeout=setTimeout(()=>qa.kill('SIGKILL'),18000);
 qa.stdout.on('data',b=>{qaOut+=String(b);});
 qa.stderr.on('data',b=>{qaErr+=String(b);});
 const qaExit=await new Promise(resolve=>qa.on('close',resolve));
 if(qaExit!==0||!qaOut.includes('QA-PASS')){
  throw new Error('Chromium UI interaction failure: exit='+qaExit+
   '\\nDOM='+qaOut.slice(-1700)+'\\nSTDERR='+qaErr.slice(-800));
 }
 console.log('Chromium interactive smoke passed: Soul buttons, Soultimate cancel, sleep/purify, G charge');
}finally{
 clearTimeout(timeout);
 await new Promise(resolve=>srv.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
