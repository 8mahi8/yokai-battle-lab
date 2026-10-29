import test from 'node:test';
import assert from 'node:assert/strict';
import {YW2_ORIGINAL_REFERENCE_INDEX} from '../content/yw2-original-reference-pack.mjs';
import {createYw2SourceIndex} from '../content/yw2-source-intake.mjs';
import {buildJibanyanNormalMoveLab,compileJibanyanNormalMoveTrialTeams}
 from '../content/yw2-jibanyan-normal-moves-lab.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const original=YW2_ORIGINAL_REFERENCE_INDEX;
function mutatedIndex(edit){
 const characters=clone(original.characters);
 edit(characters[0]);
 return createYw2SourceIndex({sources:clone(original.sources),characters});
}
function doc(value,ref='yw2_attitudes'){
 return {status:'documented',sourceIds:[ref],
  claims:[{value,sourceIds:[ref]}]};
}
function lab(enabled){
 return buildJibanyanNormalMoveLab({
  includeSpeedDown:true,includeSourceWeights:true,
  includeSourceAttitude:enabled
 });
}

test('V3-4-13 YW2 source says Jibanyan 100% Grouchy; loaf WEIGHT=5, not final chance',()=>{
 const jib=original.getCharacter('yw2:jibanyan');
 assert.deepEqual(jib.behavior.attitudeOptions.claims[0].value,
  [{attitude:'grouchy',chance:100}]);
 assert.deepEqual(jib.behavior.attitudeOptions.claims[0].sourceIds,
  ['yw2_attitudes']);
 assert.equal(jib.behavior.loafWeight.claims[0].value,5);
 assert.deepEqual(jib.behavior.loafWeight.claims[0].sourceIds,
  ['jibanyan_mtw']);
 assert.deepEqual(original.getPreview(jib.id).attitudeOptions,
  [{attitude:'grouchy',chance:100}]);
 assert.equal(original.getPreview(jib.id).loafWeight,5);
 assert.equal(original.getPreview('yw2:komasan').attitudeOptions,null);
 assert.equal(original.getPreview('yw2:komasan').loafWeight,null);
 assert.ok(Object.isFrozen(jib.behavior.attitudeOptions.claims[0].value));
 assert.ok(Object.isFrozen(original.getPreview(jib.id).attitudeOptions));
});

test('V3-4-13 source fixed attitude compiles to both team positions without claiming full personality/Loaf mechanics',()=>{
 const sourceLab=lab(true),oldLab=lab(false);
 const a=sourceLab.catalog.getCharacter(sourceLab.characterId);
 const b=oldLab.catalog.getCharacter(oldLab.characterId);
 assert.equal(a.personality.attitude,'grouchy');
 assert.equal(b.personality.attitude,'grouchy','prior fixture happened to match');
 assert.deepEqual(a.personality.actionWeights,[55,30,10,5]);
 assert.equal(a.personality.loafChancePercent,b.personality.loafChancePercent);
 assert.equal(a.personality.loafChancePercent,0,
  'source loaf weight 5 is not an unadjusted 5% at Level99');
 assert.equal(a.provenance.personality,'fixture',
  'loaf chance, complete Attitude rules and personality are incomplete');
 assert.equal(sourceLab.researchProvenance.originalFixedAttitude,'grouchy');
 assert.equal(sourceLab.researchProvenance.originalLoafWeight,5);
 assert.ok(sourceLab.researchProvenance.fixtureFields.includes('loafChance'));
 assert.ok(!sourceLab.researchProvenance.fixtureFields.includes('attitude'));
 assert.equal(sourceLab.researchProvenance.battleReady,false);
 assert.ok(a.fieldSourceRefs.personality.includes(
  original.sources.yw2_attitudes));
 assert.ok(a.fieldSourceRefs.personality.includes(
  original.sources.jibanyan_mtw));
 const teams=compileJibanyanNormalMoveTrialTeams({lab:sourceLab});
 for(const member of [teams[0][0],teams[1][5]]){
  assert.equal(member.attitude,'grouchy');
  assert.deepEqual(member.weights,[55,30,10,5]);
  assert.equal(member.loafChance,0);
  assert.equal(member.inspirit,'speed-down');
 }
 assert.deepEqual(RENTAL_SQUAD[0].weights,[60,25,10,5]);
});

