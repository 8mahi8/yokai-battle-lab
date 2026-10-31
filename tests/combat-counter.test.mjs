import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const make=({seed=40}={})=>createCombat({seed,teams:[RENTAL_SQUAD,RENTAL_SQUAD],
 researchCounterTiming:true,researchPresentation:true,researchSpecialEffects:true});
const hp=(g,id)=>g.snapshot().squads.flat().find(m=>m.id===id).hp;
const charge=g=>{g.giveSoul('A1',100);return g.prepareSoultimate(0,'A1');};

test('early counter freezes front at completion then deals actual HP only after cutin',()=>{
 const g=make(),start=g.beginCounterCutin({attackerSide:1,durationMs:800});
 assert.equal(start.ok,true);
 const c=charge(g);assert.equal(c.ok,true);
 g.advancePresentation(200);
 g.rotate(1,1); // B2 B3 B4 at charge completion
 const frontAtFinish=[...g.snapshot().clock.teams[1].frontIds];
 const before=Object.fromEntries(g.snapshot().squads[1].map(m=>[m.id,m.hp]));
 const result=g.resolveSoultimate(0,c.token,true);
 assert.equal(result.effectStatus,'pending-counter-hit');
 assert.equal(result.counter.frontLock,'completion');
 assert.deepEqual(result.counter.targetIds,frontAtFinish);
 assert.equal(g.snapshot().soul.teams[0][0].soul,0);
 assert.deepEqual(Object.fromEntries(g.snapshot().squads[1].map(m=>[m.id,m.hp])),before);
 g.rotate(1,1);
 assert.equal(g.snapshot().counterEffectsPending,1);
 g.advancePresentation(600);
 assert.equal(g.snapshot().counterEffectsPending,0);
 assert.ok(frontAtFinish.every(id=>hp(g,id)<before[id]));
 assert.ok(['B1','B5','B6'].every(id=>hp(g,id)===before[id]));
 assert.equal(g.snapshot().events.filter(e=>e.type==='counter-hit').length,1);
});
test('late counter uses new front at delayed hit and does not hit former front',()=>{
 const g=make();g.beginCounterCutin({attackerSide:1,durationMs:800});
 const c=charge(g);
 g.advancePresentation(900);
 const queued=g.resolveSoultimate(0,c.token,true);
 assert.equal(queued.effectStatus,'pending-counter-hit');
 assert.equal(queued.counter.hitAt,1300);
 assert.equal(queued.counter.frontLock,'impact');
 const old=[...g.snapshot().clock.teams[1].frontIds];
 const before=Object.fromEntries(g.snapshot().squads[1].map(m=>[m.id,m.hp]));
 g.rotate(1,1);
 assert.deepEqual(g.advancePresentation(399).length>=0,true);
 assert.equal(hp(g,'B1'),before.B1);
 g.advancePresentation(1);
 const targets=g.snapshot().events.findLast(x=>x.type==='counter-hit').targets;
 assert.deepEqual(targets,['B2','B3','B4']);
 assert.equal(hp(g,'B1'),before.B1);
 assert.ok(targets.every(id=>hp(g,id)<before[id]));
});
test('two Endure consumptions override late front snapshot only with stable cut-in face',()=>{
 const g=make();g.beginCounterCutin({attackerSide:1,durationMs:800,enduresSpent:2});
 const c=charge(g);g.advancePresentation(900);
 const out=g.resolveSoultimate(0,c.token,true);
 assert.equal(out.counter.frontLock,'endure-exception');
 assert.equal(out.counter.uncertainty,null);
 g.rotate(1,1);g.rotate(1,1);
 const before=Object.fromEntries(g.snapshot().squads[1].map(m=>[m.id,m.hp]));
 g.advancePresentation(400);
 assert.deepEqual(g.snapshot().events.findLast(x=>x.type==='counter-hit').targets,['B1','B2','B3']);
 assert.ok(['B1','B2','B3'].every(id=>hp(g,id)<before[id]));
 assert.ok(['B4','B5','B6'].every(id=>hp(g,id)===before[id]));
});
test('22D cut-in wheel rotation plus two Endures cannot invent HP for an unknown freeze frame',()=>{
 const g=make();g.beginCounterCutin({attackerSide:1,durationMs:800,enduresSpent:2});
 const c=charge(g);
 g.advancePresentation(250);
 g.rotate(1,1); // B2,B3,B4 visible during cut-in; lock time unknown
 g.advancePresentation(650);
 const planned=g.resolveSoultimate(0,c.token,true);
 assert.equal(planned.counter.uncertainty?.code,
  'two-endures-cutin-front-lock-time-unverified');
 assert.equal(g.snapshot().counterEffectsPending,1);
 const before=Object.fromEntries(g.snapshot().squads[1].map(m=>[m.id,m.hp]));
 g.rotate(1,1);
 g.advancePresentation(400);
 const after=g.snapshot();
 assert.deepEqual(Object.fromEntries(after.squads[1].map(m=>[m.id,m.hp])),before);
 assert.equal(after.counterEffectsPending,0);
 const unresolved=after.events.filter(x=>x.type==='counter-hit-indeterminate');
 assert.equal(unresolved.length,1);
 assert.equal(unresolved[0].reason,'two-endures-cutin-front-lock-time-unverified');
 assert.equal(unresolved[0].hpApplied,false);
 assert.equal(after.events.filter(x=>x.type==='counter-hit').length,0);
});
test('cancelling a cutin counter does not queue any HP changes',()=>{
 const g=make();g.beginCounterCutin({attackerSide:1,durationMs:800});
 const c=charge(g);
 assert.equal(g.resolveSoultimate(0,c.token,false).reason,'charge_cancelled');
 assert.equal(g.snapshot().counterEffectsPending,0);
 assert.deepEqual(g.advancePresentation(1400).filter(x=>x.kind==='specialRelease'),[]);
 assert.equal(g.snapshot().events.filter(x=>x.type==='counter-hit').length,0);
 assert.equal(g.snapshot().soul.teams[0][0].soul,100);
});
test('rotation of guided caster cancels counter preparation safely',()=>{
 const g=make();g.beginCounterCutin({attackerSide:1,durationMs:800});
 g.giveSoul('A1',100);
 const c=g.beginGuidedCharge(0,'A1');assert.equal(c.ok,true);
 const rotated=g.rotate(0,1);assert.equal(rotated.chargeCancelled,true);
 assert.equal(g.snapshot().counterWindow.cutin.counterToken,null);
 g.advancePresentation(1000);
 assert.equal(g.snapshot().counterEffectsPending,0);
 assert.equal(g.snapshot().soul.teams[0][0].soul,100);
});
test('opt-in is isolated from existing research game modes',()=>{
 const g=createCombat({researchPresentation:true,researchSpecialEffects:true});
 assert.deepEqual(g.beginCounterCutin({attackerSide:1,durationMs:800}),
  {ok:false,reason:'counter_timing_disabled'});
 assert.equal(Object.hasOwn(g.snapshot(),'counterWindow'),false);
 assert.throws(()=>createCombat({researchCounterTiming:true}));
 assert.throws(()=>createCombat({researchCounterTiming:true,researchPresentation:true}));
});


