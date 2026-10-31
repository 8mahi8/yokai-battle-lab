import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {projectSoultimateHitLedger,assertSoultimateHitLedger}
 from '../contracts/soultimate-hit-ledger-v1.mjs';

const deep=x=>JSON.parse(JSON.stringify(x));
const teams=()=>[0,1].map(()=>RENTAL_SQUAD.map(u=>({...u,weights:[...u.weights]})));
function custom({seed=20261029,power=null,hits=3,enabled=true}={}){
 const rosters=teams();
 if(power!==null)rosters[0][0].special={kind:'damage',scope:'front',
  damageKind:'attack',power};
 const combat=createCombat({seed,teams:rosters,researchDamageModel:true,
  researchStatInspirits:true,researchSpecialEffects:true,
  ...(enabled?{researchSoultimateHitCount:hits}:{})});
 combat.giveSoul('A1',100);
 const start=combat.prepareSoultimate(0,'A1');
 assert.equal(start.ok,true);
 const result=combat.resolveSoultimate(0,start.token,true);
 assert.equal(result.ok,true);
 return {combat,result,wire:{game:combat.snapshot(),revision:1,
  clientSequences:[0,0],forecast:[]}};
}
test('custom real host resolves nine ordered hits and preserves authoritative target totals',()=>{
 const {combat,result,wire}=custom();
 const original=JSON.stringify(wire);
 const event=wire.game.events.findLast(e=>e.type==='special');
 assert.equal(event.researchSoultimateHits.model,'custom-roster-per-hit-fixture');
 assert.equal(event.researchSoultimateHits.originalHitCount,null);
 const rows=event.researchSoultimateHits.hits;
 assert.equal(result.impacts.length,3);
 assert.equal(rows.length,9,'3-hit custom fixture x 3 live targets, not original move count');
 for(let group=0;group<3;group++){
  const groupRows=rows.slice(group*3,(group+1)*3);
  const impact=result.impacts[group];
  assert.equal(groupRows[0].targetId,impact.targetId);
  assert.deepEqual(groupRows.map(h=>h.targetSequence),[1,2,3]);
  assert.equal(groupRows[0].hpBefore,impact.hpBefore);
  assert.equal(groupRows.at(-1).hpAfter,impact.hpAfter);
  assert.equal(groupRows.reduce((sum,h)=>sum+h.damage,0),impact.amount);
 }
 const ledger=projectSoultimateHitLedger(event);
 assert.ok(ledger);
 assert.equal(assertSoultimateHitLedger(ledger),true);
 assert.ok(Object.isFrozen(ledger)&&Object.isFrozen(ledger.hits[0]));
 const view=makeStageView(wire,0);
 const cue=latestBattleCue(view.events);
 const plan=planActionChoreography(cue);
 assert.deepEqual(plan.specialHitLedger,ledger);
 assert.equal(plan.specialImpactLedger.impacts.length,3);
 assert.equal(plan.hitResults.length,0,'normal attack hits remain separate');
 const begin=plan.phases[1].startMs;
 const ms=(plan.phases[1].endMs-begin)/ledger.hits.length;
 for(let index=0;index<ledger.hits.length;index++){
  const frame=choreographyFrame(plan,begin+(index+.01)*ms);
  assert.equal(frame.specialHitIndex,index);
  assert.equal(frame.specialTargetIndex,Math.floor(index/3));
  assert.deepEqual(frame.currentSpecialHit,ledger.hits[index]);
  assert.equal(frame.impacts.length,1);
  assert.equal(frame.impacts[0].amount,ledger.hits[index].damage);
  assert.equal(frame.impacts[0].targetId,ledger.hits[index].targetId);
 }
 assert.equal(JSON.stringify(wire),original,'presentation cannot mutate host snapshot');
 assert.deepEqual(combat.snapshot(),wire.game);
});

test('high-power custom hit KO stops later hits and records only actually processed blows',()=>{
 const {wire}=custom({power:950,hits:5});
 const event=wire.game.events.findLast(e=>e.type==='special');
 const ledger=projectSoultimateHitLedger(event);
 assert.ok(ledger);
 assert.equal(ledger.plannedPerTarget,5);
 assert.ok(ledger.hits.length<15,'KO must stop unexecuted attacks');
 for(const impact of event.impacts){
  const recorded=ledger.hits.filter(h=>h.targetId===impact.targetId);
  assert.ok(recorded.length>=1&&recorded.length<=5);
  assert.equal(recorded.at(-1).hpAfter,impact.hpAfter);
  for(let i=1;i<recorded.length;i++)
   assert.notEqual(recorded[i-1].hpAfter,0,'no striking a defeated target');
 }
});

test('per-hit tampering rejected and read-only scene refuses contradictory target totals',()=>{
 const {wire}=custom();
 const event=wire.game.events.findLast(e=>e.type==='special');
 const valid=projectSoultimateHitLedger(event);
 assert.equal(assertSoultimateHitLedger(valid),true);
 const invalid=deep(event);
 invalid.researchSoultimateHits.hits[2].damage++;
 assert.equal(projectSoultimateHitLedger(invalid),null);
 const invalidHp=deep(event);
 invalidHp.researchSoultimateHits.hits[1].hpBefore++;
 assert.equal(projectSoultimateHitLedger(invalidHp),null);
 const forged=latestBattleCue(makeStageView(wire,0).events);
 const untrusted={...forged,specialHitLedger:{...deep(valid),plannedPerTarget:9}};
 assert.throws(()=>planActionChoreography(untrusted));
 const forgedTotal={...forged,specialImpactLedger:deep(forged.specialImpactLedger)};
 forgedTotal.specialImpactLedger.impacts[0].amount++;
 assert.throws(()=>planActionChoreography(forgedTotal));
});

test('default six rentals retain unknown hit count; unverified feature cannot enter built-in host',()=>{
 const defaultBattle=createCombat({seed:20261029,researchSpecialEffects:true});
 defaultBattle.giveSoul('A1',100);
 const start=defaultBattle.prepareSoultimate(0,'A1');
 assert.equal(start.ok,true);
 defaultBattle.resolveSoultimate(0,start.token,true);
 assert.equal(defaultBattle.snapshot().events.findLast(x=>x.type==='special')
  .researchSoultimateHits,undefined);
 const rosters=teams();
 for(const options of [
  {researchSoultimateHitCount:3,researchSpecialEffects:true,researchDamageModel:true},
  {teams:rosters,researchSoultimateHitCount:3,researchSpecialEffects:false,researchDamageModel:true},
  {teams:rosters,researchSoultimateHitCount:3,researchSpecialEffects:true,researchDamageModel:false},
  {teams:rosters,researchSoultimateHitCount:0,researchSpecialEffects:true,researchDamageModel:true},
  {teams:rosters,researchSoultimateHitCount:10,researchSpecialEffects:true,researchDamageModel:true}
 ])assert.throws(()=>createCombat(options),/Soultimate|hits|integer/i);
});
