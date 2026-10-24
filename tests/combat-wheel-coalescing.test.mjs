import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';

const make=()=>createCombat({
 seed:123,researchSpecialEffects:true,researchPresentation:true,
 researchCounterTiming:true,researchWheelCoalescing:true
});
const front=(g,side)=>g.snapshot().clock.teams[side].frontIds;
const hp=(g,id)=>g.snapshot().squads.flat().find(x=>x.id===id).hp;
const start=g=>{g.beginCounterCutin({attackerSide:1,durationMs:800});g.giveSoul('A1',100);
 const charge=g.prepareSoultimate(0,'A1');assert.equal(charge.ok,true);return charge;};

test('charge completed between two turns targets original front after retroactive correction',()=>{
 const game=make(),c=start(game);
 game.advancePresentation(100);
 game.rotate(1,1);
 assert.deepEqual(front(game,1),['B2','B3','B4']);
 game.advancePresentation(100);
 const done=game.resolveSoultimate(0,c.token,true);
 assert.equal(done.effectStatus,'pending-counter-hit');
 assert.deepEqual(done.counter.targetIds,['B2','B3','B4']);
 game.advancePresentation(100);
 game.rotate(1,1);
 assert.deepEqual(front(game,1),['B3','B4','B5']);
 const pending=game.snapshot().counterWindow.pending[0];
 assert.deepEqual(pending.targetIds,['B1','B2','B3']);
 assert.equal(pending.targetCorrection.reason,'second-rotation-before-auto-action');
 assert.deepEqual(game.snapshot().events.filter(x=>x.type==='wheel-target-correction').map(x=>x.hitId),[done.counter.id]);
 const before=Object.fromEntries(game.snapshot().squads[1].map(m=>[m.id,m.hp]));
 const shown=game.advancePresentation(500);
 assert.deepEqual(shown.map(e=>e.kind),['specialRelease','rotate']);
 assert.deepEqual(shown[1].frontIds,['B3','B4','B5']);
 assert.equal(shown[1].collapsedRotations,1);
 assert.ok(['B1','B2','B3'].every(id=>hp(game,id)<before[id]));
 assert.ok(['B4','B5','B6'].every(id=>hp(game,id)===before[id]));
});
test('charge complete after two turns targets final lineup instead',()=>{
 const game=make(),c=start(game);
 game.rotate(1,1);game.rotate(1,1);
 const done=game.resolveSoultimate(0,c.token,true);
 assert.deepEqual(done.counter.targetIds,['B3','B4','B5']);
 game.advancePresentation(800);
 assert.deepEqual(game.snapshot().events.findLast(e=>e.type==='counter-hit').targets,['B3','B4','B5']);
 assert.deepEqual(game.snapshot().events.filter(e=>e.type==='wheel-target-correction'),[]);
});
test('a single rotation retains original one-turn target behavior',()=>{
 const game=make(),c=start(game);
 game.rotate(1,1);
 const done=game.resolveSoultimate(0,c.token,true);
 game.advancePresentation(800);
 assert.deepEqual(game.snapshot().events.findLast(e=>e.type==='counter-hit').targets,['B2','B3','B4']);
 assert.equal(done.counter.frontLock,'completion');
});
test('late counter hit uses actual physical lineup after two moves',()=>{
 const game=make(),c=start(game);
 game.advancePresentation(900);
 const done=game.resolveSoultimate(0,c.token,true);
 assert.equal(done.counter.frontLock,'impact');
 game.rotate(1,1);game.rotate(1,1);
 game.advancePresentation(400);
 assert.deepEqual(game.snapshot().events.findLast(e=>e.type==='counter-hit').targets,['B3','B4','B5']);
});
test('completed hit cannot be revised by later wheel pair',()=>{
 const game=make(),c=start(game);
 game.rotate(1,1);
 game.resolveSoultimate(0,c.token,true);
 game.advancePresentation(800);
 const before=game.snapshot().squads;
 game.rotate(1,1);
 assert.equal(game.snapshot().events.filter(e=>e.type==='wheel-target-correction').length,0);
 assert.deepEqual(game.snapshot().squads,before);
});
test('default and counter-only modes retain original behavior',()=>{
 const game=createCombat({researchPresentation:true,researchSpecialEffects:true,researchCounterTiming:true});
 assert.equal(Object.hasOwn(game.snapshot(),'wheelCoalescing'),false);
 assert.throws(()=>createCombat({researchWheelCoalescing:true}));
 assert.throws(()=>createCombat({researchWheelCoalescing:true,researchCounterTiming:true}));
});
