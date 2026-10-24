import test from 'node:test';
import assert from 'node:assert/strict';
import {SPIRIT_DESIGNS,spiritIndex,renderSpiritPortrait} from '../ui/character-art.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';

test('six original inline SVG silhouettes match fixed six-unit rental team',()=>{
 assert.equal(SPIRIT_DESIGNS.length,6);
 assert.deepEqual(SPIRIT_DESIGNS.map(x=>x.name),RENTAL_SQUAD.map(x=>x.name));
 const faces=SPIRIT_DESIGNS.map((design,i)=>renderSpiritPortrait('A'+(i+1)));
 assert.equal(new Set(faces).size,6,'six designs must be structurally distinct');
 for(let i=0;i<6;i++){
  assert.equal(spiritIndex('A'+(i+1)),i);
  assert.equal(spiritIndex('B'+(i+1)),i);
  assert.equal(spiritIndex(i),i);
  assert.equal(renderSpiritPortrait('A'+(i+1)),renderSpiritPortrait('B'+(i+1)),
   'identical rental units must share art across the two teams');
  assert.match(faces[i],/^<svg class="mb-character-art"/);
  assert.match(faces[i],/data-design="/);
  assert.match(faces[i],/viewBox="0 0 96 96"/);
  assert.match(faces[i],/aria-hidden="true"/);
  assert.match(faces[i],/focusable="false"/);
  assert.match(faces[i],/<path |<ellipse /);
  assert.doesNotMatch(faces[i],/<image|xlink:href|url\(|https?:|<script|<filter|onload=/i,
   'SVG art must load no external resources/scripts/filters');
  assert.ok(Buffer.byteLength(faces[i],'utf8')<4500,'small inline SVG required');
 }
});
test('mini portraits remain original and invalid untrusted IDs are safe',()=>{
 assert.equal(spiritIndex('A7'),-1);assert.equal(spiritIndex('B0'),-1);
 assert.equal(spiritIndex('X1'),-1);assert.equal(spiritIndex({id:'A1'}),-1);
 assert.equal(spiritIndex(-1),-1);assert.equal(spiritIndex('A1" onclick="x'),-1);
 assert.match(renderSpiritPortrait('B4',{mini:true}),/class="mb-character-art mb-mini-art"/);
 assert.match(renderSpiritPortrait('B4',{mini:true}),/data-design="breezefox"/);
 assert.match(renderSpiritPortrait('B4',{mini:true}),/aria-hidden="true"/);
 assert.match(renderSpiritPortrait('unknown'),/data-design="unknown"/);
 assert.doesNotMatch(renderSpiritPortrait('A1" onclick="x'),/onclick|<script|url\(/i);
});
