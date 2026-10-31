import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {RENTAL_SCHOOL_CATALOG} from '../content/combat-catalog.mjs';
import {projectLegacyAttackOutcome}
 from '../presentation/legacy-attack-outcome.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const squads=()=>[0,1].map(side=>RENTAL_SQUAD.map((r,i)=>({
 ...r,id:(side?'B':'A')+(i+1),name:r.name
})));
const event=()=>({
 type:'action',eventId:42,turn:13,actor:'A1',kind:'attack',
 target:'B2',hit:true,critical:false,amount:41,targetHp:59,
 multiHit:{planned:2,attempted:2,totalDamage:41,landed:2,
 hits:[
  {index:1,hit:true,critical:false,amount:17,targetHpAfter:83},
  {index:2,hit:true,critical:false,amount:24,targetHpAfter:59}
 ]}
});

test('Phase1: one verified rental attack projects exact host hits and catalog move ID',()=>{
 const raw=event(),before=JSON.stringify(raw);
 const result=projectLegacyAttackOutcome(raw,squads());
 assert.equal(result.schema,'legacy-attack-projection-v1');
 assert.equal(result.actorId,'A1');
 assert.equal(result.moveId,RENTAL_SCHOOL_CATALOG.getCharacter('rental-01').moves.attack.id);
 assert.equal(result.moveEvidence,'fixture','source trial values are not original-verified');
 assert.equal(result.totalDamage,41);
 assert.equal(result.actionId,13);
 assert.equal(result.sourceEventId,42);
 assert.deepEqual(result.hitResults,[
  {sequence:1,targetId:'B2',hit:true,critical:false,damage:17,hpBefore:100,hpAfter:83},
  {sequence:2,targetId:'B2',hit:true,critical:false,damage:24,hpBefore:83,hpAfter:59}
 ]);
 assert.equal(JSON.stringify(raw),before,'pure projection cannot touch battle events');
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.hitResults[0]));
 assert.throws(()=>{result.hitResults[0].damage=999},TypeError);
});
test('miss and KO do not spawn fake hits, heals or extra attacks',()=>{
 const miss=event();
 miss.multiHit={planned:3,hits:[
  {index:1,hit:false,critical:false,amount:0,targetHpAfter:100},
  {index:2,hit:true,critical:false,amount:100,targetHpAfter:0}
 ]};
 miss.amount=100;miss.targetHp=0;
 const result=projectLegacyAttackOutcome(miss,squads());
 assert.equal(result.plannedHitCount,3);
 assert.equal(result.hitResults.length,2,'KO ends the attempts even if 3 were planned');
 assert.equal(result.hitResults[0].damage,0);
 assert.equal(result.hitResults[0].hit,false);
 assert.equal(result.hitResults[1].hpAfter,0);
});
test('unknown custom rosters, unsupported actions and incomplete legacy data never get fabricated move identity',()=>{
 const raw=event(),teams=squads();
 teams[0][0].name='オリジナル新キャラ';
 assert.equal(projectLegacyAttackOutcome(raw,teams),null);
 const disguised=squads();
 disguised[0][0].attackPower=123;
 assert.equal(projectLegacyAttackOutcome(raw,disguised),null,
  'a renamed/rebalanced custom rental is not identical to the catalog');
 const sp={...raw,kind:'special'};
 assert.equal(projectLegacyAttackOutcome(sp,squads()),null);
 const legacy=copy(raw);
 delete legacy.multiHit;
 assert.equal(projectLegacyAttackOutcome(legacy,squads()),null);
 const mismatch=copy(raw);
 mismatch.amount=40;
 assert.equal(projectLegacyAttackOutcome(mismatch,squads()),null);
 const conflict=copy(raw);
 conflict.multiHit.hits[1].targetHpAfter=40;
 assert.equal(projectLegacyAttackOutcome(conflict,squads()),null);
 const fake=copy(raw);
 fake.multiHit.hits.push({index:3,hit:true,critical:false,amount:5,targetHpAfter:54});
 assert.equal(projectLegacyAttackOutcome(fake,squads()),null);
});
test('a genuine seeded host attack passes to the visual cue and choreography without changing RNG or HP',()=>{
 const match=createMatchProtocol({battleOptions:{
  seed:20261028,playtestSoulTuning:true,enableLoafing:false
 }});
 let attack=null;
 for(let i=0;i<100;i++){
  const reply=match.advanceAuto();
  assert.equal(reply.ok,true);
  if(reply.result.type==='action'&&reply.result.kind==='attack'){
   attack=reply.result;break;
  }
 }
 assert.ok(attack,'normal combat should perform a real physical attack');
 const source=match.snapshot();
 const originalJSON=JSON.stringify(source);
 const sourceAction=source.game.events.findLast(e=>e.type==='action');
 assert.equal(sourceAction.turn,attack.turn);
 const projected=projectLegacyAttackOutcome(sourceAction,source.game.squads);
 assert.ok(projected,'host attack should project through rental catalog');
 assert.equal(projected.totalDamage,sourceAction.amount);
 assert.equal(projected.hitResults.reduce((s,h)=>s+h.damage,0),sourceAction.amount);
 assert.equal(projected.hitResults.at(-1).hpAfter,sourceAction.targetHp);
 const stageView=makeStageView(source,0);
 const actionView=stageView.events.findLast(e=>e.type==='action');
 assert.deepEqual(actionView.attackProjection,projected);
 const cue=latestBattleCue(stageView.events);
 assert.equal(cue.moveId,projected.moveId);
 assert.deepEqual(cue.hitResults,projected.hitResults);
 const plan=planActionChoreography(cue);
 assert.equal(plan.moveId,projected.moveId);
 assert.deepEqual(plan.hitResults,projected.hitResults);
 assert.equal(choreographyFrame(plan,0).impacts.length,0);
 assert.equal(JSON.stringify(source),originalJSON,'view projection must not modify wire snapshot');
 assert.deepEqual(match.snapshot(),source,'view projection cannot advance RNG, HP or revision');
});
test('old events without a hit ledger continue rendering through the existing battle UI fallback',()=>{
 const old=event();
 delete old.multiHit;
 const visible={...old,attackProjection:projectLegacyAttackOutcome(old,squads())};
 const cue=latestBattleCue([visible]);
 assert.equal(cue.moveId,undefined);
 const plan=planActionChoreography(cue);
 assert.equal(plan.moveId,null);
 assert.equal(plan.hitResults.length,0);
 assert.equal(plan.impacts[0].amount,41);
});
