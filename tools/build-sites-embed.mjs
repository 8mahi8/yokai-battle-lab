/**
 * Phase24A deterministic one-file Google Sites "Embed code" trial builder.
 *
 * Output A: dist/sites-embed-code.html - paste its ENTIRE contents as HTML
 * Output B: dist/sites-embed-local-preview.html - full HTML for local QA
 *
 * Deliberately LOCAL-only. Firebase/Auth/networking are excluded by the
 * entrypoint and the esbuild metafile allowlist. Never claim this is online PvP.
 * The production service config must be supplied and authorized separately.
 */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const load=rel=>readFile(path.join(root,rel),'utf8');
const css=[await load('lab/match-stage.css'),await load('lab/yw2-layout.css')].join('\n');
const built=await build({
 entryPoints:[path.join(root,'lab/sites-embed-local-entry.mjs')],
 bundle:true,write:false,format:'iife',platform:'browser',
 target:['safari13'],minify:true,metafile:true,
 legalComments:'none',logLevel:'silent'
});
const sourcePaths=Object.keys(built.metafile.inputs);
if(sourcePaths.length<5||sourcePaths.some(x=>/network[\\/]|firebase|firebase-match|emulator/i.test(x)))
 throw Error('Build cannot include network/Firebase/emulator modules');
if(built.outputFiles.length!==1)throw Error('Expected exactly one JS bundle');
let js=built.outputFiles[0].text;
// Prevent HTML parsers from truncating the inlined script.
js=js.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
const id='yw-sites-local';
const shell=`<section id="${id}" aria-label="輪戦 オフライン一台二席体験版">
<div class="yw-sites-trial-bar">
 <strong>輪戦｜オフライン1台試遊</strong>
 <span>同じ端末でA/Bを切り替えて確認できます。オンライン対戦・ルーム接続は未搭載。</span>
 <button class="yw-sites-reset" type="button">初めから</button>
 <button class="yw-sites-auto" type="button" aria-pressed="false">自動進行 OFF</button>
 <small class="yw-sites-status" role="status">読み込み中</small>
</div>
<div id="battle-stage"></div>
</section>`;
const ownCss=`
#${id} {font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN",system-ui,sans-serif}
#${id} .yw-sites-trial-bar {display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:#243142;padding:9px;color:#e9f0fa}
#${id} .yw-sites-trial-bar strong {font-size:15px}
#${id} .yw-sites-trial-bar span {font-size:11px;color:#c7d5e1}
#${id} .yw-sites-trial-bar button {background:#3d6586;border:1px solid #92abc0;color:#fff;border-radius:7px;padding:8px 12px;min-height:36px}
#${id} .yw-sites-trial-bar small {flex-basis:100%;font-size:11px;color:#d8e6f4}
`;
const fragment=`<!-- Phase24A: LOCAL ONLY / NOT network 1vs1 / no Firebase credentials. -->
<style>\n${css}\n${ownCss}\n</style>
${shell}
<script>\n${js}\n</script>`;
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>輪戦｜Google Sites直接埋込 1台2席試遊</title></head><body>${fragment}</body></html>`;
const forbidden=[/demo-yokai-lab/i,/\.useEmulator\s*\(/i,/firebase\.initializeApp\s*\(/i,/<script[^>]+src\s*=/i,/<link[^>]+rel\s*=\s*["']stylesheet/i,/\bimport\s*\(/i,/<script[^>]+type\s*=\s*["']module/i];
for(const rule of forbidden)if(rule.test(fragment))throw Error('Offline standalone export contains forbidden reference: '+rule);
if((fragment.match(/<script\b/g)||[]).length!==1)throw Error('Expected one inline JS block');
if((fragment.match(/<style\b/g)||[]).length!==1)throw Error('Expected one inline CSS block');
if(!fragment.includes('mb-yw2')||!fragment.includes('mb-dualscreen'))
 throw Error('Lost original duel UI CSS');
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/sites-embed-code.html'),fragment);
await writeFile(path.join(root,'dist/sites-embed-local-preview.html'),html);
console.log('SITES-EMBED-BUILD-PASS',JSON.stringify({
 mode:'offline-1-device-2-seat-only',jsBytes:Buffer.byteLength(js),
 cssBytes:Buffer.byteLength(css),embedBytes:Buffer.byteLength(fragment),
 inputs:sourcePaths.length,inlineScripts:1,inlineStyles:1,noNetworkModules:true
}));
