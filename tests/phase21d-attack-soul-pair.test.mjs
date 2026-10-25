import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditDamagingActionSoulPair, auditSoulGaugeChange
} from '../engine/phase21d-soul-observation.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';

const normal=()=>({
  actorId:'A1',gaugeOwnerId:'A1',targetId:'B1',
  actionKind:'attack',moveKey:'test-physical-1',
  enemyStatus:'normal',hitLanded:true,capacity:100,before:20,after:25
});
const affected=(changes={})=>({
  ...normal(),enemyStatus:'loafing',after:29,...changes
});
const check=(changes={})=>auditDamagingActionSoulPair({
  baseline:normal(),vulnerable:affected(),
  sameBattleConditionsConfirmed:true,
  noOtherSoulSourcesConfirmed:true,...changes
});

test('21D-B4 paired synthetic hit observations report difference, NOT original-game number',()=>{
  const r=check();
  assert.equal(r.status,'vulnerable-greater-observed');
  assert.equal(r.normalDelta,5);
  assert.equal(r.vulnerableDelta,9);
  assert.equal(r.observedDifference,4);
  assert.equal(r.originalNumericBonus,null);
  assert.equal(r.originalRuleVerified,false);
  assert.match(r.sourceTier,/secondary-qualitative/);
  assert.match(r.limitations.join(' '),/do not specify exact Soul points/);
});

test('21D-B4 negative Inspirit eligible as different vulnerable category',()=>{
  const r=check({vulnerable:affected({enemyStatus:'negative-inspirit',after:27})});
  assert.equal(r.status,'vulnerable-greater-observed');
  assert.equal(r.observedDifference,2);
});

test('21D-B4 damaging technique may be compared but not assigned physical attack formula',()=>{
  const a={...normal(),actionKind:'technique',moveKey:'water-technique',after:23};
  const b={...affected(),actionKind:'technique',moveKey:'water-technique',after:28};
  const r=check({baseline:a,vulnerable:b});
  assert.equal(r.status,'vulnerable-greater-observed');
  assert.equal(r.actionKind,'technique');
  assert.equal(r.originalNumericBonus,null);
  assert.match(r.limitations.join(' '),/physical attacks and damaging techniques differ/);
});

test('21D-B4 observed no advantage is NOT rewritten to match a guide',()=>{
  const r=check({vulnerable:affected({after:24})});
  assert.equal(r.status,'not-greater-observed');
  assert.equal(r.observedDifference,-1);
  assert.equal(r.originalRuleVerified,false);
});

test('21D-B4 unrelated passive source means no causal comparison',()=>{
  const r=check({noOtherSoulSourcesConfirmed:false});
  assert.equal(r.status,'indeterminate');
  assert.equal(r.observedDifference,null);
  assert.ok(r.reasonForUncertainty.some(s=>s.includes('Other Soul gains')));
});

test('21D-B4 unconfirmed equipment or timing matching means no inferred bonus',()=>{
  const r=check({sameBattleConditionsConfirmed:false});
  assert.equal(r.status,'indeterminate');
  assert.equal(r.observedDifference,null);
});

test('21D-B4 rejected causal comparison when actor, target, move or starting gauge differs',()=>{
  for(const v of [
    {actorId:'A2'}, {targetId:'B2'}, {moveKey:'different-move'},
    {actionKind:'technique'}, {before:15},{capacity:110},
    {gaugeOwnerId:'A2'}
  ]){
    const r=check({vulnerable:affected(v)});
    assert.equal(r.status,'indeterminate');
    assert.equal(r.originalNumericBonus,null);
  }
});

test('21D-B4 hit misses and meter saturation cannot prove reward magnitude',()=>{
  for(const v of [
    {hitLanded:false}, {before:20,after:100}, {capacity:25,after:25,before:20}
  ]){
    const r=check({vulnerable:affected(v)});
    assert.equal(r.status,'indeterminate');
    assert.equal(r.observedDifference,null);
  }
  const fullBaseline=check({baseline:{...normal(),after:100}});
  assert.equal(fullBaseline.status,'indeterminate');
});

test('21D-B4 invalid controls, enemy conditions and corrupt gauge rejected',()=>{
  for(const overrides of [
    {baseline:null}, {vulnerable:{...affected(),enemyStatus:'normal'}},
    {baseline:{...normal(),enemyStatus:'loafing'}},
    {vulnerable:{...affected(),targetId:'A5'}},
    {vulnerable:{...affected(),before:-1}},
    {vulnerable:{...affected(),after:101}},
    {baseline:{...normal(),moveKey:''}},
    {vulnerable:{...affected(),actionKind:'guard'}},
    {sameBattleConditionsConfirmed:'true'},
    {noOtherSoulSourcesConfirmed:1}
  ]) assert.throws(()=>check(overrides));
});

test('21D-B4 research audit does not mutate observations or patch live host',()=>{
  const baseline=Object.freeze(normal()),vulnerable=Object.freeze(affected());
  const a=JSON.stringify(baseline),b=JSON.stringify(vulnerable);
  check({baseline,vulnerable});
  assert.equal(JSON.stringify(baseline),a);
  assert.equal(JSON.stringify(vulnerable),b);
  const forced=RENTAL_SQUAD.map(u=>({...u,weights:[100,0,0,0]}));
  const match=createMatchProtocol({battleOptions:{seed:41,teams:[forced,forced]}});
  const before=match.snapshot().game.soul.teams.flat().map(x=>({id:x.id,soul:x.soul}));
  const next=match.advanceAuto();
  assert.equal(next.result.kind,'attack');
  const meter=match.snapshot().game.soul.teams.flat().find(x=>x.id===next.result.actor);
  assert.equal(meter.soul,0,'existing host attack fixture must not be silently changed');
  assert.ok(before.every(x=>x.soul===0));
  const o=auditSoulGaugeChange({gaugeOwnerId:meter.id,actorId:meter.id,
    actionKind:'attack',before:0,after:meter.soul,capacity:meter.capacity,
    noOtherSoulSourcesConfirmed:true});
  assert.equal(o.status,'indeterminate');
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});
