import assert from 'node:assert/strict';
import test from 'node:test';
import {auditFirstAction} from '../engine/opening-first-action-audit.mjs';
import {initialWaitRange} from '../engine/phase1.mjs';

const team=(speed=1)=>Array.from({length:6},()=>({speed}));
const duel=(a=team(),b=team())=>[a,b];

test('21C-B: equal-speed original front leaves six POSSIBLE openers; no invented tie rule',()=>{
  const result=auditFirstAction({teams:duel(team(211),team(211))});
  assert.equal(result.status,'not-observed');
  assert.deepEqual(result.possibleFirstActors,['A1','A2','A3','B1','B2','B3']);
  assert.equal(result.forcedFirstActor,null);
  assert.equal(result.firstWaitRanges.length,6);
  assert.deepEqual([result.firstWaitRanges[0].min,result.firstWaitRanges[0].max],initialWaitRange(211));
  assert.equal(result.confidence,'community-reference-only');
  assert.match(result.limitations.join(' '),/tie priority is unknown/);
});

test('21C-B: clear fast/slow fixture has one forced first actor under published wait ranges',()=>{
  const a=team(),b=team();
  a[0]={speed:999};
  const result=auditFirstAction({teams:duel(a,b),observedFirstActor:'A1'});
  assert.equal(result.status,'consistent-with-table');
  assert.deepEqual(result.possibleFirstActors,['A1']);
  assert.equal(result.forcedFirstActor,'A1');
  assert.deepEqual(result.firstWaitRanges.find(x=>x.id==='A1'),{id:'A1',speed:999,min:36,max:54});
});

test('21C-B: impossible synthetic first actor only contradicts table under strict baseline assumptions',()=>{
  const a=team(),b=team();
  a[0]={speed:999};
  const result=auditFirstAction({teams:duel(a,b),observedFirstActor:'B1'});
  assert.equal(result.status,'inconsistent-with-table');
  assert.deepEqual(result.possibleFirstActors,['A1']);
  assert.match(result.limitations.join(' '),/not measured 3DS/);
});

test('21C-B: registration-to-visible wheel difference marks first action indeterminate',()=>{
  const a=team(),b=team();a[3]={speed:999};
  const result=auditFirstAction({
    teams:duel(a,b),matchingStartOffsets:[0,0],
    visibleStartOffsets:[3,0],observedFirstActor:'B1'
  });
  assert.equal(result.status,'indeterminate');
  assert.deepEqual(result.matchingFront[0],['A1','A2','A3']);
  assert.deepEqual(result.visibleFront[0],['A4','A5','A6']);
  assert.equal(result.firstWaitRanges,null);
  assert.equal(result.possibleFirstActors,null);
  assert.equal(result.forcedFirstActor,null);
  assert.match(result.limitations.at(-1),/priority credit timing/);
});

test('21C-B: full-wheel-return histories cannot be inferred from equal visible offsets',()=>{
  const result=auditFirstAction({
    teams:duel(),matchingStartOffsets:[0,0],visibleStartOffsets:[0,0],
    wheelMovedSinceRegistration:true,observedFirstActor:'B1'
  });
  assert.equal(result.status,'indeterminate');
  assert.equal(result.firstWaitRanges,null);
});

test('21C-B: visible first fighter IDs are correctly rotated and side-specific',()=>{
  const a=team(),b=team();
  b[4]={speed:999};
  const result=auditFirstAction({
    teams:duel(a,b),matchingStartOffsets:[0,4],visibleStartOffsets:[0,4],
    observedFirstActor:'B5'
  });
  assert.deepEqual(result.visibleFront[1],['B5','B6','B1']);
  assert.deepEqual(result.possibleFirstActors,['B5']);
  assert.equal(result.status,'consistent-with-table');
});

test('21C-B: diagnostics never modify caller arrays and are reproducible',()=>{
  const original=duel(team(211),team(211));
  const before=JSON.stringify(original);
  const a=auditFirstAction({teams:original,observedFirstActor:'A3'});
  const b=auditFirstAction({teams:original,observedFirstActor:'A3'});
  assert.deepEqual(a,b);
  assert.equal(JSON.stringify(original),before);
});

test('21C-B: fail closed on missing data, invalid offsets, fake actor IDs or unknown wheel state',()=>{
  const teams=duel();
  for(const input of [
    {},{teams:[]},{teams:[team()]},{teams:[team(),team().slice(0,5)]},
    {teams:duel([{speed:0},...team().slice(1)],team())},
    {teams,visibleStartOffsets:[-1,0]},{teams,visibleStartOffsets:[6,0]},
    {teams,matchingStartOffsets:[0,'3']},{teams,wheelMovedSinceRegistration:'false'},
    {teams,observedFirstActor:'Z9'},{teams,observedFirstActor:'A7'}
  ])assert.throws(()=>auditFirstAction(input));
});
