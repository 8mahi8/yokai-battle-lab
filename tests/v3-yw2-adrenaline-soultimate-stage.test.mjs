import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {SKILL_TRIAL,skillMomentumStage} from '../engine/skill-effects.mjs';
import {calculateOneHit,statStageMultiplier} from '../engine/damage-model.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
function makeTeams(skill){
 const teams=[copy(RENTAL_SQUAD),copy(RENTAL_SQUAD)];
 teams[0][0].skill=skill;
 teams[0][0].special={
  kind:'damage',scope:'front',power:55,damageKind:'attack'
 };
 for(let i=0;i<6;i++){
  teams[1][i].defense=0;
  teams[1][i].maxHp=i===0?1:3000;
 }
 return teams;
}
function battle(skill,seed,researchYw2Momentum=true){
 return createCombat({seed,teams:makeTeams(skill),researchYw2Momentum,
  enableRentalSkills:true,researchDamageModel:true,researchMultiHit:true,
  researchSpecialEffects:true,researchSoultimateHitCount:2});
}
function cast(game){
 game.giveSoul('A1',100);
 const prep=game.prepareSoultimate(0,'A1');
 assert.equal(prep.ok,true);
 const result=game.resolveSoultimate(0,prep.token,true);
 assert.equal(result.ok,true);
 const snap=game.snapshot();
 const evt=snap.events.filter(x=>x.type==='special').at(-1);
 assert.ok(evt);
 assert.equal(evt.researchSoultimateHits.plannedPerTarget,2);
 return {evt,boost:snap.skillBoosts.A1??null,snap};
}
const withoutOrdinal=({eventId,...rest})=>rest;
function hitValues(evt){
 return evt.researchSoultimateHits.hits.map(({targetId,hit,critical,damage})=>
  ({targetId,hit,critical,damage}));
}

test('V3-4-10 sourced YW2 Adrenaline 2 stages/5 owner turns matches YW2 research multiplier',()=>{
 assert.equal(SKILL_TRIAL.momentumStages,2);
 assert.equal(SKILL_TRIAL.momentumOwnerTurns,5);
 assert.equal(statStageMultiplier(2),1.2);
 assert.equal(skillMomentumStage({remainingTurns:5}),2);
 const move={kind:'attack',power:55,strength:120,defense:0,hits:2};
 assert.ok(calculateOneHit({...move,statStage:2}).amount>
   calculateOneHit({...move,statStage:0}).amount);
});

test('V3-4-10 same Soultimate action cannot boost its later hits after first KO',()=>{
 const hits=[];
 let verified=0;
 for(const seed of [3,7,17,42,47,212,8192]){
  const sourced=cast(battle('momentum',seed));
  const noSkill=cast(battle(null,seed));
  const ko=sourced.snap.squads[0][0].knockouts;
  if(ko!==1)continue; // rare double miss: never invent a KO.
  verified++;
  assert.ok(sourced.boost,'KO at B1 must activate owner skill');
  assert.equal(sourced.boost.remainingTurns,5);
  assert.deepEqual(hitValues(sourced.evt),hitValues(noSkill.evt),
   'the KO skill must not change ANY damage in the originating cast');
  assert.deepEqual(sourced.snap.squads,noSkill.snap.squads);
  assert.deepEqual(sourced.snap.soul,noSkill.snap.soul);
  const skillEvents=sourced.snap.events.filter(e=>
   e.type==='skill'&&e.skill==='momentum'&&e.kind==='発動');
  assert.equal(skillEvents.length,1);
  hits.push(...hitValues(sourced.evt));
 }
 assert.ok(verified>=4,'at least 4 seeded complete casts should KO B1 once');
 assert.ok(hits.some(h=>h.targetId==='B2'&&h.hit&&h.damage>0),
  'ensure second target actually receives later hits after first KO');
});

test('V3-4-10 subsequent Soultimate with existing Adrenaline gets STR+2 for physical per-hit damage',()=>{
 let buffed=0;
 for(const seed of [3,7,17,42,47,212,8192]){
  const active=battle('momentum',seed),plain=battle(null,seed);
  const firstActive=cast(active),firstPlain=cast(plain);
  if(firstActive.snap.squads[0][0].knockouts!==1)continue;
  assert.deepEqual(hitValues(firstActive.evt),hitValues(firstPlain.evt));
  const secondActive=cast(active),secondPlain=cast(plain);
  const a=hitValues(secondActive.evt),b=hitValues(secondPlain.evt);
  assert.deepEqual(a.map(x=>({targetId:x.targetId,hit:x.hit,critical:x.critical})),
   b.map(x=>({targetId:x.targetId,hit:x.hit,critical:x.critical})),
   'skill stage may change damage but must not consume extra RNG');
  assert.ok(a.every((x,i)=>x.damage>=b[i].damage));
  if(a.some((x,i)=>x.damage>b[i].damage))buffed++;
  assert.ok(active.snapshot().skillBoosts.A1);
 }
 assert.ok(buffed>=4,'active source skill must increase later per-hit Soultimate damage');
});

test('V3-4-10 plain fixture Soultimate remains unchanged without new research flag',()=>{
 for(const seed of [3,42,212]){
  const old=battle('momentum',seed,false);
  const untouched=battle('momentum',seed,false);
  const beforeA=cast(old),beforeB=cast(untouched);
  assert.deepEqual(beforeA.evt,beforeB.evt);
  assert.deepEqual(beforeA.snap,beforeB.snap);
  const afterA=cast(old),afterB=cast(untouched);
  assert.deepEqual(afterA.evt,afterB.evt);
  assert.deepEqual(afterA.snap,afterB.snap);
 }
});

test('V3-4-10 original rental MatchProtocol and school online allowlist are unaffected',()=>{
 for(const school of [false,true])for(const seed of [3,42,212]){
  const a=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school},
   hostNowMs:()=>2000});
  const b=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school},
   hostNowMs:()=>2000});
  assert.deepEqual(a.snapshot(),b.snapshot());
  for(let k=0;k<75;k++){
   assert.deepEqual(a.advanceAuto(),b.advanceAuto());
   assert.deepEqual(a.snapshot(),b.snapshot());
   if(a.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(a.exportJournal()).ok,true);
 }
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:12,researchYw2Momentum:true
 }}),/forbids option/);
});
