import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTechniqueElementMultiplier} from '../engine/element-model.mjs';
import {calculateOneHit} from '../engine/damage-model.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

// Original YW2 https://mtwildwood.net/elements.php?g=yw2
// Weakness/resistance belongs to the defender; Play and Penetrate belong
// to the attacking side. No Play/Penetrate is assigned to built-in rentals.
test('affinity, Play 0/1/2 sources, and Penetrate are separate lanes',()=>{
 const base={element:'fire',resistances:{fire:.5}};
 const plain=resolveTechniqueElementMultiplier(base);
 assert.equal(plain.multiplier,.5);
 assert.equal(plain.resistance,.5);
 assert.equal(plain.playMultiplier,1);
 assert.equal(plain.penetrateApplied,false);
 const play1=resolveTechniqueElementMultiplier({...base,playSources:1});
 assert.equal(play1.playMultiplier,1.2);
 assert.equal(play1.multiplier,.6);
 const play2=resolveTechniqueElementMultiplier({...base,playSources:2});
 assert.equal(play2.playMultiplier,1.4);
 assert.equal(play2.multiplier,.7);
 const pierce=resolveTechniqueElementMultiplier({...base,penetrate:true,playSources:2});
 assert.equal(pierce.resistanceAfterPenetrate,1);
 assert.equal(pierce.penetrateApplied,true);
 assert.equal(pierce.multiplier,1.4);
});

test('Penetrate does not erase a weakness; neutral is not an elemental Play',()=>{
 const weakness=resolveTechniqueElementMultiplier({
  element:'water',resistances:{water:1.5},penetrate:true,playSources:1
 });
 assert.equal(weakness.resistanceAfterPenetrate,1.5);
 assert.ok(Math.abs(weakness.multiplier-1.8)<1e-12);
 assert.equal(weakness.penetrateApplied,false);
 const neutral=resolveTechniqueElementMultiplier({
  element:'neutral',resistances:{fire:.5},penetrate:true,playSources:2
 });
 assert.equal(neutral.multiplier,1);
 assert.equal(neutral.playMultiplier,1);
});

test('Technique damage scales full Wiki expression; physical ignores affinity',()=>{
 const input={kind:'technique',power:90,spirit:200,defense:130};
 const affinity=resolveTechniqueElementMultiplier({
  element:'fire',resistances:{fire:.5},penetrate:true,playSources:2
 });
 const wikiBase=(290/10+290/3-130/7);
 assert.equal(calculateOneHit({...input,elementMultiplier:affinity.multiplier}).amount,
  Math.floor(wikiBase*1.4));
 assert.equal(calculateOneHit({
  kind:'attack',power:90,strength:200,defense:130,
  elementMultiplier:affinity.multiplier
 }).elementMultiplier,1);
 // Two Play sources and highest validated target affinity: no arbitrary clamp.
 const max=resolveTechniqueElementMultiplier({
  element:'ice',resistances:{ice:3},playSources:2
 });
 assert.ok(max.multiplier<=4.2);
 assert.doesNotThrow(()=>calculateOneHit({...input,elementMultiplier:max.multiplier}));
});

test('invalid research input is rejected; built-in six keep their old shape',()=>{
 for(const bad of [-1,.5,3,'2',null])
  assert.throws(()=>resolveTechniqueElementMultiplier({element:'fire',playSources:bad}));
 for(const bad of ['true',1,null])
  assert.throws(()=>resolveTechniqueElementMultiplier({penetrate:bad}));
 assert.throws(()=>resolveTechniqueElementMultiplier({element:'shadow'}));
 const source=RENTAL_SQUAD.map(r=>({...r}));
 source[0].techniquePlaySources=3;
 assert.throws(()=>createCombat({teams:[source,RENTAL_SQUAD],researchDamageModel:true}),/techniquePlaySources/);
 source[0].techniquePlaySources=1;
 assert.throws(()=>createCombat({teams:[source,RENTAL_SQUAD]}),/requires researchDamageModel/);
 source[0].techniquePenetrate='yes';
 assert.throws(()=>createCombat({teams:[source,RENTAL_SQUAD],researchDamageModel:true}),/techniquePenetrate/);
 const original=createMatchProtocol({battleOptions:{seed:1}}).snapshot();
 assert.ok(original.game.squads.flat().every(m=>
  !Object.hasOwn(m,'techniquePlaySources')&&!Object.hasOwn(m,'techniquePenetrate')));
});

test('real host Technique uses correct affinity lane and deterministic seeded replay',()=>{
 let matchingHits=0;
 for(const seed of [21,20261028,57]){
  const attackers=RENTAL_SQUAD.map(r=>({...r,
    maxHp:900,speed:420,technique:'damage',
    techniqueElement:'fire',techniquePlaySources:2,
    techniquePenetrate:true,weights:[0,100,0,0]}));
  const defenders=RENTAL_SQUAD.map(r=>({...r,
    maxHp:900,speed:180,elementResistances:{fire:.5},
    weights:[0,0,0,100]}));
  const options={seed,teams:[attackers,defenders],
    researchDamageModel:true,enableRentalSkills:false};
  const left=createCombat(options),right=createCombat(options);
  for(let i=0;i<180;i++){
   const a=left.step(),b=right.step();
   assert.deepEqual(a,b);
   assert.deepEqual(left.snapshot(),right.snapshot());
   if(a.type!=='action'||a.winner!==null)break;
   if(a.kind==='technique'&&a.target?.startsWith('B')&&
      a.hit&&a.damageResearch){
    matchingHits++;
    assert.equal(a.damageResearch.elementMultiplier,1.4);
    assert.equal(a.damageResearch.elementResolution.resistance,.5);
    assert.equal(a.damageResearch.elementResolution.resistanceAfterPenetrate,1);
    assert.equal(a.damageResearch.elementResolution.playSources,2);
    assert.equal(a.damageResearch.elementResolution.penetrateApplied,true);
   }
  }
 }
 assert.ok(matchingHits>=3,'must exercise the actual host Technique damage');
});
