import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const file=readFileSync(new URL('../lab/match-contract.html',import.meta.url),'utf8');
test('two-seat host command lab is ordinary valid ES module with strict import',()=>{
 const script=file.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.match(script,/import \{createMatchProtocol,replayMatchJournal\} from '\.\.\/engine\/match-protocol\.mjs'/);
 const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);
});
test('lab has explicit non-network research label and both seats visible',()=>{
 for(const text of ['1台のブラウザ内','実際のオンラインルーム','id="side0"',
  'id="side1"','id="history"','id="replay"','id="autoStep"',
  'data-command="retransmit"','同じ','研究'])
  assert.ok(file.includes(text),'missing label/control: '+text);
});
test('browser interaction does not expose debug cheats or hidden force-win commands',()=>{
 for(const str of ['battle.giveSoul(','.applyInspirit(','.purify(','.resolveSoultimate(',
  'document.cookie','localStorage','sessionStorage','fetch('])
  assert.equal(file.includes(str),false,'forbidden or unsupported direct command '+str);
});
