import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {createSeatMotionVisibility} from '../ui/seat-motion-visibility.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const protocol=()=>createMatchProtocol({battleOptions:{seed:212}});
const view=(game,side)=>makeStageView(game.snapshot(),side);
const fronts=(v,s)=>v.teams[s].frontIds;
const soul=(v,s,id)=>v.teams[s].members.find(m=>m.id===id).soul;

test('V3-4-20 actual MatchProtocol: A sees own/guest B rotation only after motion, host is immediate',()=>{
 const host=protocol(),seatA=createSeatMotionVisibility({seat:0}),
  seatB=createSeatMotionVisibility({seat:1});
 const a0=view(host,0),b0=view(host,1),hash0=host.snapshot().hash;
 seatA.begin({eventKey:'event:1',durationMs:1700,view:a0});
 seatB.begin({eventKey:'event:1',durationMs:1700,view:b0});
 const cmd=host.dispatch(1,1,{type:'rotate',direction:1});
 assert.equal(cmd.accepted,true);
 const a1=view(host,0),b1=view(host,1);
 assert.notEqual(host.snapshot().hash,hash0,'host advances independently');
 assert.deepEqual(fronts(a1,1),['B2','B3','B4']);
 assert.deepEqual(fronts(b1,1),['B2','B3','B4']);
 const visibleA=seatA.project(a1),visibleB=seatB.project(b1);
 assert.deepEqual(fronts(visibleA,1),['B1','B2','B3'],
  'A sees old B front during action motion');
 assert.deepEqual(fronts(visibleB,1),['B2','B3','B4'],
  'B sees own wheel rotation immediately');
 assert.deepEqual(fronts(visibleA,0),fronts(a1,0));
 assert.equal(visibleA.teams[1].members.find(m=>m.id==='B1').front,true);
 assert.equal(visibleA.teams[1].members.find(m=>m.id==='B4').front,false);
 assert.equal(visibleB.teams[1].members.find(m=>m.id==='B4').front,true);
 const before=JSON.stringify(host.snapshot());
 seatA.advance(1699);seatB.advance(1699);
 assert.equal(seatA.status().blocked,true);
 assert.deepEqual(fronts(seatA.project(a1),1),['B1','B2','B3']);
 seatA.advance(1700);seatB.advance(1700);
 assert.equal(seatA.status().active,false);
 assert.deepEqual(fronts(seatA.project(a1),1),['B2','B3','B4']);
 assert.equal(JSON.stringify(host.snapshot()),before,
  'presentation timing never changes host HP, RNG or event journal');
});
test('V3-4-20 opponent Soul/readiness/watch are held but owner UI and canonical HP/status remain current',()=>{
 const host=protocol(),stageView=view(host,0),m=createSeatMotionVisibility({seat:0});
 m.begin({eventKey:'event:25',durationMs:2400,view:stageView});
 const changed=copy(stageView);
 changed.teams[1].frontIds=['B3','B4','B5'];
 changed.teams[1].benchIds=['B6','B1','B2'];
 changed.teams[1].mode='zero';
 const before=changed.teams[1].members.find(u=>u.id==='B3');
 before.slot=0;before.front=true;before.soul=100;before.specialReady=true;
 before.hp=1;before.positive=true;
 const owner=changed.teams[0].members.find(u=>u.id==='A1');
 owner.soul=91;owner.specialReady=true;
 changed.winner=0;
 const raw=JSON.stringify(changed);
 const visible=m.project(changed);
 const hiddenUnit=visible.teams[1].members.find(u=>u.id==='B3');
 assert.equal(hiddenUnit.soul,stageView.teams[1].members[2].soul);
 assert.equal(hiddenUnit.specialReady,stageView.teams[1].members[2].specialReady);
 assert.equal(hiddenUnit.hp,1,'host HP does not become client-side fake HP');
 assert.equal(hiddenUnit.positive,true,'status changes never blocked by wheel');
 assert.equal(visible.teams[1].mode,'standard');
 assert.equal(visible.teams[0].members.find(u=>u.id==='A1').soul,91);
 assert.equal(visible.winner,0,'winner never delayed by a motion');
 assert.equal(JSON.stringify(changed),raw);
 m.finish();
 assert.equal(m.status().blocked,false);
 assert.deepEqual(m.project(changed),changed);
});
test('V3-4-20 during one long motion, multiple B rotations reveal ONLY latest authoritative B front',()=>{
 const host=protocol(),v=view(host,0),m=createSeatMotionVisibility({seat:0});
 m.begin({eventKey:'event:3',durationMs:1800,view:v});
 // Fixture for a multi-command coalesced Firebase update. The display
 // contract does NOT invent intermediate sequence, timestamps or HP.
 const changed=copy(v);
 changed.teams[1].frontIds=['B4','B5','B6'];
 changed.teams[1].benchIds=['B1','B2','B3'];
 for(let i=0;i<6;i++){
  changed.teams[1].members[i].front=i>=3;
  changed.teams[1].members[i].slot=(i-3+6)%6;
 }
 assert.deepEqual(fronts(m.project(changed),1),['B1','B2','B3']);
 m.advance(1800);
 assert.deepEqual(fronts(m.project(changed),1),['B4','B5','B6']);
});
test('V3-4-20 background/unmount reset is immediate, new action never replays old frozen opponent',()=>{
 const p=protocol(),v=view(p,0),m=createSeatMotionVisibility({seat:0});
 m.begin({eventKey:'event:51',durationMs:2000,view:v});
 m.advance(750);
 assert.equal(m.status().remainingMs,1250);
 m.finish();
 assert.equal(m.status().active,false);
 assert.deepEqual(m.project(v),v);
 m.begin({eventKey:'event:52',durationMs:400,view:v});
 assert.equal(m.status().elapsedMs,0);
 m.advance(1500); // Safari timer late: do NOT keep a stale opponent forever
 assert.equal(m.status().blocked,false);
 assert.equal(m.status().remainingMs,0);
});
test('V3-4-20 fail closed on invalid stage view/motion arguments without gameplay writes',()=>{
 const p=protocol(),v=view(p,1),m=createSeatMotionVisibility({seat:0});
 assert.throws(()=>createSeatMotionVisibility({seat:3}),RangeError);
 assert.throws(()=>m.begin({eventKey:'event:1',durationMs:1500,view:v}),/own-seat/);
 assert.throws(()=>m.begin({eventKey:'',durationMs:1500,view:view(p,0)}),/motion eventKey/);
 assert.throws(()=>m.begin({eventKey:'event:1',durationMs:1.5,view:view(p,0)}),/motion eventKey/);
 assert.throws(()=>m.advance(-1),RangeError);
 assert.equal(p.snapshot().revision,0);
 assert.equal(m.status().active,false);
});
