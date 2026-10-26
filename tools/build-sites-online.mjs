/**
 * Phase24B Sites embed builder: no network/cloud writes or deployment.
 * DEFAULT: unconfigured, makes no external network requests.
 * --emulator: localhost-only test app, never deploy.
 * --config <path>: explicitly-approved config, only produces an HTML file.
 */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
const friends=args.length===1&&args[0]==='--friends';
const emulatorFriends=args.length===1&&args[0]==='--emulator-friends';
const emulator=args.length===1&&args[0]==='--emulator'||emulatorFriends;
const cloud=args.length===2&&args[0]==='--config'&&Boolean(args[1]);
const friendsMode=friends||emulatorFriends;
if(args.length&&!emulator&&!cloud&&!friends)
 throw Error('Usage: [--emulator | --config <file> | --friends | --emulator-friends]');
let config=null,mode='unconfigured',basename='sites-online-setup';
if(friends){
 mode='friends-no-auth-not-deployed';basename='sites-online-friends';
 // Existing school-proven BRAWL/Shokoku RTDB; NO secret, Auth SDK or sign-in.
 config={databaseURL:'https://mygame-df915-default-rtdb.firebaseio.com/'};
}
if(emulator){
 mode=emulatorFriends?'emulator-friends-no-auth-localhost-only':'emulator-localhost-only';
 basename=emulatorFriends?'sites-online-emulator-friends-qa':'sites-online-emulator-qa';
 config=emulatorFriends?
  {databaseURL:'https://demo-yokai-lab-default-rtdb.firebaseio.com'}:
  {apiKey:'demo-key',authDomain:'demo-yokai-lab.firebaseapp.com',
   projectId:'demo-yokai-lab',databaseURL:'https://demo-yokai-lab-default-rtdb.firebaseio.com'};
}
if(cloud){
 if(process.env.YW_CLOUD_BUILD_APPROVED!=='1')
  throw Error('Cloud build must be explicitly approved; builder never deploys');
 config=JSON.parse(await readFile(path.resolve(args[1]),'utf8'));
 mode='cloud-configured-not-deployed';basename='sites-online-cloud';
 if(!config||Array.isArray(config)||typeof config!=='object')
  throw Error('Invalid cloud Firebase configuration');
 const fields=['apiKey','authDomain','projectId','databaseURL','appId'];
 if(!fields.every(x=>typeof config[x]==='string'&&config[x].length>=3))
  throw Error('Cloud Firebase public config missing required field');
 const id=config.projectId;
 if(!/^[a-z0-9-]{6,50}$/.test(id)||id.startsWith('demo-')||
  config.authDomain!==id+'.firebaseapp.com')
  throw Error('Project Auth host or project ID mismatch');
 const url=new URL(config.databaseURL);
 if(url.protocol!=='https:'||
  !(url.hostname.endsWith('.firebasedatabase.app')||url.hostname.endsWith('.firebaseio.com'))||
  (!url.hostname.startsWith(id+'-')&&url.hostname!==id+'.firebaseio.com'))
  throw Error('Production Firebase RTDB URL must match project');
 if(Object.keys(config).some(k=>!['apiKey','authDomain','projectId','databaseURL',
 'appId','messagingSenderId','storageBucket','measurementId'].includes(k)))
  throw Error('Unknown public Firebase config field');
}
const css=(await Promise.all(['lab/match-stage.css','lab/yw2-layout.css'].map(p=>
 readFile(path.join(root,p),'utf8')))).join('\n');
const built=await build({entryPoints:[path.join(root,'lab/sites-embed-online-entry.mjs')],
 bundle:true,write:false,format:'iife',platform:'browser',target:['safari13'],
 minify:true,metafile:true,logLevel:'silent',legalComments:'none',
 define:{__YW_ONLINE_CONFIG__:JSON.stringify(config),__YW_EMULATOR_MODE__:String(emulator),
  __YW_FRIENDS_MODE__:String(friendsMode)}});
if(built.outputFiles.length!==1)throw Error('Need one IIFE bundle');
const modules=Object.keys(built.metafile.inputs);
for(const dependency of ['network/firebase-room.mjs','network/firebase-match.mjs',
 'engine/match-protocol.mjs','ui/match-stage.mjs']){
 if(!modules.some(m=>m.endsWith(dependency)))throw Error('Missing '+dependency);
}
if(modules.some(m=>/sites-embed-local-entry|firebase-match-stage\.html/.test(m)))
 throw Error('Offline fixture accidentally imported into online game');