test('V3-4-13 researching one 100% Attitude does not add an RNG roll or alter seeded 6v6 battle',()=>{
 const teamsV12=compileJibanyanNormalMoveTrialTeams({lab:lab(false)});
 const teamsV13=compileJibanyanNormalMoveTrialTeams({lab:lab(true)});
 assert.deepEqual(teamsV13,teamsV12);
 for(const seed of [3,7,42,212]){
  const a=createCombat({seed,teams:teamsV12,
   researchDamageModel:true,researchSpeedInspirit:true,
   researchYw2Grouchy:true});
  const b=createCombat({seed,teams:teamsV13,
   researchDamageModel:true,researchSpeedInspirit:true,
   researchYw2Grouchy:true});
  assert.deepEqual(a.snapshot(),b.snapshot());
  for(let i=0;i<100;i++){
   assert.deepEqual(a.step(),b.step(),seed+' action '+i);
   assert.deepEqual(a.snapshot(),b.snapshot(),seed+' state '+i);
   if(a.snapshot().winner!==null)break;
  }
 }
});

test('V3-4-13 fail closed for disputed/unverified/partial and multi-Attitude candidate data',()=>{
 const noFixed=mutatedIndex(j=>{
  j.behavior.attitudeOptions={
   status:'unknown',sourceIds:['yw2_attitudes'],claims:[]
  };
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index:noFixed,includeSourceAttitude:true
 }),/unresolved original fact: behavior.attitudeOptions/);
 const disputed=mutatedIndex(j=>{
  j.behavior.attitudeOptions={
   status:'disputed',sourceIds:['yw2_attitudes','jibanyan_mtw'],
   claims:[
    {value:[{attitude:'grouchy',chance:100}],
     sourceIds:['yw2_attitudes']},
    {value:[{attitude:'grouchy',chance:40},{attitude:'careful',chance:60}],
     sourceIds:['jibanyan_mtw']}
   ]
  };
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index:disputed,includeSourceAttitude:true
 }),/unresolved original fact/);
 const validVariable=mutatedIndex(j=>{
  j.behavior.attitudeOptions=doc([
   {attitude:'grouchy',chance:40},{attitude:'careful',chance:60}
  ]);
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index:validVariable,includeSourceAttitude:true
 }),/unsupported original value: behavior.attitudeOptions/);
 assert.equal(buildJibanyanNormalMoveLab({
  index:validVariable,includeSourceAttitude:false
 }).catalog.characters.length,7);
});

test('V3-4-13 reject forged source probabilities and unknown loaf value; never use base weight as percent',()=>{
 for(const value of [
  [{attitude:'grouchy',chance:99}],
  [{attitude:'grouchy',chance:70},{attitude:'grouchy',chance:30}],
  [{attitude:'grouchy',chance:-1},{attitude:'careful',chance:101}],
  [{attitude:'grouchy',chance:100,secret:true}],
  []
 ]){
  assert.throws(()=>mutatedIndex(j=>{
   j.behavior.attitudeOptions=doc(value);
  }),/invalid YW2 attitude distribution/);
 }
 assert.throws(()=>mutatedIndex(j=>{
  j.behavior.loafWeight=doc(101,'jibanyan_mtw');
 }),/invalid YW2 loaf weight/);
 const unknown=mutatedIndex(j=>{
  j.behavior.loafWeight={status:'unknown',
   sourceIds:['jibanyan_mtw'],claims:[]};
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index:unknown,includeSourceAttitude:true
 }),/unresolved original fact: behavior.loafWeight/);
 const normal=buildJibanyanNormalMoveLab({
  index:unknown,includeSourceAttitude:false
 });
 assert.equal(normal.researchProvenance.originalLoafWeight,null);
});

test('V3-4-13 existing online Lab/School and opt-in actor match replay unaffected',()=>{
 const originalTeams=compileJibanyanNormalMoveTrialTeams({lab:lab(true)});
 for(const seed of [3,42,212]){
  const match=createMatchProtocol({battleOptions:{
   seed,teams:originalTeams,researchDamageModel:true
  },hostNowMs:()=>1000});
  for(let i=0;i<100;i++){
   const outcome=match.advanceAuto();
   assert.equal(outcome.ok,true);
   if(match.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
 }
 for(const school of [false,true])for(const seed of [3,42]){
  const base=createMatchProtocol({
   battleOptions:{seed,playtestSoulTuning:school},hostNowMs:()=>3000
  });
  const unchanged=createMatchProtocol({
   battleOptions:{seed,playtestSoulTuning:school},hostNowMs:()=>3000
  });
  for(let i=0;i<80;i++){
   assert.deepEqual(base.advanceAuto(),unchanged.advanceAuto());
   assert.deepEqual(base.snapshot(),unchanged.snapshot());
   if(base.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(base.exportJournal()).ok,true);
 }
});
