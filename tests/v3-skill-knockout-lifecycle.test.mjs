import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkillHookPipeline,SKILL_HOOK_CATALOG} from '../engine/skill-hook-pipeline.mjs';
import {createKnockoutLifecycle} from '../engine/knockout-lifecycle.mjs';
import {SKILL_TRIAL} from '../engine/skill-effects.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

function fixture(enabled=true){
 const a=Array.from({length:6},(_,i)=>({
  id:'A'+(i+1),side:0,hp:200,maxHp:200,knockouts:0,
  skill:i===0?'momentum':i===4?'care':null
 }));
 const b=Array.from({length:6},(_,i)=>({
  id:'B'+(i+1),side:1,hp:200,maxHp:200,knockouts:0,skill:null
 }));
 const log=[],boosts=new Map(),byId=new Map([...a,...b].map(m=>[m.id,m]));
 const hooks=createSkillHookPipeline({
  enabled,skillOf:u=>u.skill,teams:[a,b],boosts,byId,
  emit:e=>log.push({kind:'event',value:e}),
  commitHeal:(u,n)=>{log.push({kind:'heal',id:u.id,amount:n});
   u.hp=Math.min(u.maxHp,u.hp+n);}
 });
 const ko=createKnockoutLifecycle({
  syncEligibility:id=>log.push({kind:'sync',id}),
  afterEnemyKO:(caster,target)=>hooks.afterEnemyKO(caster,target),
  refreshPins:()=>log.push({kind:'refresh'})
 });
 return {a,b,log,boosts,hooks,ko};
}

test('V3-2: all six rental passive skills have explicit trigger declarations',()=>{
 assert.deepEqual(Object.keys(SKILL_HOOK_CATALOG).sort(),
  ['momentum','care','lastStand','critImmune','sharpCrit','guardBreak'].sort());
 assert.deepEqual(SKILL_HOOK_CATALOG.momentum,
  {trigger:'after_ko',effect:'temporary_strength_stage'});
 assert.deepEqual(SKILL_HOOK_CATALOG.care,
  {trigger:'after_any_action',effect:'adjacent_ally_heal'});
 assert.deepEqual(SKILL_HOOK_CATALOG.lastStand,
  {trigger:'before_lethal_damage',effect:'survive_at_one_hp_once'});
 assert.equal(Object.isFrozen(SKILL_HOOK_CATALOG),true);
 assert.equal(Object.isFrozen(SKILL_HOOK_CATALOG.momentum),true);
});

test('V3-2: regular KO sync -> counter -> skill -> pin refresh; the five future owner turns start untouched',()=>{
 const f=fixture();
 f.b[0].hp=0;
 f.ko.commit({caster:f.a[0],target:f.b[0],refreshPin:true});
 assert.deepEqual(f.log.map(x=>x.kind),['sync','event','refresh']);
 assert.equal(f.a[0].knockouts,1);
 assert.deepEqual(f.boosts.get('A1'),{remainingTurns:SKILL_TRIAL.momentumOwnerTurns});
 assert.equal(f.log[1].value.skill,'momentum');
 const activated=f.boosts.get('A1');
 f.hooks.afterAnyAction(f.a[0],null);
 assert.strictEqual(f.boosts.get('A1'),activated,
  'the action which produced the KO is not one of five future turns');
 assert.equal(activated.remainingTurns,5);
 for(let i=0;i<5;i++){
  const before=f.boosts.get('A1');
  f.hooks.afterAnyAction(f.a[0],before);
 }
 assert.equal(f.boosts.has('A1'),false);
 assert.equal(f.log.filter(e=>e.kind==='event'&&e.value.kind==='終了').length,1);
});

test('V3-2: Soultimate KO keeps old boost -> eligibility sync order',()=>{
 const f=fixture();f.b[1].hp=0;
 f.ko.commit({caster:f.a[0],target:f.b[1],
  eligibilityPhase:'after-skill',refreshPin:false});
 assert.deepEqual(f.log.map(x=>x.kind),['event','sync']);
 assert.equal(f.a[0].knockouts,1);
});

test('V3-2: Poke KO does not create an unsupported actor-specific kill skill or KO count',()=>{
 const f=fixture();f.b[0].hp=0;
 f.ko.commit({target:f.b[0],refreshPin:true});
 assert.deepEqual(f.log,[{kind:'sync',id:'B1'},{kind:'refresh'}]);
 assert.equal(f.a[0].knockouts,0);
 assert.equal(f.boosts.has('A1'),false);
});

