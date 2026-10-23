import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const guards=()=>RENTAL_SQUAD.map(member=>({...member,weights:[0,0,0,100]}));
const game=()=>createCombat({seed:29,teams:[guards(),guards()],
 researchSpecialEffects:true,researchPresentation:true,
 researchCounterTiming:true,researchWheelCoalescing:true});
const beforeHp=g=>Object.fromEntries(g.snapshot().squads[1].map(x=>[x.id,x.hp]));

test('real automatic action separates wheel rotations and preserves first locked lineup',()=>{
 const g=game();
 g.beginCounterCutin({attackerSide:1,durationMs:800});
 g.giveSoul('A1',100);
 const charge=g.prepareSoultimate(0,'A1');assert.equal(charge.ok,true);
 g.rotate(1,1);
 const special=g.resolveSoultimate(0,charge.token,true);
 assert.deepEqual(special.counter.targetIds,['B2','B3','B4']);
 const action=g.step();
 assert.equal(action.type,'action');
 assert.equal(action.kind,'guard');
 assert.equal(g.snapshot().wheelCoalescing.groups[1],null);
 g.rotate(1,1);
 assert.equal(g.snapshot().wheelCoalescing.groups[1].rotations,1);
 assert.ok(!g.snapshot().events.some(x=>x.type==='wheel-target-correction'));
 const old=beforeHp(g);
 g.advancePresentation(800);
 const hit=g.snapshot().events.find(x=>x.type==='counter-hit');
 assert.deepEqual(hit.targets,['B2','B3','B4']);
 assert.equal(g.snapshot().events.filter(x=>x.type==='counter-hit-indeterminate').length,0);
 assert.ok(['B2','B3','B4'].every(id=>g.snapshot().squads[1].find(x=>x.id===id).hp<old[id]));
});
test('three-turn uncertainty remains unresolved after automatic action boundary',()=>{
 const g=game();
 g.beginCounterCutin({attackerSide:1,durationMs:800});
 g.giveSoul('A1',100);const charge=g.prepareSoultimate(0,'A1');
 g.resolveSoultimate(0,charge.token,true);
 for(let i=0;i<3;i++)g.rotate(1,1);
 assert.equal(g.snapshot().uncertainCounterHits.length,1);
 const action=g.step();assert.equal(action.kind,'guard');
 assert.equal(g.snapshot().wheelCoalescing.groups[1],null);
 const prev=beforeHp(g);
 g.advancePresentation(800);
 assert.deepEqual(beforeHp(g),prev);
 assert.equal(g.snapshot().events.filter(x=>x.type==='counter-hit-indeterminate').length,1);
});
test('new pair after auto action can still use its own two-turn source-grounded rule',()=>{
 const g=game();
 g.beginCounterCutin({attackerSide:1,durationMs:800});
 g.giveSoul('A1',100);const charge=g.prepareSoultimate(0,'A1');
 g.rotate(1,1);
 g.step();
 g.rotate(1,1); // this is now FIRST in a new action epoch
 const completed=g.resolveSoultimate(0,charge.token,true);
 const one=completed.counter.targetIds;
 g.rotate(1,1); // SECOND after action -> corrected to previous B2/B3/B4
 const now=g.snapshot().counterWindow.pending[0].targetIds;
 assert.deepEqual(one,['B3','B4','B5']);
 assert.deepEqual(now,['B2','B3','B4']);
 g.advancePresentation(800);
 assert.deepEqual(g.snapshot().events.find(x=>x.type==='counter-hit').targets,['B2','B3','B4']);
});
