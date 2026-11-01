import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/opt/google/chrome/chrome','/usr/bin/google-chrome-stable'].find(existsSync);
if(!browser)throw Error('Chromium is required to verify real browser pointer event gestures');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const srv=createServer(async(req,res)=>{
 try{
  const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root+path.sep))throw Error('outside fixture root');
  const b=await readFile(filename);
  res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'text/plain'}).end(b);
 }catch(error){res.writeHead(404).end('not found');}
});
const tmp=mkdtempSync(path.join(tmpdir(),'gesture-chrome-'));
try{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+srv.address().port+'/lab/gesture-stage-qa.html';
 let passed=false;
 for(let i=1;i<=2;i++){
  let output='',errors='',timedOut=false;
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
   '--disable-gpu','--disable-extensions','--no-first-run',
   '--user-data-dir='+path.join(tmp,'profile-'+i),
   '--window-size=1200,900','--virtual-time-budget=30000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},25000);
  child.stdout.on('data',b=>output+=String(b).slice(0,350000));
  child.stderr.on('data',b=>errors+=String(b).slice(0,10000));
  const exit=await new Promise(resolve=>child.on('close',resolve));
  clearTimeout(timer);
  if(exit===0&&!timedOut&&output.includes('GESTURE-PASS')){
   console.log('GESTURE-PASS: real Chromium 4 charge, 5 purification, poke, cancelled pointer, two fingers');
   passed=true;break;
  }
  console.warn('gesture attempt '+i+' failed: '+(output.match(/GESTURE-FAIL[^<]+/)?.[0]||
   ('exit='+exit+' timeout='+timedOut+' '+errors.slice(-400))));
 }
 if(!passed)throw Error('Gesture real-browser contract failed');
}finally{
 await new Promise(resolve=>srv.close(resolve));
 rmSync(tmp,{recursive:true,force:true});
}
