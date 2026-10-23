import test from 'node:test';
import assert from 'node:assert/strict';
import {createCounterWindow} from '../engine/counter-window.mjs';
import {createCombat} from '../engine/combat.mjs';

test('counter-window cannot silently consume an impact when wheel input arrives at due time',()=>{
 const t=createCounterWindow();
 assert.equal(t.beginCutin({attackerSide:1,durationMs:800}).ok,true);
 assert.equal(t.beginCharge({side:0,token:11}).ok,true);
 t.advance(1700);
 const queued=t.completeCharge({side:0,token:11});
 assert.equal(queued.hitAt,1700);
 const old=t.snapshot();
 const attempted=t.setFront({side:1,ids:['B2','B3','B4']});
 assert.deepEqual(attempted,{ok:false,reason:'hit_due_resolve_first'});
 assert.deepEqual(t.snapshot(),old);
 const due=t.advance(0);
 assert.equal(due.length,1);
 assert.deepEqual(due[0].targetIds,['B1','B2','B3']);
 assert.equal(t.setFront({side:1,ids:['B2','B3','B4']}).ok,true);
});
for(const paired of [false,true]){
 test('wheel at exact late counter impact resolves HP before rotation, coalescing='+paired,()=>{
  const g=createCombat({seed:17,researchPresentation:true,
   researchSpecialEffects:true,researchCounterTiming:true,
   researchWheelCoalescing:paired});
  g.beginCounterCutin({attackerSide:1,durationMs:800});
  g.giveSoul('A1',100);
  assert.equal(g.prepareSoultimate(0,'A1').ok,true);
  g.advancePresentation(1700);
  // Use the token from the actual state, not a newly fabricated command.
  const token=g.snapshot().soul.pending[0].token;
  const completed=g.resolveSoultimate(0,token,true);
  assert.equal(completed.counter.hitAt,1700);
  const before=g.snapshot().squads[1].map(x=>x.hp);
  const rotate=g.rotate(1,1);
  assert.equal(rotate.ok,true);
  const now=g.snapshot();
  assert.equal(now.counterEffectsPending,0);
  assert.equal(now.events.filter(e=>e.type==='counter-hit').length,1);
  assert.deepEqual(now.events.find(e=>e.type==='counter-hit').targets,['B1','B2','B3']);
  assert.ok(now.squads[1][0].hp<before[0]);
  assert.equal(now.squads[1][3].hp,before[3]);
  g.advancePresentation(0);
  assert.equal(g.snapshot().events.filter(e=>e.type==='counter-hit').length,1);
 });
}
test('ordinary auto action at an already due hit is sequenced after counter HP',()=>{
 const g=createCombat({seed:40,researchPresentation:true,researchSpecialEffects:true,researchCounterTiming:true});
 g.beginCounterCutin({attackerSide:1,durationMs:800});
 g.giveSoul('A1',100);
 const p=g.prepareSoultimate(0,'A1');
 g.advancePresentation(1600);
 const q=g.resolveSoultimate(0,p.token,true);
 assert.equal(q.counter.hitAt,1600);
 const result=g.step();
 assert.equal(result.type,'action');
 const history=g.snapshot().events;
 const hitIdx=history.findIndex(x=>x.type==='counter-hit');
 const actionIdx=history.findIndex(x=>x.type==='action');
 assert.ok(hitIdx>=0&&actionIdx>hitIdx);
 assert.equal(g.snapshot().counterEffectsPending,0);
});
