import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue,actionLabelImpact} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame} from '../presentation/action-choreography.mjs';
import {projectRecordedAttackHits,projectLegacyAttackOutcome}
 from '../presentation/legacy-attack-outcome.mjs';

test('V3-5-18 common action timeline shows each source hit, never aggregate at the first hit',()=>{
 const original={type:'action',key:'event:17',turn:17,actor:'A1',target:'B1',
  kind:'attack',hit:true,amount:19,targets:[{id:'B1',kind:'damage',hit:true,amount:19}],
  hitResults:[
   {sequence:1,targetId:'B1',hit:false,critical:false,damage:0,hpBefore:100,hpAfter:100},
   {sequence:2,targetId:'B1',hit:true,critical:false,damage:19,hpBefore:100,hpAfter:81}
  ]};
 const before=JSON.stringify(original);
 const plan=planActionChoreography(original);
 const start=plan.phases[1].startMs;
 const slice=(plan.phases[1].endMs-start)/2;
 assert.deepEqual(choreographyFrame(plan,start-1).impacts,[]);
 assert.deepEqual(choreographyFrame(plan,start).impacts,
  [{targetId:'B1',effect:'damage',hit:false,amount:0}]);
 assert.deepEqual(choreographyFrame(plan,start+slice).impacts,
  [{targetId:'B1',effect:'damage',hit:true,amount:19}]);
 assert.deepEqual(plan.impacts,
  [{targetId:'B1',effect:'damage',hit:true,amount:19}],
  'the original host aggregate remains immutable and unchanged');
 assert.equal(JSON.stringify(original),before);
 assert.equal(Object.isFrozen(choreographyFrame(plan,start).impacts[0]),true);
});

test('V3-5-18 custom 3-hit Host action reaches both battle seats without a false rental move ID',()=>{
 const custom=RENTAL_SQUAD.map(m=>({...m,weights:[100,0,0,0],attackHits:3}));
 let checked=0;
 for(const seed of [41,45,52,91,20261028]){
  const host=createCombat({teams:[custom,custom],seed,researchMultiHit:true,
   researchDamageModel:true});
  for(let step=0;step<30;step++){
   const action=host.step();
   if(action.type!=='action')break;
   const game=host.snapshot();
   const actual=game.events.findLast(e=>e.type==='action'&&e.turn===action.turn);
   if(!actual?.multiHit||actual.multiHit.hits.length<2)continue;
   const raw=projectRecordedAttackHits(actual);
   assert.ok(raw,'host hit list must have valid HP/roll totals');
   assert.equal(projectLegacyAttackOutcome(actual,game.squads),null,
    'custom three-hit attack cannot pretend to be a one-hit authored rental move');
   const wire={game,revision:step+1,clientSequences:[0,0],forecast:[]};
   const a=makeStageView(wire,0),b=makeStageView(wire,1);
   const pa=a.events.findLast(e=>e.type==='action'&&e.turn===action.turn);
   const pb=b.events.findLast(e=>e.type==='action'&&e.turn===action.turn);
   assert.ok(pa?.hostAttackHits&&pb?.hostAttackHits);
   assert.deepEqual(pa.hostAttackHits,pb.hostAttackHits);
   assert.equal(pa.attackProjection,undefined);
   assert.equal(pa.actionOutcomeV2,undefined);
   const before=JSON.stringify(host.snapshot());
   const cue=latestBattleCue([pa]);
   assert.equal(cue.moveId,undefined);
   assert.deepEqual(cue.hitResults,raw.hitResults);
   const plan=planActionChoreography(cue);
   assert.equal(plan.moveId,null);
   assert.equal(plan.hitResults.length,actual.multiHit.hits.length);
   const start=plan.phases[1].startMs;
   const stepMs=(plan.phases[1].endMs-start)/plan.hitResults.length;
   for(let i=0;i<plan.hitResults.length;i++){
    const hit=plan.hitResults[i];
    const frame=choreographyFrame(plan,start+(i+.1)*stepMs);
    assert.equal(frame.hitIndex,i);
    assert.deepEqual(frame.impacts,[{targetId:hit.targetId,
     effect:'damage',hit:hit.hit,amount:hit.damage}]);
    assert.deepEqual(actionLabelImpact(actual,plan.hitResults,i),
     {hit:hit.hit,amount:hit.damage});
   }
   assert.equal(JSON.stringify(host.snapshot()),before);
   checked++;
   break;
  }
 }
 assert.ok(checked>=3,'must exercise real multi-hit HOST, not just mock hit rows');
});

test('V3-5-18 reject forged host hit rows and keep unsourced events generic',()=>{
 const event={type:'action',kind:'attack',actor:'A1',target:'B1',turn:1,
  hit:true,critical:false,amount:18,targetHp:82,multiHit:{planned:2,hits:[
   {index:1,hit:false,critical:false,amount:0,targetHpAfter:100},
   {index:2,hit:true,critical:false,amount:18,targetHpAfter:82}
  ]}};
 const valid=projectRecordedAttackHits(event);
 assert.equal(valid.hitResults.length,2);
 const changes=[
  {...event,amount:99},
  {...event,hit:false},
  {...event,critical:true},
  {...event,multiHit:{...event.multiHit,planned:1}},
  {...event,multiHit:{...event.multiHit,hits:[event.multiHit.hits[0],
   {...event.multiHit.hits[1],index:3}]}},
  {...event,multiHit:{...event.multiHit,hits:[event.multiHit.hits[0],
   {...event.multiHit.hits[1],targetHpAfter:80}]}}
 ];
 for(const changed of changes)assert.equal(projectRecordedAttackHits(changed),null);
 assert.equal(projectRecordedAttackHits({...event,multiHit:null}),null);
 const legacy=planActionChoreography({type:'action',turn:4,actor:'A1',
  kind:'attack',target:'B1',amount:7});
 assert.deepEqual(choreographyFrame(legacy,legacy.phases[1].startMs).impacts,
  [{targetId:'B1',effect:'damage',hit:true,amount:7}]);
});

test('V3-5-18 original video color categories apply to real damage/heal numerals',()=>{
 const css=readFileSync(new URL('../lab/match-stage.css',import.meta.url),'utf8');
 assert.match(css,/\.mb-hit \.mb-floating-number\{color:#ff737e/);
 assert.match(css,/\.mb-healed \.mb-floating-number\{color:#b1f7c9/);
 const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
 assert.match(stage,/projectRecordedAttackHits\(event\)/);
 assert.match(stage,/hostAttackHits\?\{hostAttackHits\}/);
 assert.match(stage,/scenePlan\.hitResults\[sceneHitIndex\?\?0\]/);
});
