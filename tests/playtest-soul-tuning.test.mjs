import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYTEST_SOUL_TUNING as T} from '../engine/playtest-soul-tuning.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
const party=weights=>RENTAL_SQUAD.map(u=>({...u,technique:'damage',weights:[...weights]}));
const soul=(g,id)=>g.snapshot().soul.teams.flat().find(u=>u.id===id).soul;
const pokeComplete=g=>{let r;for(let i=0;i<12;i++)r=g.pokeInput(0,{type:'tap',x:.5,y:.5});return r;};

test('playtest Soul preset is centralized, labelled temporary, and nonattack grants +5',()=>{
 assert.deepEqual([T.nonAttackGain,T.attackGain,T.techniqueGain,T.vulnerableHitBonus,T.pokeMaxTransfer],[5,8,8,4,35]);
 assert.ok(Object.isFrozen(T));
 const g=createCombat({teams:[party([0,0,0,100]),party([0,0,0,100])],playtestSoulTuning:true});
 const e=g.step();assert.equal(e.kind,'guard');
 assert.equal(e.soulPlaytest.gained,T.nonAttackGain);
 assert.equal(soul(g,e.actor),T.nonAttackGain);
});

test('normal physical attacks award provisional Soul to actor only',()=>{
 const g=createCombat({seed:51,teams:[party([100,0,0,0]),party([100,0,0,0])],playtestSoulTuning:true});
 const e=g.step();assert.equal(e.kind,'attack');
 assert.equal(e.soulPlaytest.model,'playtest-estimate');
 assert.equal(e.soulPlaytest.plannedGain,T.attackGain);
 assert.equal(soul(g,e.actor),T.attackGain);
 assert.equal(g.snapshot().soul.teams.flat().filter(u=>u.soul>0).length,1);
});

test('damaging technique has its own provisional tuneable gain',()=>{
 const g=createCombat({seed:43,teams:[party([0,100,0,0]),party([0,100,0,0])],playtestSoulTuning:true});
 const e=g.step();assert.equal(e.kind,'technique');
 assert.equal(e.soulPlaytest.plannedGain,T.techniqueGain);
 assert.equal(soul(g,e.actor),T.techniqueGain);
});

test('vulnerable target bonus applies only if attack lands',()=>{
 const g=createCombat({seed:53,teams:[party([100,0,0,0]),party([0,0,0,100])],
   playtestSoulTuning:true,researchDamageModel:true,researchStatInspirits:true});
 for(const id of ['B1','B2','B3'])g.applyInspirit({id,sign:'negative',effect:'strength-down'});
 let found=false;
 for(let i=0;i<20;i++){
  const e=g.step();if(e.type!=='action')break;
  if(!e.actor.startsWith('A'))continue;
  assert.equal(e.kind,'attack');
  assert.equal(e.soulPlaytest.vulnerableHit,e.hit);
  assert.equal(e.soulPlaytest.plannedGain,T.attackGain+(e.hit?T.vulnerableHitBonus:0));
  found=true;break;
 }
 assert.equal(found,true);
});

test('Poke transfers bounded available Soul; never exceeds recipient capacity',()=>{
 const g=createCombat({playtestSoulTuning:true});
 g.giveSoul('B1',80);g.giveSoul('A1',85);
 g.setWatchMode(0,'zero');g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPoke(0,'B1').ok,true);
 const result=pokeComplete(g);
 assert.equal(result.completed,true);
 assert.equal(result.reward.kind,'playtest-soul-transfer');
 assert.equal(result.reward.model,'playtest-estimate');
 assert.equal(result.reward.amount,15);
 assert.equal(soul(g,'A1'),100);assert.equal(soul(g,'B1'),65);
 assert.equal(g.snapshot().poke.playtestSoulTuning.pokeMaxTransfer,T.pokeMaxTransfer);
});

test('Poke cannot create Soul from an empty enemy or repeat its target',()=>{
 const g=createCombat({playtestSoulTuning:true});
 g.setWatchMode(0,'zero');g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPoke(0,'B1').ok,true);
 assert.equal(pokeComplete(g).reward.amount,0);
 assert.equal(soul(g,'A1'),0);
 assert.equal(g.beginPoke(0,'B1').reason,'already_poked');
});

test('original research fixture remains opt-in; attacks still have zero default study gain',()=>{
 const g=createCombat({seed:51,teams:[party([100,0,0,0]),party([100,0,0,0])],researchSoulRecoveryMode:'owner-nonattack'});
 const e=g.step();assert.equal(e.kind,'attack');assert.equal(e.soulPlaytest,undefined);
 assert.equal(soul(g,e.actor),0);assert.equal(g.snapshot().poke.rewardFixture,0);
});

test('host uses a flag, never exposes Soul amounts as guest commands, and replay remains deterministic',()=>{
 assert.throws(()=>createMatchProtocol({battleOptions:{playtestSoulTuning:10}}),/boolean/);
 assert.throws(()=>createMatchProtocol({battleOptions:{playtestSoulTuning:true,researchPokeSoulTransfer:40}}),/forbids option/);
 assert.throws(()=>createCombat({playtestSoulTuning:true,researchPokeSoulTransfer:10}),/cannot mix/);
 const m=createMatchProtocol({battleOptions:{playtestSoulTuning:true}});
 assert.equal(m.exportJournal().initialOptions.playtestSoulTuning,true);
 const evt=m.advanceAuto();assert.equal(evt.ok,true);assert.ok(evt.result.soulPlaytest);
 assert.equal(m.dispatch(0,1,{type:'giveSoul',id:'A1',amount:200}).reason,'invalid_command');
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
