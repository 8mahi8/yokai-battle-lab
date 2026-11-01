import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const everyone=weights=>RENTAL_SQUAD.map(u=>({...u,weights:[...weights]}));
const soul=(game,id)=>game.snapshot().soul.teams.flat().find(u=>u.id===id).soul;
test('YW2 research mode non-attack +5 applies to actor only after own turn',()=>{
 const party=everyone([0,0,0,100]);
 const game=createCombat({teams:[party,party],researchSoulRecoveryMode:'owner-nonattack'});
 const ev=game.step();
 assert.equal(ev.kind,'guard');
 const all=game.snapshot().soul.teams.flat();
 assert.equal(soul(game,ev.actor),5);
 assert.equal(all.filter(m=>m.soul>0).length,1);
});
test('unknown normal-attack Soul gain remains zero, never invented',()=>{
 const party=everyone([100,0,0,0]);
 const game=createCombat({teams:[party,party],researchSoulRecoveryMode:'owner-nonattack'});
 game.simulate(24);
 assert.ok(game.snapshot().soul.teams.flat().every(u=>u.soul===0));
});
test('Soul can accrue across both sides on each owner guard and never exceed capacity',()=>{
 const party=everyone([0,0,0,100]);
 const game=createCombat({teams:[party,party],researchSoulRecoveryMode:'owner-nonattack'});
 const events=game.simulate(400);
 const counters=new Map();
 for(const ev of events)counters.set(ev.actor,(counters.get(ev.actor)||0)+1);
 for(const unit of game.snapshot().soul.teams.flat())
  assert.equal(unit.soul,Math.min(unit.capacity,5*(counters.get(unit.id)||0)));
});
test('global toy regeneration and own-turn study mode cannot both be enabled',()=>{
 assert.throws(()=>createCombat({researchSoulGainPerAction:3,researchSoulRecoveryMode:'owner-nonattack'}));
 assert.throws(()=>createCombat({researchSoulRecoveryMode:'source-verified'}));
});
