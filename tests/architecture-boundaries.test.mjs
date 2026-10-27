import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const text=path=>readFileSync(new URL(path,root),'utf8');

test('battle-presentation plan is a pure adapter; no combat, Firebase, DOM or wall-clock dependencies',()=>{
 for(const path of ['presentation/action-catalog.mjs','presentation/action-choreography.mjs']){
  const code=text(path);
  assert.doesNotMatch(code,/\bfrom\s*['"][^'"]*(?:engine|network|ui|lab)\//);
  assert.doesNotMatch(code,/\b(?:window|document|performance|requestAnimationFrame|setTimeout|setInterval|fetch|Date)\b\s*\(?/);
  assert.doesNotMatch(code,/Math\.random\s*\(/);
 }
});
test('characters live in isolated content module and combat legacy API is an adapter',()=>{
 const data=text('content/rental-roster.mjs');
 assert.doesNotMatch(data,/\bfrom\s*['"][^'"]*(?:engine|network|ui|lab)\//);
 assert.doesNotMatch(data,/\b(?:window|document|fetch|setInterval|setTimeout)\b\s*\(?/);
 const combat=text('engine/combat.mjs');
 assert.match(combat,/import \{RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES\} from '\.\.\/content\/rental-roster\.mjs'/);
 assert.match(combat,/export \{RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES\} from '\.\.\/content\/rental-roster\.mjs'/);
});
