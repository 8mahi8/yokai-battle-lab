import test from 'node:test';
import assert from 'node:assert/strict';
import {YW2_ORIGINAL_REFERENCE_INDEX} from '../content/yw2-original-reference-pack.mjs';
import {createYw2SourceIndex} from '../content/yw2-source-intake.mjs';
import {buildJibanyanNormalMoveLab,compileJibanyanNormalMoveTrialTeams}
 from '../content/yw2-jibanyan-normal-moves-lab.mjs';
import {actionWeights} from '../engine/selection.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const sources=YW2_ORIGINAL_REFERENCE_INDEX;
function indexWith(revise){
 const characters=clone(sources.characters);
 revise(characters[0]);
 return createYw2SourceIndex({
  sources:clone(sources.sources),characters
 });
}
function lab(includeSourceWeights,includeSpeedDown=true){
 return buildJibanyanNormalMoveLab({includeSourceWeights,includeSpeedDown});
}

test('V3-4-11 original YW2 Jibanyan 55/30/10/5 source is separate from YW1 50/35/10/5',()=>{
 const j=sources.getCharacter('yw2:jibanyan');
 const fact=j.behavior.baseActionWeights;
 assert.equal(fact.status,'documented');
 assert.deepEqual(fact.claims[0].value,[55,30,10,5]);
 assert.deepEqual(fact.claims[0].sourceIds,['jibanyan_mtw']);
 assert.deepEqual(sources.getPreview(j.id).baseActionWeights,[55,30,10,5]);
 assert.equal(sources.getPreview('yw2:komasan').baseActionWeights,null);
 assert.ok(Object.isFrozen(fact.claims[0].value));
});

test('V3-4-11 battle trial explicitly uses source base actions, not rental fixture, and keeps other fields fixture',()=>{
 const baseline=lab(false),original=lab(true);
 const a=original.catalog.getCharacter(original.characterId);
 const b=baseline.catalog.getCharacter(baseline.characterId);
 assert.deepEqual(b.personality.actionWeights,[60,25,10,5]);
 assert.deepEqual(a.personality.actionWeights,[55,30,10,5]);
 assert.equal(a.personality.attitude,b.personality.attitude,
  'do not silently label fixed legacy Grouchy as a researched YW2 attitude roll');
 assert.equal(a.personality.loafChancePercent,b.personality.loafChancePercent,
  'loaf weight and actual loaf chance need a separate source-backed formula');
 assert.equal(a.provenance.personality,'fixture');
 assert.ok(a.fieldSourceRefs.personality.includes(
  sources.sources.jibanyan_mtw));
 assert.equal(original.researchProvenance.originalBaseActionWeights,true);
 assert.ok(!original.researchProvenance.fixtureFields.includes('actionWeights'));
 assert.ok(original.researchProvenance.fixtureFields.includes('personality'));
 assert.equal(original.researchProvenance.battleReady,false);
 assert.equal(original.catalog.moves.length,27);
 assert.equal(RENTAL_SQUAD[0].weights[0],60,'existing rental remains untouched');
});

test('V3-4-11 existing battle compiler uses source weights on both sides without new AI or RNG engine',()=>{
 const sourceLab=lab(true),fixtureLab=lab(false);
 const a=compileJibanyanNormalMoveTrialTeams({lab:sourceLab});
 const b=compileJibanyanNormalMoveTrialTeams({lab:fixtureLab});
 for(const member of [a[0][0],a[1][5]])assert.deepEqual(member.weights,
  [55,30,10,5]);
 assert.deepEqual(b[0][0].weights,[60,25,10,5]);
 const actor={...a[0][0],id:'A1',hp:322,maxHp:322,side:0};
 const allies=[actor,...a[0].slice(1).map((x,i)=>({
  ...x,id:'A'+(i+2),hp:x.maxHp,maxHp:x.maxHp
 }))];
 const enemies=a[1].slice(0,3).map((x,i)=>({
  ...x,id:'B'+(i+1),hp:x.maxHp,maxHp:x.maxHp,
  defense:1000
 }));
 assert.deepEqual(actionWeights(actor,{allies,enemies}),[55,30,10,5],
  'base weights unchanged when no earlier Grouchy conditional rule applies');
 const game=createCombat({seed:212,teams:a,researchDamageModel:true,
  researchMultiHit:true,researchSpeedInspirit:true,enableRentalSkills:true});
 const snap=game.snapshot();
 assert.deepEqual(snap.squads[0][0].weights,[55,30,10,5]);
 assert.deepEqual(snap.squads[1][5].weights,[55,30,10,5]);
 assert.equal(snap.squads[0][0].attackHits,2);
 assert.equal(snap.squads[0][0].inspirit,'speed-down');
 assert.equal(snap.squads[0][0].techniqueElement,'fire');
 for(let i=0;i<85;i++){
  const evt=game.step();
  if(evt.type!=='action')break;
  if(evt.winner!==null)break;
 }
});

