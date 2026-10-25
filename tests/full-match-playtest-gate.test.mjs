import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';

/**
 * This is a fast full-match regression, NOT a statement about original stats.
 * Both seats use the actual canonical authoritative match protocol and the
 * actual Google Sites playtest Soul configuration. Only combat stats/weights
 * are controlled to guarantee all six KOs in reasonable CI time.
 */
function squad(strong){
 return RENTAL_SQUAD.map(unit=>({
  ...unit,
  maxHp:strong?420:85,
  strength:strong?570:10,
  spirit:strong?310:10,
  defense:strong?180:25,
  attackPower:strong?175:18,
  techniquePower:strong?100:10,
  technique:'damage',
  weights:[100,0,0,0],
  attackAccuracy:4
 }));
}
function matchForWinner(winningSide,{rotateLoser=false}={}){
 const teams=winningSide===0?[squad(true),squad(false)]:[squad(false),squad(true)];
 const m=createMatchProtocol({
  battleOptions:{seed:20261026,playtestSoulTuning:true,rotationCooldownMs:3000,teams},
  hostNowMs:()=>10000
 });
 if(rotateLoser){
  const receipt=m.dispatch(1-winningSide,1,{type:'rotate',direction:1});
  assert.equal(receipt.ok,true,'a player manually rotated right before combat');
 }
 const start=m.snapshot();
 assert.equal(start.game.winner,null);
 let autoSteps=0,autoRotations=0,knockouts=0;
 let last=null;
 for(let i=0;i<200;i++){
  const current=m.snapshot();
  if(current.game.winner!==null)break;
  const next=m.advanceAuto();
  assert.equal(next.ok,true,'host must never throw while progressing a full match');
  if(next.result.type==='awaiting_rotation'){
   assert.fail('KO/reserve progress stuck awaiting rotation at action '+i+
    ' fronts='+JSON.stringify(next.result.fronts));
  }
  assert.equal(next.result.type,'action','each combat clock pulse must progress');
  autoSteps++;
  if(next.result.targetHp===0)knockouts++;
  const after=m.snapshot();
  for(let side=0;side<2;side++){
   const team=after.game.squads[side];
   assert.equal(team.length,6);
   for(const u of team)assert.ok(u.hp>=0&&u.hp<=u.maxHp);
   for(const u of after.game.soul.teams[side])assert.ok(u.soul>=0&&u.soul<=u.capacity);
  }
  if(after.game.clock.teams.some((t,j)=>
   t.offset!==current.game.clock.teams[j].offset))autoRotations++;
  last=next.result;
 }
 const finish=m.snapshot();
 assert.equal(finish.game.winner,winningSide,
   'one of the 2 teams must be eliminated, not pause indefinitely');
 assert.equal(finish.game.squads[1-winningSide].filter(u=>u.hp===0).length,6);
 assert.ok(finish.game.squads[winningSide].some(u=>u.hp>0));
 assert.ok(autoRotations>0,'living reserve substitutions must occur');
 assert.ok(knockouts>=6,'enemy six members were actually KO by actions');
 for(let side=0;side<2;side++){
  const view=makeStageView(finish,side);
  assert.equal(view.winner,winningSide,'both viewers must see identical winner');
  assert.equal(view.teams[side].members.length,6);
 }
 const done=m.advanceAuto();
 assert.equal(done.ok,true);
 assert.equal(done.result.type,'finished');
 assert.equal(done.result.winner,winningSide);
 assert.equal(m.snapshot().game.winner,winningSide);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true,
  'the whole duel must replay with identical winners and state');
 return {autoSteps,autoRotations,last};
}

test('full 6v6 match auto-rotates every KO frontline and reports team A winner',()=>{
 const r=matchForWinner(0);
 assert.ok(r.autoSteps>6);
});

test('full 6v6 match works symmetrically when team B wins',()=>{
 const r=matchForWinner(1);
 assert.ok(r.autoSteps>6);
});

test('manual wheel input with a real host time cannot strand KO reserves forever',()=>{
 const r=matchForWinner(0,{rotateLoser:true});
 assert.ok(r.autoRotations>0);
});
