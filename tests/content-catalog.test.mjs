import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD as squad, SCHOOL_RENTAL_PERSONALITIES as trial}
 from '../content/rental-roster.mjs';
import {RENTAL_SQUAD as viaCombat, SCHOOL_RENTAL_PERSONALITIES as viaCompat,
 createCombat} from '../engine/combat.mjs';

test('rental character templates have a single authoritative data source',()=>{
 assert.strictEqual(squad,viaCombat,'legacy import must reference the same roster');
 assert.strictEqual(trial,viaCompat,'legacy trial personality import must remain stable');
 assert.ok(Object.isFrozen(squad)&&Object.isFrozen(trial));
 assert.equal(squad.length,6);
 assert.equal(trial.length,6);
 assert.equal(new Set(squad.map(x=>x.name)).size,6);
 for(let i=0;i<6;i++){
  const x=squad[i];
  assert.ok(x.name&&x.skill&&x.attitude&&x.inspirit);
  for(const key of ['maxHp','speed','strength','spirit','defense','attackPower','techniquePower']){
   assert.ok(Number.isSafeInteger(x[key])&&x[key]>=0,key);
  }
  assert.equal(x.weights.length,4);
  assert.equal(x.weights.reduce((a,b)=>a+b,0),100);
  assert.equal(trial[i].weights.length,4);
  assert.equal(trial[i].weights.reduce((a,b)=>a+b,0),100);
 }
});
test('school-only behavior differs in personality, not in character identities or symmetric teams',()=>{
 const lab=createCombat({seed:212});
 const school=createCombat({seed:212,playtestSoulTuning:true});
 const a=lab.snapshot().squads[0],b=school.snapshot().squads[0];
 assert.deepEqual(a.map(x=>x.name),b.map(x=>x.name));
 assert.deepEqual(b.map(x=>x.weights),school.snapshot().squads[1].map(x=>x.weights));
 assert.deepEqual(b.map(x=>x.name),school.snapshot().squads[1].map(x=>x.name));
 assert.equal(b[3].attitude,'brainy');
 assert.equal(b[5].attitude,'cruel');
 assert.equal(a[3].attitude,'grouchy');
 assert.equal(a[5].attitude,'grouchy');
});