const js=built.outputFiles[0].text.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
const scripts=config?['app',...(friendsMode?[]:['auth']),'database'].map(name=>
 '<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-'+name+'-compat.js"></script>').join('\n'):'';
const fragment=['<!-- Phase24B: '+mode+'; iframe/Safari/real cloud not yet proven -->',
 '<style>',css,
 '#yw-sites-online .yw-online-bar{background:#23364a;color:#e3ecfa;padding:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;font:13px/1.45 -apple-system,system-ui,sans-serif}',
 '#yw-sites-online .yw-online-bar button,#yw-sites-online .yw-online-bar input{font:inherit;padding:8px;min-height:36px;background:#204968;color:#fff;border:1px solid #7896ae;border-radius:7px}',
 '#yw-sites-online .yw-online-bar button:disabled{opacity:.45}',
 '#yw-sites-online .yw-online-bar input{width:118px;background:#10243a}',
 '#yw-sites-online .yw-online-status{font-size:12px;color:#d9e5f0;padding:9px;background:#142638}',
 '</style>',
 '<section id="yw-sites-online" aria-label="輪戦 オンライン通信開発版">',
 '<div class="yw-online-bar"><strong>輪戦｜2人対戦の接続検証</strong>',
 '<span>開発版：原作の未確定仕様と旧iPad実機は未検証。ホストのブラウザが動作中だけ進行します。</span>',
 '<button class="yw-online-make" disabled type="button">ホスト：部屋作成</button>',
 '<input class="yw-online-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6桁番号" aria-label="部屋番号">',
 '<button class="yw-online-join" disabled type="button">ゲスト：参加</button>',
 '<button class="yw-online-start" disabled type="button">ホスト：試合開始</button>',
 '<button class="yw-online-connect" disabled type="button">ゲスト：戦闘接続</button>',
 '<button class="yw-online-retry" disabled type="button">未確定入力を再送</button>',
 '<button class="yw-online-auto" disabled hidden type="button" aria-pressed="false">自動進行 OFF</button>',
 '<span class="yw-online-presence">未接続</span><b class="yw-online-role">席未選択</b>',
 '</div><div class="yw-online-status" role="status">接続初期化中</div>',
 '<div id="battle-stage"></div></section>',
 scripts,'<script>',js,'</script>'].join('\n');
if((fragment.match(/<style\b/g)||[]).length!==1)throw Error('Style wrapper failed');
if(!config&&(/firebase-app-compat\.js|demo-yokai-lab|firebaseio\.com|<script[^>]+src/i.test(fragment)))
 throw Error('Setup build must never contact Firebase');
if(friends&&!fragment.includes('mygame-df915-default-rtdb.firebaseio.com'))
 throw Error('Friend mode must reuse established school RTDB');
if(friendsMode&&(/firebase-auth-compat\.js/.test(fragment)||
 /signInAnonymously\(/.test(fragment)))
 throw Error('Friend mode must not embed Auth SDK or anonymous signup');
if(friends&&!fragment.includes('yokaiRoomsV1'))
 throw Error('Friend mode lost isolated game room path');
if(mode==='cloud-configured-not-deployed'){
 const marker=fragment.match(/demo-yokai-lab|127\.0\.0\.1:9000|127\.0\.0\.1:9099/);
 if(marker)throw Error('Cloud build contains emulator marker: '+marker[0]);
}
// The minifier escapes Japanese message characters into JS unicode escapes.
// Verify the generated hostname gate, not its localized error text.
if(emulator&&(!fragment.includes('location.hostname')||
 !fragment.includes('127.0.0.1')||(!friendsMode&&!fragment.includes('9099'))))
 throw Error('Local emulator hostname/port gate absent');
const html='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fragment+'</body></html>';
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist',basename+'-code.html'),fragment);
await writeFile(path.join(root,'dist',basename+'-preview.html'),html);
console.log('SITES-ONLINE-BUILD-PASS '+JSON.stringify({mode,bytes:Buffer.byteLength(fragment),
 sourceModules:modules.length,externalSDKs:config?(friendsMode?2:3):0,basename}));
