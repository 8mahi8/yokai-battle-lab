import test from 'node:test';
import assert from 'node:assert/strict';
import {readBattleTimeDomains} from '../engine/time-domain-contract.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createPresentationTimeline} from '../engine/presentation-timeline.mjs';

const canonical=s=>{
 const copy=structuredClone(s);
 delete copy.presentation;
 return copy;
};

test('V3-3: action points, host event ordinal and animation ms never share an implicit unit',()=>{
 const hostEvents=[{type:'action'},{type:'skill'}];
 const clockSnapshot={turn:1,pointsElapsed:135};
 const timeline=createPresentationTimeline({startMs:20});
 timeline.beginMotion({durationMs:700,kind:'inspirit'});
 timeline.record({side:0,kind:'rotate'});
 const before={clock:structuredClone(clockSnapshot),events:structuredClone(hostEvents),
  display:timeline.snapshot()};
 const view=readBattleTimeDomains({clockSnapshot,hostEvents,
  presentationSnapshot:timeline.snapshot()});
 assert.deepEqual(view,{
  logical:{unit:'action-points',actionCount:1,pointsElapsed:135},
  canonical:{unit:'host-event-ordinal',eventCount:2,lastEventOrdinal:2},
  display:{unit:'research-animation-ms',nowMs:20,blockedUntilMs:720,
   blocked:true,queuedEventCount:1,visibleEventCount:0,
   lastVisibleSequence:null,lastVisibleAtMs:null}
 });
 assert.deepEqual(clockSnapshot,before.clock);
 assert.deepEqual(hostEvents,before.events);
 assert.deepEqual(timeline.snapshot(),before.display);
 assert.equal(Object.isFrozen(view),true);
 assert.equal(Object.isFrozen(view.logical),true);
 assert.equal(Object.isFrozen(view.display),true);
 assert.equal(Object.isFrozen(view.canonical),true);
});

test('V3-3: disabled presentation is explicitly null and read-only projection does not mutate match',()=>{
 const game=createCombat({seed:20261030});
 const before=game.snapshot();
 assert.deepEqual(game.timeDomains(),{
  logical:{unit:'action-points',actionCount:0,pointsElapsed:0},
  canonical:{unit:'host-event-ordinal',eventCount:0,lastEventOrdinal:null},
  display:null
 });
 assert.deepEqual(game.snapshot(),before);
 const first=game.step(),after=game.snapshot(),view=game.timeDomains();
 assert.equal(first.type,'action');
 assert.equal(view.logical.actionCount,after.clock.turn);
 assert.equal(view.logical.pointsElapsed,after.clock.pointsElapsed);
 assert.equal(view.canonical.eventCount,after.events.length);
 assert.equal(view.display,null);
 assert.deepEqual(game.snapshot(),after);
});

test('V3-3: animation blocks opponent presentation, not accepted input or canonical battle state',()=>{
 const options={seed:42,researchPresentation:true,playtestSoulTuning:true};
 const delayed=createCombat(options),immediate=createCombat(options);
 delayed.beginPresentationMotion({durationMs:1000,kind:'inspirit'});
 assert.deepEqual(delayed.setWatchMode(0,'zero'),immediate.setWatchMode(0,'zero'));
 assert.deepEqual(delayed.rotate(1,1),immediate.rotate(1,1));
 assert.deepEqual(delayed.step(),immediate.step());
 assert.deepEqual(canonical(delayed.snapshot()),canonical(immediate.snapshot()),
  'logical/soul/HP/status/KO/events must not depend on display buffering');
 const hidden=delayed.timeDomains(),shown=immediate.timeDomains();
 assert.deepEqual(hidden.logical,shown.logical);
 assert.deepEqual(hidden.canonical,shown.canonical);
 assert.equal(hidden.display.blocked,true);
 assert.ok(hidden.display.queuedEventCount>=2);
 assert.equal(shown.display.blocked,false);
 assert.equal(shown.display.queuedEventCount,0);
 assert.deepEqual(delayed.advancePresentation(999),[]);
 assert.equal(delayed.timeDomains().display.blocked,true);
 const release=delayed.advancePresentation(1);
 assert.ok(release.length>=2);
 assert.equal(delayed.timeDomains().display.blocked,false);
 assert.equal(delayed.timeDomains().display.queuedEventCount,0);
 assert.deepEqual(canonical(delayed.snapshot()),canonical(immediate.snapshot()),
  'mere appearance of already accepted events must not redo effects');
});

test('V3-3: a delayed charge release is a display event, never a second battle commit',()=>{
 const timeline=createPresentationTimeline();
 timeline.beginMotion({durationMs:1200,kind:'action'});
 const clockSnapshot={turn:5,pointsElapsed:290},hostEvents=[{type:'action'}];
 timeline.record({side:0,kind:'chargeStart',token:4,memberId:'A1'});
 timeline.advance(600);
 timeline.record({side:0,kind:'chargeComplete',token:4,memberId:'A1'});
 const hidden=readBattleTimeDomains({clockSnapshot,hostEvents,
  presentationSnapshot:timeline.snapshot()});
 assert.equal(hidden.canonical.eventCount,1);
 assert.equal(hidden.display.queuedEventCount,2);
 assert.equal(hidden.display.visibleEventCount,0);
 const revealed=timeline.advance(600);
 assert.deepEqual(revealed.map(x=>x.kind),['specialRelease']);
 assert.equal(revealed[0].hiddenCharge,true);
 const after=readBattleTimeDomains({clockSnapshot,hostEvents,
  presentationSnapshot:timeline.snapshot()});
 assert.deepEqual(after.logical,hidden.logical);
 assert.deepEqual(after.canonical,hidden.canonical);
 assert.equal(after.display.visibleEventCount,1);
 assert.equal(after.display.lastVisibleSequence,2);
 assert.equal(after.display.lastVisibleAtMs,1200);
});

test('V3-3: reject invalid clock domain structure without modifying input',()=>{
 const valid={clockSnapshot:{turn:0,pointsElapsed:0},hostEvents:[]};
 for(const clockSnapshot of [null,{}, {turn:1.2,pointsElapsed:0},
  {turn:0,pointsElapsed:-1}]){
  assert.throws(()=>readBattleTimeDomains({...valid,clockSnapshot}));
 }
 for(const hostEvents of [null,{},[null],['event']]){
  assert.throws(()=>readBattleTimeDomains({...valid,hostEvents}));
 }
 for(const presentationSnapshot of [
  {now:50,blockUntil:100,isBlocked:false,buffered:[],visible:[]},
  {now:100,blockUntil:50,isBlocked:true,buffered:[],visible:[]},
  {now:-1,blockUntil:0,isBlocked:true,buffered:[],visible:[]},
  {now:0,blockUntil:0,isBlocked:false,buffered:[1],visible:[]},
  {now:0,blockUntil:0,isBlocked:false,buffered:[],visible:[{sequence:-1,visibleAt:0}]}
 ])assert.throws(()=>readBattleTimeDomains({...valid,presentationSnapshot}));
 assert.deepEqual(valid,{clockSnapshot:{turn:0,pointsElapsed:0},hostEvents:[]});
});
