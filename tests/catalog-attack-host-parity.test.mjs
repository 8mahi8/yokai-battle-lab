import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {resolveRentalAttackSpec}
 from '../engine/catalog-attack-spec.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));

test('every rental physical move feeds a shared immutable catalog definition',()=>{
 for(const school of [false,true]){
  const catalog=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG;
  for(const [index,source] of RENTAL_SQUAD.entries()){
   const spec=resolveRentalAttackSpec(source,index,{school});
   assert.equal(spec.moveId,'rental-'+String(index+1).padStart(2,'0')+':attack');
   assert.equal(spec.power,catalog.getMove(spec.moveId).power);
   assert.equal(spec.hits,catalog.getMove(spec.moveId).hitPattern.count);
   assert.equal(spec.power,source.attackPower);
   assert.equal(spec.hits,source.attackHits??1);
   assert.equal(spec.evidence,'fixture','never present provisional rental as official');
   assert.ok(Object.isFrozen(spec));
  }
 }
 const changed={...RENTAL_SQUAD[0],attackPower:111};
 assert.throws(()=>resolveRentalAttackSpec(changed,0),/disagree/);
 const disguised={...RENTAL_SQUAD[0],strength:RENTAL_SQUAD[0].strength+1};
 assert.throws(()=>resolveRentalAttackSpec(disguised,0),/disagree/);
 assert.throws(()=>resolveRentalAttackSpec(RENTAL_SQUAD[0],6),/slot/);
});
test('catalog mode is opt-in and rejects custom rosters without a safe ID mapping',()=>{
 const legacy=createCombat();
 const catalog=createCombat({catalogAttackResolution:true});
 assert.deepEqual(legacy.snapshot(),catalog.snapshot());
 assert.throws(()=>createCombat({catalogAttackResolution:'enabled'}),/boolean/);
 assert.throws(()=>createCombat({catalogAttackResolution:true,
  teams:[RENTAL_SQUAD,RENTAL_SQUAD]}),/unchanged built-in rentals/);
 assert.throws(()=>createMatchProtocol({battleOptions:{catalogAttackResolution:true,
  teams:[RENTAL_SQUAD,RENTAL_SQUAD]}}),/unchanged built-in rentals/);
});

test('real host resolution parity for physical attacks and entire match, many deterministic seeds',()=>{
 let attacks=0,realHits=0;
 for(const seed of [1,7,73,418,20261028,20261029,0x1fa91]){
  for(const playtestSoulTuning of [false,true]){
   const settings={seed,rotationCooldownMs:0,enableLoafing:true,playtestSoulTuning};
   const a=createMatchProtocol({battleOptions:{
    ...settings,catalogAttackResolution:false
   }});
   const b=createMatchProtocol({battleOptions:{
    ...settings,catalogAttackResolution:true
   }});
   assert.deepEqual(a.snapshot().game,b.snapshot().game,'initial state parity');
   for(let step=0;step<160;step++){
    if(step===3||step===21){
     const side=step===3?0:1;
     const cmd={type:'pin',targetId:(side?'A':'B')+'1'};
     const seq=a.snapshot().clientSequences[side]+1;
     assert.deepEqual(a.dispatch(side,seq,cmd),b.dispatch(side,seq,cmd));
    }
    const x=a.advanceAuto(),y=b.advanceAuto();
    assert.deepEqual(x,y,'same seed/action must produce same receipt at '+seed+':'+step);
    const snapA=a.snapshot(),snapB=b.snapshot();
    assert.deepEqual(snapA.game,snapB.game,'battle state mismatch at '+seed+':'+step);
    if(x.result.type==='action'&&x.result.kind==='attack'){
     attacks++;
     assert.ok(x.result.multiHit);
     realHits+=x.result.multiHit.hits.length;
     assert.equal(x.result.multiHit.totalDamage,x.result.amount);
    }
    if(x.result.type!=='action'||snapA.game.winner!==null)break;
   }
  }
 }
 assert.ok(attacks>20,'must compare actual physical attack resolutions');
 assert.ok(realHits>=attacks,'must inspect actual host hit ledgers');
});
test('legacy damage branch uses catalog power without changing any resolved state',()=>{
 for(const seed of [3,17,9021]){
  const opts={seed,researchDamageModel:false,researchMultiHit:false,
   playtestSoulTuning:false,enableLoafing:false};
  const old=createCombat(opts),modern=createCombat({...opts,catalogAttackResolution:true});
  let count=0;
  for(let step=0;step<120;step++){
   const x=old.step(),y=modern.step();
   assert.deepEqual(x,y);
   assert.deepEqual(old.snapshot(),modern.snapshot());
   if(x.kind==='attack')count++;
   if(x.type!=='action'||x.winner!==null)break;
  }
  assert.ok(count>0);
 }
});
test('explicit mode is not inserted into wire snapshots or hidden player commands',()=>{
 const p=createMatchProtocol({battleOptions:{
  seed:123,catalogAttackResolution:true
 }});
 const snapshot=p.snapshot(),prev=clone(snapshot);
 const result=p.dispatch(0,1,{type:'pin',targetId:'B1'});
 assert.equal(result.accepted,true);
 assert.deepEqual(snapshot,prev,'outside caller snapshot is immutable-by-copy');
 assert.equal(p.snapshot().game.squads[0][0].attackPower,
  RENTAL_LAB_CATALOG.getMove('rental-01:attack').power);
 const invalid=p.dispatch(0,2,{type:'catalogAttackResolution',enabled:false});
 assert.equal(invalid.ok,false,'guest may not toggle host battle rules');
});

test('standard rental protocols enable catalog source by default, custom teams retain legacy',()=>{
 const standard=createMatchProtocol({battleOptions:{seed:7}});
 const explicit=createMatchProtocol({battleOptions:{seed:7,catalogAttackResolution:true}});
 assert.equal(standard.exportJournal().initialOptions.catalogAttackResolution,true);
 assert.equal(explicit.exportJournal().initialOptions.catalogAttackResolution,true);
 for(let index=0;index<20;index++){
  const a=standard.advanceAuto(),b=explicit.advanceAuto();
  assert.deepEqual(a,b);
  assert.deepEqual(standard.snapshot().game,explicit.snapshot().game);
 }
 const custom=createMatchProtocol({battleOptions:{
  seed:7,teams:[RENTAL_SQUAD,RENTAL_SQUAD]
 }});
 assert.equal(custom.exportJournal().initialOptions.catalogAttackResolution,false);
});
