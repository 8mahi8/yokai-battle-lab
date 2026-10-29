import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkillHookPipeline} from '../engine/skill-hook-pipeline.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

function hookTrial(sourceYw2Momentum){
 const units=[0,1].map(side=>Array.from({length:6},(_,i)=>({
  id:(side===0?'A':'B')+(i+1),side,
  hp:100,maxHp:100,skill:side===0&&i===0?'momentum':null
 })));
 const byId=new Map(units.flat().map(x=>[x.id,x]));
 const boosts=new Map(),events=[];
 const hooks=createSkillHookPipeline({
  enabled:true,sourceYw2Momentum,skillOf:x=>x.skill,teams:units,
  boosts,byId,emit:e=>events.push(e),
  commitHeal:()=>{throw Error('unexpected heal');}
 });
 return {units,byId,boosts,events,hooks};
}
const clone=x=>JSON.parse(JSON.stringify(x));
function battleTeams(){
 const left=clone(RENTAL_SQUAD),right=clone(RENTAL_SQUAD);
 // KO 3 opposing members in one Soultimate. No character-specific
 // original HP/stats are implied by this fixture scenario.
 for(let i=0;i<3;i++)right[i].maxHp=1;
 left[0].skill='momentum';left[0].special={
  kind:'damage',scope:'front',power:100,damageKind:'attack'
 };
 return [left,right];
}
const options={
 seed:47,teams:battleTeams(),enableRentalSkills:true,
 researchDamageModel:true,researchMultiHit:true,
 researchSpecialEffects:true,researchYw2Momentum:true
};
test('V3-4-6 sourced Adrenaline triggers once for two KOs from ONE action',()=>{
 const t=hookTrial(true),a=t.units[0][0],b=t.units[1];
 t.hooks.beginResolution();
 t.hooks.afterEnemyKO(a,b[0]);
 t.hooks.afterEnemyKO(a,b[1]);
 t.hooks.afterEnemyKO(a,b[2]);
 assert.equal(t.events.length,1);
 assert.equal(t.events[0].targetId,'B1');
 assert.deepEqual(t.boosts.get('A1'),{remainingTurns:5});
});
test('V3-4-6 a later distinct action can refresh but cannot stack duration above 5',()=>{
 const t=hookTrial(true),a=t.units[0][0],b=t.units[1];
 t.hooks.beginResolution();t.hooks.afterEnemyKO(a,b[0]);
 const first=t.boosts.get(a.id);
 t.hooks.afterAnyAction(a,null); // new boost should not tick on same action
 assert.equal(t.boosts.get(a.id).remainingTurns,5);
 for(let i=0;i<2;i++)t.hooks.afterAnyAction(a,first);
 assert.equal(t.boosts.get(a.id).remainingTurns,3);
 t.hooks.beginResolution();t.hooks.afterEnemyKO(a,b[1]);
 assert.notStrictEqual(t.boosts.get(a.id),first);
 assert.equal(t.boosts.get(a.id).remainingTurns,5);
 t.hooks.afterAnyAction(a,first); // old object, no accidental decrement
 assert.equal(t.boosts.get(a.id).remainingTurns,5);
 assert.deepEqual(t.events.filter(e=>e.kind==='発動').map(x=>x.targetId),
  ['B1','B2']);
});
test('V3-4-6 source-mode KO does not grant Adrenaline to a fallen caster',()=>{
 const t=hookTrial(true),a=t.units[0][0];
 a.hp=0;t.hooks.beginResolution();t.hooks.afterEnemyKO(a,t.units[1][0]);
 assert.equal(t.boosts.size,0);
 assert.equal(t.events.length,0);
});
test('V3-4-6 default six-rental legacy hook remains unchanged with no new flag',()=>{
 const t=hookTrial(false),a=t.units[0][0],b=t.units[1];
 t.hooks.beginResolution();
 t.hooks.afterEnemyKO(a,b[0]);t.hooks.afterEnemyKO(a,b[1]);
 assert.equal(t.events.length,2);
 assert.equal(t.boosts.get(a.id).remainingTurns,5);
});
test('V3-4-6 actual host multi-target Soultimate credits 3 KOs but only one sourced skill activation',()=>{
 const battle=createCombat(options);
 assert.equal(battle.giveSoul('A1',100),100);
 const charge=battle.prepareSoultimate(0,'A1');
 assert.equal(charge.ok,true);
 const completed=battle.resolveSoultimate(0,charge.token,true);
 assert.equal(completed.ok,true);
 const state=battle.snapshot();
 assert.equal(state.squads[0][0].knockouts,3);
 assert.equal(state.squads[1].filter(x=>x.hp===0).length,3);
 const activations=state.events.filter(e=>
  e.type==='skill'&&e.skill==='momentum'&&e.kind==='発動');
 assert.equal(activations.length,1);
 assert.equal(state.skillBoosts.A1.remainingTurns,5);
 assert.equal(completed.impacts.filter(x=>x.predictedKO).length,3);
});
test('V3-4-6 opt-in and default routes differ ONLY in skill events for multi-KO, never damage or RNG',()=>{
 const original=createCombat({...options,researchYw2Momentum:false});
 const sourced=createCombat(options);
 for(const game of [original,sourced]){
  game.giveSoul('A1',100);
  const charge=game.prepareSoultimate(0,'A1');
  game.resolveSoultimate(0,charge.token,true);
 }
 const a=original.snapshot(),b=sourced.snapshot();
 assert.deepEqual(a.squads,b.squads);
 assert.deepEqual(a.soul,b.soul);
 assert.deepEqual(a.skillBoosts,b.skillBoosts);
 assert.equal(a.events.filter(x=>x.type==='skill'&&x.skill==='momentum').length,3);
 assert.equal(b.events.filter(x=>x.type==='skill'&&x.skill==='momentum').length,1);
 assert.deepEqual(a.events.filter(x=>x.type==='special'),
  b.events.filter(x=>x.type==='special'));
});
test('V3-4-6 sourced KO policy is explicitly gated from default rental and can replay',()=>{
 assert.throws(()=>createCombat({researchYw2Momentum:true}),/custom teams/);
 assert.throws(()=>createCombat({
  teams:battleTeams(),researchYw2Momentum:true,
  enableRentalSkills:false,researchSpecialEffects:true
 }),/active skills/);
 const p=createMatchProtocol({battleOptions:options,hostNowMs:()=>5000});
 assert.equal(p.advanceAuto().ok,true);
 const recorded=p.exportJournal();
 assert.equal(replayMatchJournal(recorded).ok,true);
 const ordinary=createMatchProtocol({battleOptions:{seed:47}});
 assert.equal(ordinary.snapshot().game.squads[0][0].skill,'momentum');
});
