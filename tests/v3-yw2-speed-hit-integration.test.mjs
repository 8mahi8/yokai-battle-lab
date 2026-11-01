import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {yw2HitProbability} from '../engine/hit-model.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';
import {buildJibanyanNormalMoveLab,compileJibanyanNormalMoveTrialTeams}
 from '../content/yw2-jibanyan-normal-moves-lab.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const clockUnit=(snapshot,id)=>snapshot.clock.teams
 .flatMap(team=>team.members).find(unit=>unit.id===id);
const actor=(snapshot,id)=>snapshot.squads.flat().find(unit=>unit.id===id);
const stage=(snapshot,id)=>snapshot.inspirits[id]
 .filter(e=>e.effect==='speed-down'&&e.sign==='negative')
 .reduce((sum,e)=>sum-e.level,0);
const baselineTeams=(kind='attack')=>Array.from({length:2},(_,side)=>
 RENTAL_SQUAD.map((x,i)=>({
  ...clone(x),name:side+'-'+i,maxHp:7000,
  attackPower:1,techniquePower:1,strength:0,spirit:0,defense:850,
  speed:side===0&&i===0?140:side===1&&i===0?210:100,
  weights:kind==='attack'?[100,0,0,0]:[0,100,0,0],
  technique:'damage',loafChance:0
 })));
const battle=(opts={})=>createCombat({
 seed:42,teams:baselineTeams(),researchDamageModel:true,
 researchSpeedInspirit:true,researchMultiHit:true,...opts
});
const slow=(game,id)=>game.applyInspirit({
 id,sign:'negative',effect:'speed-down',level:2,source:'A2'
});

test('V3-4-9 documented formula responds to -2 SPD on either side; attack accuracy and techniques stay distinct',()=>{
 const before=yw2HitProbability({
  kind:'attack',attackerSpeed:140,targetSpeed:210
 });
 const attackerSlow=yw2HitProbability({
  kind:'attack',attackerSpeed:98,targetSpeed:210
 });
 const defenderSlow=yw2HitProbability({
  kind:'attack',attackerSpeed:140,targetSpeed:147
 });
 assert.deepEqual([before.base,attackerSlow.base,defenderSlow.base],
  [84,75,96]);
 assert.ok(attackerSlow.probability<before.probability);
 assert.ok(defenderSlow.probability>before.probability);
 assert.equal(yw2HitProbability({
  kind:'attack',attackerSpeed:140,targetSpeed:147,moveAccuracy:.5
 }).probability,48);
 assert.equal(yw2HitProbability({
  kind:'technique',attackerSpeed:140,targetSpeed:147,moveAccuracy:.5
 }).probability,96);
});

test('V3-4-9 physical attacks use the SAME speed as future action clock, including per-hit multi-hit',()=>{
 const game=battle();
 const original=game.snapshot();
 assert.equal(clockUnit(original,'A1').speed,140);
 assert.equal(clockUnit(original,'B1').speed,210);
 slow(game,'A1');
 assert.equal(clockUnit(game.snapshot(),'A1').speed,98);
 // Guard against initial wait/turn mutations from a research status.
 assert.equal(clockUnit(game.snapshot(),'A1').wait,clockUnit(original,'A1').wait);
 let actions=0,affected=0,perHit=0;
 for(let i=0;i<85;i++){
  const before=game.snapshot(),evt=game.step();
  if(evt.type!=='action'||evt.winner!==null)break;
  if(evt.kind!=='attack')continue;
  const a=actor(before,evt.actor),t=actor(before,evt.target);
  const aSpeed=clockUnit(before,a.id).speed,tSpeed=clockUnit(before,t.id).speed;
  const expected=yw2HitProbability({
   kind:'attack',attackerSpeed:aSpeed,targetSpeed:tSpeed,
   moveAccuracy:a.attackAccuracy
  });
  assert.equal(evt.hitResearch.base,expected.base);
  assert.equal(evt.hitResearch.probability,expected.probability);
  if(evt.multiHit)perHit+=evt.multiHit.attempted;
  if(evt.actor==='A1'){
   affected++;
   assert.equal(stage(before,'A1'),-2);
   const wrong=yw2HitProbability({kind:'attack',
    attackerSpeed:a.speed,targetSpeed:tSpeed});
   if(expected.base!==wrong.base)
    assert.ok(expected.base<wrong.base,'the attacker SPD debuff reduces accuracy');
  }
  actions++;
 }
 assert.ok(actions>20);
 assert.ok(affected>0,'slowed actor must actually attack');
 assert.ok(perHit>5,'multi-hit still visits existing hit loop');
});

test('V3-4-9 slowing a defender raises physical hit chance; purify restores it',()=>{
 const game=battle();
 const pre=game.snapshot();
 const initial=yw2HitProbability({
  kind:'attack',attackerSpeed:140,targetSpeed:210
 }).base;
 slow(game,'B1');
 const now=game.snapshot();
 assert.equal(clockUnit(now,'B1').speed,147);
 assert.equal(now.squads[1][0].speed,210,'base SPD must stay unchanged');
 const boosted=yw2HitProbability({
  kind:'attack',attackerSpeed:140,targetSpeed:clockUnit(now,'B1').speed
 }).base;
 assert.equal(initial,84);
 assert.equal(boosted,96);
 assert.ok(boosted>initial);
 assert.equal(clockUnit(now,'B1').wait,clockUnit(pre,'B1').wait);
 // Bring B1 to bench without using a new status-removal mechanism.
 game.rotate(1,1,0);
 const purified=game.purify(1,'B1');
 assert.equal(purified.ok,true);
 assert.equal(clockUnit(game.snapshot(),'B1').speed,210);
 assert.equal(game.snapshot().inspirits.B1.length,0);
});