test('V3-2: Care uses the shared after-action hook even after ENEMY actions',()=>{
 const f=fixture();f.a[3].hp=187;f.a[5].hp=0;
 f.hooks.afterAnyAction(f.b[0],null);
 assert.equal(f.a[3].hp,191); // 2% of 200 research fixture
 assert.equal(f.a[5].hp,0,'cannot heal a KO ally');
 const care=f.log.filter(e=>e.kind==='event'&&e.value.skill==='care');
 assert.equal(care.length,1);
 assert.deepEqual(care[0].value,{type:'skill',actor:'A5',targetId:'A4',
  skill:'care',amount:4,label:'おせわ型',kind:'回復'});
});

test('V3-2: KO hook rejects unconfirmed and surviving lethal hits',()=>{
 const f=fixture();
 assert.throws(()=>f.ko.commit({caster:f.a[0],target:f.b[0]}),/zero-HP/);
 assert.throws(()=>f.ko.commit({target:{id:'B1',hp:0},eligibilityPhase:'unknown'}),
  /synchronization phase/);
 assert.equal(f.a[0].knockouts,0);
 assert.deepEqual(f.log,[]);
 assert.throws(()=>createSkillHookPipeline({enabled:true}),/host dependencies/);
 assert.throws(()=>createKnockoutLifecycle({}),/callback/);
});

test('V3-2: critical, guard, survival skill triggers use the one authoring catalog',()=>{
 const f=fixture();
 f.a[0].skill='sharpCrit';
 assert.equal(f.hooks.beforeCriticalRoll(f.a[0],3),
  Math.min(98,3+SKILL_TRIAL.sharpCritBonusUnits));
 assert.equal(f.hooks.beforeCriticalRoll(f.a[0],98),98);
 assert.equal(f.hooks.beforeCriticalRoll(f.a[1],3),3);
 f.b[0].skill='critImmune';
 assert.equal(f.hooks.beforeDefenderCriticalRoll(f.b[0],false),true);
 assert.equal(f.hooks.beforeDefenderCriticalRoll(f.b[1],false),false);
 assert.equal(f.hooks.beforeDefenderCriticalRoll(f.b[1],true),true);
 f.a[1].skill='guardBreak';
 assert.equal(f.hooks.beforeGuardedPhysicalHit(f.a[1],false),true);
 assert.equal(f.hooks.beforeGuardedPhysicalHit(f.a[0],false),false);
 assert.equal(f.hooks.beforeGuardedPhysicalHit(f.a[0],true),true);
 f.a[2].skill='lastStand';
 f.a[2].hp=20;
 assert.deepEqual(f.hooks.beforeLethalDamage(f.a[2],30,false),
  {hpAfter:1,amount:19,activated:true});
 assert.deepEqual(f.hooks.beforeLethalDamage(f.a[2],30,true),
  {hpAfter:0,amount:20,activated:false});
 assert.deepEqual(f.hooks.beforeLethalDamage(f.a[1],30,false),
  {hpAfter:0,amount:20,activated:false});
 assert.equal(f.a[2].hp,20,'before-damage hook must not mutate canonical HP');
 assert.equal(f.log.length,0,'passive resolvers are pure; caller commits and emits');
});

test('V3-2: no passive bonus when skills are disabled, and invalid inputs fail closed',()=>{
 const f=fixture(false);
 f.a[0].skill='sharpCrit';
 f.a[1].skill='guardBreak';
 f.a[2].skill='lastStand';
 f.b[0].skill='critImmune';
 f.a[2].hp=20;
 assert.equal(f.hooks.beforeCriticalRoll(f.a[0],3),3);
 assert.equal(f.hooks.beforeDefenderCriticalRoll(f.b[0],false),false);
 assert.equal(f.hooks.beforeGuardedPhysicalHit(f.a[1],false),false);
 assert.deepEqual(f.hooks.beforeLethalDamage(f.a[2],30,false),
  {hpAfter:0,amount:20,activated:false});
 assert.throws(()=>f.hooks.beforeCriticalRoll(f.a[0],99),/critical bonus/);
 assert.throws(()=>f.hooks.beforeDefenderCriticalRoll(f.b[0],'no'),/boolean/);
 assert.throws(()=>f.hooks.beforeGuardedPhysicalHit(f.a[1],1),/boolean/);
 assert.throws(()=>f.hooks.beforeLethalDamage(f.a[2],-1),/nonnegative/);
});

test('V3-2: after refactor a full canonical six-rental battle remains replayable',()=>{
 for(const seed of [7,212,8192]){
  const match=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:true}});
  const before=match.snapshot();
  assert.equal(before.game.squads[0].length,6);
  for(let step=0;step<135&&match.snapshot().game.winner===null;step++){
   const result=match.advanceAuto();
   assert.equal(result.ok,true);
  }
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
  const final=match.snapshot().game;
  for(const side of final.squads)for(const member of side)
   assert.ok(member.hp>=0&&member.hp<=member.maxHp);
 }
});
