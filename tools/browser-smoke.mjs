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
const srv=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
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
}finally{
 clearTimeout(timeout);
 await new Promise(resolve=>srv.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
