import test from 'node:test';
import assert from 'node:assert/strict';
import {SOUL_RECHARGE_SOURCE_CASES,comparePublishedRechargeEvidence,predictResearchRecharge}
  from '../engine/phase21d-soul-rate-evidence.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';

/** Independent transcription of the 8 original player experiment lines:
 * kind, Soul capacity, turns-to-full with 0 / 1 / 2 Enra adjacent Souls.
 * See https://note.com/ricosama0726/n/n14710bbe446c
 */
const SOURCE=[
  ['g4-power',250,[50,25,17]],
  ['g3-power',200,[40,23,16]],
  ['g4-soul',165,[33,21,15]],
  ['g3-soul',130,[26,19,13]],
  ['g2-power',130,[26,19,14]],
  ['g2-soul',105,[21,15,12]],
  ['g1-power',100,[20,15,12]],
  ['g1-soul',75,[15,13,10]]
];

test('21D-B: eight original-player experimental Soul rate groups are preserved exactly',()=>{
  assert.equal(SOUL_RECHARGE_SOURCE_CASES.length,8);
  assert.deepEqual(SOUL_RECHARGE_SOURCE_CASES.map(x=>[x.kind,x.capacity,x.turnsToFull]),SOURCE);
  assert.ok(Object.isFrozen(SOUL_RECHARGE_SOURCE_CASES));
  assert.ok(SOUL_RECHARGE_SOURCE_CASES.every(x=>Object.isFrozen(x)&&Object.isFrozen(x.turnsToFull)));
});
test('21D-B: candidate +5 plus 2%-per-Enra rule reproduces 23 of 24 observations, not all',()=>{
  const results=comparePublishedRechargeEvidence();
  assert.equal(results.length,24);
  assert.equal(results.filter(x=>x.agrees).length,23);
  assert.deepEqual(results.filter(x=>!x.agrees),[
    {kind:'g2-power',capacity:130,adjacentRecoverySouls:2,
     observedActions:14,predictedActions:13,candidatePerAction:10,
     agrees:false,confidence:'original-player-experiment-unreplicated'}
  ]);
});
test('21D-B: equal gauge capacity cannot guarantee equal observations across grades',()=>{
  const rows=SOUL_RECHARGE_SOURCE_CASES.filter(x=>x.capacity===130);
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.turnsToFull[2]),[13,14]);
  // This unresolved difference prevents silently accepting a general formula.
});
test('21D-B: candidate rate values must be labelled unverified original behavior',()=>{
  const entry=predictResearchRecharge({capacity:250,adjacentRecoverySouls:2});
  assert.equal(entry.perAction,15);
  assert.equal(entry.actionsToFull,17);
  assert.equal(entry.originalParityVerified,false);
  assert.match(entry.model,/hypothesis/);
});
test('21D-B: model checks ceiling at gauge saturation, low rate and divisors',()=>{
  assert.deepEqual([0,1,2].map(adjacentRecoverySouls=>
    predictResearchRecharge({capacity:75,adjacentRecoverySouls}).actionsToFull),[15,13,10]);
  assert.equal(predictResearchRecharge({capacity:1}).actionsToFull,1);
  assert.equal(predictResearchRecharge({capacity:10000,adjacentRecoverySouls:2}).actionsToFull,25);
});
test('21D-B: invalid values do not enter any model',()=>{
  for(const bad of [{},{capacity:0},{capacity:10001},{capacity:1.5},{capacity:NaN},
      {capacity:Infinity},{capacity:100,adjacentRecoverySouls:3},
      {capacity:100,adjacentRecoverySouls:-1},
      {capacity:100,adjacentRecoverySouls:1.5},
      {capacity:100,adjacentRecoverySouls:'2'}]){
    assert.throws(()=>predictResearchRecharge(bad));
  }
});
test('21D-B: online rental host still omits experimental adjacent Soul equipment rates',()=>{
  const match=createMatchProtocol({battleOptions:{seed:36,teams:[
    RENTAL_SQUAD.map(x=>({...x,weights:[0,0,0,100]})),
    RENTAL_SQUAD.map(x=>({...x,weights:[0,0,0,100]}))
  ]}});
  assert.equal(Object.keys(match.exportJournal().initialOptions)
    .filter(x=>x.toLowerCase().includes('adjacent')).length,0);
  const step=match.advanceAuto();
  assert.equal(step.ok,true);
  const gauges=match.snapshot().game.soul.teams.flat();
  assert.equal(gauges.find(x=>x.id===step.result.actor).soul,5);
  assert.ok(gauges.filter(x=>x.id!==step.result.actor).every(x=>x.soul===0));
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});
