import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const rank2=()=>RENTAL_SQUAD.map((u,i)=>({...u,
 soultimateRank:i===0?2:1,
 special:i===0?{kind:'damage',scope:'front',power:110,damageKind:'attack'}:
  {kind:'heal',scope:'front',power:50}
}));
test('two rank-2 casters need 150 Soul before charge',()=>{
 const teams=[rank2(),rank2()];
 const game=createCombat({teams,researchSpecialEffects:true});
 assert.equal(game.snapshot().soul.teams[0][0].capacity,150);
 game.giveSoul('A1',100);
 assert.equal(game.prepareSoultimate(0,'A1').reason,'soul_not_full');
 game.giveSoul('A1',50);
 assert.equal(game.prepareSoultimate(0,'A1').ok,true);
});
test('default research build remains unchanged unless effects explicitly enabled',()=>{
 const game=createCombat();game.giveSoul('A1',100);
 const before=game.snapshot().squads.map(x=>x.map(u=>u.hp));
 const charge=game.prepareSoultimate(0,'A1');
 const out=game.resolveSoultimate(0,charge.token,true);
 assert.equal(out.effectStatus,'unimplemented');
 assert.deepEqual(game.snapshot().squads.map(x=>x.map(u=>u.hp)),before);
});
test('opt-in ranged attack touches only enemy front, not bench',()=>{
 const teams=[rank2(),rank2()];
 const game=createCombat({teams,researchSpecialEffects:true});
 game.giveSoul('A1',150);
 const before=game.snapshot(),charge=game.prepareSoultimate(0,'A1');
 const out=game.resolveSoultimate(0,charge.token,true),after=game.snapshot();
 assert.equal(out.effectStatus,'research-fixture');
 assert.equal(out.impacts.length,3);
 assert.deepEqual(out.impacts.map(x=>x.targetId),before.clock.teams[1].frontIds);
 for(let i=0;i<3;i++)assert.ok(after.squads[1][i].hp<before.squads[1][i].hp);
 for(let i=3;i<6;i++)assert.equal(after.squads[1][i].hp,before.squads[1][i].hp);
 assert.equal(after.soul.teams[0][0].soul,0);
 assert.equal(game.resolveSoultimate(0,charge.token,true).reason,'stale_or_unknown_charge');
});
test('KO via Soultimate disables further actions and can end match',()=>{
 const squadr=RENTAL_SQUAD.map((u,i)=>({...u,
  maxHp:4,
  special:{kind:'damage',scope:'front',power:900,damageKind:'attack'}
 }));
 const game=createCombat({teams:[squadr,squadr],researchSpecialEffects:true,autoRotateReserves:false});
 let rounds=0;
 while(game.snapshot().winner===null && rounds++<16){
  const state=game.snapshot(),side=1;
  if(!state.clock.teams[side].frontIds.some(id=>state.squads[1].find(x=>x.id===id).hp>0))
   game.rotate(1,1);
  game.giveSoul('A1',100);
  const charge=game.prepareSoultimate(0,'A1');
  assert.equal(charge.ok,true,'caster should be able to attack in round '+rounds);
  const result=game.resolveSoultimate(0,charge.token,true);
  assert.equal(result.effectStatus,'research-fixture');
 }
 assert.equal(game.snapshot().winner,0);
 assert.ok(game.snapshot().squads[1].every(u=>u.hp===0));
 assert.ok(game.snapshot().clock.teams[1].members.every(u=>u.canAct===false));
});
test('healing special never exceeds max HP, works after damage',()=>{
 const team=RENTAL_SQUAD.map((u,i)=>({...u,special:
  i===1?{kind:'heal',scope:'front',power:200}:
  {kind:'damage',scope:'front',power:100,damageKind:'attack'}
 }));
 const game=createCombat({seed:20261023,teams:[team,team],researchSpecialEffects:true});
 game.simulate(12);
 const before=game.snapshot().squads[0].map(x=>x.hp);
 game.giveSoul('A2',100);
 const charge=game.prepareSoultimate(0,'A2');
 assert.equal(charge.ok,true);
 const result=game.resolveSoultimate(0,charge.token,true);
 assert.equal(result.effectStatus,'research-fixture');
 const after=game.snapshot().squads[0];
 assert.ok(after.every(x=>x.hp<=x.maxHp));
 assert.ok(after.slice(0,3).every((x,i)=>x.hp>=before[i]));
});
test('invalid special power is rejected on battle creation',()=>{
 const party=RENTAL_SQUAD.map(u=>({...u}));
 party[0].special={kind:'damage',scope:'front',power:-4,damageKind:'attack'};
 assert.throws(()=>createCombat({teams:[party,RENTAL_SQUAD],researchSpecialEffects:true}));
});
