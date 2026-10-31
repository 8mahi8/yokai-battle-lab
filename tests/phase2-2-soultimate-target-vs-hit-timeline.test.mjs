import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';

// These are display TARGET records from a host-resolved Soultimate, not
// assumed attack hits. Original PvP move hit-count evidence remains pending.
const frameAt=(plan,index)=>{
 const start=plan.phases[1].startMs;
 const end=plan.phases[1].endMs;
 return choreographyFrame(plan,start+(index+.1)*(end-start)/plan.impacts.length);
};

test('real Soultimate host effect -> visual cue has 3 TARGETS but no claimed hit count',()=>{
 const host=createCombat({seed:20261028,catalogSoultimateResolution:true,
  researchSpecialEffects:true});
 host.giveSoul('A1',100);
 const charging=host.prepareSoultimate(0,'A1');
 assert.equal(charging.ok,true);
 const outcome=host.resolveSoultimate(0,charging.token,true);
 assert.equal(outcome.ok,true);
 assert.equal(outcome.impacts.length,3,'same action affects three enemies');
 const truth=JSON.stringify(host.snapshot());
 const cue=latestBattleCue(host.snapshot().events);
 assert.equal(cue.type,'special');
 const plan=planActionChoreography(cue);
 assert.equal(plan.kind,'special');
 assert.equal(plan.impacts.length,3);
 assert.equal(plan.hitResults.length,0,'one per-target result is not an observed hit');
 assert.equal(plan.actionOutcomeV2,null,'physical attack V2 cannot be forged for Soultimate');
 assert.deepEqual(plan.impacts.map(x=>x.targetId),
  outcome.impacts.map(x=>x.targetId),'keep authoritative target order');
 for(let i=0;i<3;i++){
  const frame=frameAt(plan,i);
  assert.equal(frame.specialTargetIndex,i);
  assert.equal(frame.currentSpecialImpact.targetId,outcome.impacts[i].targetId);
  assert.equal(frame.impacts.length,1,'only the current target is displayed');
  assert.equal(frame.hitIndex,null,'target index must never be passed as hit index');
  assert.equal(frame.currentHit,null);
  assert.equal(frame.impacts[0].amount,outcome.impacts[i].amount);
 }
 assert.equal(JSON.stringify(host.snapshot()),truth,
  'visualization never mutates battle HP, Soul, action order or RNG');
 assert.deepEqual(RENTAL_SOULTIMATE_MOVES[0].hitPattern,
  {type:'unknown',count:null},'do not invent a five/seven-hit value');
});

test('special target timing has exact boundaries, original visual milliseconds unclaimed',()=>{
 const cue={type:'special',key:'event:71',actor:'A1',mode:'normal',targets:[
  {id:'B1',kind:'damage',amount:19,hit:true},
  {id:'B2',kind:'damage',amount:0,hit:false},
  {id:'B3',kind:'damage',amount:11,hit:true}
 ]};
 const copy=JSON.stringify(cue);
 const plan=planActionChoreography(cue);
 const begin=plan.phases[1].startMs;
 const slice=(plan.phases[1].endMs-begin)/3;
 const before=choreographyFrame(plan,begin-.01);
 assert.deepEqual(before.impacts,[]);
 assert.equal(before.specialTargetIndex,null);
 assert.equal(before.nextSpecialImpactAtMs,null);
 const a=choreographyFrame(plan,begin);
 assert.equal(a.specialTargetIndex,0);
 assert.equal(a.currentSpecialImpact.targetId,'B1');
 assert.equal(a.nextSpecialImpactAtMs,begin+slice);
 const b=choreographyFrame(plan,begin+slice);
 assert.equal(b.specialTargetIndex,1);
 assert.equal(b.currentSpecialImpact.targetId,'B2');
 assert.equal(b.currentSpecialImpact.hit,false);
 assert.equal(b.nextSpecialImpactAtMs,begin+2*slice);
 const c=choreographyFrame(plan,begin+2*slice);
 assert.equal(c.specialTargetIndex,2);
 assert.equal(c.currentSpecialImpact.targetId,'B3');
 assert.equal(c.nextSpecialImpactAtMs,null);
 const end=choreographyFrame(plan,plan.phases[1].endMs);
 assert.equal(end.phase,'recovery');
 assert.equal(end.specialTargetIndex,2);
 assert.equal(end.impacts.length,1);
 assert.equal(plan.impacts.length,3,'the full host ledger stays intact');
 assert.equal(JSON.stringify(cue),copy);
 assert.ok(Object.isFrozen(plan)&&Object.isFrozen(plan.impacts[0]));
 assert.ok(Object.isFrozen(b.impacts)&&Object.isFrozen(b.currentSpecialImpact));
});

test('single-target and target-free specials never fabricate extra hits',()=>{
 for(const targets of [[],[{id:'B2',kind:'debuff',amount:0}]]){
  const plan=planActionChoreography({type:'special',key:'event:72',
   actor:'A4',targets});
  assert.equal(plan.impacts.length,targets.length);
  assert.equal(plan.hitResults.length,0);
  const phase=plan.phases[1].startMs;
  const first=choreographyFrame(plan,phase);
  assert.equal(first.specialTargetIndex,targets.length?0:null);
  assert.equal(first.impacts.length,targets.length);
  assert.equal(first.currentHit,null);
  assert.equal(first.nextSpecialImpactAtMs,null);
 }
 // Physical attack remains on its separately verified single-target ledger.
 const attack=planActionChoreography({type:'action',turn:7,
  actor:'A2',kind:'attack',target:'B2',amount:10});
 assert.equal(choreographyFrame(attack,attack.phases[1].startMs)
  .specialTargetIndex,null);
});
