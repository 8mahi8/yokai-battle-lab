import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
const presented=g=>g.snapshot().presentation;
const ids=xs=>xs.map(x=>x.kind);

test('actual guided tap charge completes during motion and appears as no-motion special',()=>{
 let success=false;
 for(let seed=1;seed<=80&&!success;seed++){
  const game=createCombat({seed,researchPresentation:true,researchSpecialEffects:true});
  game.giveSoul('A1',100);
  game.beginPresentationMotion({durationMs:900,kind:'inspirit',actorId:'B2'});
  const begin=game.beginGuidedCharge(0,'A1');
  if(begin.kind!=='tap')continue;
  let result;
  for(let i=0;i<6;i++){
   const orb=presented(game);assert.equal(orb.visible.length,0);
   const state=game.snapshot().guided[0].challenge;
   const [x,y]=state.target;
   result=game.chargeInput(0,{type:'down',x,y});
  }
  assert.equal(result.completed,true);
  assert.equal(result.special.effectStatus,'research-fixture');
  assert.deepEqual(presented(game).visible,[]);
  const revealed=game.advancePresentation(900);
  assert.deepEqual(ids(revealed),['specialRelease']);
  assert.equal(revealed[0].hiddenCharge,true);
  assert.equal(revealed[0].memberId,'A1');
  assert.equal(game.snapshot().soul.teams[0][0].soul,0);
  assert.ok(game.snapshot().squads[1][0].hp<game.snapshot().squads[1][0].maxHp);
  success=true;
 }
 assert.equal(success,true,'at least one seeded tap trial must exist');
});
test('slow charge becomes visible when the animation ends',()=>{
 const game=createCombat({researchPresentation:true});
 game.giveSoul('A1',100);
 game.beginPresentationMotion({durationMs:400});
 const charge=game.prepareSoultimate(0,'A1');
 assert.equal(charge.ok,true);
 assert.deepEqual(ids(game.advancePresentation(400)),['chargeStart']);
 game.advancePresentation(300);
 const result=game.resolveSoultimate(0,charge.token,true);
 assert.equal(result.ok,true);
 const view=presented(game);
 assert.deepEqual(ids(view.visible),['chargeStart','specialRelease']);
 assert.equal(view.visible[1].hiddenCharge,false);
 assert.equal(view.visible[1].visibleAt,700);
});
test('rotation and charge cancellation inside a motion produce no phantom special',()=>{
 const game=createCombat({researchPresentation:true});
 game.giveSoul('A1',100);
 game.beginPresentationMotion({durationMs:500});
 assert.equal(game.beginGuidedCharge(0,'A1').ok,true);
 const rotated=game.rotate(0,1);
 assert.equal(rotated.chargeCancelled,true);
 const events=game.advancePresentation(500);
 assert.deepEqual(ids(events),['rotate']);
 assert.equal(game.snapshot().soul.teams[0][0].soul,100);
});
test('Watch mode switch midcharge cancels old charge and shows mode without phantom charge',()=>{
 const game=createCombat({researchPresentation:true});
 game.giveSoul('A1',100);
 game.beginPresentationMotion({durationMs:300});
 game.beginGuidedCharge(0,'A1');
 game.setWatchMode(0,'zero');
 assert.deepEqual(ids(game.advancePresentation(300)),['watchMode']);
 assert.equal(presented(game).activeCharges[0],null);
});
test('two sides can complete independent charges inside one animation',()=>{
 const game=createCombat({researchPresentation:true});
 game.giveSoul('A1',100);game.giveSoul('B1',100);
 game.beginPresentationMotion({durationMs:900});
 const a=game.prepareSoultimate(0,'A1'),b=game.prepareSoultimate(1,'B1');
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 game.resolveSoultimate(0,a.token,true);
 game.resolveSoultimate(1,b.token,true);
 const reveals=game.advancePresentation(900);
 assert.deepEqual(ids(reveals),['specialRelease','specialRelease']);
 assert.deepEqual(reveals.map(x=>x.side),[0,1]);
 assert.ok(reveals.every(x=>x.hiddenCharge));
});
test('ordinary auto action is also buffered as presentation while animation active',()=>{
 const game=createCombat({researchPresentation:true});
 game.beginPresentationMotion({durationMs:600,kind:'soultimate'});
 const action=game.step();assert.equal(action.type,'action');
 assert.deepEqual(presented(game).visible,[]);
 const released=game.advancePresentation(600);
 assert.equal(released.length,1);
 assert.equal(released[0].kind,'action');
 assert.equal(released[0].memberId,action.actor);
});
test('legacy combat snapshot and commands remain free of presentation side effects',()=>{
 const game=createCombat();
 assert.equal(Object.hasOwn(game.snapshot(),'presentation'),false);
 assert.deepEqual(game.beginPresentationMotion({durationMs:100}),{ok:false,reason:'presentation_disabled'});
 assert.deepEqual(game.advancePresentation(10),{ok:false,reason:'presentation_disabled'});
 assert.throws(()=>createCombat({researchPresentation:'on'}));
});
