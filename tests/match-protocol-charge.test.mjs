import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
const guards=RENTAL_SQUAD.map(m=>({...m,weights:[0,0,0,100]}));
const create=seed=>createMatchProtocol({battleOptions:{seed,teams:[guards,guards]}});
function untilSoul(match,id,limit=450){
 for(let n=0;n<limit;n++){
  const meter=match.snapshot().game.soul.teams.flat().find(m=>m.id===id);
  if(meter.soul===meter.capacity)return;
  const res=match.advanceAuto();
  assert.equal(res.ok,true);
 }
 assert.fail('actor never filled Soul through own nonattack actions');
}
function solve(match,side,startSeq){
 let seq=startSeq;
 function send(input){
  const r=match.dispatch(side,++seq,{type:'chargeInput',gesture:input});
  assert.equal(r.accepted,true);
  assert.equal(r.ok,true,JSON.stringify(r.result));
  return r;
 }
 const get=()=>match.snapshot().game.guided[side]?.challenge;
 const beginning=get(),kind=beginning.kind;
 let result;
 if(kind==='tap'){
  for(let i=0;i<8&&get();i++){
   const [x,y]=get().target;
   result=send({type:'tap',x,y});
  }
 }else if(kind==='spin'){
  result=send({type:'down',x:.8,y:.5});
  for(let i=1;i<126&&get();i++){
   const a=Math.PI*2*i/50;
   result=send({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
  }
 }else if(kind==='trace'){
  for(let i=0;i<4&&get();i++){
   const path=get().path;
   result=send({type:'down',x:path[0][0],y:path[0][1]});
   for(const [x,y] of path.slice(1))if(get())result=send({type:'move',x,y});
  }
 }else if(kind==='align'){
  for(let i=0;i<4&&get();i++){
   const n=get().clockNumber;
   const angle=-Math.PI/2+(n%12)*Math.PI*2/12;
   result=send({type:'down',x:.5,y:.18});
   result=send({type:'move',x:.5+.32*Math.cos(angle),y:.5+.32*Math.sin(angle)});
   result=send({type:'up'});
  }
 }else assert.fail('unknown kind '+kind);
 assert.equal(get(),null,'guided charge trial should close on success');
 assert.equal(result.result.completed,true);
 return {seq,kind,result};
}
test('host defaults to +5 owner Soul after nonattack even without explicit research option',()=>{
 const match=create(22);
 const r=match.advanceAuto();
 assert.equal(r.result.kind,'guard');
 const unit=match.snapshot().game.soul.teams.flat().find(x=>x.id===r.result.actor);
 assert.equal(unit.soul,5);
 const none=createMatchProtocol({battleOptions:{seed:22,teams:[guards,guards],
  researchSoulRecoveryMode:'none'}});
 const r2=none.advanceAuto();
 const found=none.snapshot().game.soul.teams.flat().find(x=>x.id===r2.result.actor);
 assert.equal(found.soul,0);
});
test('touch gesture completion via sequenced client commands consumes exactly one full Soul meter',()=>{
 for(const seed of [4,15,21,33]){
  const match=create(seed);
  untilSoul(match,'A1');
  const started=match.dispatch(0,1,{type:'chargeStart',id:'A1'});
  assert.equal(started.ok,true);
  const {seq,kind,result}=solve(match,0,1);
  assert.ok(['spin','tap','trace','align'].includes(kind));
  assert.equal(result.result.special.ok,true);
  assert.equal(match.snapshot().game.soul.teams[0][0].soul,0);
  assert.equal(match.snapshot().clientSequences[0],seq);
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
 }
});
test('retransmitted touch packet does not count as a second progress gesture',()=>{
 const match=create(9);
 untilSoul(match,'A1');
 const start=match.dispatch(0,1,{type:'chargeStart',id:'A1'});
 assert.equal(start.ok,true);
 const trial=match.snapshot().game.guided[0].challenge;
 let gesture;
 if(trial.kind==='tap')gesture={type:'tap',x:trial.target[0],y:trial.target[1]};
 else if(trial.kind==='trace')gesture={type:'down',x:trial.path[0][0],y:trial.path[0][1]};
 else if(trial.kind==='align')gesture={type:'down',x:.5,y:.18};
 else gesture={type:'down',x:.8,y:.5};
 const a=match.dispatch(0,2,{type:'chargeInput',gesture});
 const before=match.snapshot();
 const duplicate=match.dispatch(0,2,{type:'chargeInput',gesture});
 assert.equal(a.accepted,true);
 assert.equal(duplicate.duplicate,true);
 assert.deepEqual(match.snapshot(),before);
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});
