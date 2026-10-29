import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {INSPIRIT_EFFECT_MASTER,inspiritEffectById}
 from '../content/inspirit-effect-master.mjs';
import {RENTAL_INSPIRIT_MOVES}
 from '../content/rental-inspirit-moves.mjs';
import {rentalMoveById} from '../content/rental-move-master.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {resolveRentalInspiritSpec}
 from '../engine/catalog-inspirit-spec.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createCombat} from '../engine/combat.mjs';
import {actionWeights} from '../engine/selection.mjs';

test('6 rental Inspirits have immutable canonical effects, signs, target and level',()=>{
 assert.equal(INSPIRIT_EFFECT_MASTER.length,8);
 assert.equal(inspiritEffectById('speed-down').sign,'negative');
 assert.deepEqual(RENTAL_INSPIRIT_MOVES.map(x=>x.effect),
  ['sleep','strength-up','strength-up','sleep','strength-up','sleep']);
 for(let i=0;i<6;i++){
  const x=RENTAL_INSPIRIT_MOVES[i],source=RENTAL_SQUAD[i];
  const effect=inspiritEffectById(x.effect);
  const move=rentalMoveById(x.id);
  assert.equal(source.inspirit,x.effect);
  assert.equal(source.inspiritLevel??1,x.level);
  assert.equal(effect.sign,x.sign);
  assert.equal(x.duration,null,'do not fabricate original duration');
  assert.equal(move.statusEffect,x.effect);
  assert.equal(move.targetScope,x.targetScope);
  assert.equal(move.category,x.sign==='positive'?'status_positive':'status_negative');
  assert.deepEqual(move.hitPattern,{type:'none',count:0});
  for(const school of [false,true]){
   const catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG;
   assert.deepEqual(catalog.getMove(x.id),move);
   const spec=resolveRentalInspiritSpec(source,i,{school});
   assert.equal(spec.effect,x.effect);
   assert.equal(spec.sign,x.sign);
   assert.equal(spec.level,1);
   assert.equal(spec.duration,null);
   assert.equal(spec.evidence,'fixture');
   assert.ok(Object.isFrozen(spec));
  }
  assert.ok(Object.isFrozen(x));
 }
 assert.equal(inspiritEffectById('imagined-effect'),null);
});
test('mis-tagged or misidentified Inspirit effects fail closed before battle',()=>{
 const x=RENTAL_SQUAD[0];
 for(const patch of [
  {name:'different'},{speed:x.speed+1},{inspirit:'strength-up'},
  {inspiritLevel:2},{skill:'not-real'}
 ]){
  assert.throws(()=>resolveRentalInspiritSpec({...x,...patch},0),
   /Inspirit catalog mismatch/);
 }
 assert.throws(()=>resolveRentalInspiritSpec(x,-1),/valid rental slot/);
 assert.throws(()=>createCombat({catalogInspiritResolution:'on'}),/must be boolean/);
 assert.throws(()=>createCombat({catalogInspiritResolution:true,
  teams:[RENTAL_SQUAD,RENTAL_SQUAD]}),/unchanged built-in rentals/);
});
test('default friends mode uses Inspirit catalog; custom team cannot silently claim rental ID',()=>{
 const p=createMatchProtocol({battleOptions:{seed:5}});
 assert.equal(p.exportJournal().initialOptions.catalogInspiritResolution,true);
 const custom=createMatchProtocol({battleOptions:{
  seed:5,teams:[RENTAL_SQUAD,RENTAL_SQUAD]
 }});
 assert.equal(custom.exportJournal().initialOptions.catalogInspiritResolution,false);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:5,teams:[RENTAL_SQUAD,RENTAL_SQUAD],catalogInspiritResolution:true
 }}),/unchanged built-in rentals/);
 const r=p.dispatch(0,1,{type:'catalogInspiritResolution',enabled:false});
 assert.equal(r.ok,false,'guest cannot modify host rules through command');
});
test('host old/new seeded states and outcome match, including real negative and positive Inspirits',()=>{
 let positive=0,negative=0,resisted=0;
 for(const seed of [3,7,19,73,202,20261028,20261031]){
  for(const school of [false,true]){
   const opts={seed,playtestSoulTuning:school,enableLoafing:true,
    catalogAttackResolution:true,catalogTechniqueResolution:true};
   const legacy=createMatchProtocol({battleOptions:{...opts,catalogInspiritResolution:false}});
   const next=createMatchProtocol({battleOptions:{...opts,catalogInspiritResolution:true}});
   for(let step=0;step<170;step++){
    if(step===8||step===37){
     const side=step===8?0:1;
     const seq=legacy.snapshot().clientSequences[side]+1;
     const cmd={type:'pin',targetId:(side?'A':'B')+'1'};
     assert.deepEqual(legacy.dispatch(side,seq,cmd),next.dispatch(side,seq,cmd));
    }
    const a=legacy.advanceAuto(),b=next.advanceAuto();
    assert.deepEqual(a,b,'receipt differs seed '+seed+' step '+step);
    assert.deepEqual(legacy.snapshot().game,next.snapshot().game,
     'HP/status/soul differs seed '+seed+' step '+step);
    const event=a.result;
    if(event?.type==='action'&&event.kind==='inspirit'){
     const actorIndex=Number(event.actor.slice(1))-1;
     const sign=RENTAL_INSPIRIT_MOVES[actorIndex].sign;
     if(sign==='positive')positive++;else negative++;
     if(event.resisted)resisted++;
     assert.equal(event.effect,RENTAL_INSPIRIT_MOVES[actorIndex].effect);
     assert.equal(event.target?.slice(0,1),
      sign==='positive'?event.actor.slice(0,1):(event.actor[0]==='A'?'B':'A'));
    }
    if(event?.type!=='action'||legacy.snapshot().game.winner!==null)break;
   }
  }
 }
 assert.ok(positive>0,'must observe helpful Inspirit in real matches');
 assert.ok(negative>0,'must observe harmful Inspirit in real matches');
 assert.ok(resisted>=0);
});
test('low-level legacy combat still matches both seeded Inspirit paths exactly',()=>{
 for(const seed of [15,32,412]){
  const opts={seed,playtestSoulTuning:false,enableLoafing:false,
   researchDamageModel:false,catalogAttackResolution:false,
   catalogTechniqueResolution:false};
  const old=createCombat({...opts,catalogInspiritResolution:false});
  const fresh=createCombat({...opts,catalogInspiritResolution:true});
  for(let i=0;i<110;i++){
   const a=old.step(),b=fresh.step();
   assert.deepEqual(a,b);
   assert.deepEqual(old.snapshot(),fresh.snapshot());
   if(a?.type!=='action'||a?.winner!==null)break;
  }
 }
});
test('AI keeps different eligibility for beneficial and harmful Inspirits',()=>{
 const squad=RENTAL_SQUAD;
 const enemies=squad.slice(3,6).map((x,i)=>({...x,id:'B'+(i+1),hp:x.maxHp}));
 const allies=squad.slice(0,3).map((x,i)=>({...x,id:'A'+(i+1),hp:x.maxHp}));
 const up={...squad[1],id:'A2'};
 const down={...squad[0],id:'A1'};
 const wUp=actionWeights(up,{allies,enemies,positiveCounts:{A1:1,A2:1,A3:1}});
 const wDown=actionWeights(down,{allies,enemies,negativeCounts:{B1:1,B2:1,B3:1}});
 assert.equal(wUp[2],0);
 assert.equal(wDown[2],0);
});