test('V3-4-11 source action weight validation rejects disputed, missing and invalid battle weights',()=>{
 const invalid=[
  {status:'documented',sourceIds:['jibanyan_mtw'],
   claims:[{value:[50,35,10],sourceIds:['jibanyan_mtw']}]},
  {status:'documented',sourceIds:['jibanyan_mtw'],
   claims:[{value:[55,30,10,6],sourceIds:['jibanyan_mtw']}]},
  {status:'documented',sourceIds:['jibanyan_mtw'],
   claims:[{value:[55,30,-1,16],sourceIds:['jibanyan_mtw']}]},
  {status:'documented',sourceIds:['missing'],
   claims:[{value:[55,30,10,5],sourceIds:['missing']}]}
 ];
 for(const fact of invalid)assert.throws(()=>indexWith(j=>{
  j.behavior.baseActionWeights=fact;
 }));
 const unknown=indexWith(j=>{
  j.behavior.baseActionWeights={status:'unknown',
   sourceIds:['jibanyan_mtw'],claims:[]};
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index:unknown,includeSourceWeights:true
 }),/unresolved original fact: behavior.baseActionWeights/);
 assert.equal(buildJibanyanNormalMoveLab({
  index:unknown,includeSourceWeights:false
 }).catalog.characters.length,7);
 const disputed=indexWith(j=>{
  j.behavior.baseActionWeights={status:'disputed',
   sourceIds:['jibanyan_mtw','jibanyan_guide'],
   claims:[
    {value:[55,30,10,5],sourceIds:['jibanyan_mtw']},
    {value:[50,35,10,5],sourceIds:['jibanyan_guide']}
   ]
  };
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index:disputed,includeSourceWeights:true
 }),/unresolved original fact/);
 assert.equal(sources.getCharacter('yw2:jibanyan').behavior.baseActionWeights.status,
  'documented');
});

test('V3-4-11 original action data does not alter canonical Lab/School 6-rental online/Replay',()=>{
 for(const school of [false,true])for(const seed of [3,42,212]){
  const options={seed,playtestSoulTuning:school};
  const old=createMatchProtocol({battleOptions:options,hostNowMs:()=>5000});
  const fresh=createMatchProtocol({battleOptions:options,hostNowMs:()=>5000});
  const original=lab(true);
  assert.equal(original.catalog.characters.length,7);
  assert.deepEqual(fresh.snapshot(),old.snapshot());
  for(let k=0;k<90;k++){
   assert.deepEqual(fresh.advanceAuto(),old.advanceAuto());
   assert.deepEqual(fresh.snapshot(),old.snapshot());
   if(old.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(fresh.exportJournal()).ok,true);
 }
});

test('V3-4-11 no false claim of YW2 original behaviour or disputed 5/7 Soultimate',()=>{
 const trial=lab(true,true),actor=trial.catalog.getCharacter(trial.characterId);
 assert.equal(trial.researchProvenance.originalSoultimateHitCount,null);
 assert.equal(actor.moves.soultimate.evidence,'fixture');
 assert.equal(actor.provenance.personality,'fixture');
 assert.deepEqual(trial.researchProvenance.originalMoves,
  ['attack','technique','inspirit']);
 const references=sources.getCharacter('yw2:jibanyan');
 assert.equal(references.moves.soultimate.hits.status,'disputed');
 assert.deepEqual(references.moves.soultimate.hits.claims.map(x=>x.value),[5,7]);
 assert.equal(trial.researchProvenance.battleReady,false);
});
