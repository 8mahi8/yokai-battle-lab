import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {RENTAL_SOULTIMATE_TITLES,soultimateDisplayTitle}
 from '../content/presentation-labels.mjs';

test('six named Soultimates are a stable player-visible UI dictionary only',()=>{
 assert.equal(RENTAL_SQUAD.length,6);
 assert.equal(RENTAL_SOULTIMATE_TITLES.length,6);
 assert.equal(new Set(RENTAL_SOULTIMATE_TITLES).size,6);
 assert.ok(Object.isFrozen(RENTAL_SOULTIMATE_TITLES));
 for(let i=1;i<=6;i++){
  const name=RENTAL_SOULTIMATE_TITLES[i-1];
  assert.ok(name.length>=3,'cutins need recognizable move names');
  assert.equal(soultimateDisplayTitle('A'+i),name);
  assert.equal(soultimateDisplayTitle('B'+i),name,
   'both friend players use same six-creature rental squad');
 }
 assert.equal(soultimateDisplayTitle('C1'),'ひっさつわざ');
 assert.equal(soultimateDisplayTitle('A9'),'ひっさつわざ');
 assert.equal(soultimateDisplayTitle(null),'ひっさつわざ');
});
