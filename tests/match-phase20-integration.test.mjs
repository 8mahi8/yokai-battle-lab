import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
import {calculateOneHit} from '../engine/damage-model.mjs';

const attack=RENTAL_SQUAD.map((u,i)=>({...u,
 weights:[100,0,0,0],attackHits:i===0?3:1}));
const guard=RENTAL_SQUAD.map(u=>({...u,weights:[0,0,0,100]}));

function firstMatching(match,predicate,limit=45){
 for(let i=0;i<limit;i++){
  const result=match.advanceAuto();
  assert.equal(result.ok,true,JSON.stringify(result));
  if(predicate(result.result))return result.result;
 }
 assert.fail('host did not produce the required action in '+limit+' turns');
}
test('Phase20 initial online host enables previously researched damage + multi-hit; holds unverified effects OFF',()=>{
 const m=createMatchProtocol();
 assert.deepEqual(Object.fromEntries(Object.entries(m.exportJournal().initialOptions)
  .filter(([key])=>key.startsWith('research'))),{
  researchSoulRecoveryMode:'owner-nonattack',
  researchDamageModel:true,
  researchMultiHit:true,
  researchSpecialEffects:true
 });
 const action=firstMatching(m,x=>x.type==='action'&&['attack','technique'].includes(x.kind)&&
  x.hit);
 assert.equal(action.multiHit?.model,'research-per-hit');
 assert.equal(action.multiHit?.planned,1);
 assert.equal(action.multiHit?.totalDamage,action.amount);
 assert.equal(action.multiHit?.hits.reduce((n,h)=>n+h.amount,0),action.amount);
 assert.ok(action.damageResearch,'authoritative host attack must use sourced 1-hit calculator');
 assert.equal(action.damageResearch.confidence,'yw2-wiki-formula-research');
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});

test('host three-hit attack tracks separate HP/crit/accuracy/interruption outcomes against pinned enemy',()=>{
 const m=createMatchProtocol({battleOptions:{seed:11,teams:[attack,guard]}});
 const accepted=m.dispatch(0,1,{type:'pin',targetId:'B1'});
 assert.equal(accepted.accepted,true);
 const initial=m.snapshot().game.squads[1][0].hp;
 const action=firstMatching(m,x=>x.type==='action'&&x.actor==='A1');
 assert.equal(action.kind,'attack');
 assert.equal(action.target,'B1');
 assert.equal(action.multiHit.planned,3);
 assert.ok(action.multiHit.attempted>=1&&action.multiHit.attempted<=3);
 assert.equal(action.multiHit.totalDamage,action.amount);
 assert.equal(action.multiHit.hits.reduce((sum,h)=>sum+h.amount,0),action.amount);
 assert.equal(action.multiHit.landed,action.multiHit.hits.filter(h=>h.hit).length);
 assert.equal(action.multiHit.criticalHits,action.multiHit.hits.filter(h=>h.critical).length);
 const after=m.snapshot().game.squads[1][0].hp;
 assert.equal(initial-after,action.amount);
 assert.ok(action.multiHit.hits.every((hit,i,arr)=>
  i===0||hit.targetHpAfter<=arr[i-1].targetHpAfter));
 if(action.hit){
  assert.equal(action.damageResearch.hits,3);
  const sample=calculateOneHit({kind:'attack',
   power:attack[0].attackPower,strength:attack[0].strength,
   defense:guard[0].defense,hits:3,critical:false});
  assert.ok(sample.amount>=1);
 }
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
 const before=m.snapshot();
 const retransmitted=m.dispatch(0,1,{type:'pin',targetId:'B1'});
 assert.equal(retransmitted.duplicate,true);
 assert.deepEqual(m.snapshot(),before);
});

test('deliberate protocol overrides still permit legacy damage model and reject dependent flags',()=>{
 const legacy=createMatchProtocol({battleOptions:{seed:11,
  researchDamageModel:false,researchMultiHit:false}});
 const a=firstMatching(legacy,x=>x.type==='action'&&['attack','technique'].includes(x.kind));
 assert.equal(a.multiHit,undefined);
 assert.equal(a.damageResearch,undefined);
 assert.equal(replayMatchJournal(legacy.exportJournal()).ok,true);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  researchDamageModel:false,researchMultiHit:true
 }}),/requires researchDamageModel/);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  researchDamageModel:false,researchTurnInspirits:true
 }}),/requires researchDamageModel/);
});
