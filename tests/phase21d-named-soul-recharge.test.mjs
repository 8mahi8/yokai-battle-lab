import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUL_RECHARGE_SOURCE_CASES,SOUL_RECHARGE_NAMED_SOURCE_CASES,
  SOUL_RECHARGE_INCREMENT_CLAIMS,compareNamedRechargeEvidence,
  compareSameCapacityRateIntervals
} from '../engine/phase21d-soul-rate-evidence.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

test('21D-B3 named source rows preserve all four reported exceptional observations',()=>{
  assert.deepEqual(SOUL_RECHARGE_NAMED_SOURCE_CASES.map(x=>[
    x.kind,x.confirmedCapacity,x.questionedCapacity,x.turnsToFull
  ]),[
    ['jibanyan-hyakuretsu',75,null,[15,13,10]],
    ['nyoe',null,100,[20,17,13]],
    ['nya-in',null,100,[20,17,13]],
    ['komanyachi',null,115,[23,16,13]]
  ]);
  assert.ok(Object.isFrozen(SOUL_RECHARGE_NAMED_SOURCE_CASES));
  assert.ok(SOUL_RECHARGE_NAMED_SOURCE_CASES.every(x=>
    Object.isFrozen(x)&&Object.isFrozen(x.turnsToFull)));
});

test('21D-B3 named Jibanyan full counts agree with the old g1-soul table without redefining either',()=>{
  const named=compareNamedRechargeEvidence()[0];
  assert.equal(named.kind,'jibanyan-hyakuretsu');
  assert.deepEqual(named.comparisons.map(x=>x.predictedActions),[15,13,10]);
  assert.deepEqual(named.comparisons.map(x=>x.agrees),[true,true,true]);
  assert.equal(named.originalParityVerified,false);
  assert.deepEqual(SOUL_RECHARGE_SOURCE_CASES.find(x=>x.kind==='g1-soul').turnsToFull,
    [15,13,10]);
});

test('21D-B3 unconfirmed max100? and max115? MUST NOT turn into authoritative predictions',()=>{
  const named=compareNamedRechargeEvidence();
  assert.equal(named.length,4);
  for(const row of named.slice(1)){
    assert.equal(row.capacity,null);
    assert.equal(row.unresolved,'questioned-gauge-capacity');
    assert.deepEqual(row.comparisons.map(x=>x.predictedActions),[null,null,null]);
    assert.deepEqual(row.comparisons.map(x=>x.agrees),[null,null,null]);
  }
  assert.deepEqual(named.slice(1).map(x=>x.questionedCapacity),[100,100,115]);
  assert.ok(named.every(x=>x.originalParityVerified===false));
});

test('21D-B3 author-described +2/+3 Enra increments remain observations, not adopted a formula',()=>{
  assert.deepEqual(SOUL_RECHARGE_INCREMENT_CLAIMS.map(x=>[
    x.subject,x.adjacentRecoverySouls,x.reportedAdditionalPerOwnerTurn
  ]),[
    ['robonyan',1,3],
    ['jibanyan-hyakuretsu',1,2]
  ]);
  assert.ok(Object.isFrozen(SOUL_RECHARGE_INCREMENT_CLAIMS));
  assert.ok(SOUL_RECHARGE_INCREMENT_CLAIMS.every(Object.isFrozen));
});

test('21D-B3 prior 24-case conflict remains visible, never fit away',()=>{
  assert.equal(SOUL_RECHARGE_SOURCE_CASES.length,8);
  const cap130=compareSameCapacityRateIntervals()
    .find(x=>x.capacity===130&&x.adjacentRecoverySouls===2);
  assert.equal(cap130.compatible,false);
  assert.deepEqual(cap130.observations.map(x=>x.turnsToFull),[13,14]);
});

test('21D-B3 named Soul experiment fixtures are not part of live match options',()=>{
  const match=createMatchProtocol();
  const options=match.exportJournal().initialOptions;
  for(const key of Object.keys(options))
    assert.ok(!/enra|named|additional|adjacent/i.test(key),'no empirical Soul buffs in '+key);
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});
