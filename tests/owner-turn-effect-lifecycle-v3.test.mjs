import test from 'node:test';
import assert from 'node:assert/strict';
import {createEffectCommitter} from '../engine/effect-commit.mjs';
import {createInspiritLedger} from '../engine/inspirit.mjs';
import {calculateTurnInspirit} from '../engine/turn-inspirit.mjs';
import {createOwnerTurnEffectLifecycle} from '../engine/owner-turn-effect-lifecycle.mjs';
import {createCombat,RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES}
 from '../engine/combat.mjs';

function fixture(){
 const statuses=createInspiritLedger(['A1','A2','B1']);
 let survival=0,direct=0,eligibility=[],pinRefresh=0;
 const effects=createEffectCommitter({
  resolveDirectDamage:(target,amount)=>{
   direct++;
   return {amount,activated:false,hpAfter:Math.max(0,target.hp-amount)};
  },
  onSurvival:()=>{survival++;},
  applyStatus:spec=>statuses.apply(spec),
  onStatus:()=>{}
 });
 const timeline=createOwnerTurnEffectLifecycle({
  statuses,effects,syncEligibility:id=>eligibility.push(id),
  refreshPins:()=>{pinRefresh++;}
 });
 return {statuses,effects,timeline,counters:()=>({
  direct,survival,eligibility:[...eligibility],pinRefresh
 })};
}

test('V3-2: canonical timed HP damage differs explicitly from direct-hit Last Stand',()=>{
 const f=fixture(),member={id:'A1',hp:20,maxHp:100};
 const before=f.effects.commitTimedHp(member,{kind:'loss',amount:20});
 assert.deepEqual(before,{kind:'loss',amount:20,hpAfter:0});
 assert.equal(member.hp,0);
 assert.deepEqual(f.counters(),{
  direct:0,survival:0,eligibility:[],pinRefresh:0
 });
 assert.throws(()=>f.effects.commitTimedHp(member,{kind:'hit',amount:10}),/timed HP/);
 assert.throws(()=>f.effects.commitTimedHp(member,{kind:'regen',amount:-1}),/nonnegative/);
 assert.equal(member.hp,0);
 const healed=f.effects.commitTimedHp(member,{kind:'regen',amount:400});
 assert.deepEqual(healed,{kind:'regen',amount:100,hpAfter:100});
 assert.equal(f.counters().survival,0);
});

test('V3-2: owner DoT uses existing research calculation and synchronizes lethal ticks',()=>{
 const f=fixture(),actor={id:'A1',hp:20,maxHp:100};
 f.statuses.apply({id:'A1',sign:'negative',effect:'hp-loss',level:4});
 const expected=calculateTurnInspirit({
  statuses:f.statuses.list('A1'),currentHp:20,maxHp:100
 });
 const result=f.timeline.applyHpTick(actor);
 assert.deepEqual(result,{id:'A1',...expected});
 assert.equal(result.amount,20);
 assert.equal(actor.hp,0);
 assert.deepEqual(f.counters(),{
  direct:0,survival:0,eligibility:['A1'],pinRefresh:1
 });
 assert.equal(f.timeline.applyHpTick(actor),null,'KO unit does not take another tick');
});

test('V3-2: owner regen and loss netting do not change before/after HP semantics',()=>{
 const f=fixture(),actor={id:'A2',hp:60,maxHp:100};
 f.statuses.apply({id:'A2',sign:'positive',effect:'hp-regen',level:3});
 f.statuses.apply({id:'A2',sign:'negative',effect:'hp-loss',level:1});
 const research=calculateTurnInspirit({
  statuses:f.statuses.list('A2'),currentHp:60,maxHp:100
 });
 const actual=f.timeline.applyHpTick(actor);
 assert.deepEqual(actual,{id:'A2',...research});
 assert.equal(actor.hp,70); // net 2 levels of 5% max HP (research fixture)
 assert.deepEqual(f.counters(),{
  direct:0,survival:0,eligibility:[],pinRefresh:0
 });
});

test('V3-2: positive 30 GLOBAL actions vs owner-turn duration vs persistent negatives',()=>{
 const f=fixture();
 f.statuses.apply({id:'A1',sign:'positive',effect:'strength-up',level:1});
 f.statuses.apply({id:'A1',sign:'positive',effect:'research-marker',duration:2});
 f.statuses.apply({id:'A1',sign:'negative',effect:'sleep',level:1});
 f.timeline.expireAfterAction('B1');
 assert.equal(f.statuses.list('A1')[0].remaining,29);
 assert.equal(f.statuses.list('A1')[1].remaining,2);
 assert.equal(f.statuses.list('A1')[2].remaining,null);
 f.timeline.expireAfterAction('A1');
 assert.equal(f.statuses.list('A1')[0].remaining,28);
 assert.equal(f.statuses.list('A1')[1].remaining,1);
 const expired=f.timeline.expireAfterAction('A1');
 assert.equal(expired.length,1);
 assert.equal(expired[0].effect,'research-marker');
 assert.equal(f.statuses.list('A1')[0].remaining,27);
 assert.equal(f.statuses.list('A1').some(s=>s.effect==='sleep'),true);
 assert.deepEqual(f.counters().eligibility,['A1']);
});

test('V3-2: full research battle matches seeded custom baseline with timed effects',()=>{
 const school=RENTAL_SQUAD.map((member,i)=>({...member,
  attitude:SCHOOL_RENTAL_PERSONALITIES[i].attitude,
  loafChance:SCHOOL_RENTAL_PERSONALITIES[i].loafChance,
  weights:[...SCHOOL_RENTAL_PERSONALITIES[i].weights]
 }));
 for(const seed of [3,42,20261029]){
  const opts={seed,playtestSoulTuning:true,enableRentalSkills:true,
   researchDamageModel:true,researchStatInspirits:true,researchTurnInspirits:true};
  const a=createCombat(opts),b=createCombat({...opts,teams:[school,school]});
  for(const g of [a,b]){
   g.applyInspirit({id:'A1',sign:'negative',effect:'hp-loss',level:2});
   g.applyInspirit({id:'A2',sign:'positive',effect:'hp-regen',level:2});
  }
  assert.deepEqual(a.snapshot(),b.snapshot());
  for(let step=0;step<90;step++){
   assert.deepEqual(a.step(),b.step());
   assert.deepEqual(a.snapshot(),b.snapshot());
   if(a.snapshot().winner!==null)break;
  }
 }
});
