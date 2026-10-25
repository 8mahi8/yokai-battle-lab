import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {validateRentalSkill,SKILL_TRIAL,skillMomentumStage,
  critSkillBonus,careOnOwnerTurn} from '../engine/skill-effects.mjs';

const squad=()=>RENTAL_SQUAD.map(u=>({...u}));

test('source-audited skill labels and numerical boundaries are separate',()=>{
 assert.equal(validateRentalSkill('momentum'),'momentum');
 assert.equal(validateRentalSkill('care'),'care');
 assert.equal(validateRentalSkill('sharpCrit'),'sharpCrit');
 assert.equal(validateRentalSkill(undefined),null);
 assert.throws(()=>validateRentalSkill('instant-special'),/skill/);
 assert.equal(SKILL_TRIAL.momentumOwnerTurns,5);
 assert.equal(SKILL_TRIAL.momentumStages,2);
 assert.equal(SKILL_TRIAL.careMaxHpFraction,.02);
 assert.equal(critSkillBonus('sharpCrit'),SKILL_TRIAL.sharpCritBonusUnits);
 assert.equal(critSkillBonus(null),0);
 assert.equal(skillMomentumStage({remainingTurns:1}),2);
 assert.equal(skillMomentumStage(null),0);
 assert.throws(()=>skillMomentumStage({remainingTurns:0}),/duration/);
});

test('Care: six-medal circular neighbors recover 2% after THEIR actions, even if provider is on bench',()=>{
 const units=Array.from({length:6},(_,i)=>({
  id:'A'+(i+1),hp:100,maxHp:200,skill:i===4?'care':null
 }));
 const fourth=careOnOwnerTurn({actor:units[3],team:units});
 assert.deepEqual(fourth,[{actor:'A5',targetId:'A4',skill:'care',amount:4}]);
 assert.deepEqual(careOnOwnerTurn({actor:units[2],team:units}),[]);
 assert.deepEqual(careOnOwnerTurn({actor:units[5],team:units}),
  [{actor:'A5',targetId:'A6',skill:'care',amount:4}]);
 units[4].hp=0;
 assert.deepEqual(careOnOwnerTurn({actor:units[3],team:units}),[]);
 units[4].hp=100;
 units[3].hp=199;
 assert.equal(careOnOwnerTurn({actor:units[3],team:units})[0].amount,1);
 units[3].hp=0;
 assert.deepEqual(careOnOwnerTurn({actor:units[3],team:units}),[]);
});

test('canonical AI knockout activates Momentum and refreshes for five future actor turns',()=>{
 const teamA=squad().map((u,i)=>({...u,
  speed:i===0?800:1,weights:[100,0,0,0],
  ...(i===0?{strength:800,attackPower:800}:{}),
  skill:i===0?'momentum':null}));
 const teamB=squad().map(u=>({...u,maxHp:60,speed:1,weights:[100,0,0,0],skill:null}));
 const game=createCombat({teams:[teamA,teamB],enableRentalSkills:true,
  researchDamageModel:true,seed:20261026});
 let found=false;
 for(let i=0;i<60&&!found;i++){
  const move=game.step();
  assert.equal(move.type,'action');
  found=game.snapshot().events.some(e=>e.type==='skill'&&e.skill==='momentum'&&e.kind==='発動');
 }
 assert.equal(found,true,'real attack KO must automatically trigger passive skill');
 const state=game.snapshot();
 assert.equal(state.skillBoosts.A1.remainingTurns,5,
  'KO action does not consume one of the five NEXT turns');
 assert.equal(state.squads[0][0].knockouts>0,true);
 assert.equal(state.squads[0][0].skill,'momentum');
 // A timed status must be included in both viewers' canonical UI.
 const match=createMatchProtocol({battleOptions:{seed:20261026,playtestSoulTuning:true}});
 const view=makeStageView(match.snapshot(),0);
 assert.equal(view.teams[0].members[0].skill,'momentum');
 assert.equal(view.teams[0].members[3].skill,'sharpCrit');
 assert.equal(view.teams[0].members[4].skill,'care');
});

test('canonical original-rental critical skill changes real research hit-roll bonus',()=>{
 const teamA=squad().map((u,i)=>({...u,
  speed:i===3?850:2,weights:[100,0,0,0]}));
 const teamB=squad().map(u=>({...u,speed:1}));
 const game=createCombat({teams:[teamA,teamB],enableRentalSkills:true,
  researchDamageModel:true,seed:8192});
 assert.equal(game.rotate(0,1).ok,true); // A4 enters front
 let action;
 for(let i=0;i<50;i++){
  const move=game.step();
  if(move.actor==='A4'&&move.criticalResearch){action=move;break;}
 }
 assert.ok(action,'skill holder must complete real attack');
 assert.equal(action.criticalResearch.units,1+SKILL_TRIAL.sharpCritBonusUnits);
 assert.equal(action.actor,'A4');
});

test('canonical match with skills still replays deterministically from the authoritative journal',()=>{
 const m=createMatchProtocol({battleOptions:{playtestSoulTuning:true,seed:20261026}});
 assert.equal(m.snapshot().game.squads[0][0].skill,'momentum');
 assert.equal(m.snapshot().game.squads[1][4].skill,'care');
 for(let i=0;i<45;i++){
  const r=m.advanceAuto();
  assert.equal(r.ok,true);
  if(m.snapshot().game.winner!==null)break;
 }
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
