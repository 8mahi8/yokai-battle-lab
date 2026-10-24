import assert from 'node:assert/strict';
import test from 'node:test';
import {auditPokeSoulTrace} from '../engine/phase21d-poke-soul-trace.mjs';

const gauges=()=>[
  ...Array.from({length:6},(_,i)=>({id:'A'+(i+1),soul:25,capacity:100})),
  ...Array.from({length:6},(_,i)=>({id:'B'+(i+1),soul:60,capacity:100}))
];
const update=(rows,id,soul)=>rows.map(row=>row.id===id?{...row,soul}:row);
const defaults=(changes={})=>({
  side:0,targetId:'B1',before:gauges(),after:gauges(),
  isolatedPokeWindow:true,...changes
});

test('21D-C2: measured enemy drain and allied growth are reported, not falsely proved a transfer',()=>{
  const before=gauges();
  let after=update(before,'B1',40);
  after=update(after,'A2',45);
  const result=auditPokeSoulTrace(defaults({before,after}));
  assert.equal(result.status,'target-soul-decrease-observed');
  assert.equal(result.targetLost,20);
  assert.deepEqual(result.potentialRecipients,['A2']);
  assert.deepEqual(result.foeChanges.map(x=>[x.id,x.delta]),[['B1',-20]]);
  assert.deepEqual(result.allyChanges.map(x=>[x.id,x.delta]),[['A2',20]]);
  assert.equal(result.changes.length,12);
  assert.match(result.limitations.join(' '),/does not prove Poke caused it/);
  assert.equal(result.evidenceTier,'official-effect-type-numeric-details-unverified');
});

test('21D-C2: original manual does not justify inventing a recipient after enemy meter loss',()=>{
  const before=gauges(),after=update(before,'B1',10);
  const result=auditPokeSoulTrace(defaults({before,after}));
  assert.equal(result.targetLost,50);
  assert.deepEqual(result.potentialRecipients,[]);
  assert.equal(result.status,'target-soul-decrease-observed');
  assert.equal(result.allyChanges.length,0);
});

test('21D-C2: unchanged Soul meters are merely a no-drain observation, not a YW2 reward declaration',()=>{
  const result=auditPokeSoulTrace(defaults());
  assert.equal(result.status,'no-target-soul-decrease-observed');
  assert.equal(result.targetLost,0);
  assert.ok(result.limitations.some(s=>s.includes('ONE possible')));
});

test('21D-C2: interfering actions force indeterminate even when meters appear to transfer',()=>{
  const before=gauges();
  const after=update(update(before,'B1',20),'A1',65);
  const result=auditPokeSoulTrace(defaults({
    before,after,isolatedPokeWindow:false
  }));
  assert.equal(result.status,'indeterminate');
  assert.equal(result.targetLost,40);
  assert.deepEqual(result.potentialRecipients,['A1']);
  assert.match(result.limitations.at(-1),/Intervening actions/);
});

test('21D-C2: reverse direction keeps team ownership and original target identity intact',()=>{
  const before=gauges();
  const after=update(update(before,'A4',0),'B5',75);
  const result=auditPokeSoulTrace(defaults({
    side:1,targetId:'A4',before,after
  }));
  assert.equal(result.status,'target-soul-decrease-observed');
  assert.equal(result.targetLost,25);
  assert.deepEqual(result.potentialRecipients,['B5']);
  assert.deepEqual(result.foeChanges.map(c=>c.id),['A4']);
});

test('21D-C2: input order and input snapshots are never mutated',()=>{
  const before=gauges(),after=gauges().reverse();
  const originalBefore=JSON.stringify(before),originalAfter=JSON.stringify(after);
  const result=auditPokeSoulTrace(defaults({before,after}));
  assert.equal(result.status,'no-target-soul-decrease-observed');
  assert.equal(JSON.stringify(before),originalBefore);
  assert.equal(JSON.stringify(after),originalAfter);
  assert.deepEqual(result.changes.map(x=>x.id).slice(0,2),['A1','A2']);
});

test('21D-C2: reject unverifiable, incomplete, cross-side and out-of-range gauges',()=>{
  const original=gauges();
  for(const input of [
    {side:2},{side:'0'},{targetId:'A1'},{targetId:'B7'},
    {isolatedPokeWindow:'true'},
    {before:original.slice(0,11)},
    {after:original.map((x,i)=>i===0?{...x,id:'A2'}:x)},
    {after:update(original,'A1',101)},
    {after:update(original,'A1',-1)},
    {before:original.map((x,i)=>i===0?{...x,capacity:0}:x)},
    {after:original.map((x,i)=>i===0?{...x,capacity:200}:x)},
    {before:original.map((x,i)=>i===0?{...x,soul:1.5}:x)}
  ])assert.throws(()=>auditPokeSoulTrace(defaults(input)));
});
