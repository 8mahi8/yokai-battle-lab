import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {PLAYTEST_SKILL_CATALOG} from '../content/skill-catalog.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {resolveRentalSkillSpec} from '../engine/catalog-skill-spec.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {careAtActionBoundary,careOnOwnerTurn,SKILL_TRIAL}
 from '../engine/skill-effects.mjs';

test('all six rental passives resolve by ID with exact trigger/effect and provenance',()=>{
 assert.equal(PLAYTEST_SKILL_CATALOG.length,6);
 const seen=new Set();
 for(let index=0;index<RENTAL_SQUAD.length;index++){
  const row=RENTAL_SQUAD[index];
  for(const school of [false,true]){
   const catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG;
   const member=createCombat({playtestSoulTuning:school}).snapshot().squads[0][index];
   const skill=resolveRentalSkillSpec(member,index,{school});
   const expected=PLAYTEST_SKILL_CATALOG.find(x=>x.id==='skill:'+row.skill);
   assert.ok(expected);
   assert.equal(skill.skillId,expected.id);
   assert.equal(skill.legacyKey,row.skill);
   assert.equal(skill.trigger,expected.trigger);
   assert.equal(skill.effect,expected.effect);
   assert.equal(skill.evidence,'fixture');
   assert.equal(catalog.getCharacter(skill.characterId).skill.id,skill.skillId);
   assert.ok(Object.isFrozen(skill));
   seen.add(skill.skillId);
  }
 }
 assert.equal(seen.size,6);
 assert.ok(PLAYTEST_SKILL_CATALOG.every(x=>x.evidence==='fixture'));
});
test('invalid skill identity and altered roster fail before host starts',()=>{
 const actor=createCombat().snapshot().squads[0][0];
 for(const change of [{name:'new'},{strength:actor.strength+1},
  {skill:'care'},{skill:'unlisted'}]){
  assert.throws(()=>resolveRentalSkillSpec({...actor,...change},0),/mismatch/);
 }
 assert.throws(()=>resolveRentalSkillSpec(actor,-1),/valid rental slot/);
 assert.throws(()=>createCombat({catalogSkillResolution:'yes'}),/boolean/);
 assert.throws(()=>createCombat({catalogSkillResolution:true,
  teams:[RENTAL_SQUAD,RENTAL_SQUAD]}),/unchanged built-in rentals/);
 const modified=PLAYTEST_SKILL_CATALOG.map(x=>({...x}));
 modified[0].trigger='after_any_action';
 assert.throws(()=>resolveRentalSkillSpec(actor,0,{skills:modified}),/mismatch/);
});
test('canonical passive mode defaults to on in built-in friends matches, off for custom',()=>{
 const builtIn=createMatchProtocol({battleOptions:{seed:30}});
 const x=builtIn.exportJournal().initialOptions;
 assert.equal(x.catalogSkillResolution,true);
 const old=createMatchProtocol({battleOptions:{
  seed:30,catalogSkillResolution:false
 }});
 assert.equal(old.exportJournal().initialOptions.catalogSkillResolution,false);
 const custom=createMatchProtocol({battleOptions:{
  seed:30,teams:[RENTAL_SQUAD,RENTAL_SQUAD]
 }});
 assert.equal(custom.exportJournal().initialOptions.catalogSkillResolution,false);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  catalogSkillResolution:true,teams:[RENTAL_SQUAD,RENTAL_SQUAD]
 }}),/unchanged built-in rentals/);
 assert.equal(builtIn.dispatch(0,1,{type:'catalogSkillResolution',value:false}).ok,false);
});
test('care neighborhood resolver preserves existing original-inspired action-boundary timing',()=>{
 const side=RENTAL_SQUAD.map((r,i)=>({
  id:'A'+(i+1),name:r.name,skill:r.skill,hp:100,maxHp:250
 }));
 const other=RENTAL_SQUAD.map((r,i)=>({
  id:'B'+(i+1),name:r.name,skill:r.skill,hp:100,maxHp:250
 }));
 const before=JSON.stringify([side,other]);
 const baseline=careAtActionBoundary({teams:[side,other]});
 const fromCatalog=careAtActionBoundary({teams:[side,other],
  skillOf:u=>PLAYTEST_SKILL_CATALOG.find(x=>x.legacyKey===u.skill).legacyKey});
 assert.deepEqual(fromCatalog,baseline);
 assert.deepEqual(careOnOwnerTurn({actor:side[0],team:side,skillOf:u=>u.skill}),
  careOnOwnerTurn({actor:side[0],team:side}));
 assert.equal(JSON.stringify([side,other]),before);
 assert.equal(SKILL_TRIAL.careMaxHpFraction,.02,'do not replace trial rate with unsourced original');
 assert.throws(()=>careAtActionBoundary({teams:[side,other],skillOf:3}),/function/);
});
test('same seeds and player inputs preserve all host events, skill activations, RNG and HP',()=>{
 const observed=new Set();
 for(const seed of [1,3,13,77,218,2114,20261028,20261102]){
  for(const school of [false,true]){
   const options={seed,playtestSoulTuning:school,enableLoafing:true,
    catalogAttackResolution:true,catalogTechniqueResolution:true,
    catalogInspiritResolution:true,catalogSoultimateResolution:true,
    researchSpecialEffects:true};
   const old=createMatchProtocol({battleOptions:{...options,
    catalogSkillResolution:false}});
   const next=createMatchProtocol({battleOptions:{...options,
    catalogSkillResolution:true}});
   assert.deepEqual(old.snapshot().game,next.snapshot().game);
   for(let step=0;step<170;step++){
    if(step===5||step===38){
     const side=step===5?0:1;
     const seq=old.snapshot().clientSequences[side]+1;
     const cmd={type:'pin',targetId:(side?'A':'B')+'2'};
     assert.deepEqual(old.dispatch(side,seq,cmd),next.dispatch(side,seq,cmd));
    }
    const a=old.advanceAuto(),b=next.advanceAuto();
    assert.deepEqual(a,b,'receipt divergence seed '+seed+':'+step);
    const stateA=old.snapshot().game,stateB=next.snapshot().game;
    assert.deepEqual(stateA,stateB,'HP/skill event divergence seed '+seed+':'+step);
    for(const e of stateA.events.filter(e=>e.type==='skill'))observed.add(e.skill);
    if(a.result?.type!=='action'||stateA.winner!==null)break;
   }
  }
 }
 assert.ok(observed.has('care'),'real positive adjacent healing should be exercised');
});
test('legacy base-damage mode and disabled passives remain binary-compatible',()=>{
 for(const seed of [9,123,901]){
  for(const enableRentalSkills of [false,true]){
   const opts={seed,enableRentalSkills,
    researchDamageModel:false,playtestSoulTuning:false};
   const a=createCombat({...opts,catalogSkillResolution:false});
   const b=createCombat({...opts,catalogSkillResolution:true});
   for(let i=0;i<125;i++){
    const x=a.step(),y=b.step();
    assert.deepEqual(x,y);
    assert.deepEqual(a.snapshot(),b.snapshot());
    if(x?.type!=='action'||x.winner!==null)break;
   }
  }
 }
});
