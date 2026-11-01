import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_TECHNIQUE_MOVES} from '../content/rental-technique-moves.mjs';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {RENTAL_MOVE_MASTER,rentalMoveById} from '../content/rental-move-master.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {resolveRentalTechniqueSpec}
 from '../engine/catalog-technique-spec.mjs';

test('all six research Techniques share one value source and do not confuse heals with hits',()=>{
 assert.deepEqual(RENTAL_TECHNIQUE_MOVES.map(x=>x.power),[45,50,35,65,50,25]);
 assert.deepEqual(RENTAL_TECHNIQUE_MOVES.map(x=>x.kind),
  ['damage','heal','damage','damage','heal','damage']);
 for(let i=0;i<6;i++){
  const record=RENTAL_TECHNIQUE_MOVES[i],legacy=RENTAL_SQUAD[i];
  assert.equal(legacy.techniquePower,record.power);
  assert.equal(legacy.technique,record.kind);
  assert.equal(legacy.techniqueElement??'neutral',record.element);
  assert.equal(legacy.techniqueHits??1,record.hits??1);
  const fromMaster=rentalMoveById(record.id);
  assert.ok(fromMaster);
  assert.equal(fromMaster.power,record.power);
  assert.equal(fromMaster.element,record.element);
  assert.equal(fromMaster.evidence,'fixture');
  if(record.kind==='heal'){
   assert.equal(record.hits,null);
   assert.deepEqual(fromMaster.hitPattern,{type:'none',count:0});
   assert.equal(fromMaster.category,'heal');
   assert.equal(fromMaster.targetScope,'single_ally');
  }else{
   assert.equal(fromMaster.hitPattern.count,record.hits);
   assert.equal(fromMaster.category,'technique_damage');
   assert.equal(fromMaster.targetScope,'single_enemy');
  }
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(fromMaster));
  for(const school of [false,true]){
   const catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG;
   const spec=resolveRentalTechniqueSpec(legacy,i,{school});
   assert.equal(spec.moveId,record.id);
   assert.equal(spec.power,record.power);
   assert.equal(spec.kind,record.kind);
   assert.equal(spec.hits,record.hits);
   assert.equal(spec.element,'neutral');
   assert.equal(spec.evidence,'fixture');
   assert.deepEqual(catalog.getMove(record.id),fromMaster);
   assert.ok(Object.isFrozen(spec));
  }
 }
 assert.equal(RENTAL_MOVE_MASTER.length,24);
});
test('fail closed for altered legacy technique numbers, kind, element and identity',()=>{
 const base=RENTAL_SQUAD[0],school=false;
 for(const patch of [
  {techniquePower:200},{technique:'heal'}, {techniqueElement:'fire'},
  {techniqueHits:2},{speed:base.speed+1},{skill:'other'},
  {name:'not rental'}
 ]){
  assert.throws(()=>resolveRentalTechniqueSpec({...base,...patch},0,{school}),
    /Technique catalog mismatch/);
 }
 assert.throws(()=>resolveRentalTechniqueSpec(base,6),/valid rental slot/);
 assert.throws(()=>createCombat({catalogTechniqueResolution:true,
   teams:[RENTAL_SQUAD,RENTAL_SQUAD]}),/unchanged built-in rentals/);
 assert.throws(()=>createCombat({catalogTechniqueResolution:1}),/must be boolean/);
});
test('built-in rental defaults use Technique catalog; custom teams keep legacy option',()=>{
 const p=createMatchProtocol({battleOptions:{seed:76}});
 assert.equal(p.exportJournal().initialOptions.catalogTechniqueResolution,true);
 const custom=createMatchProtocol({battleOptions:{
  teams:[RENTAL_SQUAD,RENTAL_SQUAD],seed:76
 }});
 assert.equal(custom.exportJournal().initialOptions.catalogTechniqueResolution,false);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  teams:[RENTAL_SQUAD,RENTAL_SQUAD],catalogTechniqueResolution:true
 }}),/unchanged built-in rentals/);
 const invalid=p.dispatch(0,1,{type:'catalogTechniqueResolution',enabled:false});
 assert.equal(invalid.ok,false,'client commands cannot toggle host research mode');
});
test('actual physical and Technique resolution produce identical seeded host turns',()=>{
 let damageTechniques=0,heals=0;
 for(const seed of [3,8,33,257,991,20261028,20261101]){
  for(const playtestSoulTuning of [false,true]){
   const options={seed,playtestSoulTuning,enableLoafing:true,
    catalogAttackResolution:true};
   const a=createMatchProtocol({battleOptions:{
    ...options,catalogTechniqueResolution:false
   }});
   const b=createMatchProtocol({battleOptions:{
    ...options,catalogTechniqueResolution:true
   }});
   for(let step=0;step<170;step++){
    if(step===5||step===38){
     const side=step===5?0:1;
     const seq=a.snapshot().clientSequences[side]+1;
     const command={type:'pin',targetId:(side?'A':'B')+'2'};
     assert.deepEqual(a.dispatch(side,seq,command),b.dispatch(side,seq,command));
    }
    const receiptA=a.advanceAuto(),receiptB=b.advanceAuto();
    assert.deepEqual(receiptA,receiptB,'action mismatch seed '+seed+' step '+step);
    assert.deepEqual(a.snapshot().game,b.snapshot().game,
     'game HP/Soul/event mismatch seed '+seed+' step '+step);
    const x=receiptA.result;
    if(x?.type==='action'){
     if(x.kind==='technique')damageTechniques++;
     if(x.kind==='heal')heals++;
    }
    if(x?.type!=='action'||a.snapshot().game.winner!==null)break;
   }
  }
 }
 assert.ok(damageTechniques>=10,'must cover real offensive Techniques');
 assert.ok(heals>=2,'must cover real healing Technique actions');
});
test('legacy non-research healing and damage calculation also preserve seeded RNG',()=>{
 let techniques=0,heals=0;
 for(const seed of [15,202,816]){
  const opts={seed,enableLoafing:false,
   playtestSoulTuning:false,researchDamageModel:false,
   catalogAttackResolution:false};
  const old=createCombat({...opts,catalogTechniqueResolution:false});
  const fresh=createCombat({...opts,catalogTechniqueResolution:true});
  for(let i=0;i<145;i++){
   const a=old.step(),b=fresh.step();
   assert.deepEqual(a,b);
   assert.deepEqual(old.snapshot(),fresh.snapshot());
   if(a?.kind==='technique')techniques++;
   if(a?.kind==='heal')heals++;
   if(a?.type!=='action'||a?.winner!==null)break;
  }
 }
 assert.ok(techniques>0&&heals>0,'cover both offensive and healing legacy branches');
});
