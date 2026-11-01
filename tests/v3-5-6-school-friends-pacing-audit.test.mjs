import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';

// This is exactly the existing school FRIENDS Host battle options.
// No QA HP/Power/guard/weights or time acceleration is injected.
// The human players are IDLE: do not mistake this for an active match with
// manual Soultimates, rotation, Purify and Zero Poke.
const friendsOptions=Object.freeze({
 playtestSoulTuning:true,enableLoafing:true,
 researchSpecialEffects:true,researchDamageModel:true,
 researchStatInspirits:true
});
const SEEDS=[12,41,53,89,144,233,377,610];
const ACTION_CAP=240;
const SCHOOL_CLOCK_MS=2600;

function audit(seed){
 const match=createMatchProtocol({battleOptions:{seed,...friendsOptions}});
 const actions={attack:0,technique:0,heal:0,guard:0,inspirit:0,loaf:0,other:0};
 let maxKOs=0,damage=0,healing=0,turns=0,stall=0,stableHpRun=0,maxStableHpRun=0;
 let previous=match.snapshot();
 for(let i=0;i<ACTION_CAP&&previous.game.winner===null;i++){
  const step=match.advanceAuto();
  assert.equal(step.ok,true,'Host must not throw or reject: seed '+seed);
  if(step.result.type==='awaiting_rotation'){
   // A player can legally rotate a stuck circle; record the needed input
   // instead of pretending a non-input test has proved an actual softlock.
   stall++;break;
  }
  assert.equal(step.result.type,'action','unexpected non-action before winner');
  const kind=step.result.kind;
  actions[Object.hasOwn(actions,kind)?kind:'other']++;
  if(kind==='heal')healing+=Math.max(0,step.result.amount??0);
  else damage+=Math.max(0,step.result.amount??0);
  const now=match.snapshot();
  assert.equal(now.revision,previous.revision+1);
  assert.ok(now.game.clock.turn>=previous.game.clock.turn);
  assert.ok(now.game.squads.flat().every(u=>
   Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp));
  assert.ok(now.game.soul.teams.flat().every(u=>
   Number.isFinite(u.soul)&&u.soul>=0&&u.soul<=u.capacity));
  const beforeHp=previous.game.squads.flat().map(u=>u.hp).join(',');
  const afterHp=now.game.squads.flat().map(u=>u.hp).join(',');
  stableHpRun=beforeHp===afterHp?stableHpRun+1:0;
  maxStableHpRun=Math.max(maxStableHpRun,stableHpRun);
  maxKOs=Math.max(maxKOs,now.game.squads.flat().filter(u=>u.hp===0).length);
  turns++;previous=now;
 }
 for(const seat of [0,1]){
  const view=makeStageView(previous,seat);
  assert.equal(view.revision,previous.revision);
  assert.equal(view.winner,previous.game.winner);
  assert.equal(view.teams[seat].members.length,6);
  assert.equal(view.teams[1-seat].members.length,6);
 }
 return {seed,turns,winner:previous.game.winner,
  completed:previous.game.winner!==null,
  requiresHumanRotate:stall>0,maxKOs,actions,
  damage,healing,maxNoHpChangeRun:maxStableHpRun,
  clockMinutesIfUnpaused:Number((turns*SCHOOL_CLOCK_MS/60000).toFixed(2)),
  // No chargeStart / wheel / Purify input was dispatched in this audit.
  playerInterventions:0};
}

test('V3-5-6 school Friends actual rental pace across eight seeded idle matches is measured without gameplay mutation',()=>{
 const rows=SEEDS.map(audit);
 for(const row of rows)console.log('V3-5-6-SCHOOL-PACE '+JSON.stringify(row));
 const ended=rows.filter(r=>r.completed);
 const sortedTurns=rows.map(r=>r.turns).sort((a,b)=>a-b);
 const summary={
  seeds:rows.length,actionCap:ACTION_CAP,
  finishesBeforeCap:ended.length,
  stillAlive:rows.filter(r=>!r.completed).length,
  humanRotateNeeded:rows.filter(r=>r.requiresHumanRotate).length,
  turnsMedianUpper:sortedTurns[Math.floor(sortedTurns.length/2)],
  observedLongestHpQuietRun:Math.max(...rows.map(r=>r.maxNoHpChangeRun)),
  attackActions:rows.reduce((s,r)=>s+r.actions.attack,0),
  techniqueActions:rows.reduce((s,r)=>s+r.actions.technique,0),
  healActions:rows.reduce((s,r)=>s+r.actions.heal,0),
  guardActions:rows.reduce((s,r)=>s+r.actions.guard,0),
  inspiritActions:rows.reduce((s,r)=>s+r.actions.inspirit,0),
  loafActions:rows.reduce((s,r)=>s+r.actions.loaf,0),
  notes:'idle playtest, 2600ms wall-time every Host action; no original game parity'
 };
 console.log('V3-5-6-SCHOOL-SUMMARY '+JSON.stringify(summary));
 assert.equal(rows.length,SEEDS.length);
 assert.ok(rows.every(r=>r.turns>0));
});
