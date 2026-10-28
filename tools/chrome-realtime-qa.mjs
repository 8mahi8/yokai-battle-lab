/**
 * Real wall-clock Chromium source-of-truth QA.
 * --dump-dom + --virtual-time-budget fast-forwards JS timers before Firebase
 * network I/O can finish; waiting for the browser result requires CDP polling
 * against an actual live page. Chrome DevTools Protocol Runtime.evaluate is
 * read-only here: the page itself performs every UI gesture and network call.
 * Node >=22 has stable native WebSocket; no new npm dependency.
 *
 * Browser port=0 is bound to local Chrome; its DevToolsActivePort file is
 * read from the isolated temp profile. This cannot target a remote browser.
 */
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const localOnly=u=>/^http:\/\/127\.0\.0\.1:\d+\/qa(?:\?setup)?$/.test(u);
async function devtoolsPage(profile,url,deadline){
 let last='';
 while(Date.now()<deadline){
  try{
   const [portRaw]=String(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split(/\r?\n/);
   const port=Number(portRaw);
   if(!Number.isInteger(port)||port<1||port>65535)throw Error('no Chrome debugging port');
   const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   const page=pages.find(p=>p.type==='page'&&p.url===url&&
     /^ws:\/\/127\.0\.0\.1:\d+\/devtools\/page\//.test(p.webSocketDebuggerUrl||''));
   if(page)return page.webSocketDebuggerUrl;
   last='page not found: '+pages.map(p=>p.url).join(', ').slice(0,250);
  }catch(e){last=String(e.message||e).slice(0,250);}
  await sleep(120);
 }
 throw Error('Chrome CDP target unavailable: '+last);
}
async function openCdp(url){
 return await new Promise((resolve,reject)=>{
  const socket=new WebSocket(url);
  const timer=setTimeout(()=>{socket.close();reject(Error('CDP connect timeout'));},7000);
  socket.addEventListener('open',()=>{clearTimeout(timer);resolve(socket);},{once:true});
  socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP websocket error'));},{once:true});
 });
}
function remoteEvaluate(socket,expression,id){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{
   socket.removeEventListener('message',handle);
   reject(Error('CDP Runtime.evaluate timeout'));
  },4000);
  function handle(event){
   let data;try{data=JSON.parse(event.data);}catch{return;}
   if(data.id!==id)return;
   socket.removeEventListener('message',handle);clearTimeout(timer);
   if(data.error||data.result?.exceptionDetails){
    reject(Error('CDP evaluation error: '+JSON.stringify(data.error||data.result?.exceptionDetails).slice(0,300)));
   }else resolve(data.result?.result?.value??'');
  }
  socket.addEventListener('message',handle);
  socket.send(JSON.stringify({id,method:'Runtime.evaluate',
   params:{expression,returnByValue:true,awaitPromise:false}}));
 });
}
/**
 * Run only on QA's own 127.0.0.1 server. No virtual-time acceleration.
 * Returns evidence from #result's ACTUAL textContent, not the document
 * source or a token in an inline script.
 */
export async function runRealtimeQa({browser,url,profile,sentinel,timeoutMs=90000}={}){
 if(typeof browser!=='string'||!browser||
    !localOnly(url)||typeof profile!=='string'||!profile||
    typeof sentinel!=='string'||!sentinel.endsWith('-PASS')||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>240000)
  throw new TypeError('strict local real-browser QA parameters required');
 const args=['--headless=new','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--disable-extensions','--no-first-run',
  '--no-default-browser-check','--remote-debugging-port=0',
  '--remote-allow-origins=*','--user-data-dir='+profile,
  '--window-size=1160,900',url];
 const child=spawn(browser,args,{stdio:['ignore','ignore','pipe']});
 let errors='',socket=null,observed='',serial=0;
 child.stderr.on('data',b=>{errors=(errors+String(b)).slice(-1200);});
 const deadline=Date.now()+timeoutMs;
 try{
  const websocketUrl=await devtoolsPage(profile,url,Math.min(deadline,Date.now()+20000));
  socket=await openCdp(websocketUrl);
  while(Date.now()<deadline){
   try{
    const result=await remoteEvaluate(socket,
     "document.querySelector('#result')?.textContent||''",++serial);
    if(typeof result==='string'){
     observed=result;
     if(result.startsWith(sentinel+' '))
      return {ok:true,rendered:result};
     if(result.startsWith('SITES-ONLINE-FAIL '))
      return {ok:false,rendered:result,reason:'visible_qa_error'};
    }
   }catch(e){
    errors=(errors+' '+String(e.message||e)).slice(-1200);
   }
   await sleep(170);
  }
  return {ok:false,rendered:observed||'missing-result-node',
   reason:'real_wall_clock_timeout',stderr:errors};
 }catch(e){
  return {ok:false,rendered:observed||'missing-result-node',
   reason:String(e.message||e),stderr:errors};
 }finally{
  try{socket?.close();}catch{}
  child.kill('SIGKILL');
  await new Promise(resolve=>{
   if(child.exitCode!==null||child.signalCode!==null)return resolve();
   child.once('close',resolve);
   setTimeout(resolve,2000);
  });
 }
}
