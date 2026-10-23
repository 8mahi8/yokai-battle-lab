import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../lab/phase2.html',import.meta.url),'utf8');
test('battle lab Purify UI connects five gestures and never calls instant cleanse',()=>{
 for(const token of ['id="purifyOverlay"','id="purifyPad"','id="purifyCancel"',
  'id="purifyMeter"','id="purifyMode"','beginPurify(','purifyInput(','cancelPurify(',
  'pointerdown','pointermove','pointerup','purifyNames','pop','mash','rub','spin','slash'])
  assert.ok(html.includes(token),'missing required purge control: '+token);
 assert.ok(!html.includes('battle.purify('),'player-visible UI must not use developer direct Purify');
});
test('research purification rules are clearly marked as unverified in the UI',()=>{
 for(const token of ['研究用','経験値ボーナス','仮設定','後衛','とりつき'])
  assert.ok(html.includes(token),'missing source uncertainty disclosure: '+token);
});
test('purification overlay script remains valid ES module',()=>{
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
