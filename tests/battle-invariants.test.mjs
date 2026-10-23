import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';

function invariant(game) {
 const s=game.snapshot();
 for(let side=0;side<2;side++){
  const front=s.clock.teams[side].frontIds;
  assert.equal(front.length,3);
  assert.equal(new Set(front).size,3);
  for(const m of s.squads[side]){
   assert.ok(Number.isInteger(m.hp)&&m.hp>=0&&m.hp<=m.maxHp,m.id+' invalid HP');
   const soul=s.soul.teams[side].find(x=>x.id===m.id);
   assert.ok(soul.soul>=0&&soul.soul<=soul.capacity,m.id+' invalid Soul');
   const clock=s.clock.teams[side].members.find(x=>x.id===m.id);
   if(m.hp===0)assert.equal(clock.canAct,false,m.id+' KO cannot act');
  }
  const pending=s.soul.pending[side];
  if(pending){
   const caster=s.squads[side].find(x=>x.id===pending.casterId);
   assert.ok(caster.hp>0,'dead caster cannot have pending special');
   assert.ok(front.includes(caster.id),'benched caster cannot keep pending special');
   assert.equal(s.clock.teams[side].members.find(x=>x.id===caster.id).canAct,false,
    'charging caster must not take ordinary action');
  }
 }
 if(s.winner!==null)assert.ok(s.squads[1-s.winner].every(m=>m.hp===0));
}
test('many-seed simulated battle and special cancellation keep core invariants',()=>{
 for(let seed=1;seed<=25;seed++){
  const game=createCombat({seed,researchSpecialEffects:true,researchSoulRecoveryMode:'owner-nonattack'});
  for(let turn=0;turn<180;turn++){
   const s=game.snapshot();
   if(s.winner!==null)break;
   const side=turn%2;
   const front=s.clock.teams[side].frontIds;
   const caster=front.find(id=>s.squads[side].find(x=>x.id===id).hp>0);
   if(caster&&turn%7===0){
    game.giveSoul(caster,250);
    const charge=game.prepareSoultimate(side,caster);
    if(charge.ok){
     if(turn%14===0)game.resolveSoultimate(side,charge.token,false);
     else game.resolveSoultimate(side,charge.token,true);
    }
   }
   invariant(game);
   const event=game.step();
   if(event.type==='awaiting_rotation'){
    for(let side=0;side<2;side++){
     const current=game.snapshot();
     if(current.squads[side].some(x=>x.hp>0)&&
       !current.clock.teams[side].frontIds.some(id=>current.squads[side].find(x=>x.id===id).hp>0))
      game.rotate(side,1);
    }
   }
   invariant(game);
  }
 }
});
