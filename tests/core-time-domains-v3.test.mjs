import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleHostInputMs,inspectCoreTimeDomains} from '../engine/core-time-domains.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createCombat} from '../engine/combat.mjs';

test('V3 read-only time domain contract keeps logical points, input milliseconds, presentation separate',()=>{
 const game=createMatchProtocol({battleOptions:{seed:212},hostNowMs:()=>10000});
 const before=game.snapshot();
 const contract=game.inspectTimeDomains();
 assert.deepEqual(contract.logical,{timeDomain:'logical-action-points',
  completedActions:0,pointsElapsed:0});
 assert.equal(contract.input.timeDomain,'trusted-host-monotonic-ms');
 assert.equal(contract.presentation,null,
  'a combat host with no presentation does not invent motion durations');
 assert.equal(contract.phase,'battle-active');
 assert.deepEqual(game.snapshot(),before,'inspection must not mutate canonical hash');
 assert.equal(Object.hasOwn(game.snapshot(),'timeDomains'),false,
  'current Firebase network snapshot schema must stay identical');
 assert.ok(Object.isFrozen(contract));
 const rotate=game.dispatch(0,1,{type:'rotate',direction:1});
 assert.equal(rotate.ok,true);
 const afterRotate=game.inspectTimeDomains();
 assert.equal(afterRotate.logical.pointsElapsed,0,
  'wall-clock wheel input must not advance logical action points');
 const event=game.advanceAuto();
 assert.equal(event.ok,true);
 assert.equal(game.inspectTimeDomains().logical.completedActions,1);
 assert.ok(game.inspectTimeDomains().logical.pointsElapsed>=0);
});

test('V3 host input timestamps are sampled only when wheel cooldown requires it',()=>{
 let sampled=0;
 const game=createMatchProtocol({hostNowMs:()=>{sampled++;return 10000;},
  battleOptions:{seed:212,rotationCooldownMs:3000}});
 game.advanceAuto();
 game.dispatch(0,1,{type:'pin',targetId:'B1'});
 game.inspectTimeDomains();
 assert.equal(sampled,0,'auto actions, pins and diagnostics never read wall time');
 game.dispatch(0,2,{type:'rotate',direction:1});
 assert.equal(sampled,1);
 const old=game.snapshot();
 game.dispatch(0,2,{type:'rotate',direction:1});
 assert.equal(sampled,1,'duplicate ACK cannot consume new clock reading');
 assert.deepEqual(game.snapshot(),old);
});

test('V3 invalid host clocks cannot advance wheel or command sequence',()=>{
 for(const sample of [-1,Infinity,NaN,null,undefined]){
  const p=createMatchProtocol({hostNowMs:()=>sample});
  const before=p.snapshot();
  assert.equal(p.dispatch(0,1,{type:'rotate',direction:1}).reason,'invalid_host_clock');
  assert.deepEqual(p.snapshot(),before);
 }
 assert.equal(sampleHostInputMs(()=>0),0);
 assert.equal(sampleHostInputMs(()=>10000.5),10000.5);
 assert.equal(sampleHostInputMs(()=>-1),null);
 assert.throws(()=>sampleHostInputMs(12),/host clock/);
});

test('V3 presentation boundary stays a separate research-only millisecond clock',()=>{
 const battle=createCombat({seed:212,researchPresentation:true});
 const before=battle.snapshot();
 assert.equal(inspectCoreTimeDomains(before).presentation.nowMs,0);
 const motion=battle.beginPresentationMotion({durationMs:700,kind:'action',actorId:'A1'});
 assert.equal(motion.opponentViewBlockedUntil,700);
 const during=battle.snapshot();
 const domains=inspectCoreTimeDomains(during);
 assert.equal(domains.presentation.timeDomain,'presentation-ms');
 assert.equal(domains.presentation.blockUntilMs,700);
 assert.equal(domains.presentation.isBlocked,true);
 assert.equal(domains.logical.completedActions,0);
 assert.equal(domains.logical.pointsElapsed,0,
  'presentation buffering must not create an AI turn');
 battle.advancePresentation(700);
 assert.equal(inspectCoreTimeDomains(battle.snapshot()).presentation.isBlocked,false);
});

test('V3 touching only lower-screen purification updates phase but no action points',()=>{
 const battle=createCombat({seed:22});
 battle.applyInspirit({id:'A4',sign:'negative',effect:'sleep'});
 assert.equal(battle.beginPurify(0,'A4',{kind:'mash'}).ok,true);
 const stage=inspectCoreTimeDomains(battle.snapshot());
 assert.equal(stage.phase,'touch-active');
 assert.equal(stage.logical.completedActions,0);
 assert.equal(stage.presentation,null);
 assert.throws(()=>inspectCoreTimeDomains({clock:{turn:-1,pointsElapsed:0}}));
});
