import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateOneHit} from '../engine/damage-model.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

// YW2 original source: https://mtwildwood.net/guarding.php?g=yw2
// Ordinary guarding = x0.5 damage, boosted guard = x0.25 damage.
// Guard Break only pierces physical attacks. This opt-in research input
// does NOT claim the six existing rentals have a boost source yet.
test('original YW2 guard boost reduces physical damage to one quarter',()=>{
 const common={kind:'attack',power:50,strength:100,defense:80};
 assert.equal(calculateOneHit(common).amount,55);
 const normal=calculateOneHit({...common,guarded:true});
 const boost=calculateOneHit({...common,guarded:true,guardBoost:true});
 assert.equal(normal.amount,27);
 assert.equal(boost.amount,13);
 assert.equal(normal.guardFactor,.5);
 assert.equal(boost.guardFactor,.25);
 assert.equal(calculateOneHit({...common,guardBoost:true}).guardFactor,1);
 assert.equal(calculateOneHit({...common,guardBoost:true}).amount,55);
});
test('boosted guard also reduces Technique; physical-only Guard Break ignores it',()=>{
 const a={kind:'attack',power:50,strength:100,defense:80,guarded:true,guardBoost:true};
 const t={kind:'technique',power:50,spirit:100,defense:80,guarded:true,guardBoost:true};
 const physicalPierce=calculateOneHit({...a,guardBreak:true});
 assert.equal(physicalPierce.amount,55);
 assert.equal(physicalPierce.guardFactor,1);
 assert.equal(physicalPierce.guardIgnored,true);
 const normalTech=calculateOneHit({...t,guardBoost:false});
 const boostedTech=calculateOneHit(t);
 assert.equal(normalTech.guardFactor,.5);
 assert.equal(boostedTech.guardFactor,.25);
 assert.ok(boostedTech.amount<normalTech.amount);
 assert.equal(calculateOneHit({...t,guardBreak:true}).amount,boostedTech.amount,
  'Guard Break must not bypass Technique guard');
 for(const bad of [0,.25,'yes',null])
  assert.throws(()=>calculateOneHit({...a,guardBoost:bad}),/booleans/);
});
test('host applies quarter guard in real guarded attacks; seeded replay is stable',()=>{
 let guardedHits=0,techniqueHits=0;
 for(const seed of [11,27,20261028]){
  const teamA=RENTAL_SQUAD.map(r=>({...r,maxHp:650,
   speed:120,weights:[70,30,0,0]}));
  const teamB=RENTAL_SQUAD.map(r=>({...r,maxHp:900,
   speed:550,defense:80,guardBoost:true,weights:[0,0,0,100]}));
  const options={seed,teams:[teamA,teamB],researchDamageModel:true,
   researchMultiHit:true,enableRentalSkills:false};
  const left=createCombat(options),right=createCombat(options);
  for(let i=0;i<180;i++){
   const a=left.step(),b=right.step();
   assert.deepEqual(a,b);
   assert.deepEqual(left.snapshot(),right.snapshot());
   if(a.type!=='action'||a.winner!==null)break;
   if(a.target?.startsWith('B')&&a.guard&&a.hit&&
      ['attack','technique'].includes(a.kind)){
    guardedHits++;
    if(a.kind==='technique')techniqueHits++;
    assert.equal(a.damageResearch?.guardFactor,.25,
     'real host must use boosted-guard multiplier');
    assert.equal(a.damageResearch?.guardApplied,true);
    assert.equal(a.damageResearch?.guardIgnored,false);
    assert.ok(a.amount<=a.damageResearch.amount,
     'no extra RNG damage spread is applied to guarding targets');
   }
  }
 }
 assert.ok(guardedHits>5,'must actually exercise a live guarded opponent');
 assert.ok(techniqueHits>0,'must exercise Technique as well as Attack on guard');
});
test('legacy damage path uses the same known quarter-guard rule',()=>{
 const teamA=RENTAL_SQUAD.map(r=>({...r,speed:120,weights:[100,0,0,0]}));
 const teamB=RENTAL_SQUAD.map(r=>({...r,speed:550,maxHp:900,
  guardBoost:true,weights:[0,0,0,100]}));
 const match=createCombat({seed:27,teams:[teamA,teamB],researchDamageModel:false,
  enableRentalSkills:false});
 let guardedHits=0;
 for(let i=0;i<160;i++){
  const a=match.step();
  if(a.type!=='action'||a.winner!==null)break;
  if(a.target?.startsWith('B')&&a.kind==='attack'&&a.guard&&a.hit){
   guardedHits++;
   assert.ok(a.amount>=1);
  }
 }
 assert.ok(guardedHits>0);
});
test('boost input is validated; standard rental wire remains without invented guard boost',()=>{
 const invalid=RENTAL_SQUAD.map(r=>({...r}));
 invalid[0].guardBoost='yes';
 assert.throws(()=>createCombat({teams:[invalid,RENTAL_SQUAD]}),
  /guardBoost must be a boolean/);
 const standard=createMatchProtocol({battleOptions:{seed:7}});
 assert.ok(standard.snapshot().game.squads.flat().every(x=>
  !Object.hasOwn(x,'guardBoost')));
});