test('22D-B preserve BOTH unknown Endure freeze and 3+ rotations in real research combat without HP',()=>{
 const g=createCombat({seed:123,researchPresentation:true,
  researchSpecialEffects:true,researchCounterTiming:true,researchWheelCoalescing:true});
 assert.equal(g.beginCounterCutin({attackerSide:1,durationMs:800,enduresSpent:2}).ok,true);
 g.giveSoul('A1',100);
 const charge=g.prepareSoultimate(0,'A1');assert.equal(charge.ok,true);
 g.advancePresentation(100);g.rotate(1,1);
 g.advancePresentation(100);g.rotate(1,1);
 g.advancePresentation(100);g.rotate(1,1);
 g.advancePresentation(600);
 const outcome=g.resolveSoultimate(0,charge.token,true);
 assert.equal(outcome.effectStatus,'pending-counter-hit');
 assert.equal(outcome.counter.uncertainty.code,'two-endures-cutin-front-lock-time-unverified');
 assert.equal(outcome.counter.frontLock,'endure-exception');
 const reported=g.snapshot().uncertainCounterHits;
 assert.equal(reported.length,1);
 assert.deepEqual([reported[0].reason.code,
  ...reported[0].reason.additionalReasons.map(x=>x.code)],[
  'two-endures-cutin-front-lock-time-unverified','three-plus-rotations-unverified'
 ]);
 const before=g.snapshot().squads.map(team=>team.map(x=>x.hp));
 g.advancePresentation(400);
 const after=g.snapshot();
 assert.deepEqual(after.squads.map(team=>team.map(x=>x.hp)),before);
 assert.equal(after.counterEffectsPending,0);
 const unknown=after.events.filter(x=>x.type==='counter-hit-indeterminate');
 assert.equal(unknown.length,1);
 assert.deepEqual(unknown[0].reasonCodes,[
  'two-endures-cutin-front-lock-time-unverified','three-plus-rotations-unverified'
 ]);
 assert.equal(unknown[0].rotationCount,3);
 assert.deepEqual(unknown[0].candidateCutinFronts,[
  {at:0,frontIds:['B1','B2','B3']},
  {at:100,frontIds:['B2','B3','B4']},
  {at:200,frontIds:['B3','B4','B5']},
  {at:300,frontIds:['B4','B5','B6']}
 ]);
 assert.equal(unknown[0].cutinHistoryTruncated,false);
 assert.equal(unknown[0].hpApplied,false);
 g.advancePresentation(999);
 assert.equal(g.snapshot().events.filter(x=>x.type==='counter-hit-indeterminate').length,1);
});

test('22D-B uncertainty reasons in snapshots are deep defensive copies',()=>{
 const g=createCombat({seed:123,researchPresentation:true,
  researchSpecialEffects:true,researchCounterTiming:true,researchWheelCoalescing:true});
 g.beginCounterCutin({attackerSide:1,durationMs:800,enduresSpent:2});
 g.giveSoul('A1',100);
 const c=g.prepareSoultimate(0,'A1');
 g.rotate(1,1);g.advancePresentation(900);g.resolveSoultimate(0,c.token,true);
 const first=g.snapshot().uncertainCounterHits[0];
 assert.ok(first.reason.cutinFrontlineTimeline.length>=2);
 first.reason.cutinFrontlineTimeline[0].frontIds[0]='corrupted';
 assert.equal(g.snapshot().uncertainCounterHits[0].reason.cutinFrontlineTimeline[0].frontIds[0],'B1');
});
