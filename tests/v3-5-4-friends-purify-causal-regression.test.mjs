import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {makeStageView} from '../ui/match-stage.mjs';

// Identical local-only deterministic roster used by the real Firebase
// Chromium E2E. Negative status comes ONLY from a canonical Host action;
// no direct applyInspirit, remote mutation, forced result or snapshot edit.
const enemy=RENTAL_SQUAD.map(unit=>({
 ...unit,inspirit:'sleep',weights:[0,0,100,0]
}));
const guest=RENTAL_SQUAD.map(unit=>({
 ...unit,weights:[0,0,0,100]
}));
const host=()=>createMatchProtocol({battleOptions:{
 seed:12,teams:[enemy,guest],rotationCooldownMs:0,
 researchSpecialEffects:true,researchDamageModel:true,
 researchStatInspirits:true
}});

test('V3-5-4 genuine Host enemy Inspirit -> Guest rotate to bench -> 5 touch ACK -> negative status removed',()=>{
 const match=host();
 const pin=match.dispatch(0,1,{type:'pin',targetId:'B1'});
 assert.equal(pin.ok,true);
 let turns=0;
 const negative=()=>match.snapshot().game.inspirits.B1
  .some(x=>x.sign==='negative');
 while(!negative()&&turns<35){
  const step=match.advanceAuto();
  assert.equal(step.ok,true,'canonical enemy Inspirit must proceed');
  turns++;
 }
 assert.equal(negative(),true,'no real negative status after autonomous actions');
 const inflicting=match.snapshot().game.events.filter(e=>
  e.type==='action'&&e.kind==='inspirit'&&e.target==='B1'&&e.hit);
 assert.ok(inflicting.length>0,'B1 status must be explained by a real enemy action');
 assert.equal(makeStageView(match.snapshot(),1).teams[1].members[0].negative,true);
 assert.equal(match.dispatch(1,1,{type:'purifyStart',id:'B1'}).result.reason,
  'must_be_on_bench','frontline cannot purify');
 const moved=match.dispatch(1,2,{type:'rotate',direction:1});
 assert.equal(moved.ok,true);
 assert.ok(match.snapshot().game.clock.teams[1].benchIds.includes('B1'));
 const start=match.dispatch(1,3,{type:'purifyStart',id:'B1'});
 assert.equal(start.ok,true);
 const trial=match.snapshot().game.purification[1].challenge;
 assert.equal(trial.kind,'pop');
 assert.equal(trial.total,5);
 assert.equal(negative(),true,'Purify start cannot clear any status');
 let finished=null;
 for(let i=0;i<trial.popPoints.length;i++){
  const [x,y]=trial.popPoints[i];
  const hit=match.dispatch(1,4+i,{type:'purifyInput',gesture:{type:'tap',x,y}});
  assert.equal(hit.ok,true);
  finished=hit.result;
  assert.equal(hit.result.completed,i===4);
  if(i<4){
   assert.equal(negative(),true,'partial touch cannot clear status');
   assert.ok(match.snapshot().game.purification[1]);
  }
 }
 assert.equal(finished.completed,true);
 assert.equal(negative(),false,'real guest purification must remove negative status');
 assert.equal(match.snapshot().game.purification[1],null);
 const event=match.snapshot().game.events.filter(e=>e.type==='purification');
 assert.equal(event.length,1);
 assert.equal(event[0].targetId,'B1');
 assert.equal(event[0].side,1);
 assert.equal(event[0].removed.some(x=>x.sign==='negative'),true);
 for(const seat of [0,1]){
  const view=makeStageView(match.snapshot(),seat);
  assert.equal(view.teams[1].members[0].negative,false);
  assert.equal(view.revision,match.snapshot().revision);
 }
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true,
  'all commands including Purify must replay with the same result');
});

test('V3-5-4 rejected premature and duplicate purification inputs cannot erase negative status',()=>{
 const match=host();
 assert.equal(match.dispatch(1,1,{type:'purifyStart',id:'B4'}).result.reason,
  'no_negative_inspirit');
 assert.equal(match.dispatch(1,2,{type:'purifyInput',gesture:{type:'tap',x:.5,y:.5}}).result.reason,
  'no_active_purification');
 const before=match.snapshot();
 const duplicate=match.dispatch(1,2,{type:'purifyInput',gesture:{type:'tap',x:.5,y:.5}});
 assert.equal(duplicate.duplicate,true);
 assert.deepEqual(match.snapshot(),before);
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});
