import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {ACTION_OUTCOME_SCHEMA,defineActionOutcomeV2,
 validateActionOutcomeV2} from '../contracts/action-outcome-v2.mjs';
import {projectAttackOutcomeV2}
 from '../presentation/legacy-attack-to-v2.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';

const deep=x=>JSON.parse(JSON.stringify(x));
const teams=()=>[0,1].map(side=>RENTAL_SQUAD.map((x,i)=>({
 ...x,id:(side?'B':'A')+(i+1)
})));
const legacy=()=>({
 type:'action',eventId:42,turn:16,actor:'A1',kind:'attack',target:'B2',
 hit:true,critical:false,amount:35,targetHp:65,winner:null,
 multiHit:{planned:2,hits:[
  {index:1,hit:false,critical:false,amount:0,targetHpAfter:100},
  {index:2,hit:true,critical:false,amount:35,targetHpAfter:65}
 ]}
});
const projected=()=>projectAttackOutcomeV2(legacy(),teams());

test('V2 is frozen, typed and anchored to exact host-recorded hits',()=>{
 const event=legacy(),copy=deep(event),outcome=projected();
 assert.equal(outcome.schema,ACTION_OUTCOME_SCHEMA);
 assert.equal(outcome.eventId,42);
 assert.equal(outcome.actionId,16);
 assert.equal(outcome.actionKind,'attack');
 assert.equal(outcome.actorId,'A1');
 assert.equal(outcome.moveId,'rental-01:attack');
 assert.equal(outcome.moveEvidence,'fixture');
 assert.equal(outcome.outcome.totalDamage,35);
 assert.equal(outcome.outcome.plannedHitCount,2);
 assert.deepEqual(outcome.outcome.effects,[]);
 assert.deepEqual(outcome.outcome.hits,[
  {sequence:1,targetId:'B2',hit:false,critical:false,damage:0,hpBefore:100,hpAfter:100},
  {sequence:2,targetId:'B2',hit:true,critical:false,damage:35,hpBefore:100,hpAfter:65}
 ]);
 assert.equal(validateActionOutcomeV2(outcome),true);
 assert.ok(Object.isFrozen(outcome)&&Object.isFrozen(outcome.outcome.hits[0]));
 assert.throws(()=>{outcome.outcome.hits[1].damage=999},TypeError);
 assert.deepEqual(event,copy,'conversion never changes the authoritative event');
});
test('KO cuts off remaining attacks; neither V2 nor renderer invents more hits',()=>{
 const e=legacy();
 e.multiHit.planned=4;e.multiHit.hits=[{
  index:1,hit:true,critical:false,amount:100,targetHpAfter:0
 }];
 e.amount=100;e.targetHp=0;
 const o=projectAttackOutcomeV2(e,teams());
 assert.equal(o.outcome.plannedHitCount,4);
 assert.equal(o.outcome.hits.length,1);
 assert.equal(o.outcome.hits[0].hpAfter,0);
 const malformed=deep(o);
 malformed.outcome.hits.push({
  sequence:2,targetId:'B2',hit:false,critical:false,damage:0,hpBefore:0,hpAfter:0
 });
 assert.throws(()=>defineActionOutcomeV2(malformed),/after KO/);
});
test('V2 contract rejects fake damage, HP discontinuity, status effects and edited IDs',()=>{
 const stable=projected();
 const badAmount=deep(stable);
 badAmount.outcome.totalDamage=99;
 assert.throws(()=>validateActionOutcomeV2(badAmount),/sum mismatch/);
 const discontinuity=deep(stable);
 discontinuity.outcome.hits[1].hpBefore=101;
 assert.throws(()=>validateActionOutcomeV2(discontinuity),/hit|contiguous/);
 const extraneous=deep(stable);
 extraneous.outcome.effects.push({kind:'extra-heal',amount:999});
 assert.throws(()=>validateActionOutcomeV2(extraneous),/unverified/);
 const badIdentity=deep(stable);
 badIdentity.actionKind='soultimate';
 assert.throws(()=>validateActionOutcomeV2(badIdentity),/identity/);
 const invalidOrder=deep(stable);
 invalidOrder.outcome.hits[1].sequence=4;
 assert.throws(()=>validateActionOutcomeV2(invalidOrder),/invalid ActionOutcome hit/);
});
test('no fabricated V2 mapping for unverified or contradictory legacy actions',()=>{
 const events=[
  {...legacy(),eventId:undefined},
  {...legacy(),critical:true},
  {...legacy(),hit:false},
  {...legacy(),kind:'technique'},
  {...legacy(),target:'B7'},
  {...legacy(),amount:37},
  {...legacy(),multiHit:undefined}
 ];
 for(const evt of events)assert.equal(projectAttackOutcomeV2(evt,teams()),null);
 const custom=teams();custom[0][0].speed+=1;
 assert.equal(projectAttackOutcomeV2(legacy(),custom),null);
});
test('real host action -> V2 -> view -> cue -> scene matches wire state exactly',()=>{
 const protocol=createMatchProtocol({battleOptions:{
  seed:20261028,playtestSoulTuning:true,enableLoafing:false
 }});
 let last=null;
 for(let i=0;i<100;i++){
  const receipt=protocol.advanceAuto();
  assert.equal(receipt.ok,true);
  if(receipt.result?.type==='action'&&receipt.result.kind==='attack'){
   last=receipt.result;break;
  }
 }
 assert.ok(last,'host must generate a real attack');
 const wire=protocol.snapshot(),original=JSON.stringify(wire);
 const event=wire.game.events.findLast(x=>x.type==='action');
 const outcome=projectAttackOutcomeV2(event,wire.game.squads);
 assert.ok(outcome,'genuine host action must resolve into V2');
 assert.equal(outcome.outcome.totalDamage,event.amount);
 assert.equal(outcome.outcome.hits.at(-1).hpAfter,event.targetHp);
 const view=makeStageView(wire,0);
 const projectedEvent=view.events.findLast(x=>x.type==='action');
 assert.deepEqual(projectedEvent.actionOutcomeV2,outcome);
 const cue=latestBattleCue(view.events);
 assert.deepEqual(cue.actionOutcomeV2,outcome);
 const scene=planActionChoreography(cue);
 assert.deepEqual(scene.actionOutcomeV2,outcome);
 assert.deepEqual(scene.hitResults,outcome.outcome.hits);
 assert.equal(scene.moveId,outcome.moveId);
 assert.equal(scene.impacts[0].amount,event.amount);
 assert.equal(JSON.stringify(wire),original);
 assert.deepEqual(protocol.snapshot(),wire,'converting cannot advance the host');
});
test('historical cue without V2 keeps working, inconsistent new cue is rejected',()=>{
 const oldCue={type:'action',kind:'attack',turn:42,actor:'A1',
  target:'B2',amount:10};
 const fallback=planActionChoreography(oldCue);
 assert.equal(fallback.actionOutcomeV2,null);
 assert.equal(fallback.moveId,null);
 assert.equal(fallback.impacts[0].amount,10);
 const correct=projected();
 const forged={type:'action',kind:'attack',actor:'A1',
  key:'event:42',moveId:correct.moveId,amount:999,
  actionOutcomeV2:correct};
 assert.throws(()=>planActionChoreography(forged),/conflicts/);
});

