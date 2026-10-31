import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../lab/yw2-layout.css',import.meta.url),'utf8');

test('V3-5-8 short Sites gesture dialog keeps a Safari pre-15.4 vh fallback before dvh',()=>{
 const rule=css.match(/\.mb-friends-stage\s+\.mb-modal-surface\s*\{([^}]+)\}/);
 assert.ok(rule,'no school Friends scoped gesture dialog height limit');
 const vh=rule[1].indexOf('max-height:calc(100vh - 30px)');
 const dvh=rule[1].indexOf('max-height:calc(100dvh - 30px)');
 assert.ok(vh>=0&&dvh>vh,'Safari without dvh would receive no height limit');
 assert.match(css,/\.mb-friends-stage\s+\.mb-modal-surface/);
 assert.match(css,/\.mb-friends-stage\s+\.mb-wheel\s*\{\s*touch-action:none/);
});
