import test from 'node:test';
import assert from 'node:assert/strict';
import {createEffectCommitter} from '../engine/effect-commit.mjs';
import {commitResearchSpecialHp} from '../engine/special-impact-commit.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

function fixture(hp=80,maxHp=100){
 const target={id:'B1',side:1,hp,maxHp},events=[];
 const real=createEffectCommitter({
  resolveDirectDamage:(t,amount)=>{
   const actual=Math.min(t.hp,amount);
   return {amount:actual,hpAfter:t.hp-actual,activated:false};
  },
  onSurvival:()=>events.push('survival'),
  applyStatus:()=>{},onStatus:()=>{}
 });
 const effects={
  commitDamage:(t,amount)=>{events.push(['damage',amount]);return real.commitDamage(t,amount)},
  commitHeal:(t,amount)=>{events.push(['heal',amount]);return real.commitHeal(t,amount)}
 };
 return {target,events,effects};
}

test('V3-2: custom Soultimate attack, drain and status-attack use one HP commit',()=>{
 for(const kind of ['damage','drain','damage-status']){
  const f=fixture();
  const result=commitResearchSpecialHp({impact:{
   targetId:'B1',kind,amount:35,hpBefore:80,hpAfter:45
  },target:f.target,effects:f.effects});
  assert.equal(result.amount,35);
  assert.equal(result.hpAfter,45);
  assert.equal(f.target.hp,45);
  assert.deepEqual(f.events,[['damage',35]]);
 }
});

test('V3-2: custom Soultimate heal and revive use one bounded HP commit',()=>{
 for(const [kind,before,after] of [
  ['heal',80,100],['heal',80,80],['revive',0,60],['revive',0,100]
 ]){
  const f=fixture(before);
  const result=commitResearchSpecialHp({impact:{
   targetId:'B1',kind,hpBefore:before,hpAfter:after
  },target:f.target,effects:f.effects});
  assert.equal(f.target.hp,after);
  assert.equal(result.hpAfter,after);
  assert.deepEqual(f.events,[['heal',after-before]]);
 }
});

test('V3-2: invalid and unknown custom impact cannot mutate host HP',()=>{
 const f=fixture(),before={...f.target};
 const invalid=[
  {targetId:'B1',kind:'unknown',hpAfter:0},
  {targetId:'B1',kind:'buff',hpAfter:0},
  {targetId:'B1',kind:'debuff',hpAfter:0},
  {targetId:'B1',kind:'damage',amount:-1},
  {targetId:'B1',kind:'damage',amount:0.4},
  {targetId:'B1',kind:'damage-status',amount:NaN},
  {targetId:'B1',kind:'heal',hpAfter:79},
  {targetId:'B1',kind:'heal',hpAfter:101},
  {targetId:'B1',kind:'revive',hpAfter:50.5},
  {targetId:'A1',kind:'heal',hpAfter:90}
 ];
 for(const impact of invalid){
  assert.throws(()=>commitResearchSpecialHp({
   impact,target:f.target,effects:f.effects
  }));
  assert.deepEqual(f.target,before);
  assert.deepEqual(f.events,[]);
 }
 assert.throws(()=>commitResearchSpecialHp({
  impact:{targetId:'B1',kind:'heal',hpAfter:90},
  target:f.target,effects:{}
 }));
 assert.deepEqual(f.target,before);
});

test('V3-2: legacy custom special categories still replay deterministically',()=>{
 const cases=[
  {kind:'damage',scope:'front',power:100,damageKind:'attack'},
  {kind:'drain',scope:'front',power:80,damageKind:'technique'},
  {kind:'damage-status',scope:'front',power:80,damageKind:'attack',
   effect:'sleep',level:2},
  {kind:'heal',scope:'front',power:100},
  {kind:'buff',scope:'front',effect:'strength-up',level:2},
  {kind:'debuff',scope:'front',effect:'defense-down',level:2},
  {kind:'revive-heal',scope:'team',power:75},
  {kind:'revive',scope:'one',power:75}
 ];
 for(const special of cases){
  const roster=RENTAL_SQUAD.map(x=>({...x}));
  roster[0]={...roster[0],special};
  const options={teams:[roster,roster],seed:20261029,researchSpecialEffects:true};
  const make=()=>{
   const game=createCombat(options);
   game.giveSoul('A1',250);
   const prepared=game.prepareSoultimate(0,'A1');
   assert.equal(prepared.ok,true);
   const outcome=game.resolveSoultimate(0,prepared.token,true);
   assert.equal(outcome.ok,true);
   return {outcome,snapshot:game.snapshot()};
  };
  assert.deepEqual(make(),make(),JSON.stringify(special));
 }
});
