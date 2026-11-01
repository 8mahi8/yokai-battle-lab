import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {inspectCoreTimeDomains} from '../engine/core-time-domains.mjs';

const withoutView=game=>{
 const snapshot=game.snapshot();
 delete snapshot.presentation;
 return snapshot;
};
const hp=game=>game.snapshot().squads.map(team=>team.map(unit=>unit.hp));
const eventCount=game=>game.timeDomains().canonical.eventCount;
const setupCounter=({seed=40,wheel=false,enduresSpent=0}={})=>{
 const game=createCombat({seed,researchPresentation:true,
  researchSpecialEffects:true,researchCounterTiming:true,
  researchWheelCoalescing:wheel});
 assert.equal(game.beginCounterCutin({
  attackerSide:1,durationMs:800,enduresSpent
 }).ok,true);
 game.giveSoul('A1',100);
 const charge=game.prepareSoultimate(0,'A1');
 assert.equal(charge.ok,true);
 return {game,charge};
};

test('V3-3-2: display-only motion never changes canonical state over 12 seeded full action traces',()=>{
 for(const researchDamageModel of [false,true])for(const seed of [1,7,42,212,8192,20261030]){
  const opts={seed,researchPresentation:true,researchSpecialEffects:true,
   playtestSoulTuning:true,researchDamageModel};
  const blocked=createCombat(opts),direct=createCombat(opts);
  for(const game of [blocked,direct])game.giveSoul('A1',100);
  blocked.beginPresentationMotion({durationMs:1000,kind:'inspirit',actorId:'B2'});
  const chargeA=blocked.prepareSoultimate(0,'A1');
  const chargeB=direct.prepareSoultimate(0,'A1');
  assert.deepEqual(chargeA,chargeB,seed+'/charge start');
  assert.equal(chargeA.ok,true);
  assert.deepEqual(blocked.rotate(1,1),direct.rotate(1,1));
  assert.deepEqual(
   blocked.resolveSoultimate(0,chargeA.token,true),
   direct.resolveSoultimate(0,chargeB.token,true),
   seed+'/special'
  );
  assert.deepEqual(blocked.setWatchMode(1,'zero'),direct.setWatchMode(1,'zero'));
  for(let i=0;i<12;i++){
   assert.deepEqual(blocked.step(),direct.step(),seed+'/step '+i);
   assert.deepEqual(withoutView(blocked),withoutView(direct),
    seed+'/canonical state '+i);
   assert.deepEqual(blocked.timeDomains().logical,direct.timeDomains().logical);
   assert.deepEqual(blocked.timeDomains().canonical,direct.timeDomains().canonical);
  }
  const before=withoutView(blocked),clockBefore=blocked.timeDomains();
  assert.equal(clockBefore.display.blocked,true);
  assert.ok(clockBefore.display.queuedEventCount>0);
  assert.equal(direct.timeDomains().display.queuedEventCount,0);
  const revealed=blocked.advancePresentation(1000);
  assert.ok(revealed.length>0);
  assert.equal(blocked.timeDomains().display.queuedEventCount,0);
  assert.deepEqual(withoutView(blocked),before);
  assert.deepEqual(withoutView(blocked),withoutView(direct));
  assert.deepEqual(blocked.timeDomains().logical,clockBefore.logical);
  assert.deepEqual(blocked.timeDomains().canonical,clockBefore.canonical);
 }
});

test('V3-3-2: legacy V3-1 time inspector agrees with new V3-3 observer',()=>{
 for(const enabled of [false,true]){
  const g=createCombat({seed:212,researchPresentation:enabled});
  if(enabled)g.beginPresentationMotion({durationMs:700,kind:'action'});
  for(let step=0;step<4;step++){
   g.step();
   const snap=g.snapshot(),old=inspectCoreTimeDomains(snap),current=g.timeDomains();
   assert.equal(old.logical.completedActions,current.logical.actionCount);
   assert.equal(old.logical.pointsElapsed,current.logical.pointsElapsed);
   assert.equal(old.presentation===null,current.display===null);
   if(old.presentation){
    assert.equal(old.presentation.nowMs,current.display.nowMs);
    assert.equal(old.presentation.blockUntilMs,current.display.blockedUntilMs);
    assert.equal(old.presentation.isBlocked,current.display.blocked);
   }
   assert.equal(current.canonical.lastEventOrdinal,
    snap.events.at(-1)?.eventId??null);
   assert.equal(current.canonical.eventCount,snap.events.length);
  }
 }
});