test('V3-4-9 Techniques use effective defender AND attacker Speed, without physical moveAccuracy multipliers',()=>{
 const teams=baselineTeams('technique');
 for(const team of teams)for(const member of team)member.attackAccuracy=.5;
 const game=createCombat({seed:212,teams,researchDamageModel:true,
  researchSpeedInspirit:true,researchMultiHit:true});
 slow(game,'A1');
 slow(game,'B1');
 let seen=0,affected=0;
 for(let i=0;i<85;i++){
  const before=game.snapshot(),evt=game.step();
  if(evt.type!=='action')break;
  if(evt.kind==='technique'){
   const a=actor(before,evt.actor),t=actor(before,evt.target);
   const aSpd=clockUnit(before,a.id).speed;
   const tSpd=clockUnit(before,t.id).speed;
   const expected=yw2HitProbability({
    kind:'technique',attackerSpeed:aSpd,targetSpeed:tSpd,
    moveAccuracy:a.attackAccuracy
   });
   assert.equal(evt.hitResearch.probability,expected.probability);
   assert.equal(evt.hitResearch.moveAccuracy,1);
   if(evt.actor==='A1'||evt.target==='B1')affected++;
   seen++;
  }
 }
 assert.ok(seen>20&&affected>0,'must exercise sourced SPD on techniques');
});

test('V3-4-9 2-hit Soultimate research uses status-adjusted speed and same host seeded RNG',()=>{
 const teams=baselineTeams();
 teams[0][0].special={kind:'damage',scope:'one',power:1,damageKind:'attack'};
 const reference=clone(teams);
 reference[1][0].speed=147; // exactly 210 * .7 (derived from source Lv2)
 function cast(input,withStatus,seed){
  const game=createCombat({seed,teams:input,researchDamageModel:true,
   researchSpecialEffects:true,researchSoultimateHitCount:2,
   researchSpeedInspirit:withStatus});
  if(withStatus)slow(game,'B1');
  game.pin(0,'B1');
  game.giveSoul('A1',100);
  const started=game.prepareSoultimate(0,'A1');
  assert.equal(started.ok,true);
  const resolved=game.resolveSoultimate(0,started.token,true);
  assert.equal(resolved.ok,true);
  const events=game.snapshot().events.filter(e=>e.type==='special');
  assert.equal(events.length,1);
  assert.equal(events[0].researchSoultimateHits.plannedPerTarget,2);
  return events[0].researchSoultimateHits.hits
   .map(({hit,critical,damage})=>({hit,critical,damage}));
 }
 let distinct=0;
 for(const seed of [3,7,13,42,57,91,100,212,345,8192,20261030]){
  const withDebuff=cast(teams,true,seed);
  const sameEffective=cast(reference,false,seed);
  const unmodified=cast(teams,false,seed);
  assert.deepEqual(withDebuff,sameEffective,
   'same effective SPD must yield identical hit RNG and damage for '+seed);
  if(JSON.stringify(withDebuff)!==JSON.stringify(unmodified))distinct++;
 }
 assert.ok(distinct>0,'at least one seeded cast distinguishes base and debuffed SPD');
});

test('V3-4-9 source Jibanyan three original moves reuses hit formula, no live rental changes',()=>{
 const lab=buildJibanyanNormalMoveLab({includeSpeedDown:true});
 const teams=compileJibanyanNormalMoveTrialTeams({lab});
 const game=createCombat({seed:212,teams,researchDamageModel:true,
  researchMultiHit:true,researchSpeedInspirit:true});
 slow(game,'A1');
 const snap=game.snapshot();
 assert.equal(snap.squads[0][0].speed,165);
 assert.equal(clockUnit(snap,'A1').speed,115);
 assert.equal(teams[0][0].attackHits,2);
 assert.equal(teams[0][0].techniqueElement,'fire');
 assert.equal(teams[0][0].inspirit,'speed-down');
 assert.equal(lab.catalog.getMove(lab.characterId+':inspirit').level,2);
 let actual=0;
 for(let i=0;i<75;i++){
  const before=game.snapshot(),evt=game.step();
  if(evt.type!=='action')break;
  if(evt.actor==='A1'&&(evt.kind==='attack'||evt.kind==='technique')){
   const t=clockUnit(before,evt.target);
   assert.equal(evt.hitResearch.probability,
    yw2HitProbability({kind:evt.kind,attackerSpeed:115,
     targetSpeed:t.speed,moveAccuracy:before.squads[0][0].attackAccuracy
    }).probability);
   actual++;
  }
 }
 assert.ok(actual>0);
});

test('V3-4-9 default six rentals and online allowlist remain deterministic and unchanged',()=>{
 const rentalA=createCombat({seed:42,researchDamageModel:true,
  researchMultiHit:true});
 const rentalB=createCombat({seed:42,researchDamageModel:true,
  researchMultiHit:true,researchSpeedInspirit:false});
 assert.deepEqual(rentalA.snapshot(),rentalB.snapshot());
 for(let i=0;i<90;i++){
  assert.deepEqual(rentalA.step(),rentalB.step());
  assert.deepEqual(rentalA.snapshot(),rentalB.snapshot());
  if(rentalA.snapshot().winner!==null)break;
 }
 for(const seed of [3,42,212]){
  const online=createMatchProtocol({battleOptions:{seed},hostNowMs:()=>9000});
  for(let i=0;i<65&&online.snapshot().game.winner===null;i++)
   assert.equal(online.advanceAuto().ok,true);
  assert.equal(replayMatchJournal(online.exportJournal()).ok,true);
 }
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:42,researchSpeedInspirit:true
 }}),/forbids option/);
});
