import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJibanyanNormalMoveLab,compileJibanyanNormalMoveTrialTeams,
 JIBANYAN_NORMAL_TRIAL_ID}
 from '../content/yw2-jibanyan-normal-moves-lab.mjs';
import {YW2_ORIGINAL_REFERENCE_INDEX}
 from '../content/yw2-original-reference-pack.mjs';
import {createYw2SourceIndex} from '../content/yw2-source-intake.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const source=YW2_ORIGINAL_REFERENCE_INDEX;
const sourceIndex=characters=>createYw2SourceIndex({
 sources:clone(source.sources),characters
});
const mutate=fn=>{
 const entries=clone(source.characters);fn(entries[0]);
 return sourceIndex(entries);
};
const moveId=slot=>JIBANYAN_NORMAL_TRIAL_ID+':'+slot;

test('V3-4-7 YW2 source-backed 10x2 claws and Fire20x1 compile as documented move master entries',()=>{
 const lab=buildJibanyanNormalMoveLab(),c=lab.catalog;
 assert.equal(c.characters.length,7);
 assert.equal(c.moves.length,26);
 const a=c.getMove(moveId('attack')),t=c.getMove(moveId('technique'));
 assert.deepEqual([a.displayName,a.power,a.hitPattern.type,a.hitPattern.count],
  ['するどいつめ',10,'multi',2]);
 assert.deepEqual([t.displayName,t.power,t.element,t.hitPattern.count],
  ['火花の術',20,'fire',1]);
 assert.equal(a.evidence,'documented');
 assert.equal(t.evidence,'documented');
 assert.ok(a.sourceRefs.some(url=>url.includes('gamepedia.jp')));
 assert.ok(t.sourceRefs.some(url=>url.includes('mtwildwood.net')));
 assert.ok(Object.isFrozen(a));
 assert.ok(Object.isFrozen(t.hitPattern));
 assert.ok(Object.isFrozen(t.sourceRefs));
 assert.equal(RENTAL_LAB_CATALOG.moves.length,24);
 assert.equal(RENTAL_SCHOOL_CATALOG.moves.length,24);
 assert.equal(RENTAL_LAB_CATALOG.getCharacter(lab.characterId),null);
});

test('V3-4-7 original level99 stats and move labels coexist with explicitly fixture-only skill/Inspirit/Soultimate',()=>{
 const lab=buildJibanyanNormalMoveLab();
 const actor=lab.catalog.getCharacter(lab.characterId);
 assert.deepEqual(actor.stats,{
  hp:322,strength:153,spirit:90,defense:108,speed:165
 });
 assert.equal(actor.rank,'D');
 assert.equal(actor.tribe,'プリチー');
 assert.equal(actor.provenance.identity,'documented');
 assert.equal(actor.provenance.stats,'documented');
 assert.equal(actor.provenance.moves,'fixture','two of four moves are research fixtures');
 assert.equal(actor.provenance.personality,'fixture');
 assert.equal(actor.provenance.skill,'fixture');
 assert.equal(actor.moves.inspirit.evidence,'fixture');
 assert.equal(actor.moves.soultimate.evidence,'fixture');
 assert.equal(actor.skill.id,'skill:momentum');
 assert.equal(actor.moves.soultimate.hitPattern.count,null);
 assert.equal(lab.researchProvenance.originalSoultimateHitCount,null);
 assert.equal(lab.researchProvenance.battleReady,false);
 assert.equal(source.getPreview('yw2:jibanyan').battleReady,false);
 assert.ok(Object.isFrozen(lab.profile));
});

test('V3-4-7 BattleProfile builds real existing-engine teams from original authored attack and technique',()=>{
 const lab=buildJibanyanNormalMoveLab(),teams=compileJibanyanNormalMoveTrialTeams({lab});
 assert.equal(teams.length,2);
 assert.equal(teams[0][0].name,'ジバニャン（通常技のみ研究）');
 assert.equal(teams[1][5].name,'ジバニャン（通常技のみ研究）');
 for(const member of [teams[0][0],teams[1][5]]){
  assert.equal(member.attackPower,10);
  assert.equal(member.attackHits,2);
  assert.equal(member.techniquePower,20);
  assert.equal(member.technique,'damage');
  assert.equal(member.techniqueElement,'fire');
  assert.equal(member.maxHp,322);
  assert.equal(member.strength,153);
  assert.equal(member.soulCapacity,100,'original Soultimate rank not researched');
  assert.equal(member.skill,'momentum','legacy implementation is fixture');
  assert.ok(Object.isFrozen(member));
 }
 const combat=createCombat({
  seed:212,teams,
  researchDamageModel:true,researchMultiHit:true,enableRentalSkills:true
 });
 assert.equal(combat.snapshot().squads[0][0].attackHits,2);
 assert.equal(combat.snapshot().squads[0][0].techniqueElement,'fire');
});

