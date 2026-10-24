import assert from 'node:assert/strict';
import test from 'node:test';
import {auditSoulGaugeChange} from '../engine/phase21d-soul-observation.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';

const audit=(changes={})=>auditSoulGaugeChange({
  gaugeOwnerId:'A1',actorId:'A1',actionKind:'guard',
  before:10,after:15,capacity:100,
  noOtherSoulSourcesConfirmed:true,...changes
});
const soul=(match,id)=>match.snapshot().game.soul.teams.flat().find(x=>x.id===id).soul;
const forced=(kind)=>RENTAL_SQUAD.map(u=>({
  ...u,weights:kind==='guard'?[0,0,0,100]:[100,0,0,0]
}));
test('21D +5 nonattack has narrow research-consistent result, not confirmed original parity',()=>{
  const result=audit();
  assert.equal(result.status,'consistent-with-research');
  assert.equal(result.expectedAfter,15);
  assert.equal(result.observedDelta,5);
  assert.equal(result.confidence,'community-experiment-not-ROM');
  assert.match(result.limitations.join(' '),/not whole-battle/);
});
test('21D Soul meter saturation is handled without false +5 expectation',()=>{
  assert.equal(audit({before:98,after:100}).expectedAfter,100);
  assert.equal(audit({before:100,after:100}).status,'consistent-with-research');
  assert.equal(audit({before:99,after:99}).status,'inconsistent-with-research');
});
test('21D contradictory isolated nonattack delta is flagged as hypothesis mismatch',()=>{
  const result=audit({before:20,after:21});
  assert.equal(result.status,'inconsistent-with-research');
  assert.equal(result.expectedAfter,25);
});
test('21D all four documented nonattack branches can be compared',()=>{
  for(const kind of ['guard','heal','inspirit','loaf'])
    assert.equal(audit({actionKind:kind}).status,'consistent-with-research');
});
test('21D attacks and damaging techniques never get arbitrary +5 or zero parity claims',()=>{
  for(const kind of ['attack','technique','poke','switch','soultimate','other']){
    const result=audit({actionKind:kind,before:0,after:0});
    assert.equal(result.status,'indeterminate');
    assert.equal(result.expectedAfter,null);
  }
});
test('21D other units and mixed-source intervals remain indeterminate',()=>{
  assert.equal(audit({gaugeOwnerId:'A2'}).status,'indeterminate');
  const uncertain=audit({noOtherSoulSourcesConfirmed:false});
  assert.equal(uncertain.status,'indeterminate');
  assert.equal(uncertain.expectedAfter,null);
});
test('21D invalid gauge inputs and unrecognized action labels fail closed',()=>{
  for(const props of [
    {gaugeOwnerId:'X1'},{actorId:'B7'},{actionKind:'special-move'},
    {before:-1},{after:101},{before:101},{capacity:0},
    {after:13.5},{before:NaN},{noOtherSoulSourcesConfirmed:1}
  ])assert.throws(()=>audit(props));
});
test('21D original match host guard event exactly follows existing +5 actor-only fixture',()=>{
  const g=createMatchProtocol({battleOptions:{seed:21,teams:[forced('guard'),forced('guard')]}});
  const before=g.snapshot().game.soul.teams.flat().map(x=>({id:x.id,soul:x.soul}));
  const ev=g.advanceAuto();
  assert.equal(ev.ok,true);
  assert.equal(ev.result.kind,'guard');
  const after=soul(g,ev.result.actor);
  const check=audit({actorId:ev.result.actor,gaugeOwnerId:ev.result.actor,
    actionKind:ev.result.kind,before:0,after,capacity:100});
  assert.equal(check.status,'consistent-with-research');
  for(const x of before)if(x.id!==ev.result.actor)assert.equal(soul(g,x.id),x.soul);
  assert.equal(replayMatchJournal(g.exportJournal()).ok,true);
});
test('21D actual online-host attack 0 Soul remains explicitly NOT original-verified',()=>{
  const g=createMatchProtocol({battleOptions:{seed:25,teams:[forced('attack'),forced('attack')]}});
  const ev=g.advanceAuto();
  assert.equal(ev.ok,true);
  assert.equal(ev.result.kind,'attack');
  const result=audit({gaugeOwnerId:ev.result.actor,actorId:ev.result.actor,
    actionKind:'attack',before:0,after:soul(g,ev.result.actor),capacity:100});
  assert.equal(result.status,'indeterminate');
  assert.equal(result.expectedAfter,null);
  assert.equal(replayMatchJournal(g.exportJournal()).ok,true);
});
