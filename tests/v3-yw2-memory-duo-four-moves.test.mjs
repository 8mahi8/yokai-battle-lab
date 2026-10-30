import test from 'node:test';
import assert from 'node:assert/strict';
import {buildYw2MemoryDuoNormalLab,buildYw2MemoryDuoFourMoveLab,
 compileYw2MemoryDuoTrialTeams,YW2_MEMORY_DUO_SOURCE_INDEX}
 from '../content/yw2-memory-duo-normal-lab.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createYw2SourceIndex} from '../content/yw2-source-intake.mjs';
import {compileSoultimateEffectPlan} from '../engine/soultimate-effect-plan.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const sourceLab=()=>buildYw2MemoryDuoFourMoveLab();
const sourceTeams=()=>{
 const lab=sourceLab(),teams=copy(compileYw2MemoryDuoTrialTeams({lab}));
 for(const unit of teams.flat())unit.inspiritResistance=0;
 return {lab,teams};
};
const sourceCombat=(options={})=>{
 const {teams}=sourceTeams();
 return createCombat({seed:119,teams,
  researchYw2Confusion:true,researchYw2ActionOverrides:true,
  researchDamageModel:true,researchMultiHit:true,researchSpecialEffects:true,
  ...options});
};
test('V3-4-18 old two-normal-moves lab remains byte-for-byte isolated from new four-slot variant',()=>{
 const old=buildYw2MemoryDuoNormalLab();
 const next=sourceLab();
 assert.equal(old.catalog.moves.length,28);
 assert.equal(old.fixtureSlots.includes('inspirit'),true);
 assert.equal(old.catalog.getCharacter(old.researchIds['yw2:wazzat'])
  .moves.inspirit.evidence,'fixture');
 assert.equal(old.sourceStatusMoves,false);
 assert.equal(next.catalog.characters.length,8);
 assert.equal(next.catalog.moves.length,32);
 assert.equal(next.fixtureSlots.includes('inspirit'),false);
 assert.equal(next.fixtureSlots.includes('originalChargeTiming'),true);
 assert.equal(next.sourceStatusMoves,true);
 assert.equal(next.battleReady,false);
 for(const id of ['yw2:wazzat','yw2:houzzat']){
  const original=next.catalog.getCharacter(next.researchIds[id]);
  for(const slot of ['attack','technique','inspirit','soultimate']){
   const m=original.moves[slot];
   assert.equal(m.evidence,'documented');
   assert.ok(m.sourceRefs.some(x=>x.includes('/yw2/yokai/')));
   assert.equal(Object.isFrozen(m),true);
  }
  assert.equal(original.provenance.moves,'fixture',
   'unverified original mechanics must not be declared battle ready');
 }
 assert.equal(next.profiles[next.researchIds['yw2:wazzat']].soulCapacity,100);
 assert.equal(next.profiles[next.researchIds['yw2:houzzat']].soulCapacity,200);
 assert.throws(()=>buildYw2MemoryDuoNormalLab({includeSourceStatusMoves:'yes'}),
  /boolean/);
});
test('V3-4-18 Wazzat level1/Houzzat level3 original Inspirits compile through shared ledger/move master',()=>{
 const lab=sourceLab(),teams=compileYw2MemoryDuoTrialTeams({lab});
 for(const [id,level] of [['yw2:wazzat',1],['yw2:houzzat',3]]){
  const original=lab.catalog.getCharacter(lab.researchIds[id]);
  assert.equal(original.moves.inspirit.category,'status_negative');
  assert.equal(original.moves.inspirit.statusEffect,'friendly-fire');
  assert.equal(original.moves.inspirit.level,level);
  assert.deepEqual(original.moves.inspirit.hitPattern,{type:'none',count:0});
  assert.equal(original.moves.inspirit.targetScope,'single_enemy');
  const actor=teams[0].find(m=>m.sourceYw2CharacterId===id);
  assert.equal(actor.inspiritLevel,level);
  assert.equal(actor.inspirit,'friendly-fire');
 }
 const t=copy(teams);
 for(const m of t.flat()){
  m.weights=[100,0,0,0];
  m.inspiritResistance=0;
 }
 t[0][0].weights=[0,0,100,0]; // Wazzat at A1
 t[0][1].weights=[0,0,100,0]; // Houzzat at A2
 const battle=createCombat({teams:t,seed:87,
  researchYw2Confusion:true,researchYw2ActionOverrides:true,
  researchDamageModel:true,researchMultiHit:true});
 let hits=[false,false];
 for(let i=0;i<160;i++){
  const e=battle.step();
  if(e.type!=='action')break;
  if(e.kind==='inspirit'&&e.hit&&['A1','A2'].includes(e.actor)){
   const lvl=e.actor==='A1'?1:3;
   assert.ok(battle.snapshot().inspirits[e.target].some(x=>
    x.effect==='friendly-fire'&&x.level===lvl));
   hits[e.actor==='A1'?0:1]=true;
  }
  if(hits.every(Boolean))break;
 }
 assert.deepEqual(hits,[true,true]);
});
test('V3-4-18 source Wazzat Soultimate removes only positive Inspirits from ALL living foe front',()=>{
 const battle=sourceCombat();
 for(const id of ['B1','B2','B3','B4'])battle.applyInspirit({
  id,sign:'positive',effect:'strength-up',source:'B6'
 });
 battle.applyInspirit({id:'B1',sign:'negative',effect:'strength-down',source:'A4'});
 const before=battle.snapshot();
 const planned=before.squads[0][0].special;
 assert.equal(planned.kind,'dispel');
 const lab=sourceLab(),s=lab.catalog.getCharacter(lab.researchIds['yw2:wazzat']).moves.soultimate;
 assert.equal(s.category,'dispel');
 assert.equal(s.execution.kind,'dispel');
 assert.equal(s.hitPattern.type,'none');
 assert.equal(compileSoultimateEffectPlan(s,s.execution).stages[0].type,'remove-status');
 battle.giveSoul('A1',100);
 const started=battle.prepareSoultimate(0,'A1');
 assert.equal(started.ok,true);
 const done=battle.resolveSoultimate(0,started.token,true);
 assert.equal(done.ok,true);
 assert.equal(done.impacts.length,3);
 assert.deepEqual(done.impacts.map(x=>x.targetId),['B1','B2','B3']);
 assert.ok(done.impacts.every(x=>x.kind==='dispel'&&x.removed.length===1));
 const after=battle.snapshot();
 for(const id of ['B1','B2','B3'])
  assert.equal(after.inspirits[id].some(x=>x.sign==='positive'),false);
 assert.deepEqual(after.inspirits.B1.filter(x=>x.sign==='negative'),
  before.inspirits.B1.filter(x=>x.sign==='negative'));
 assert.equal(after.inspirits.B4[0].sign,'positive','bench was not a target');
 assert.deepEqual(after.squads.map(t=>t.map(m=>m.hp)),
  before.squads.map(t=>t.map(m=>m.hp)),'pure dispel cannot change HP');
});
test('V3-4-18 Houzzat original no-damage Soultimate applies Lv3 confusion to enemy front',()=>{
 const battle=sourceCombat();
 const lab=sourceLab(),s=lab.catalog.getCharacter(
  lab.researchIds['yw2:houzzat']).moves.soultimate;
 assert.equal(s.category,'debuff');
 assert.equal(s.statusEffect,'friendly-fire');
 assert.equal(s.execution.level,3);
 assert.equal(s.hitPattern.count,0);
 assert.equal(compileSoultimateEffectPlan(s,s.execution).stages[0].statusEffect,
  'friendly-fire');
 battle.giveSoul('A2',200);
 const start=battle.prepareSoultimate(0,'A2');
 assert.equal(start.ok,true);
 const done=battle.resolveSoultimate(0,start.token,true);
 assert.equal(done.ok,true);
 assert.deepEqual(done.impacts.map(x=>x.targetId),['B1','B2','B3']);
 assert.ok(done.impacts.every(x=>
  x.kind==='debuff'&&x.applied===true&&x.statusLevel===3));
 const snap=battle.snapshot();
 for(const id of ['B1','B2','B3']){
  const s=snap.inspirits[id].find(x=>x.effect==='friendly-fire');
  assert.ok(s);
  assert.equal(s.level,3);
  assert.equal(s.sign,'negative');
 }
 assert.equal(snap.inspirits.B4.length,0);
});
test('V3-4-18 incomplete/altered original source effect level is rejected at authoring intake',()=>{
 const source=YW2_MEMORY_DUO_SOURCE_INDEX;
 for(const [id,slot,field,change] of [
  ['yw2:wazzat','inspirit','level',{status:'unknown',sourceIds:['wazzat_yw2'],claims:[]}],
  ['yw2:houzzat','soultimate','level',{status:'unknown',sourceIds:['houzzat_yw2'],claims:[]}],
  ['yw2:houzzat','inspirit','level',{status:'documented',sourceIds:['houzzat_yw2'],
   claims:[{value:5,sourceIds:['houzzat_yw2']}]}],
  ['yw2:wazzat','soultimate','effect',{status:'unknown',sourceIds:['wazzat_yw2'],claims:[]}]
 ]){
  const input=copy(source.characters);
  const data=input.find(x=>x.id===id);
  data.moves[slot][field]=change;
  const maker=()=>createYw2SourceIndex({sources:source.sources,characters:input});
  if(change.claims.length&&change.claims[0].value===5)
   assert.throws(maker,/invalid YW2 Inspirit level/);
  else assert.throws(()=>buildYw2MemoryDuoFourMoveLab({index:maker()}),
   /uncertified YW2 fact/);
 }
});
test('V3-4-18 original status-only moves are opt-in, not available to online or six rentals',()=>{
 const {teams}=sourceTeams();
 assert.throws(()=>createCombat({teams,
  researchDamageModel:true,researchYw2ActionOverrides:true}),
  /requires researchYw2Confusion/);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  researchYw2Confusion:true}}),/forbids option/);
 const normal=createCombat({seed:77});
 const other=createCombat({seed:77,researchYw2Confusion:false});
 for(let i=0;i<75;i++){
  assert.deepEqual(other.step(),normal.step());
  assert.deepEqual(other.snapshot(),normal.snapshot());
  if(normal.snapshot().winner!==null)break;
 }
 assert.equal(RENTAL_SQUAD.some(x=>x.inspirit==='friendly-fire'),false);
});
