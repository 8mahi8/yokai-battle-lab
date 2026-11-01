import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {makeStageView,projectMatchResult} from '../ui/match-stage.mjs';

// Same local emulator-only initial battle as /qa?fullmatch: unlike a mocked
// result, this MUST earn all six KOs via real attack decisions/HP updates.
const weak=RENTAL_SQUAD.map(u=>({...u,maxHp:35,defense:5,
 weights:[0,0,0,100]}));
const strong=RENTAL_SQUAD.map(u=>({...u,maxHp:750,speed:450,
 strength:450,attackPower:380,weights:[100,0,0,0]}));
const full=()=>createMatchProtocol({battleOptions:{
 seed:12,teams:[weak,strong],rotationCooldownMs:0,
 researchSpecialEffects:true,researchDamageModel:true,
 researchStatInspirits:true
}});

test('V3-5-5 one real 6v6 match: guest pin, wheel, Watch Zero return, KO reserves, winner and both views',()=>{
 const match=full();
 const opening=match.snapshot();
 assert.deepEqual(opening.game.squads.map(a=>a.length),[6,6]);
 assert.equal(opening.game.winner,null);
 let receipt=match.dispatch(1,1,{type:'pin',targetId:'A2'});
 assert.equal(receipt.ok,true);assert.equal(match.snapshot().game.pins[1],'A2');
 receipt=match.dispatch(1,2,{type:'rotate',direction:1});
 assert.equal(receipt.ok,true);
 assert.notEqual(match.snapshot().game.clock.teams[1].offset,
  opening.game.clock.teams[1].offset);
 receipt=match.dispatch(1,3,{type:'watch',mode:'zero'});
 assert.equal(receipt.ok,true);
 assert.equal(match.snapshot().game.soul.modes[1],'zero');
 receipt=match.dispatch(1,4,{type:'watch',mode:'standard'});
 assert.equal(receipt.ok,true);
 assert.equal(match.snapshot().game.soul.modes[1],'standard');

 let turns=0,substitutions=0,last=match.snapshot();
 while(match.snapshot().game.winner===null&&turns<90){
  const action=match.advanceAuto();
  assert.equal(action.ok,true,'Host must advance legitimate combat');
  assert.equal(action.result.type,'action','real battle action required');
  const next=match.snapshot();
  assert.ok(next.game.squads.flat().every(u=>u.hp>=0&&u.hp<=u.maxHp));
  if(next.game.clock.teams[0].offset!==last.game.clock.teams[0].offset)
   substitutions++;
  last=next;turns++;
 }
 const end=match.snapshot();
 assert.equal(end.game.winner,1,'real actions must finish with guest victory');
 assert.equal(end.game.squads[0].filter(u=>u.hp===0).length,6);
 assert.ok(substitutions>0,'the bench never replaced a wiped front');
 assert.ok(end.game.events.filter(e=>e.type==='action'&&e.kind==='attack').length>=6);
 assert.equal(end.clientSequences[1],4);
 assert.equal(end.game.pins[1],null,'pin on a KO target must be cleared');
 for(const side of [0,1]){
  const stage=makeStageView(end,side);
  assert.equal(stage.winner,1);
  assert.equal(stage.teams[0].members.filter(u=>u.ko).length,6);
  assert.equal(stage.revision,end.revision);
  assert.equal(projectMatchResult(stage.winner,side).title,
   side===1?'勝利！':'敗北…');
 }
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true,
  'single real match must replay every action, seat command and KO deterministically');
 console.log('V3-5-5-SIX-VS-SIX-UNIT-PASS actions='+turns+
  ' enemySubstitutions='+substitutions+' revision='+end.revision);
});

test('V3-5-5 ordinary school six-rental match pace remains measured, not declared original parity',()=>{
 // Character values/AI priorities are all current SCHOOL presets.
 // This is a measured guardrail, not a promise of a specific 3DS duration.
 for(const seed of [12,41]){
  const match=createMatchProtocol({battleOptions:{seed,
   playtestSoulTuning:true,enableLoafing:true,
   researchSpecialEffects:true,researchDamageModel:true,
   researchStatInspirits:true}});
  let attacks=0,knockouts=0,blocked=0,turns=0;
  for(let i=0;i<160&&match.snapshot().game.winner===null;i++){
   const before=match.snapshot();
   const x=match.advanceAuto();
   assert.equal(x.ok,true,'regular six-rental auto battle crashed');
   if(x.result.type==='awaiting_rotation'){
    // A real player can rotate a trapped circle: do not call that a bug
    // in the automated clock merely because human input is absent.
    blocked++;break;
   }
   if(x.result.type==='action'){
    turns++;
    if(x.result.kind==='attack'||x.result.kind==='technique')attacks++;
    knockouts=Math.max(knockouts,match.snapshot().game.squads.flat()
     .filter(y=>y.hp===0).length);
    assert.ok(match.snapshot().game.clock.turn>=before.game.clock.turn);
   }
  }
  const end=match.snapshot();
  assert.ok(turns>0,'standard school battle never advanced');
  assert.ok(end.game.squads.flat().every(u=>u.hp>=0&&u.hp<=u.maxHp));
  console.log('V3-5-5-SCHOOL-MATCH-PACE seed='+seed+
   ' turns='+turns+' offensiveActions='+attacks+' maxKO='+knockouts+
   ' winner='+end.game.winner+' awaitingHumanRotation='+blocked+
   ' testLimit=160 actions, school AutoClock=2600ms/action (playtest)');
 }
});
