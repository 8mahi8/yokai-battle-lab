import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

// Historical qualitative PvP evidence (2014 actual match):
// https://www.youtube.com/watch?v=bLt5uujW9kU
// Video description says Poke robbed Soul and a following Katsuobushi
// Slash decided a match. NOT a timestamped 12-gauge original measurement.
// This lab exercises the *mechanical dependency* under a labelled
// intentionally fictional Poke-transfer fixture only. NEVER enable
// that fixture in the authoritative online match.
const meter=(g,id)=>g.snapshot().soul.teams.flat().find(x=>x.id===id).soul;
const finishPoke=(g,targetId)=>{
  const started=g.beginPoke(0,targetId);
  assert.equal(started.ok,true,JSON.stringify(started));
  for(let i=0;i<11;i++){
    const tap=g.pokeInput(0,{type:'tap',x:.5,y:.5});
    assert.equal(tap.ok,true);assert.equal(tap.completed,false);
  }
  return g.pokeInput(0,{type:'tap',x:.5,y:.5});
};
const cast=(g)=>{
  g.setWatchMode(0,'standard');
  const charged=g.prepareSoultimate(0,'A1');
  assert.equal(charged.ok,true,JSON.stringify(charged));
  const result=g.resolveSoultimate(0,charged.token,true);
  assert.equal(result.ok,true);
  assert.equal(result.kind,'soultimate');
  assert.equal(result.effectStatus,'unimplemented',
    'no original special effect is invented by this lab');
  return result;
};
test('22A lab: Poke→normal Soultimate→second target Poke→second Soultimate works only as a marked fixture',()=>{
  const g=createCombat({researchPokeSoulTransfer:100,researchSpecialEffects:false});
  g.giveSoul('A1',70);
  g.giveSoul('B1',60);
  g.giveSoul('B2',100);
  g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
  g.applyInspirit({id:'B2',sign:'negative',effect:'sleep'});
  g.setWatchMode(0,'zero');

  const first=finishPoke(g,'B1');
  assert.equal(first.reward.kind,'research-soul-transfer');
  assert.equal(first.reward.amount,30,'recipient Soul caps at 100');
  assert.equal(first.reward.recipientId,'A1');
  assert.equal(meter(g,'B1'),30);
  assert.equal(meter(g,'A1'),100);
  const zeroAttempt=g.prepareSoultimate(0,'A1');
  assert.equal(zeroAttempt.reason,'soul_not_full',
    'Zero Watch expects all three original ring neighbors for G-tech');
  const firstSpecial=cast(g);
  assert.deepEqual(firstSpecial.consumers,['A1']);
  assert.equal(meter(g,'A1'),0);

  g.setWatchMode(0,'zero');
  assert.equal(g.beginPoke(0,'B1').reason,'already_poked');
  const second=finishPoke(g,'B2');
  assert.equal(second.reward.kind,'research-soul-transfer');
  assert.equal(second.reward.amount,100);
  assert.equal(meter(g,'B2'),0);
  assert.equal(meter(g,'A1'),100);
  const secondSpecial=cast(g);
  assert.deepEqual(secondSpecial.consumers,['A1']);
  assert.equal(meter(g,'A1'),0);
  assert.deepEqual(g.snapshot().poke.used[0],['B1','B2']);
  assert.deepEqual(g.snapshot().events.filter(x=>x.type==='poke')
    .map(x=>x.targetId),['B1','B2']);
});

test('22A lab: no artificial Soul transfer means Poke cannot enable an immediate Soultimate',()=>{
  const g=createCombat();
  g.giveSoul('A1',70);
  g.giveSoul('B1',60);
  g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
  g.setWatchMode(0,'zero');
  const poke=finishPoke(g,'B1');
  assert.equal(poke.reward.kind,'unresolved');
  assert.equal(poke.reward.amount,0);
  assert.equal(meter(g,'A1'),70);
  assert.equal(meter(g,'B1'),60);
  g.setWatchMode(0,'standard');
  assert.equal(g.prepareSoultimate(0,'A1').reason,'soul_not_full');
});

test('22A production host cannot enable the lab Soul-transfer shortcut',()=>{
  assert.throws(()=>createMatchProtocol({battleOptions:{
    researchPokeSoulTransfer:100
  }}),/forbids option/);
  const m=createMatchProtocol();
  assert.equal(m.exportJournal().initialOptions.researchPokeSoulTransfer,undefined);
});


test('22A lab: rotation permits a second DIFFERENT caster to use a second Poke-funded Soultimate',()=>{
  // RC / 2020 player party notes describe Poke-based energy feeding multiple
  // different attackers, but they do NOT specify the Soul transfer mechanics.
  // This intentionally relies on the existing lab's fictional first-living-
  // frontline-recipient rule, and makes that chosen recipient change via
  // a normal wheel rotation between the two Pokes.
  const g=createCombat({researchPokeSoulTransfer:100,researchSpecialEffects:false});
  for(const id of ['B1','B2'])g.giveSoul(id,100);
  for(const id of ['B1','B2'])
    g.applyInspirit({id,sign:'negative',effect:'sleep'});
  g.setWatchMode(0,'zero');
  const first=finishPoke(g,'B1');
  assert.equal(first.reward.recipientId,'A1');
  assert.equal(first.reward.amount,100);
  g.setWatchMode(0,'standard');
  const chargedA1=g.prepareSoultimate(0,'A1');
  assert.equal(chargedA1.ok,true);
  assert.equal(g.resolveSoultimate(0,chargedA1.token,true).ok,true);
  assert.equal(meter(g,'A1'),0);

  const rotation=g.rotate(0,1);
  assert.equal(rotation.ok,true,JSON.stringify(rotation));
  assert.deepEqual(g.snapshot().clock.teams[0].frontIds,['A2','A3','A4']);
  g.setWatchMode(0,'zero');
  const second=finishPoke(g,'B2');
  assert.equal(second.reward.recipientId,'A2');
  assert.equal(second.reward.amount,100);
  assert.equal(meter(g,'A2'),100);
  g.setWatchMode(0,'standard');
  const chargedA2=g.prepareSoultimate(0,'A2');
  assert.equal(chargedA2.ok,true);
  const resolvedA2=g.resolveSoultimate(0,chargedA2.token,true);
  assert.equal(resolvedA2.ok,true);
  assert.equal(resolvedA2.effectStatus,'unimplemented');
  assert.equal(meter(g,'A2'),0);
  assert.equal(meter(g,'B1'),0);
  assert.equal(meter(g,'B2'),0);
  assert.deepEqual(g.snapshot().poke.used[0],['B1','B2']);
});
