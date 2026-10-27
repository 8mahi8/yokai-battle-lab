import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';
import {rentalMoveById} from '../content/rental-move-master.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG} from '../content/combat-catalog.mjs';
import {resolveRentalSoultimateSpec} from '../engine/catalog-soultimate-spec.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {validateSpecialSpec} from '../engine/special-effects.mjs';

test('six original rentals have one Soultimate master; target set and hits stay independent',()=>{
 assert.equal(RENTAL_SOULTIMATE_MOVES.length,6);
 const kinds=['damage','drain','buff','damage-status','revive-heal','debuff'];
 const scopes=['enemy_front','enemy_front','ally_front','single_enemy','ally_team','enemy_front'];
 for(let i=0;i<6;i++){
  const spec=RENTAL_SOULTIMATE_MOVES[i];
  assert.equal(spec.kind,kinds[i]);
  assert.equal(spec.targetScope,scopes[i]);
  assert.equal(spec.id,'rental-'+String(i+1).padStart(2,'0')+':soultimate');
  assert.equal(spec.evidence,'fixture');
  assert.ok(Object.isFrozen(spec)&&Object.isFrozen(spec.definition));
  const compiled=rentalMoveById(spec.id);
  assert.equal(compiled.targetScope,spec.targetScope);
  assert.equal(compiled.category,spec.kind);
  assert.equal(compiled.power,spec.power);
  assert.equal(compiled.statusEffect,spec.statusEffect);
  assert.deepEqual(compiled.hitPattern,spec.hitPattern);
  if(['damage','drain','damage-status'].includes(spec.kind))
   assert.deepEqual(compiled.hitPattern,{type:'unknown',count:null});
  else assert.deepEqual(compiled.hitPattern,{type:'none',count:0});
  const legacy=RENTAL_SQUAD[i].special??{kind:'damage',scope:'front',power:100,damageKind:'attack'};
  assert.deepEqual(validateSpecialSpec(legacy),validateSpecialSpec(spec.definition));
  for(const school of [false,true]){
   const combat=createCombat({playtestSoulTuning:school,
    catalogSoultimateResolution:true});
   const member=combat.snapshot().squads[0][i];
   const catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG;
   const resolved=resolveRentalSoultimateSpec(member,i,{school});
   assert.deepEqual(resolved.definition,validateSpecialSpec(spec.definition));
   assert.equal(resolved.moveId,spec.id);
   assert.deepEqual(catalog.getMove(spec.id),compiled);
   assert.equal(resolved.evidence,'fixture');
  }
 }
});
test('misidentified rental/corrupt Soultimate effect cannot silently pick another move',()=>{
 const member=createCombat().snapshot().squads[0][1];
 for(const override of [{speed:member.speed+1},{name:'fake'},
  {skill:'invalid'},{special:{...member.special,power:81}}]){
  assert.throws(()=>resolveRentalSoultimateSpec({...member,...override},1),
   /Soultimate catalog mismatch/);
 }
 assert.throws(()=>resolveRentalSoultimateSpec(member,-1),/valid rental slot/);
 assert.throws(()=>createCombat({catalogSoultimateResolution:1}),/must be boolean/);
 assert.throws(()=>createCombat({
  teams:[RENTAL_SQUAD,RENTAL_SQUAD],catalogSoultimateResolution:true
 }),/unchanged built-in rentals/);
});
test('standard rental online mode enables catalog Soultimates; custom teams stay legacy',()=>{
 const builtIn=createMatchProtocol({battleOptions:{seed:5}});
 assert.equal(builtIn.exportJournal().initialOptions.catalogSoultimateResolution,true);
 const custom=createMatchProtocol({battleOptions:{seed:5,teams:[RENTAL_SQUAD,RENTAL_SQUAD]}});
 assert.equal(custom.exportJournal().initialOptions.catalogSoultimateResolution,false);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  catalogSoultimateResolution:true,teams:[RENTAL_SQUAD,RENTAL_SQUAD]
 }}),/unchanged built-in rentals/);
 assert.equal(builtIn.dispatch(0,1,{type:'catalogSoultimateResolution',enabled:false}).ok,false);
});
test('each of six Soultimate effect kinds yields identical host events and HP in old/new modes',()=>{
 let observed=new Set();
 for(const seed of [3,21]){
  for(const school of [false,true]){
   for(let i=0;i<6;i++){
    const options={seed,playtestSoulTuning:school,researchSpecialEffects:true,
     catalogAttackResolution:true,catalogTechniqueResolution:true,
     catalogInspiritResolution:true,catalogSoultimateResolution:false};
    const a=createCombat(options);
    const b=createCombat({...options,catalogSoultimateResolution:true});
    assert.deepEqual(a.snapshot(),b.snapshot());
    const caster='A'+(i+1);
    if(i>=3){
     // Advance the wheel so its contiguous front includes slots 4-6.
     // Exact angle isn't a rule under test; parity after identical rotation is.
     let rotations=0;
     while(!a.snapshot().clock.teams[0].frontIds.includes(caster)&&rotations<6){
      const left=a.rotate(0,1),right=b.rotate(0,1);
      assert.deepEqual(left,right);
      rotations++;
     }
    }
    if(!a.snapshot().clock.teams[0].frontIds.includes(caster))continue;
    assert.equal(a.giveSoul(caster,100),b.giveSoul(caster,100));
    const first=a.prepareSoultimate(0,caster),second=b.prepareSoultimate(0,caster);
    assert.deepEqual(first,second);
    assert.equal(first.ok,true,'full Soul on front should allow charge '+caster);
    const old=a.resolveSoultimate(0,first.token,true);
    const next=b.resolveSoultimate(0,second.token,true);
    assert.deepEqual(old,next,'effect outcome differs '+caster);
    assert.deepEqual(a.snapshot(),b.snapshot(),'host state differs '+caster);
    if(old.effectStatus==='research-fixture')observed.add(RENTAL_SOULTIMATE_MOVES[i].kind);
   }
  }
 }
 assert.ok(observed.has('damage'));
 assert.ok(observed.has('drain'));
 assert.ok(observed.has('buff'));
 assert.ok(observed.has('damage-status'));
 assert.ok(observed.has('revive-heal'));
 assert.ok(observed.has('debuff'));
});
test('many seeded automatic match turns are identical with catalog Soultimates toggled',()=>{
 for(const seed of [7,71,20261028]){
  const base={seed,playtestSoulTuning:true,
   catalogAttackResolution:true,catalogTechniqueResolution:true,
   catalogInspiritResolution:true,researchSpecialEffects:true};
  const old=createMatchProtocol({battleOptions:{...base,catalogSoultimateResolution:false}});
  const next=createMatchProtocol({battleOptions:{...base,catalogSoultimateResolution:true}});
  for(let i=0;i<110;i++){
   const x=old.advanceAuto(),y=next.advanceAuto();
   assert.deepEqual(x,y);
   assert.deepEqual(old.snapshot().game,next.snapshot().game);
   if(x.result?.type!=='action'||x.result.winner!==null)break;
  }
 }
});
