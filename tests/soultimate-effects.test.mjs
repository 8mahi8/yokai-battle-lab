import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {soulCapacityForRank} from '../engine/soul.mjs';
import {normalizeRentalSpecial, observedNonAttackRecovery, soultimateBaseHit, researchSpecialHeal} from '../engine/soultimate-effects.mjs';

const fullOf=(state,id)=>state.soul.teams.flat().find(x=>x.id===id);
test('sourced rank costs are distinct from Yo-kai ranks and validated',()=>{
 assert.deepEqual([1,2,3,4].map(soulCapacityForRank),[100,150,200,250]);
 assert.throws(()=>soulCapacityForRank(5));
 const roster=RENTAL_SQUAD.map(x=>({...x}));
 roster[0].soultimateRank=4;
 const combat=createCombat({teams:[roster,roster]});
 assert.equal(fullOf(combat.snapshot(),'A1').capacity,250);
 combat.giveSoul('A1',100);
 assert.equal(combat.prepareSoultimate(0,'A1').reason,'soul_not_full');
 combat.giveSoul('A1',150);
 assert.equal(combat.prepareSoultimate(0,'A1').ok,true);
});
test('non-offensive observed Soul gain is actor-only and not global',()=>{
 const roster=RENTAL_SQUAD.map(x=>({...x,weights:[0,0,0,100]}));
 const combat=createCombat({teams:[roster,roster],observedSoulRecovery:true,seed:11});
 const action=combat.step();
 assert.equal(action.kind,'guard');
 assert.equal(action.soulRecovered,5);
 const meters=combat.snapshot().soul.teams.flat();
 assert.equal(meters.filter(m=>m.soul!==0).length,1);
 assert.equal(fullOf(combat.snapshot(),action.actor).soul,5);
});
test('physical/magical attacks do not use non-attack grant; disabled by default',()=>{
 assert.equal(observedNonAttackRecovery('attack'),0);
 assert.equal(observedNonAttackRecovery('technique'),0);
 assert.equal(observedNonAttackRecovery('heal'),5);
 assert.equal(observedNonAttackRecovery('inspirit'),5);
 assert.equal(observedNonAttackRecovery('loaf'),5);
 const roster=RENTAL_SQUAD.map(x=>({...x,weights:[100,0,0,0]}));
 const combat=createCombat({teams:[roster,roster],observedSoulRecovery:true,seed:11});
 const action=combat.step();
 assert.equal(action.soulRecovered,0);
 assert.ok(combat.snapshot().soul.teams.flat().every(x=>x.soul===0));
 assert.throws(()=>createCombat({observedSoulRecovery:true,researchSoulGainPerAction:5}));
});
test('Soultimate fixture and healing formulas reject invalid input, G power only a proxy',()=>{
 assert.deepEqual(normalizeRentalSpecial({kind:'heal',targets:'all',power:50}),{kind:'heal',targets:'all',method:'healing',power:50});
 assert.throws(()=>normalizeRentalSpecial({kind:'attack',targets:'all',method:'fiction',power:50}));
 assert.throws(()=>normalizeRentalSpecial({kind:'heal',targets:'all',power:0}));
 assert.equal(researchSpecialHeal({power:100,spirit:150}),150);
 assert.ok(soultimateBaseHit({power:100,strength:100,defense:60,method:'physical',multiplier:2})
  >soultimateBaseHit({power:100,strength:100,defense:60,method:'physical'}));
});
test('opt-in offensive Soultimate damages active opponents, but not benches',()=>{
 const combat=createCombat({enableResearchSoultimateEffects:true,seed:6});
 combat.giveSoul('A1',100);
 const c=combat.prepareSoultimate(0,'A1');
 assert.equal(c.ok,true);
 const before=combat.snapshot().squads[1];
 const result=combat.resolveSoultimate(0,c.token,true);
 assert.equal(result.effectStatus,'experimental');
 assert.equal(result.event.type,'special');
 assert.equal(result.effects.length,3);
 const after=combat.snapshot().squads[1];
 assert.ok(after.slice(0,3).some((m,i)=>m.hp<before[i].hp));
 assert.deepEqual(after.slice(3).map(m=>m.hp),before.slice(3).map(m=>m.hp));
 assert.equal(combat.snapshot().events.at(-1).type,'special');
 assert.equal(fullOf(combat.snapshot(),'A1').soul,0);
});
test('healing Soultimate restores injured allies without exceeding max HP',()=>{
 let verified=false;
 for(let seed=1;seed<25&&!verified;seed++){
  const combat=createCombat({enableResearchSoultimateEffects:true,seed});
  combat.pin(1,'A1');
  combat.simulate(12);
  const before=combat.snapshot();
  if(before.winner!==null||!before.clock.teams[0].frontIds.includes('A2'))continue;
  if(!before.squads[0].slice(0,3).some(m=>m.hp>0&&m.hp<m.maxHp))continue;
  combat.giveSoul('A2',100);
  const c=combat.prepareSoultimate(0,'A2');
  if(!c.ok)continue;
  const outcome=combat.resolveSoultimate(0,c.token,true);
  assert.equal(outcome.effectStatus,'experimental');
  assert.ok(outcome.effects.some(e=>e.kind==='heal'&&e.amount>0));
  assert.ok(combat.snapshot().squads[0].every(m=>m.hp<=m.maxHp));
  verified=true;
 }
 assert.equal(verified,true);
});
test('G-tech attack effects are recorded, cost all three ring adjacent meters',()=>{
 const combat=createCombat({enableResearchSoultimateEffects:true,seed:12});
 combat.setWatchMode(0,'zero');
 for(const id of ['A6','A1','A2'])combat.giveSoul(id,100);
 const c=combat.prepareSoultimate(0,'A1');
 assert.equal(c.ok,true);
 const r=combat.resolveSoultimate(0,c.token,true);
 assert.equal(r.kind,'g-tech');
 assert.equal(r.effectStatus,'experimental');
 assert.equal(r.effects.length,3);
 for(const id of ['A6','A1','A2'])assert.equal(fullOf(combat.snapshot(),id).soul,0);
});
test('snapshot does not expose mutable original special move references',()=>{
 const combat=createCombat({enableResearchSoultimateEffects:true});
 const shot=combat.snapshot();
 shot.squads[0][0].special.power=999;
 assert.notEqual(combat.snapshot().squads[0][0].special.power,999);
});
