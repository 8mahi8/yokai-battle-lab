import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('browser laboratory ES-module source parses in Node without npm dependencies',()=>{
 const html=readFileSync(new URL('../lab/phase2.html',import.meta.url),'utf8');
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match,'expected one inline module script');
 const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:match[1],encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);
});
test('browser laboratory imports an existing engine path',()=>{
 const html=readFileSync(new URL('../lab/phase2.html',import.meta.url),'utf8');
 assert.match(html,/import \{createCombat\} from '\.\.\/engine\/combat\.mjs'/);
 assert.equal(existsSync(new URL('../engine/combat.mjs',import.meta.url)),true);
});
test('Soul research controls have both visible affordances and handlers',()=>{
 const html=readFileSync(new URL('../lab/phase2.html',import.meta.url),'utf8');
 for(const token of ['data-soul','data-watch','data-special','data-finish','data-cancel','pokeEligibility','prepareSoultimate','resolveSoultimate'])
   assert.ok(html.includes(token),'missing UI control or handler: '+token);
 assert.match(html,/技効果は未実装/);
});
