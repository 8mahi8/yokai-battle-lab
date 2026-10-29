import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_MOVE_MASTER} from '../content/rental-move-master.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';
import {compileSoultimateEffectPlan,assertSoultimatePlanMatches}
 from '../engine/soultimate-effect-plan.mjs';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const master=id=>RENTAL_MOVE_MASTER.find(m=>m.id===id);

test('V3-2: all six rental specials compile without fabricating unknown original hit counts',()=>{
 const kinds=['damage','drain','buff','damage-status','revive-heal','debuff'];
 assert.equal(RENTAL_SOULTIMATE_MOVES.length,6);
 for(let i=0;i<6;i++){
  const authored=RENTAL_SOULTIMATE_MOVES[i];
  const plan=compileSoultimateEffectPlan(master(authored.id),authored.definition);
  assert.equal(plan.moveId,authored.id);
  assert.equal(plan.category,kinds[i]);
  assert.equal(plan.targetScope,authored.targetScope);
  assert.equal(plan.evidence,'fixture');
  assert.deepEqual(plan.sourceRefs,[]);
  assert.equal(Object.isFrozen(plan),true);
  assert.equal(Object.isFrozen(plan.stages),true);
  assert.equal(plan.orderEvidence,'legacy-playtest-only');
  for(const stage of plan.stages)assert.equal(Object.isFrozen(stage),true);
  assert.equal(assertSoultimatePlanMatches(plan,authored.definition),true);
  if(authored.hitPattern.type==='unknown'){
   assert.equal(plan.originalHitCount,null);
   assert.deepEqual(plan.hitPattern,{type:'unknown',count:null});
   assert.deepEqual(plan.stages[0].hitPattern,{type:'unknown',count:null});
  }else assert.equal(plan.hitPattern.type,'none');
 }
});

test('V3-2: composite semantic stages do not invent hit count or double heal',()=>{
 const plans=RENTAL_SOULTIMATE_MOVES.map(m=>
  compileSoultimateEffectPlan(master(m.id),m.definition));
 assert.deepEqual(plans.map(p=>p.stages.map(s=>s.type)),[
  ['damage'],['damage','heal-from-actual-damage'],['status'],
  ['damage','status-on-surviving-target'],['combined-revive-heal'],['status']
 ]);
 assert.equal(plans[1].stages[1].dependency,'actual-hp-drained');
 assert.equal(plans[3].stages[1].dependency,'after-damage-survivor');
 assert.equal(plans[4].stages[0].atomicPerTarget,true);
 assert.deepEqual(plans[4].stages[0].components,['revive','heal']);
 assert.equal(Object.isFrozen(plans[4].stages[0].components),true);
 assert.equal(plans[4].stages.length,1,
  'revive+heal is one legacy per-target impact, not two separate HP commits');
});

test('V3-2: source changes to power, hit pattern, target and status are rejected',()=>{
 const cases=[
  [{power:101},{}],
  [{targetScope:'single_enemy'},{}],
  [{category:'revive'},{}],
  [{hitPattern:{type:'single',count:0}},{}],
  [{statusEffect:'sleep'},{}],
  [{evidence:'documented',sourceRefs:[]},{}]
 ];
 const move=master(RENTAL_SOULTIMATE_MOVES[0].id);
 for(const [changes,ruleChanges] of cases)
  assert.throws(()=>compileSoultimateEffectPlan({...clone(move),...changes},
   {...RENTAL_SOULTIMATE_MOVES[0].definition,...ruleChanges}));
 const datum=RENTAL_SOULTIMATE_MOVES[3];
 const plan=compileSoultimateEffectPlan(master(datum.id),datum.definition);
 assert.throws(()=>assertSoultimatePlanMatches(plan,{...datum.definition,power:999}),
  /disagree/);
 assert.throws(()=>assertSoultimatePlanMatches(plan,{...datum.definition,effect:'sleep'}),
  /disagree/);
 assert.throws(()=>assertSoultimatePlanMatches(plan,{...datum.definition,scope:'front'}),
  /disagree/);
});

test('V3-2: real special resolution keeps legacy impact and deterministic replay',()=>{
 for(const seed of [3,42,20261029]){
  const options={seed,playtestSoulTuning:true,enableRentalSkills:true,
   researchSpecialEffects:true,researchDamageModel:true};
  const game=createCombat(options);
  const before=game.snapshot();
  game.giveSoul('A1',100);
  const ready=game.prepareSoultimate(0,'A1');
  assert.equal(ready.ok,true);
  const resolved=game.resolveSoultimate(0,ready.token,true);
  assert.equal(resolved.ok,true);
  assert.equal(resolved.impacts.length,3);
  const after=game.snapshot();
  assert.equal(after.events.some(e=>e.type==='special'),true);
  assert.deepEqual(before.squads[0].map(x=>x.maxHp),after.squads[0].map(x=>x.maxHp));
  const protocol=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:true}});
  for(let i=0;i<90&&protocol.snapshot().game.winner===null;i++)
   assert.equal(protocol.advanceAuto().ok,true);
  assert.equal(replayMatchJournal(protocol.exportJournal()).ok,true);
 }
});

test('V3-2: additional move definitions reuse effect families without new character branches',()=>{
 const make=(id,kind,targetScope,power,hitPattern)=>{
  const move={id,slot:'soultimate',category:kind,targetScope,
   power,statusEffect:null,hitPattern,evidence:'fixture',sourceRefs:[]};
  return move;
 };
 const multi=compileSoultimateEffectPlan(
  make('test:new-multi','damage','enemy_front',120,{type:'multi',count:6}),
  {kind:'damage',scope:'front',power:120,damageKind:'attack'});
 assert.equal(multi.stages[0].hitPattern.count,6);
 assert.equal(multi.originalHitCount,6);
 const heal=compileSoultimateEffectPlan(
  make('test:new-heal','heal','ally_front',70,{type:'none',count:0}),
  {kind:'heal',scope:'front',power:70});
 assert.equal(heal.stages[0].type,'heal');
 const revival=compileSoultimateEffectPlan(
  make('test:new-revival','revive','single_ally',90,{type:'none',count:0}),
  {kind:'revive',scope:'one',power:90});
 assert.equal(revival.stages[0].type,'revive');
 assert.throws(()=>compileSoultimateEffectPlan(
  make('test:bad-multi','damage','enemy_front',120,{type:'multi',count:100}),
  {kind:'damage',scope:'front',power:120,damageKind:'attack'}),
  /hit pattern/);
});
