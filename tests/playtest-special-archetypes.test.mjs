import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD,createCombat} from '../engine/combat.mjs';
import {validateSpecialSpec,planResearchSpecial} from '../engine/special-effects.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const source=()=>RENTAL_SQUAD.map(x=>({...x,weights:[0,0,0,100],inspiritResistance:0}));
const make=()=>createCombat({teams:[source(),source()],researchSpecialEffects:true,
  researchDamageModel:true,researchStatInspirits:true});
const statuses=(game,id)=>game.snapshot().inspirits[id];

test('six original rental designs now cover front damage/heal, one-target damage, team buff/debuff',()=>{
 const g=make();
 const specials=g.snapshot().squads[0].map(x=>x.special);
 assert.deepEqual(specials.map(x=>x.kind),
  ['damage','heal','buff','damage','heal','debuff']);
 assert.deepEqual(specials.map(x=>x.scope),
  ['front','front','front','one','front','front']);
 assert.equal(specials[2].effect,'strength-up');
 assert.equal(specials[5].effect,'defense-down');
});

test('buff and debuff planners reuse living front, do not fabricate HP changes',()=>{
 const caster={id:'A3',hp:100,maxHp:100,defense:70,strength:100,spirit:80};
 const allies=[caster,{...caster,id:'A2',hp:0},{...caster,id:'A1',hp:41}];
 const enemies=[{...caster,id:'B1',hp:55},{...caster,id:'B2',hp:0}];
 const spec={kind:'buff',scope:'front',effect:'strength-up',level:2};
 const before=JSON.stringify({allies,enemies});
 const plan=planResearchSpecial({spec,caster,allies,enemies});
 assert.deepEqual(plan.map(x=>x.targetId),['A3','A1']);
 assert.equal(plan[0].hpAfter,100);
 assert.equal(plan[1].amount,0);
 assert.equal(plan[0].statusSign,'positive');
 assert.equal(plan[0].statusLevel,2);
 const down=planResearchSpecial({spec:{kind:'debuff',scope:'front',
   effect:'defense-down',level:2},caster,allies,enemies,powerMultiplier:2});
 assert.deepEqual(down.map(x=>x.targetId),['B1']);
 assert.equal(down[0].statusSign,'negative');
 assert.equal(down[0].statusLevel,4);
 assert.equal(JSON.stringify({allies,enemies}),before);
});

test('status special validation rejects missing/unsupported statuses and invalid placement',()=>{
 for(const spec of [
  {kind:'buff',scope:'one',effect:'strength-up',level:2},
  {kind:'buff',scope:'front',effect:'defense-down',level:2},
  {kind:'debuff',scope:'front',effect:'strength-up',level:2},
  {kind:'debuff',scope:'front',effect:'defense-down'},
  {kind:'debuff',scope:'front',effect:'defense-down',level:0},
  {kind:'debuff',scope:'front',effect:'hp-loss',level:2},
  {kind:'resurrect',scope:'front',power:200}
 ])assert.throws(()=>validateSpecialSpec(spec));
});

test('team buff Soultimate adds actual positive Inspirits to living allies using normal ledger',()=>{
 const g=make();
 g.giveSoul('A3',100);
 // Bench A3 starts outside the ring; rotate once to bring its medal front.
 assert.equal(g.rotate(0,1).ok,true);
 assert.ok(g.snapshot().clock.teams[0].frontIds.includes('A3'));
 const ready=g.prepareSoultimate(0,'A3');
 assert.equal(ready.ok,true,JSON.stringify(ready));
 const fired=g.resolveSoultimate(0,ready.token,true);
 assert.equal(fired.effectStatus,'research-fixture');
 assert.equal(fired.impacts.length,3);
 assert.ok(fired.impacts.every(x=>x.kind==='buff'&&x.amount===0&&x.applied));
 assert.ok(fired.impacts.every(x=>statuses(g,x.targetId).some(y=>
   y.sign==='positive'&&y.effect==='strength-up'&&y.level===2)));
 assert.equal(g.snapshot().events.at(-1).type,'special');
});

test('debuff Soultimate applies three separate enemy negative Inspirits in host',()=>{
 const g=make();
 g.giveSoul('A6',100);
 assert.equal(g.rotate(0,-1).ok,true);
 assert.ok(g.snapshot().clock.teams[0].frontIds.includes('A6'));
 const ready=g.prepareSoultimate(0,'A6');
 assert.equal(ready.ok,true,JSON.stringify(ready));
 const fired=g.resolveSoultimate(0,ready.token,true);
 assert.equal(fired.effectStatus,'research-fixture');
 assert.deepEqual(fired.impacts.map(x=>x.targetId),['B1','B2','B3']);
 for(const x of fired.impacts){
  assert.equal(x.kind,'debuff');
  assert.equal(x.applied,true);
  assert.equal(x.resisted,false);
  assert.ok(statuses(g,x.targetId).some(y=>
   y.sign==='negative'&&y.effect==='defense-down'&&y.level===2));
 }
});

test('old host commands and deterministic initial seed replay remain valid with varied specials',()=>{
 const m=createMatchProtocol({battleOptions:{seed:20261025}});
 assert.equal(m.snapshot().game.squads[0][2].special.kind,'buff');
 assert.equal(m.snapshot().game.squads[1][5].special.kind,'debuff');
 for(let i=0;i<20;i++){
  const result=m.advanceAuto();
  assert.equal(result.ok,true);
 }
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
