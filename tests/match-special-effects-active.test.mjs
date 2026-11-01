import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const guards=RENTAL_SQUAD.map(u=>({...u,weights:[0,0,0,100]}));
function fullSoul(match,id,limit=600){
 for(let t=0;t<limit;t++){
  const soul=match.snapshot().game.soul.teams.flat().find(x=>x.id===id);
  if(soul.soul>=soul.capacity)return;
  assert.equal(match.advanceAuto().ok,true);
 }
 assert.fail('Soul never naturally filled through the owner nonattack research model');
}
function completeCharge(match,side,startingSeq){
 let seq=startingSeq;
 let latest=null;
 const get=()=>match.snapshot().game.guided[side]?.challenge;
 function send(input){
  const res=match.dispatch(side,++seq,{type:'chargeInput',gesture:input});
  assert.equal(res.accepted,true,JSON.stringify(res));
  assert.equal(res.ok,true,JSON.stringify(res.result));
  latest=res;return res;
 }
 const kind=get().kind;
 if(kind==='tap'){
  for(let i=0;i<8&&get();i++){
   const [x,y]=get().target;send({type:'tap',x,y});
  }
 }else if(kind==='spin'){
  send({type:'down',x:.8,y:.5});
  for(let i=1;i<=130&&get();i++){
   const a=Math.PI*2*i/50;
   send({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
  }
 }else if(kind==='trace'){
  for(let n=0;n<4&&get();n++){
   const path=get().path;send({type:'down',x:path[0][0],y:path[0][1]});
   for(const [x,y] of path.slice(1))if(get())send({type:'move',x,y});
  }
 }else if(kind==='align'){
  for(let n=0;n<4&&get();n++){
   const target=get(),angle=-Math.PI/2+(target.clockNumber%12)*Math.PI*2/12;
   send({type:'down',x:.5,y:.18});
   send({type:'move',x:.5+.32*Math.cos(angle),y:.5+.32*Math.sin(angle)});
   send({type:'up'});
  }
 }else assert.fail('unknown guided charge trial '+kind);
 assert.equal(get(),undefined,'a successful minigame must be finished');
 assert.equal(latest?.result?.completed,true);
 assert.equal(latest?.result?.special?.ok,true);
 return latest.result.special;
}

test('default host Soultimate resolves real enemy HP and emits deterministic research-tagged events',()=>{
 const match=createMatchProtocol({battleOptions:{seed:22,teams:[guards,guards]}});
 fullSoul(match,'A1');
 const before=match.snapshot();
 const started=match.dispatch(0,1,{type:'chargeStart',id:'A1'});
 assert.equal(started.ok,true);
 const outcome=completeCharge(match,0,1);
 assert.equal(outcome.effectStatus,'research-fixture');
 assert.equal(outcome.kind,'soultimate');
 assert.equal(outcome.impacts.length,3);
 assert.deepEqual(outcome.impacts.map(x=>x.targetId),before.game.clock.teams[1].frontIds);
 const after=match.snapshot();
 assert.deepEqual(after.game.squads[1].slice(3).map(u=>u.hp),
  before.game.squads[1].slice(3).map(u=>u.hp),
  'defensive reserve remains untouched by a front-field attack');
 for(let i=0;i<3;i++)assert.ok(after.game.squads[1][i].hp<before.game.squads[1][i].hp);
 assert.equal(after.game.soul.teams[0][0].soul,0,'exactly one caster meter spent');
 const specials=after.game.events.filter(e=>e.type==='special');
 assert.equal(specials.length,1);
 assert.equal(specials[0].model,'research-fixture','never call rental move values original-authentic');
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true,
  'changed default must still replay identically from a host journal');
});

test('explicitly disabling unverified fixture preserves no-effect research control',()=>{
 const match=createMatchProtocol({battleOptions:{seed:23,teams:[guards,guards],
  researchSpecialEffects:false}});
 fullSoul(match,'A1');
 const before=match.snapshot().game.squads[1].map(x=>x.hp);
 assert.equal(match.dispatch(0,1,{type:'chargeStart',id:'A1'}).ok,true);
 const resolved=completeCharge(match,0,1);
 assert.equal(resolved.effectStatus,'unimplemented');
 assert.deepEqual(match.snapshot().game.squads[1].map(x=>x.hp),before);
});

test('G technique has three Soul consumers, doubles configured move power and hits once',()=>{
 const game=createCombat({seed:42,researchSpecialEffects:true});
 game.setWatchMode(0,'zero');
 for(const id of ['A6','A1','A2'])game.giveSoul(id,100);
 const before=game.snapshot();
 const started=game.prepareSoultimate(0,'A1');
 assert.deepEqual(started.consumers,['A6','A1','A2']);
 const complete=game.resolveSoultimate(0,started.token,true);
 assert.equal(complete.ok,true);
 assert.equal(complete.kind,'g-tech');
 assert.equal(complete.effectStatus,'research-fixture');
 assert.equal(complete.impacts.length,3);
 assert.equal(game.snapshot().events.filter(x=>x.type==='special').length,1);
 for(const id of ['A6','A1','A2']){
  const index=Number(id.slice(1))-1;
  assert.equal(game.snapshot().soul.teams[0][index].soul,0);
 }
 assert.equal(game.snapshot().clock.teams[0].benchIds.includes('A6'),true);
 assert.deepEqual(game.snapshot().squads[1].slice(3).map(x=>x.hp),
  before.squads[1].slice(3).map(x=>x.hp));
});
