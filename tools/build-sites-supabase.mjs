/** Phase25 Supabase single pasteable HTML builder; no cloud deployment.
 * Default: no config and no network. --public-config: owner-approved published
 * web CONFIG containing only URL and sb_publishable_ key (never service_role).
 */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
// The QA variant contains accelerated 6v6 fixture teams. It is NOT a
// distributable Sites build and its filename never overlaps the owner build.
const qaFullMatch=args.length===2&&args[0]==='--public-config'&&args[1]==='--qa-full-match';
const configured=(args.length===1&&args[0]==='--public-config')||qaFullMatch;
if(args.length&&!configured)throw Error('Usage: [--public-config [--qa-full-match]]');
let config=null,mode='unconfigured',basename='sites-supabase-setup';
if(configured){
 config=JSON.parse(await readFile(path.join(root,'supabase/yw_pvp_public_config.json'),'utf8'));
 mode=qaFullMatch?'QA-ONLY-NEVER-DEPLOY':'configured-not-deployed';
 basename=qaFullMatch?'sites-supabase-qa-full-match':'sites-supabase-online';
 if(!config||config.projectRef!=='itqimlgnrjikaamstdlp'||
  config.url!=='https://itqimlgnrjikaamstdlp.supabase.co'||
  typeof config.publishableKey!=='string'||!config.publishableKey.startsWith('sb_publishable_'))
  throw Error('Supabase published project config mismatch or privileged key');
 if(Object.keys(config).sort().join()!==['projectRef','publishableKey','url'].sort().join())
  throw Error('Unexpected config fields; secret/privileged keys forbidden');
}
const css=(await Promise.all(['lab/match-stage.css','lab/yw2-layout.css'].map(p=>
 readFile(path.join(root,p),'utf8')))).join('\n');
const built=await build({entryPoints:[path.join(root,'lab/sites-embed-supabase-entry.mjs')],
 bundle:true,write:false,format:'iife',platform:'browser',target:['safari13'],
 minify:true,metafile:true,logLevel:'silent',legalComments:'none',
 define:{__YW_SUPABASE_CONFIG__:JSON.stringify(config),
  __YW_QA_FULL_MATCH__:String(qaFullMatch)}});
if(built.outputFiles.length!==1)throw Error('Need one IIFE bundle');
const modules=Object.keys(built.metafile.inputs);
for(const dependency of ['network/supabase-room.mjs','network/firebase-match.mjs',
 'engine/match-protocol.mjs','ui/match-stage.mjs']){
 if(!modules.some(m=>m.endsWith(dependency)))throw Error('Missing '+dependency);
}
if(modules.some(m=>/sites-embed-local-entry|firebase-match-stage\.html/.test(m)))
 throw Error('Offline fixture accidentally imported into online game');
const js=built.outputFiles[0].text.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
// Supabase JS v2 browser UMD is pinned; no JS secrets or service_role key.
// SDK is loaded externally, identical to the prior Firebase Google Sites style.
const scripts=config?'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0"></script>':'';
const fragment=['<!-- Phase25 Supabase: '+mode+'; real iPad/Sites not yet proven -->',
 '<style>',css,
 '#yw-sites-online .yw-online-bar{background:#23364a;color:#e3ecfa;padding:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;font:13px/1.45 -apple-system,system-ui,sans-serif}',
 '#yw-sites-online .yw-online-bar button,#yw-sites-online .yw-online-bar input{font:inherit;padding:8px;min-height:36px;background:#204968;color:#fff;border:1px solid #7896ae;border-radius:7px}',
 '#yw-sites-online .yw-online-bar button:disabled{opacity:.45}',
 '#yw-sites-online .yw-online-bar input{width:118px;background:#10243a}',
 '#yw-sites-online .yw-online-status{font-size:12px;color:#d9e5f0;padding:9px;background:#142638}',
 '</style>',
 '<section id="yw-sites-online" aria-label="輪戦 オンライン通信開発版">',
 '<div class="yw-online-bar"><strong>輪戦｜オンライン対戦</strong>',
 '<span>試遊版：攻撃・妖術・つつくの妖気は調整用仮値です。旧iPad実機は未検証。ホスト画面が開いている間だけ進行します。</span>',
 '<button class="yw-online-make" disabled type="button">ホスト：部屋作成</button>',
 '<input class="yw-online-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6桁番号" aria-label="部屋番号">',
 '<button class="yw-online-join" disabled type="button">ゲスト：参加</button>',
 '<button class="yw-online-start" disabled type="button">ホスト：試合開始</button>',
 '<button class="yw-online-connect" disabled type="button">ゲスト：戦闘接続</button>',
 '<button class="yw-online-retry" disabled type="button">未確定入力を再送</button>',
 '<button class="yw-online-auto" disabled hidden type="button" aria-pressed="false">自動進行 OFF</button>',
 ...(qaFullMatch?['<button class="yw-online-qa-finish" type="button">QA-ONLY 終局まで高速進行</button>']:[]),
 '<span class="yw-online-presence">未接続</span><b class="yw-online-role">席未選択</b>',
 '</div><div class="yw-online-status" role="status">接続初期化中</div>',
 '<div id="battle-stage"></div></section>',
 scripts,'<script>',js,'</script>'].join('\n');
if((fragment.match(/<style\b/g)||[]).length!==1)throw Error('Style wrapper failed');
if(!config&&/<script[^>]+src/i.test(fragment))
 throw Error('Unconfigured setup must never load a remote SDK');
if(config&&(!fragment.includes('cdn.jsdelivr.net')||!fragment.includes('sb_publishable_')))
 throw Error('Configured Supabase build missing external SDK or publishable key');
const html='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fragment+'</body></html>';
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist',basename+'-code.html'),fragment);
await writeFile(path.join(root,'dist',basename+'-preview.html'),html);
console.log('SITES-SUPABASE-BUILD-PASS '+JSON.stringify({mode,bytes:Buffer.byteLength(fragment),
 sourceModules:modules.length,externalSDKs:config?1:0,basename}));
