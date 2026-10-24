import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelAngle,signedWheelDelta,wheelTurnFromDelta,wheelGestureAt} from '../ui/wheel-gesture.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';

test('one circular swipe produces one direction, wrap and tiny taps do not rotate',()=>{
 const start=wheelAngle(90,10,50,50);
 assert.equal(start,-Math.PI/4);
 const clockwise=wheelGestureAt({x:90,y:90,centerX:50,centerY:50,radius:60,startAngle:start});
 assert.equal(clockwise.direction,1);
 assert.ok(clockwise.degrees>=89&&clockwise.degrees<=91);
 const counter=wheelGestureAt({x:10,y:10,centerX:50,centerY:50,radius:60,startAngle:start});
 assert.equal(counter.direction,-1);
 assert.equal(wheelTurnFromDelta(.02),0);
 assert.equal(wheelTurnFromDelta(-Math.PI/2),-1);
 assert.equal(wheelTurnFromDelta(Math.PI/2),1);
 assert.equal(wheelGestureAt({x:50,y:50,centerX:50,centerY:50,radius:60,startAngle:start}),null,
  'drag through center must not claim arbitrary clockwise direction');
 const wrap=signedWheelDelta(179*Math.PI/180,-179*Math.PI/180);
 assert.ok(Math.abs(wrap-2*Math.PI/180)<.00001);
 assert.throws(()=>wheelAngle(NaN,20,1,1),/finite/);
 assert.throws(()=>wheelTurnFromDelta(NaN),/invalid/);
});

test('action presentation is only derived from canonical battle log payload',()=>{
 assert.equal(latestBattleCue([]),null);
 const cue=latestBattleCue([{type:'action',turn:4,actor:'A1',target:'B2',
  kind:'attack',hit:true,amount:27}]);
 assert.equal(cue.key,'action:4');
 assert.equal(cue.actor,'A1');
 assert.deepEqual(cue.targets,[{id:'B2',amount:27,kind:'damage',hit:true}]);
 const miss=latestBattleCue([{type:'action',turn:5,actor:'B1',target:'A1',
  kind:'technique',hit:false,amount:0}]);
 assert.deepEqual(miss.targets,[{id:'A1',amount:0,kind:'damage',hit:false}]);
 assert.equal(latestBattleCue([{type:'rotation',side:0},...[]]),null);
});
test('special presentation uses every resolved impact and exact G/normal mode',()=>{
 const events=[{type:'action',turn:6,actor:'A1',target:'B3',kind:'guard'},
  {type:'special',mode:'g-tech',actor:'B2',impacts:[
   {targetId:'A2',kind:'damage',amount:30},
   {targetId:'A3',kind:'damage',amount:12},
   {targetId:'A1',kind:'heal',amount:5}
  ]},
  {type:'view',kind:'chargeComplete'}];
 const cue=latestBattleCue(events);
 assert.equal(cue.type,'special');assert.equal(cue.mode,'g-tech');
 assert.deepEqual(cue.targets.map(x=>x.id),['A2','A3','A1']);
 assert.deepEqual(cue.targets.map(x=>x.kind),['damage','damage','heal']);
 assert.ok(cue.key.startsWith('special:'));
 assert.equal(latestBattleCue([...events,{type:'action',turn:7,actor:'B1'}]).key,'action:7');
 assert.throws(()=>latestBattleCue(null),/array/);
});
