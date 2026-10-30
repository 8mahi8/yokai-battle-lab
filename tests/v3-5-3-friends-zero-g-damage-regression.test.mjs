import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';

const schoolBattle=Object.freeze({
 playtestSoulTuning:true,enableLoafing:true,
 researchSpecialEffects:true,researchDamageModel:true,
 researchStatInspirits:true
});

function resolveB1({zero}){
 const game=createCombat({seed:20261030,...schoolBattle});
 // Unit-only preparation: the real Firebase browser QA must EARN these
 // meters via canonical guard actions, not mutate a snapshot or fabricate ACKs.
 for(const id of ['B6','B1','B2'])game.giveSoul(id,999);
 if(zero)game.setWatchMode(1,'zero');
 const before=game.snapshot();
 assert.deepEqual(before.clock.teams[1].frontIds,['B1','B2','B3']);
 assert.ok(before.clock.teams[1].benchIds.includes('B6'),
  'left G neighbor may be on the bench in the original rule');
 const prepared=game.prepareSoultimate(1,'B1');
 assert.equal(prepared.ok,true);
 assert.deepEqual(prepared.consumers,zero?['B6','B1','B2']:['B1']);
 const resolved=game.resolveSoultimate(1,prepared.token,true);
 const after=game.snapshot();
 return {before,resolved,after};
}

test('V3-5-3 production Friends effects execute real Zero G from three ring meters (including bench)',()=>{
 const normal=resolveB1({zero:false});
 const g=resolveB1({zero:true});
 assert.equal(normal.resolved.kind,'soultimate');
 assert.equal(normal.resolved.powerMultiplier,1);
 assert.equal(g.resolved.kind,'g-tech');
 assert.equal(g.resolved.powerMultiplier,2);
 assert.equal(g.resolved.effectStatus,'research-fixture');
 assert.deepEqual(g.resolved.consumers,['B6','B1','B2']);
 for(const id of ['B6','B1','B2']){
  const unit=g.after.soul.teams[1].find(x=>x.id===id);
  assert.equal(unit.soul,0,id+' G Soul not spent');
 }
 for(const id of ['B6','B2']){
  const unit=normal.after.soul.teams[1].find(x=>x.id===id);
  assert.equal(unit.soul,unit.capacity,id+' standard special wrongly consumed neighbor');
 }
 const event=g.after.events.filter(e=>e.type==='special').at(-1);
 assert.equal(event.mode,'g-tech');
 assert.equal(event.actor,'B1');
 assert.ok(event.impacts.some(i=>i.amount>0),'G must apply actual damage');
 assert.ok(g.after.squads[0].some((unit,i)=>unit.hp<g.before.squads[0][i].hp));
 const normalDamage=normal.before.squads[0].reduce((sum,m,i)=>
  sum+m.hp-normal.after.squads[0][i].hp,0);
 const gDamage=g.before.squads[0].reduce((sum,m,i)=>
  sum+m.hp-g.after.squads[0][i].hp,0);
 assert.ok(gDamage>normalDamage,
  'Zero G multiplier must increase actual Host HP impact for same caster/seed');
});

test('V3-5-3 school Friends damage-model switch keeps six-rental auto battle deterministic and bounded',()=>{
 for(const seed of [12,41,20261030]){
  const match=createMatchProtocol({battleOptions:{seed,...schoolBattle}});
  const mirror=createMatchProtocol({battleOptions:{seed,...schoolBattle}});
  for(let turn=0;turn<125;turn++){
   if(match.snapshot().game.winner!==null)break;
   const a=match.advanceAuto(),b=mirror.advanceAuto();
   assert.equal(a.ok,true,'normal rental battle stopped at seed '+seed+' turn '+turn);
   assert.deepEqual(a,b,'different outcome under identical Friends options');
  }
  const state=match.snapshot();
  assert.deepEqual(state,mirror.snapshot());
  assert.ok(state.game.clock.turn>0);
  assert.ok(state.game.squads.flat().every(m=>
   Number.isInteger(m.hp)&&m.hp>=0&&m.hp<=m.maxHp));
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
  for(const side of [0,1]){
   const view=makeStageView(state,side);
   assert.ok(view&&Array.isArray(view.events),'stage projection broken');
  }
 }
});
