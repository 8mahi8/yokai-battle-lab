import test from 'node:test';
import assert from 'node:assert/strict';
import {planResearchSpecial} from '../engine/special-effects.mjs';
import {assertResearchSpecialImpact} from '../engine/special-impact-commit.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const unit=(id,side,hp=100)=>({id,side,hp,maxHp:150,
 strength:80,spirit:80,defense:30,guard:false});
const specials=[
 {kind:'damage',scope:'front',power:100,damageKind:'attack'},
 {kind:'drain',scope:'front',power:80,damageKind:'technique'},
 {kind:'damage-status',scope:'front',power:100,damageKind:'attack',
  effect:'sleep',level:2},
 {kind:'heal',scope:'front',power:100},
 {kind:'buff',scope:'front',effect:'strength-up',level:2},
 {kind:'debuff',scope:'front',effect:'defense-down',level:2},
 {kind:'revive-heal',scope:'team',power:75},
 {kind:'revive',scope:'one',power:75}
];

test('V3-2: all eight current custom special categories pass whole-plan preflight',()=>{
 const caster=unit('A1',0,90);
 const allies=[caster,unit('A2',0,0),unit('A3',0,70)];
 const enemies=[unit('B1',1,90),unit('B2',1,100)];
 const members=new Map([...allies,...enemies].map(u=>[u.id,u]));
 let total=0;
 for(const spec of specials){
  const impacts=planResearchSpecial({spec,caster,allies,enemies});
  for(const impact of impacts){
   const target=members.get(impact.targetId);
   assert.equal(assertResearchSpecialImpact(impact,{casterSide:0,target}),true);
   total++;
  }
 }
 assert.equal(total,18);
});

test('V3-2: malformed research impact set fails before committing earlier effects',()=>{
 const target=unit('B1',1),friend=unit('A2',0);
 const all=[
  {kind:'damage',targetId:'B1',amount:5},
  {kind:'heal',targetId:'A2',hpAfter:110},
  {kind:'unknown',targetId:'B1',amount:20}
 ];
 const lookup=new Map([[target.id,target],[friend.id,friend]]);
 const before=JSON.stringify([...lookup.values()]);
 let committed=0;
 // The real host performs this entire validation pass before any writes.
 // A malformed trailing impact must prevent ALL earlier valid effects.
 const execute=()=>{
  all.forEach(impact=>assertResearchSpecialImpact(impact,{
   casterSide:0,target:lookup.get(impact.targetId)
  }));
  for(const impact of all){
   if(impact.kind==='damage')lookup.get(impact.targetId).hp-=impact.amount;
   if(impact.kind==='heal')lookup.get(impact.targetId).hp=impact.hpAfter;
   committed++;
  }
 };
 assert.throws(execute,/research impact kind or target side invalid/);
 assert.equal(committed,0);
 assert.equal(JSON.stringify([...lookup.values()]),before);
 // If validation had succeeded, only then would the host start applying.
 const legal=all.slice(0,2);
 for(const impact of legal)
  assert.equal(assertResearchSpecialImpact(impact,{
   casterSide:0,target:lookup.get(impact.targetId)
  }),true);
});

test('V3-2: research preflight rejects invalid side, value and status without writes',()=>{
 const target=unit('B1',1),friend=unit('A2',0);
 const invalid=[
  [{kind:'damage',targetId:'B1',amount:-1},target],
  [{kind:'damage',targetId:'B1',amount:0.5},target],
  [{kind:'damage',targetId:'B2',amount:10},target],
  [{kind:'heal',targetId:'B1',hpAfter:110},target],
  [{kind:'heal',targetId:'A2',hpAfter:151},friend],
  [{kind:'revive',targetId:'A2',hpAfter:30},friend],
  [{kind:'buff',targetId:'B1',statusEffect:'strength-up',statusSign:'positive',statusLevel:2},target],
  [{kind:'debuff',targetId:'B1',statusEffect:'sleep',statusSign:'positive',statusLevel:2},target],
  [{kind:'damage-status',targetId:'B1',amount:5,statusEffect:'sleep',statusSign:'negative',statusLevel:5},target],
  [{kind:'debuff',targetId:'B1',statusEffect:'sleep',statusSign:'negative',statusLevel:2},unit('B1',1,0)],
  [{kind:'unknown',targetId:'B1'},target]
 ];
 for(const [impact,u] of invalid){
  const before={...u};
  assert.throws(()=>assertResearchSpecialImpact(impact,{casterSide:0,target:u}));
  assert.deepEqual(u,before);
 }
});

test('V3-2: preflight does not alter seeded snapshots for legal research specials',()=>{
 for(const spec of specials){
  const roster=RENTAL_SQUAD.map((u,i)=>({...u,...(i===0?{special:spec}:{})}));
  const config={seed:20261029,teams:[roster,roster],researchSpecialEffects:true,
   researchDamageModel:true,researchStatInspirits:true};
  const run=()=>{
   const game=createCombat(config);
   game.giveSoul('A1',250);
   const ready=game.prepareSoultimate(0,'A1');
   assert.equal(ready.ok,true);
   const result=game.resolveSoultimate(0,ready.token,true);
   assert.equal(result.ok,true);
   return {result,snapshot:game.snapshot()};
  };
  assert.deepEqual(run(),run(),'seeded research special '+spec.kind);
 }
});
