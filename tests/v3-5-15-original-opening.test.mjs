import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../lab/yw2-layout.css',import.meta.url),'utf8');

test('original PvP Match01 opening is Friends-only and does not replay on late join',()=>{
 assert.match(stage,/id="mb-start-callout" class="mb-start-callout" hidden/);
 assert.match(stage,/いざ勝負！/);
 assert.match(stage,/if\(!matchIntroShown\)/);
 assert.match(stage,/!showResearchLabels&&!document\.hidden&&view\.winner===null&&view\.turn===0/);
 assert.match(stage,/!view\.events\.some\(e=>e\.type==='action'\|\|e\.type==='special'\)/);
 assert.match(stage,/950\); \/\/ presentation trial, not an original measured duration/);
 assert.match(stage,/clearTimeout\(matchIntroTimer\);matchIntroTimer=null;/);
});
test('opening cannot consume touches or cover late attack special scenes',()=>{
 assert.match(css,/\.mb-friends-stage \.mb-start-callout\{[^}]*pointer-events:none/);
 assert.match(css,/\.mb-start-callout\[hidden\]\{display:none!important\}/);
 assert.match(stage,/function beginScene\([\s\S]*?\$\('mb-start-callout'\)\.hidden=true/);
});
