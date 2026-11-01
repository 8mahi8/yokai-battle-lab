import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const make=()=>createCombat({seed:15,teams:[RENTAL_SQUAD,RENTAL_SQUAD],
 researchOpeningPriority:{flashIds:['B6']}});
test('a real bot battle can execute the Flash interception and reports whose turn is replaced',()=>{
 const g=make();
 assert.equal(g.rotate(1,-1).ok,true);
 const first=g.step();
 assert.equal(first.actor,'B6');
 assert.equal(first.priorityKind,'flash-intercept');
 assert.equal(first.flashConsumed,true);
 assert.ok(first.skippedId&&first.skippedId!=='B6');
 assert.equal(g.snapshot().clock.openingPriority.flashReady.length,0);
 assert.deepEqual(g.snapshot().events.at(-1).priorityConfidence,'research-fixture');
});
test('same rental matchup without research opening priority preserves old first actor',()=>{
 const normal=createCombat({seed:15,teams:[RENTAL_SQUAD,RENTAL_SQUAD]});
 const boosted=make();
 normal.rotate(1,-1);boosted.rotate(1,-1);
 const normalFirst=normal.step(),flashFirst=boosted.step();
 assert.notEqual(normalFirst.actor,flashFirst.actor);
 assert.equal(flashFirst.skippedId,normalFirst.actor);
 assert.equal(Object.hasOwn(normal.snapshot().clock,'openingPriority'),false);
});
test('combat forecast can show Flash but never spends it',()=>{
 const g=make();g.rotate(1,-1);
 const before=g.snapshot();
 const planned=g.preview(5);
 assert.equal(planned[0].id,'B6');
 assert.equal(planned[0].flashConsumed,true);
 assert.deepEqual(g.snapshot(),before);
 assert.equal(g.step().actor,planned[0].id);
});
test('flash only triggers when its owner is not KO or disabled',()=>{
 const g=make();g.rotate(1,-1);
 // Directly stop B6 before its action with a simulated negative Inspirit.
 g.applyInspirit({id:'B6',sign:'negative',effect:'sleep'});
 assert.notEqual(g.step().actor,'B6');
 assert.deepEqual(g.snapshot().clock.openingPriority.flashReady,['B6']);
});
test('Flash intervention can interleave existing Soul/Poke/reserve systems without corrupting ranges',()=>{
 for(const seed of [2,15,40,71,105]){
  const g=createCombat({seed,researchSpecialEffects:true,researchSoulRecoveryMode:'owner-nonattack',
   researchOpeningPriority:{flashIds:['A2','B6','B3']}});
  g.rotate(1,-1);
  for(let i=0;i<80;i++){
   const evt=g.step();if(evt.type!=='action')break;
   const state=g.snapshot();
   for(const team of state.squads)for(const m of team)
    assert.ok(m.hp>=0&&m.hp<=m.maxHp);
   for(const team of state.soul.teams)for(const m of team)
    assert.ok(m.soul>=0&&m.soul<=m.capacity);
  }
  const events=g.snapshot().events.filter(e=>e.type==='action');
  assert.ok(events.filter(e=>e.flashConsumed).length<=3);
 }
});
test('nonobject research opening config is rejected by combat',()=>{
 for(const bad of [true,'yes',[],5])
  assert.throws(()=>createCombat({researchOpeningPriority:bad}));
});
