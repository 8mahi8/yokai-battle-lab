import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {YW2_REFERENCE_SOULTIMATES,yw2ReferenceSoultimate,
 yw2ReferenceSpecialDefinition} from '../content/yw2-soultimate-reference.mjs';
import {projectSoultimateHitLedger,assertSoultimateHitLedger}
 from '../contracts/soultimate-hit-ledger-v1.mjs';
import {projectSoultimateImpactLedger}
 from '../contracts/soultimate-impact-ledger-v1.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';

const ids=['yw2:tararin:hanaji-bomber','yw2:ookuwano-kami:daisetsudan'];
const customTeams=()=>[0,1].map(()=>RENTAL_SQUAD.map(x=>({...x,weights:[...x.weights]})));
function run(id,{seed=20261029}={}){
 const battle=createCombat({teams:customTeams(),seed,
  researchYw2Soultimate:id,researchSpecialEffects:true,
  researchDamageModel:true,researchStatInspirits:true});
 battle.giveSoul('A1',100);
 const prepared=battle.prepareSoultimate(0,'A1');
 assert.equal(prepared.ok,true);
 const result=battle.resolveSoultimate(0,prepared.token,true);
 assert.equal(result.ok,true);
 const snapshot=battle.snapshot();
 return {battle,result,snapshot,event:snapshot.events.findLast(x=>x.type==='special')};
}

test('two independently cited original YW2 move shapes remain frozen and unambiguous',()=>{
 assert.equal(YW2_REFERENCE_SOULTIMATES.length,2);
 for(const id of ids){
  const move=yw2ReferenceSoultimate(id);
  assert.ok(Object.isFrozen(move)&&Object.isFrozen(move.sourceRefs));
  assert.equal(move.hitsPerTarget,1);
  assert.equal(move.sourceRefs.length,2);
  assert.equal(move.evidence,'two-independent-yw2-guides');
  assert.deepEqual(move.effects,[]);
  assert.deepEqual(yw2ReferenceSpecialDefinition(id),{
   kind:'damage',scope:move.scope,power:move.power,damageKind:'attack'});
 }
 assert.deepEqual(ids.map(x=>yw2ReferenceSoultimate(x).targetScope),
  ['enemy_front','single_enemy']);
 assert.deepEqual(ids.map(x=>yw2ReferenceSoultimate(x).power),[100,210]);
 assert.throws(()=>yw2ReferenceSoultimate('yw2:jibanyan:paws-of-fury'),/unknown/);
});

test('100×1 full-front YW2 reference applies precisely one *host* hit per opponent',()=>{
 const {battle,result,snapshot,event}=run(ids[0]);
 assert.equal(result.impacts.length,3);
 assert.deepEqual(result.impacts.map(x=>x.targetId),['B1','B2','B3']);
 assert.equal(event.referenceSoultimate.id,ids[0]);
 assert.equal(event.referenceSoultimate.scope,'enemy_front');
 assert.equal(event.referenceSoultimate.hitCount,1);
 assert.equal(event.referenceSoultimate.limitation,
  'original-shape-only; applied RNG/visual timing are research');
 assert.equal(event.researchSoultimateHits.plannedPerTarget,1);
 const sourceHits=event.researchSoultimateHits.hits;
 assert.equal(sourceHits.length,3);
 assert.deepEqual(sourceHits.map(x=>x.targetSequence),[1,1,1]);
 const ledger=projectSoultimateHitLedger(event);
 assert.equal(assertSoultimateHitLedger(ledger),true);
 const impacts=projectSoultimateImpactLedger(event);
 assert.equal(impacts.impacts.length,3);
 for(let i=0;i<3;i++){
  const hit=ledger.hits[i],target=impacts.impacts[i];
  assert.equal(hit.targetId,target.targetId);
  assert.equal(hit.damage,target.amount);
  assert.equal(hit.hpAfter,target.hpAfter);
  assert.equal(snapshot.squads[1][i].hp,hit.hpAfter);
 }
 // Source identity and live calculation are separate provenance levels.
 assert.equal(ledger.originalHitCount,null,
  'research hit ledger does not claim original damage formula or timing');
 const view=makeStageView({game:snapshot,revision:1,clientSequences:[0,0]},0);
 const cue=latestBattleCue(view.events);
 const plan=planActionChoreography(cue);
 assert.equal(plan.specialHitLedger.hits.length,3);
 assert.equal(plan.specialImpactLedger.impacts.length,3);
 const start=plan.phases[1].startMs;
 const step=(plan.phases[1].endMs-start)/3;
 for(let i=0;i<3;i++){
  const frame=choreographyFrame(plan,start+(i+.1)*step);
  assert.equal(frame.specialHitIndex,i);
  assert.equal(frame.specialTargetIndex,i);
  assert.equal(frame.currentSpecialHit.damage,ledger.hits[i].damage);
  assert.equal(frame.impacts.length,1);
 }
 assert.deepEqual(battle.snapshot(),snapshot);
});

test('210×1 single-target YW2 reference hits only one enemy, no fabricated status',()=>{
 const {event,result,snapshot}=run(ids[1]);
 assert.equal(result.impacts.length,1);
 assert.equal(event.referenceSoultimate.id,ids[1]);
 assert.equal(event.referenceSoultimate.scope,'single_enemy');
 const hits=projectSoultimateHitLedger(event);
 assert.equal(hits.hits.length,1);
 assert.equal(hits.plannedPerTarget,1);
 assert.equal(hits.hits[0].targetId,'B1');
 assert.equal(event.impacts[0].kind,'damage');
 assert.equal(event.impacts[0].statusEffect,undefined);
 assert.deepEqual(snapshot.squads[1].slice(1).map(x=>x.hp),
  snapshot.squads[1].slice(1).map(x=>x.maxHp));
});

test('uncertified Soultimate shapes never enter the school default or invalid modes',()=>{
 for(const id of ids){
  for(const options of [
   {researchYw2Soultimate:id,researchDamageModel:true,researchSpecialEffects:true},
   {teams:customTeams(),researchYw2Soultimate:id,researchSpecialEffects:true},
   {teams:customTeams(),researchYw2Soultimate:id,researchDamageModel:true},
   {teams:customTeams(),researchYw2Soultimate:id,researchDamageModel:true,
    researchSpecialEffects:true,researchSoultimateHitCount:3},
   {teams:customTeams(),researchYw2Soultimate:id,researchDamageModel:true,
    researchSpecialEffects:true,catalogSoultimateResolution:true}
  ])assert.throws(()=>createCombat(options),/YW2 reference|Soultimate/);
 }
 const classic=createCombat({researchSpecialEffects:true,seed:20261029});
 classic.giveSoul('A1',100);
 const started=classic.prepareSoultimate(0,'A1');
 classic.resolveSoultimate(0,started.token,true);
 const old=classic.snapshot().events.findLast(e=>e.type==='special');
 assert.equal(old.referenceSoultimate,undefined);
 assert.equal(old.researchSoultimateHits,undefined);
 assert.equal(projectSoultimateHitLedger(old),null);
});