test('visual trial steps through exactly recorded hits, preserves miss and interim HP',()=>{
 const outcome=projected();
 const plan=planActionChoreography({type:'action',kind:'attack',
  actor:'A1',target:'B2',amount:35,key:'event:42',
  moveId:outcome.moveId,hitResults:outcome.outcome.hits,actionOutcomeV2:outcome});
 const start=plan.phases[1].startMs,end=plan.phases[1].endMs;
 const mid=(start+end)/2;
 let state=choreographyFrame(plan,start-1);
 assert.equal(state.currentHit,null);
 assert.equal(state.hitIndex,null);
 state=choreographyFrame(plan,start);
 assert.equal(state.hitIndex,0);
 assert.equal(state.currentHit.hit,false);
 assert.equal(state.currentHit.damage,0);
 assert.equal(state.currentHit.hpAfter,100);
 assert.equal(state.nextHitAtMs,mid);
 state=choreographyFrame(plan,mid);
 assert.equal(state.hitIndex,1);
 assert.equal(state.currentHit.hit,true);
 assert.equal(state.currentHit.damage,35);
 assert.equal(state.currentHit.hpBefore,100);
 assert.equal(state.currentHit.hpAfter,65);
 assert.equal(state.nextHitAtMs,null);
 state=choreographyFrame(plan,end+1);
 assert.equal(state.phase,'recovery');
 assert.equal(state.hitIndex,1);
 assert.equal(state.currentHit.hpAfter,65);
 assert.equal(state.impacts[0].amount,35,'legacy aggregate remains for compatibility');
 assert.equal(plan.actionOutcomeV2.outcome.totalDamage,35,
  'the visual timeline cannot change authoritative damage');
});
test('single-recorded hit has one visual state; KO cannot animate planned unexecuted hits',()=>{
 const raw=legacy();
 raw.multiHit.planned=4;
 raw.multiHit.hits=[{index:1,hit:true,critical:false,amount:100,targetHpAfter:0}];
 raw.amount=100;raw.targetHp=0;
 const verified=projectAttackOutcomeV2(raw,teams());
 const plan=planActionChoreography({
  type:'action',kind:'attack',actor:'A1',target:'B2',amount:100,
  key:'event:42',moveId:verified.moveId,
  hitResults:verified.outcome.hits,actionOutcomeV2:verified
 });
 const frame=choreographyFrame(plan,plan.phases[1].startMs);
 assert.equal(frame.hitIndex,0);
 assert.equal(frame.currentHit.hpAfter,0);
 assert.equal(frame.nextHitAtMs,null);
 assert.equal(plan.hitResults.length,1);
 assert.equal(plan.actionOutcomeV2.outcome.plannedHitCount,4);
});
