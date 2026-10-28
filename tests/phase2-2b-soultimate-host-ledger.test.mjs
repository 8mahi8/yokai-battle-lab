import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {projectSoultimateImpactLedger,assertSoultimateImpactLedger}
 from '../contracts/soultimate-impact-ledger-v1.mjs';

const deep=x=>JSON.parse(JSON.stringify(x));

function realSpecial(slot,seed=20261029){
 const host=createCombat({seed,catalogSoultimateResolution:true,
  researchSpecialEffects:true,enableRentalSkills:false});
 const caster='A'+slot;
 for(let i=0;i<6&&!host.snapshot().clock.teams[0].frontIds.includes(caster);i++)
  host.rotate(0,1);
 assert.ok(host.snapshot().clock.teams[0].frontIds.includes(caster));
 host.giveSoul(caster,100);
 const charge=host.prepareSoultimate(0,caster);
 assert.equal(charge.ok,true,JSON.stringify(charge));
 const result=host.resolveSoultimate(0,charge.token,true);
 assert.equal(result.ok,true);
 const wire={game:host.snapshot(),revision:1,clientSequences:[0,0],forecast:[]};
 return {host,result,wire};
}

test('all six real rental Soultimates retain exactly host resolved target HP/status records',()=>{
 const kinds=['damage','drain','buff','damage-status','revive-heal','debuff'];
 for(let i=1;i<=6;i++){
  const {host,result,wire}=realSpecial(i);
  const original=JSON.stringify(wire);
  const event=wire.game.events.findLast(x=>x.type==='special');
  assert.equal(event.model,'research-fixture');
  const ledger=projectSoultimateImpactLedger(event);
  assert.ok(ledger,'valid host impact ledger for rental #'+i);
  assert.equal(assertSoultimateImpactLedger(ledger),true);
  assert.equal(ledger.originalHitCount,null,'do not infer move hit count from target count');
  assert.deepEqual(ledger.impacts.map(r=>r.targetId),
   result.impacts.map(r=>r.targetId));
  assert.ok(ledger.impacts.every(r=>r.sequence>0));
  for(let n=0;n<ledger.impacts.length;n++){
   const row=ledger.impacts[n],truth=result.impacts[n];
   assert.equal(row.kind,truth.kind);
   assert.equal(row.hpBefore,truth.hpBefore);
   assert.equal(row.hpAfter,truth.hpAfter);
   assert.equal(row.amount,truth.amount);
   assert.equal(row.deltaHp,truth.deltaHp);
   assert.equal(row.kind==='buff'||row.kind==='debuff'||
    row.kind==='damage-status' ? typeof row.applied==='boolean':true,true);
  }
  const view=makeStageView(wire,0);
  const transformed=view.events.findLast(x=>x.type==='special');
  assert.deepEqual(transformed.specialImpactLedger,ledger);
  const cue=latestBattleCue(view.events);
  assert.deepEqual(cue.specialImpactLedger,ledger);
  const plan=planActionChoreography(cue);
  assert.deepEqual(plan.specialImpactLedger,ledger);
  assert.equal(plan.impacts.length,ledger.impacts.length);
  assert.equal(plan.hitResults.length,0,'target records are not repeat attack hits');
  if(plan.impacts.length){
   const point=choreographyFrame(plan,plan.phases[1].startMs);
   assert.equal(point.specialTargetIndex,0);
   assert.equal(point.currentSpecialImpact.targetId,ledger.impacts[0].targetId);
  }
  assert.equal(JSON.stringify(wire),original,'presentation cannot rewrite wire snapshot');
  assert.equal(JSON.stringify(host.snapshot()),JSON.stringify(wire.game));
  if([3,4,6].includes(i)){
   assert.ok(ledger.impacts.some(x=>x.statusEffect),
    'status Soultimate kind '+kinds[i-1]+' must keep status metadata');
  }
 }
});

test('tampered status, fake damage and altered visual target are rejected',()=>{
 const {wire}=realSpecial(4,90125);
 const event=wire.game.events.findLast(x=>x.type==='special');
 const canonical=projectSoultimateImpactLedger(event);
 assert.ok(canonical);
 for(const change of [
  x=>x.impacts[0].hpAfter++,
  x=>x.impacts[0].amount+=10,
  x=>x.impacts[0].kind='fake',
  x=>x.impacts[0].targetId='X9',
  x=>x.eventId=0,
  x=>x.impacts[0].applied=!x.impacts[0].applied
 ]){
  const bad=deep(event);change(bad);
  assert.equal(projectSoultimateImpactLedger(bad),null);
 }
 const badLedger=deep(canonical);
 badLedger.originalHitCount=5;
 assert.throws(()=>assertSoultimateImpactLedger(badLedger));
 const cue=latestBattleCue(makeStageView(wire,0).events);
 const forged={...cue,targets:cue.targets.map(x=>({...x}))};
 forged.targets[0].amount++;
 assert.throws(()=>planActionChoreography(forged),/contradicts|conflict/);
});

test('old special visual fixtures stay supported, never implicitly gain a host ledger',()=>{
 const cue={type:'special',key:'s:1',actor:'A1',
  targets:[{id:'B1',kind:'damage',amount:4}]};
 const plan=planActionChoreography(cue);
 assert.equal(plan.specialImpactLedger,null);
 assert.equal(plan.hitResults.length,0);
 assert.equal(plan.impacts.length,1);
 assert.equal(projectSoultimateImpactLedger({...cue,model:'research-fixture'}),null);
});