test('V3-3-2: early counter reserves HP until confirmed scheduled hit and never commits twice',()=>{
 const {game:g,charge}=setupCounter();
 g.advancePresentation(200);
 assert.equal(g.rotate(1,1).ok,true);
 const done=g.resolveSoultimate(0,charge.token,true);
 assert.equal(done.effectStatus,'pending-counter-hit');
 const pending=g.snapshot(),logical=g.timeDomains().logical,ordinal=eventCount(g);
 assert.equal(g.timeDomains().display.blocked,true);
 g.advancePresentation(599);
 assert.deepEqual(hp(g),pending.squads.map(team=>team.map(x=>x.hp)));
 assert.equal(eventCount(g),ordinal);
 assert.equal(g.timeDomains().logical.actionCount,logical.actionCount);
 g.advancePresentation(1);
 const hit=g.snapshot();
 assert.equal(hit.counterEffectsPending,0);
 assert.ok(hit.events.some(x=>x.type==='counter-hit'));
 assert.ok(hit.squads[1].some((x,i)=>x.hp<pending.squads[1][i].hp));
 assert.equal(eventCount(g),ordinal+2,
  'counter must append special impact and counter-hit, once');
 assert.deepEqual(g.timeDomains().logical,logical);
 const stable=withoutView(g);
 assert.deepEqual(g.advancePresentation(0),[]);
 assert.deepEqual(withoutView(g),stable);
});

test('V3-3-2: late counter due at zero-ms wheel boundary hits old front before rotation',()=>{
 const {game:g,charge}=setupCounter({seed:17});
 g.advancePresentation(1700);
 const done=g.resolveSoultimate(0,charge.token,true);
 assert.equal(done.counter.hitAt,1700);
 const ordinal=eventCount(g),clock=g.timeDomains().logical,before=hp(g);
 assert.equal(g.rotate(1,1).ok,true);
 const after=g.snapshot(),impact=after.events.findLast(x=>x.type==='counter-hit');
 assert.deepEqual(impact.targets,['B1','B2','B3']);
 assert.ok(after.squads[1][0].hp<before[1][0]);
 assert.equal(after.squads[1][3].hp,before[1][3]);
 assert.equal(after.counterEffectsPending,0);
 assert.equal(eventCount(g),ordinal+2);
 assert.deepEqual(g.timeDomains().logical,clock);
 const now=withoutView(g);
 g.advancePresentation(0);
 assert.deepEqual(withoutView(g),now);
});

test('V3-3-2: unsourced 3+ rotations plus Endure never invent HP or hit target',()=>{
 const {game:g,charge}=setupCounter({seed:123,wheel:true,enduresSpent:2});
 for(let i=0;i<3;i++){g.advancePresentation(100);assert.equal(g.rotate(1,1).ok,true);}
 g.advancePresentation(600);
 const released=g.resolveSoultimate(0,charge.token,true);
 assert.equal(released.effectStatus,'pending-counter-hit');
 assert.equal(released.counter.uncertainty?.code,
  'two-endures-cutin-front-lock-time-unverified');
 const before=hp(g),logical=g.timeDomains().logical,ordinal=eventCount(g);
 g.advancePresentation(400);
 const state=g.snapshot();
 assert.deepEqual(hp(g),before);
 assert.equal(state.counterEffectsPending,0);
 const unknown=state.events.findLast(x=>x.type==='counter-hit-indeterminate');
 assert.ok(unknown);
 assert.deepEqual(unknown.reasonCodes,[
  'two-endures-cutin-front-lock-time-unverified',
  'three-plus-rotations-unverified'
 ]);
 assert.equal(unknown.hpApplied,false);
 assert.equal(state.events.filter(x=>x.type==='counter-hit').length,0);
 assert.equal(eventCount(g),ordinal+1);
 assert.deepEqual(g.timeDomains().logical,logical);
 const stable=withoutView(g);
 g.advancePresentation(0);
 assert.deepEqual(withoutView(g),stable);
});
