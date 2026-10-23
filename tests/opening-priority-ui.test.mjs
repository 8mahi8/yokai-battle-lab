import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../lab/phase1.html',import.meta.url),'utf8');
test('Phase1 research scheduler HTML embeds syntactically valid ES Module',()=>{
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match);
 const parsed=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[1],encoding:'utf8'});
 assert.equal(parsed.status,0,parsed.stderr);
});
test('opening-first and Flash UI makes source-uncertain policies explicit',()=>{
 for(const part of ['flashToggle','flashDeploy','matchingToggle','skipPolicy','priorityForecast',
  '行動権の減算式','数値補正は未実装','⚡閃光'])
  assert.ok(html.includes(part),'Missing Flash UI/qualification: '+part);
});
