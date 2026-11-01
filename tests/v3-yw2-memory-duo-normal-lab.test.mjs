import test from 'node:test';
import assert from 'node:assert/strict';
import {YW2_MEMORY_DUO_SOURCE_INDEX,YW2_MEMORY_DUO_IDS,
 buildYw2MemoryDuoNormalLab,compileYw2MemoryDuoTrialTeams}
 from '../content/yw2-memory-duo-normal-lab.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';
import {createYw2SourceIndex}
 from '../content/yw2-source-intake.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const ids=['yw2:wazzat','yw2:houzzat'];
const expected=[
 {id:'yw2:wazzat',stats:[252,76,150,87,192],
  attack:[15,1],technique:[20,1],weights:[10,55,30,5]},
 {id:'yw2:houzzat',stats:[332,99,187,156,185],
  attack:[45,2],technique:[50,2],weights:[5,60,25,10]}
];
function battle(seed=42){
 return createCombat({seed,teams:compileYw2MemoryDuoTrialTeams(),
  researchDamageModel:true,researchMultiHit:true,
  researchYw2ActionOverrides:true});
}
test('V3-4-16 2 original YW2 owners'+' documented 4 slot facts retain unsupported effects',()=>{
 assert.deepEqual(YW2_MEMORY_DUO_IDS,ids);
 for(const x of expected){
  const data=YW2_MEMORY_DUO_SOURCE_INDEX.getCharacter(x.id);
  assert.equal(data.game,'yw2');
  assert.equal(data.skill.label.claims[0].value,'まもりわすれ');
  assert.equal(data.skill.effect.claims[0].value,'forgot-to-guard');
  assert.deepEqual(data.behavior.baseActionWeights.claims[0].value,x.weights);
  assert.deepEqual(['hp','strength','spirit','defense','speed'].map(k=>
   data.stats[k].claims[0].value),x.stats);
  assert.equal(data.moves.inspirit.effect.claims[0].value,'friendly-fire');
  assert.ok(data.moves.soultimate.effect.claims[0].value.includes(
   x.id==='yw2:wazzat'?'remove-positive':'friendly-fire'));
  assert.equal(data.behavior.loafWeight.status,'unknown');
  assert.equal(data.behavior.attitudeOptions.status,'unknown');
  assert.equal(YW2_MEMORY_DUO_SOURCE_INDEX.getPreview(x.id).battleReady,false);
  assert.ok(Object.isFrozen(data));
 }
});
test('V3-4-16 immutable shared authored 2 character 4 normal-move pack uses YW2 values',()=>{
 const l=buildYw2MemoryDuoNormalLab();
 assert.equal(l.catalog.characters.length,8);
 assert.equal(l.catalog.moves.length,28);
 assert.equal(RENTAL_LAB_CATALOG.characters.length,6);
 assert.equal(RENTAL_SCHOOL_CATALOG.moves.length,24);
 for(const x of expected){
  const id=l.researchIds[x.id],actor=l.catalog.getCharacter(id);
  assert.equal(actor.name.startsWith(x.id==='yw2:wazzat'?'わすれん帽':'メゾン・ドワスレ'),true);
  assert.deepEqual(['hp','strength','spirit','defense','speed'].map(k=>
   actor.stats[k]),x.stats);
  assert.deepEqual(actor.personality.actionWeights,x.weights);
  const attack=actor.moves.attack,technique=actor.moves.technique;
  assert.equal(attack.power,x.attack[0]);
  assert.equal(attack.hitPattern.count,x.attack[1]);
  assert.equal(technique.power,x.technique[0]);
  assert.equal(technique.hitPattern.count,x.technique[1]);
  assert.equal(technique.element,'wind');
  for(const move of [attack,technique]){
   assert.equal(move.evidence,'documented');
   assert.ok(move.sourceRefs.length>0);
   assert.ok(move.sourceRefs.every(s=>s.startsWith('https://')));
  }
  assert.equal(actor.moves.inspirit.evidence,'fixture');
  assert.equal(actor.moves.soultimate.evidence,'fixture');
  assert.equal(actor.provenance.moves,'fixture','two original slots + two fixture slots');
  assert.equal(actor.provenance.skill,'fixture','legacy passive is not the source owner');
  assert.ok(Object.isFrozen(actor));
  assert.ok(Object.isFrozen(l.profiles[id]));
 }
 assert.deepEqual(l.fixtureSlots.includes('inspirit'),true);
 assert.equal(l.battleReady,false);
});
test('V3-4-16 current BattleProfile adapter plus YW2 source-owned skill gets original stats, hits, weights and 2 original IDs',()=>{
 const t=compileYw2MemoryDuoTrialTeams();
 assert.equal(t.length,2);
 const a=t[0][0],b=t[0][1],aw=t[1][5],bh=t[1][4];
 for(const x of [a,aw]){
  assert.equal(x.sourceYw2CharacterId,'yw2:wazzat');
  assert.equal(x.maxHp,252);
  assert.equal(x.strength,76);
  assert.equal(x.attackPower,15);
  assert.equal(x.techniquePower,20);
  assert.equal(x.techniqueElement,'wind');
  assert.deepEqual(x.weights,[10,55,30,5]);
  assert.ok(Object.isFrozen(x));
 }
 for(const x of [b,bh]){
  assert.equal(x.sourceYw2CharacterId,'yw2:houzzat');
  assert.equal(x.maxHp,332);
  assert.equal(x.attackHits,2);
  assert.equal(x.techniqueHits,2);
  assert.deepEqual(x.weights,[5,60,25,10]);
 }
 const game=createCombat({seed:212,teams:t,
  researchDamageModel:true,researchMultiHit:true,researchYw2ActionOverrides:true});
 for(const id of ['A1','B6','A2','B5']){
  const m=game.snapshot().squads.flat().find(x=>x.id===id);
  assert.equal(m.sourceYw2SkillId,'yw2:skill:mamoriwasure');
  assert.equal(m.researchActionOverrideSkill,'forgot-to-guard');
 }
});
test('V3-4-16 actual 6vs6 host simulation observes source multi-hits and global guard restriction from original owners',()=>{
 for(const seed of [3,42,212]){
  const combat=battle(seed);
  let attacks=0,techniques=0,doubles=0,guards=0,src=0;
  for(let k=0;k<220;k++){
   const evt=combat.step();
   if(evt.type!=='action')break;
   if(evt.kind==='guard')guards++;
   if(['A1','A2','B5','B6'].includes(evt.actor)){
    src++;
    if(evt.kind==='attack'){
     attacks++;
     if(['A2','B5'].includes(evt.actor)){
      assert.equal(evt.multiHit.planned,2);
      doubles++;
     }
    }else if(evt.kind==='technique'){
     techniques++;
     if(['A2','B5'].includes(evt.actor)){
      assert.equal(evt.multiHit.planned,2);
      doubles++;
     }
    }
   }
   if(evt.winner!==null)break;
  }
  assert.equal(guards,0,'source active Wazzat/Houzzat suppress both teams guard');
  assert.ok(src>5);
  assert.ok(techniques>0&&attacks>0);
  assert.ok(doubles>0,'Houzzat 2x hit pattern executes in existing engine');
 }
});
test('V3-4-16 unresolved/altered original facts or unknown owner cannot silently produce playable original move',()=>{
 const initial=YW2_MEMORY_DUO_SOURCE_INDEX;
 const entries=clone(initial.characters),sources=clone(initial.sources);
 entries.find(x=>x.id==='yw2:wazzat').moves.attack.power={
  status:'unknown',sourceIds:['wazzat_yw2'],claims:[]
 };
 const bad=createYw2SourceIndex({sources,characters:entries});
 assert.throws(()=>buildYw2MemoryDuoNormalLab({index:bad}),
  /uncertified YW2 fact/);
 const incompatible=clone(initial.characters);
 incompatible.find(x=>x.id==='yw2:houzzat').skill.effect={
  status:'documented',sourceIds:['houzzat_yw2'],
  claims:[{value:'different-skill',sourceIds:['houzzat_yw2']}]
 };
 const badSkill=createYw2SourceIndex({sources,characters:incompatible});
 assert.throws(()=>buildYw2MemoryDuoNormalLab({index:badSkill}),
  /uncertified YW2 fact/);
 assert.equal(RENTAL_LAB_CATALOG.getCharacter('yw2:memory-normal-lab:wazzat'),null);
});
test('V3-4-16 no source Skill flag in canonical online; older six-rental Lab/School seeds and journal unchanged',()=>{
 assert.throws(()=>createCombat({seed:3,teams:compileYw2MemoryDuoTrialTeams()}),
  /researchYw2ActionOverrides/);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:3,researchYw2ActionOverrides:true
 }}),/forbids option/);
 for(const seed of [3,42,212])for(const school of [false,true]){
  const a=createMatchProtocol({battleOptions:{
   seed,playtestSoulTuning:school},hostNowMs:()=>5000});
  const b=createMatchProtocol({battleOptions:{
   seed,playtestSoulTuning:school},hostNowMs:()=>5000});
  for(let i=0;i<75;i++){
   assert.deepEqual(a.advanceAuto(),b.advanceAuto());
   assert.deepEqual(a.snapshot(),b.snapshot());
   if(a.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(a.exportJournal()).ok,true);
 }
 assert.equal(RENTAL_SQUAD[0].attackPower,RENTAL_SQUAD[0].attackPower);
});
