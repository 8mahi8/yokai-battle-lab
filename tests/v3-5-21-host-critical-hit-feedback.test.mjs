import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue,visualReactionClass} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame} from '../presentation/action-choreography.mjs';

const toRoster=()=>RENTAL_SQUAD.map(m=>({...m,maxHp:900,
  weights:[100,0,0,0],attackHits:3,moveCritBonus:98,attackAccuracy:4}));
test('V3-5-21 critical style comes only from Host verified hit; Miss is never gold',()=>{
 assert.equal(visualReactionClass({kind:'damage',hit:true,amount:51}), 'mb-hit');
 assert.equal(visualReactionClass({kind:'damage',hit:true,amount:999}), 'mb-hit');
 assert.equal(visualReactionClass({kind:'damage',hit:true,amount:9,critical:true}), 'mb-hit mb-critical');
 assert.equal(visualReactionClass({kind:'damage',hit:false,amount:0,critical:true}), 'mb-missed');
 assert.equal(visualReactionClass({kind:'heal',hit:true,amount:50,critical:true}), 'mb-healed');
 assert.equal(visualReactionClass({kind:'status',critical:true}), 'mb-inspirited');
 assert.equal(visualReactionClass(null),'');
});
test('V3-5-21 real CUSTOM host criticals survive both seats and exactly one hit of choreography',()=>{
 const host=createCombat({seed:41,teams:[toRoster(),toRoster()],
  researchMultiHit:true,researchDamageModel:true});
 const action=host.step();
 assert.equal(action.type,'action');assert.equal(action.kind,'attack');
 const state=host.snapshot();
 const original=JSON.stringify(state);
 const event=state.events.findLast(x=>x.type==='action');
 assert.equal(event.multiHit.hits.length,3);
 assert.ok(event.multiHit.hits.some(x=>x.critical),'actual source must be Host critical');
 const wire={game:state,revision:1,clientSequences:[0,0]};
 const a=makeStageView(wire,0),b=makeStageView(wire,1);
 const events=[a,b].map(x=>x.events.findLast(e=>e.type==='action'));
 assert.deepEqual(events[0].hostAttackHits,events[1].hostAttackHits);
 assert.ok(events[0].hostAttackHits);
 const cue=latestBattleCue([events[0]]);
 const plan=planActionChoreography(cue);
 const begin=plan.phases[1].startMs,span=plan.phases[1].endMs-begin;
 for(const [i,hit] of plan.hitResults.entries()){
  const frame=choreographyFrame(plan,begin+(i+.1)*span/plan.hitResults.length);
  assert.equal(frame.currentHit.critical,hit.critical);
  assert.equal(frame.currentHit.damage,hit.damage);
  assert.equal(frame.currentHit.hit,hit.hit);
  assert.deepEqual(frame.impacts,[{targetId:hit.targetId,
   effect:'damage',hit:hit.hit,amount:hit.damage}]);
 }
 assert.equal(JSON.stringify(host.snapshot()),original);
});
test('V3-5-21 UI attaches critical only to actual indexed damage rows and keeps accessible label',()=>{
 const js=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../lab/match-stage.css',import.meta.url),'utf8');
 assert.match(js,/h\.critical===true\?\{critical:true\}/);
 assert.match(js,/hit\.critical===true\?\{critical:true\}/);
 assert.match(js,/activeHit\?activeHit\.critical===true:action\.critical===true/);
 assert.match(js,/critical\?'（クリティカル）'/);
 assert.match(css,/\.mb-hit\.mb-critical \.mb-floating-number/);
 assert.match(css,/color:#ffe075/);
 assert.match(css,/\.mb-hit \.mb-floating-number\{color:#ff737e/);
 assert.match(css,/\.mb-healed \.mb-floating-number\{color:#b1f7c9/);
});

test('V3-5-21 real research Soultimate criticals remain on their own host hit rows',()=>{
 const teams=[toRoster(),toRoster()];
 const host=createCombat({seed:20261029,teams,researchSpecialEffects:true,
  researchDamageModel:true,researchStatInspirits:true,
  researchSoultimateHitCount:3});
 host.giveSoul('A1',100);
 const charge=host.prepareSoultimate(0,'A1');
 assert.equal(charge.ok,true);
 assert.equal(host.resolveSoultimate(0,charge.token,true).ok,true);
 const game=host.snapshot();
 const event=game.events.findLast(x=>x.type==='special');
 assert.ok(event.researchSoultimateHits.hits.some(h=>h.critical),
  'the seeded custom Host must truly resolve a critical hit');
 const wire={game,revision:1,clientSequences:[0,0]};
 const views=[makeStageView(wire,0),makeStageView(wire,1)];
 const hits=views.map(v=>v.events.findLast(e=>e.type==='special').specialHitLedger.hits);
 assert.deepEqual(hits[0],hits[1]);
 const scene=planActionChoreography(latestBattleCue(views[0].events));
 assert.equal(scene.specialHitLedger.originalHitCount,null);
 for(const [i,hit] of scene.specialHitLedger.hits.entries()){
  const start=scene.phases[1].startMs;
  const duration=scene.phases[1].endMs-start;
  const frame=choreographyFrame(scene,start+(i+.1)*duration/
   scene.specialHitLedger.hits.length);
  assert.equal(frame.currentSpecialHit.critical,hit.critical);
  const reaction=visualReactionClass({kind:'damage',hit:hit.hit,
   amount:hit.damage,critical:hit.critical});
  assert.equal(reaction,hit.hit?(hit.critical?'mb-hit mb-critical':'mb-hit'):'mb-missed');
 }
});
