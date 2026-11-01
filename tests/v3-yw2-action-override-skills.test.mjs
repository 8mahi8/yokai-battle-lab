import test from 'node:test';
import assert from 'node:assert/strict';
import {applyYw2ActionOverrides,actionWeights,pickAction}
 from '../engine/selection.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const base=[55,30,10,5];
const trialTeams=()=>[copy(RENTAL_SQUAD),copy(RENTAL_SQUAD)]
 .map(team=>team.map(x=>({...x,maxHp:7000,
  attackPower:1,techniquePower:1,strength:1,spirit:1,
  defense:250,loafChance:0})));
function run(teams,seed=42){
 return createCombat({seed,teams,researchYw2ActionOverrides:true});
}
const actor={id:'A1',attitude:'grouchy',weights:base,strength:100,
 technique:'damage',inspirit:'strength-down',hp:300,maxHp:300};
const context=()=>({allies:[actor],
 enemies:[{id:'B1',defense:200,hp:300,maxHp:300}],
 sourceYw2Grouchy:true});

test('V3-4-14 YW2 shared post-attitude Override: global Forgot to Guard suppresses Guard',()=>{
 assert.deepEqual(applyYw2ActionOverrides(base,{forgotToGuard:true}),
  [55,30,10,0]);
 assert.equal(pickAction([55,30,10,0],()=>.999),'inspirit');
 const source=actionWeights(actor,{...context(),forgotToGuard:true,
  researchYw2ActionOverrides:true});
 assert.deepEqual(source,[55,30,10,0]);
 assert.deepEqual(actionWeights(actor,{...context(),forgotToGuard:true}),
  base,'default existing rental path must not change');
 assert.ok(Object.isFrozen(applyYw2ActionOverrides(base)));
});

test('V3-4-14 source Pacifist forces Guard, but Forgot to Guard supersedes it',()=>{
 assert.deepEqual(applyYw2ActionOverrides(base,{pacifist:true}),
  [0,0,0,1]);
 assert.equal(pickAction([0,0,0,1],()=>0),'guard');
 const paradox=applyYw2ActionOverrides(base,{
  pacifist:true,forgotToGuard:true
 });
 assert.deepEqual(paradox,[55,30,10,0]);
 const withChatty=applyYw2ActionOverrides(base,{
  pacifist:true,forgotToGuard:true,chatty:true
 });
 assert.deepEqual(withChatty,[55,0,10,0]);
 assert.deepEqual(actionWeights(actor,{...context(),pacifist:true,
  researchYw2ActionOverrides:true}),[0,0,0,1]);
 assert.deepEqual(actionWeights(actor,{...context(),pacifist:true,
  forgotToGuard:true,researchYw2ActionOverrides:true}),[55,30,10,0]);
});

test('V3-4-14 global Chatty blocks all Techniques, including healing and attack-focused attitudes',()=>{
 assert.deepEqual(applyYw2ActionOverrides(base,{chatty:true}),
  [55,0,10,5]);
 const healer={...actor,technique:'heal',weights:[10,75,10,5]};
 const ally={id:'A2',hp:50,maxHp:300};
 const w=actionWeights(healer,{allies:[healer,ally],
  enemies:[{id:'B1',hp:500,maxHp:500,defense:200}],
  sourceYw2Grouchy:true,researchYw2ActionOverrides:true,chatty:true});
 assert.deepEqual(w,[10,0,10,5],
  'source attitude may multiply Technique but Chatty removes it afterwards');
 assert.equal(w[1],0);
});

test('V3-4-14 full HP disables healing Technique after rules; zero eligibility has safe research fallback',()=>{
 assert.deepEqual(applyYw2ActionOverrides([0,70,0,30],{
  healingTechnique:true,allAlliesFull:true
 }),[0,0,0,30]);
 assert.deepEqual(applyYw2ActionOverrides([0,70,0,30],{
  healingTechnique:true,allAlliesFull:false
 }),[0,70,0,30]);
 assert.deepEqual(applyYw2ActionOverrides([0,70,0,30],{
  pacifist:true,healingTechnique:true,allAlliesFull:true
 }),[0,0,0,1]);
 assert.deepEqual(applyYw2ActionOverrides([0,70,0,30],{
  forgotToGuard:true,chatty:true
 }),[1,0,0,0],
  'no action left: explicit research-only deterministic fallback, not original claim');
});