test('V3-4-7 actual host sim performs separately rolled claws and fire attacks using unchanged combat engine',()=>{
 for(const seed of [3,42,212]){
  const teams=compileJibanyanNormalMoveTrialTeams();
  const combat=createCombat({seed,teams,researchDamageModel:true,
   researchMultiHit:true,researchSpecialEffects:true,enableRentalSkills:true});
  const normalActions=[];
  for(let k=0;k<240;k++){
   const evt=combat.step();
   if(evt.type!=='action')break;
   if((evt.actor==='A1'||evt.actor==='B6')&&
       (evt.kind==='attack'||evt.kind==='technique')){
    normalActions.push(evt);
    if(evt.kind==='attack'){
     assert.equal(evt.multiHit.planned,2);
     assert.ok(evt.multiHit.attempted>=1&&evt.multiHit.attempted<=2);
     assert.equal(evt.damageResearch.sourceMovePower,10);
    }else{
     assert.equal(evt.damageResearch.sourceMovePower,20);
     assert.equal(evt.damageResearch.techniqueElement,'fire');
    }
   }
   if(evt.winner!==null)break;
  }
  assert.ok(normalActions.some(x=>x.kind==='attack'),'Claws should execute seed '+seed);
  assert.ok(normalActions.some(x=>x.kind==='technique'),'Fire should execute seed '+seed);
 }
});

test('V3-4-7 original facts cannot be silently replaced by unknown/disputed or unsupported numbers',()=>{
 const hitDispute=mutate(j=>{
  j.moves.attack.hits={
   status:'disputed',sourceIds:['jibanyan_guide','jibanyan_mtw'],
   claims:[{value:2,sourceIds:['jibanyan_guide']},
    {value:3,sourceIds:['jibanyan_mtw']}]
  };
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({index:hitDispute}),
  /unresolved original fact: attack.hits/);
 const fireUnknown=mutate(j=>{
  j.moves.technique.element={status:'unknown',sourceIds:['jibanyan_guide'],claims:[]};
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({index:fireUnknown}),
  /unresolved original fact: technique.element/);
 const wrongPower=mutate(j=>{
  j.moves.attack.power.claims[0].value=-1;
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({index:wrongPower}),
  /unsupported original value: attack.power/);
 const badLv99=mutate(j=>{
  j.stats.hp={status:'disputed',
   sourceIds:['jibanyan_game8','jibanyan_mtw'],
   claims:[{value:322,sourceIds:['jibanyan_game8']},
    {value:359,sourceIds:['jibanyan_mtw']}]
  };
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({index:badLv99}),
  /unresolved original fact: stats.hp/);
 const base=buildJibanyanNormalMoveLab();
 assert.equal(base.catalog.getMove(moveId('attack')).hitPattern.count,2);
 assert.equal(RENTAL_LAB_CATALOG.characters.length,6);
});

test('V3-4-7 original partial trial remains opt-in and does not change six-rental simulation',()=>{
 const preview=buildJibanyanNormalMoveLab();
 assert.equal(preview.catalog.characters.length,7);
 for(const school of [false,true])for(const seed of [3,42,212]){
  const a=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school}});
  const b=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school}});
  assert.deepEqual(a.snapshot(),b.snapshot());
  for(let i=0;i<75;i++){
   assert.deepEqual(a.advanceAuto(),b.advanceAuto());
   assert.deepEqual(a.snapshot(),b.snapshot());
   if(a.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(a.exportJournal()).ok,true);
 }
});

test('V3-4-7 authoring-driven partial Jibanyan can run and replay through existing 1vs1 host protocol',()=>{
 const teams=compileJibanyanNormalMoveTrialTeams();
 for(const seed of [7,212]){
  const match=createMatchProtocol({
   battleOptions:{seed,teams,researchDamageModel:true,researchMultiHit:true},
   hostNowMs:()=>2000
  });
  assert.equal(match.snapshot().game.squads[0][0].name,'ジバニャン（通常技のみ研究）');
  const receipt=match.dispatch(0,1,{type:'pin',targetId:'B1'});
  assert.equal(receipt.accepted,true);
  assert.equal(match.dispatch(0,1,{type:'pin',targetId:'B1'}).duplicate,true);
  for(let i=0;i<100&&match.snapshot().game.winner===null;i++)
   assert.equal(match.advanceAuto().ok,true);
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
  assert.equal(match.snapshot().game.squads[1][5].attackHits,2);
  assert.equal(match.snapshot().game.squads[1][5].techniqueElement,'fire');
 }
});