test('V3-4-14 custom combat: living REAR Forgot to Guard holder prevents guard for BOTH sides',()=>{
 const teams=trialTeams();
 teams[0][5].researchActionOverrideSkill='forgot-to-guard';
 // A1 and B1 would otherwise always Guard; ensure no hidden Guard branch.
 teams[0][0].weights=[0,0,0,100];
 teams[1][0].weights=[0,0,0,100];
 const game=run(teams,212);
 assert.equal(game.snapshot().squads[0][5].researchActionOverrideSkill,
  'forgot-to-guard');
 assert.ok(game.snapshot().clock.teams[0].frontIds.every(id=>id!=='A6'));
 let count=0;
 for(let i=0;i<130;i++){
  const evt=game.step();
  if(evt.type!=='action')break;
  assert.notEqual(evt.kind,'guard','rear passive must suppress both sides');
  assert.notEqual(evt.kind,'loaf');
  count++;
  if(evt.winner!==null)break;
 }
 assert.ok(count>45,'exercise enough actual auto actions');
});

test('V3-4-14 custom combat: pacifist holder guards while free; Chatty in enemy rear suppresses Techniques',()=>{
 const onlyPacifist=trialTeams();
 onlyPacifist[0][0].researchActionOverrideSkill='pacifist';
 onlyPacifist[0][0].weights=[100,0,0,0];
 const a=run(onlyPacifist,3);
 let guards=0;
 for(let i=0;i<75;i++){
  const evt=a.step();if(evt.type!=='action')break;
  if(evt.actor==='A1'){assert.equal(evt.kind,'guard');guards++;}
 }
 assert.ok(guards>3);
 const noTechnique=trialTeams();
 noTechnique[1][5].researchActionOverrideSkill='chatty';
 noTechnique[0][0].weights=[0,100,0,0];
 noTechnique[1][0].weights=[0,100,0,0];
 const b=run(noTechnique,212);
 let seen=0;
 for(let i=0;i<125;i++){
  const evt=b.step();if(evt.type!=='action')break;
  assert.notEqual(evt.kind,'technique','chatty in rear affects both sides');
  seen++;
 }
 assert.ok(seen>40);
});

test('V3-4-14 unsupported source passive and non-research inputs fail closed',()=>{
 const teams=trialTeams();
 teams[0][4].researchActionOverrideSkill='forgot-to-guard';
 assert.throws(()=>createCombat({teams}),/requires researchYw2ActionOverrides/);
 assert.throws(()=>createCombat({researchYw2ActionOverrides:true}),
  /explicit custom teams/);
 const invalid=trialTeams();
 invalid[0][4].researchActionOverrideSkill='unknown-passive';
 assert.throws(()=>run(invalid),/unsupported research action override skill/);
 assert.throws(()=>applyYw2ActionOverrides(base,{forgotToGuard:'yes'}),
  /valid YW2/);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:3,researchYw2ActionOverrides:true
 }}),/forbids option/);
 assert.deepEqual(RENTAL_SQUAD[0].weights,[60,25,10,5]);
});

test('V3-4-14 old 6 rental seed states and 2-seat protocol replay stay unchanged',()=>{
 for(const seed of [3,42,212])for(const school of [false,true]){
  const opts={seed,playtestSoulTuning:school};
  const original=createMatchProtocol({battleOptions:opts,hostNowMs:()=>1000});
  const newMatch=createMatchProtocol({battleOptions:opts,hostNowMs:()=>1000});
  for(let i=0;i<85;i++){
   assert.deepEqual(original.advanceAuto(),newMatch.advanceAuto());
   assert.deepEqual(original.snapshot(),newMatch.snapshot());
   if(original.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(newMatch.exportJournal()).ok,true);
 }
 const old=createCombat({seed:31}),same=createCombat({
  seed:31,researchYw2ActionOverrides:false
 });
 for(let i=0;i<85;i++){
  assert.deepEqual(old.step(),same.step());
  assert.deepEqual(old.snapshot(),same.snapshot());
  if(old.snapshot().winner!==null)break;
 }
});
