import test from 'node:test';
import assert from 'node:assert/strict';
import {planYw2FriendlyFire,YW2_FRIENDLY_FIRE}
 from '../engine/confusion-action.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {INSPIRIT_EFFECT_MASTER} from '../content/inspirit-effect-master.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const statuses=(...levels)=>levels.map(level=>({
 effect:'friendly-fire',sign:'negative',level
}));
const actor={id:'A1',side:0,hp:100};
const allies=[
 {id:'A1',side:0,hp:100},{id:'A2',side:0,hp:100},
 {id:'A3',side:0,hp:50},{id:'B1',side:1,hp:100}
];
function teams(){
 return [copy(RENTAL_SQUAD),copy(RENTAL_SQUAD)].map(team=>
  team.map((m,i)=>({...m,maxHp:9000,
   speed:i===0?400:45,attackPower:1,techniquePower:1,
   strength:12,spirit:12,defense:500,
   weights:[100,0,0,0],loafChance:0})));
}
test('V3-4-17 original YW2 semantics are distinct from explicitly unverified target fixture',()=>{
 assert.equal(YW2_FRIENDLY_FIRE.effect,'friendly-fire');
 assert.equal(YW2_FRIENDLY_FIRE.chancePerLevelPercent,10);
 assert.equal(YW2_FRIENDLY_FIRE.maxLevel,5);
 assert.equal(YW2_FRIENDLY_FIRE.originalTargetSelection,'unknown');
 assert.equal(Object.isFrozen(YW2_FRIENDLY_FIRE),true);
 const entry=INSPIRIT_EFFECT_MASTER.find(x=>x.id==='friendly-fire');
 assert.equal(entry.sign,'negative');
 assert.equal(entry.category,'target_override');
 assert.equal(entry.evidence,'documented');
 assert.ok(entry.sourceRefs.some(x=>x.includes('inspirits.php?g=yw2')));
});

test('V3-4-17 friendly-fire owner-turn chance 10%/level and capped 50%, boundary rolls',()=>{
 let calls=0;
 const random=()=>{calls++;return calls===1?.099:0;};
 const lv1=planYw2FriendlyFire({actor,statuses:statuses(1),
  allies,random});
 assert.equal(lv1.chancePercent,10);
 assert.equal(lv1.level,1);
 assert.equal(lv1.triggered,true);
 assert.equal(lv1.targetId,'A2');
 assert.equal(lv1.targetModel,'research-unverified');
 assert.equal(calls,2,'one chance roll plus one research target roll');
 assert.equal(Object.isFrozen(lv1),true);
 const lv3=planYw2FriendlyFire({actor,statuses:statuses(3),
  allies,random:()=>.299});
 assert.equal(lv3.chancePercent,30);
 assert.equal(lv3.triggered,true);
 const noLv3=planYw2FriendlyFire({actor,statuses:statuses(3),
  allies,random:()=>.3});
 assert.equal(noLv3.triggered,false);
 assert.equal(noLv3.targetId,null);
 const max=planYw2FriendlyFire({actor,statuses:statuses(4,4),
  allies,random:()=>.5});
 assert.equal(max.level,5);
 assert.equal(max.chancePercent,50);
 assert.equal(max.triggered,false);
});

test('V3-4-17 no status, no other living ally and rejected malformed statuses never spend hidden RNG',()=>{
 let count=0;
 const random=()=>{count++;return .01;};
 assert.equal(planYw2FriendlyFire({
  actor,statuses:[{effect:'sleep',sign:'negative',level:1}],
  allies,random
 }),null);
 assert.equal(count,0);
 const alone=planYw2FriendlyFire({actor,statuses:statuses(4),
  allies:[actor,{id:'A2',side:0,hp:0},{id:'B1',side:1,hp:100}],random});
 assert.equal(alone.active,true);
 assert.equal(alone.triggered,false);
 assert.equal(alone.reason,'no_other_living_front_ally');
 assert.equal(count,0);
 for(const bad of [[{effect:'friendly-fire',sign:'positive',level:1}],
  [{effect:'friendly-fire',sign:'negative',level:5}],
  [{effect:'friendly-fire',sign:'negative',level:0}]]){
  assert.throws(()=>planYw2FriendlyFire({actor,statuses:bad,allies,random}),
   /invalid negative/);
 }
 assert.equal(count,0);
 assert.throws(()=>planYw2FriendlyFire({actor,statuses:statuses(1),
  allies,random:()=>1}),/RNG/);
});

test('V3-4-17 source-derived persistent status redirects a real auto-attack to a living ally',()=>{
 const game=createCombat({seed:117,teams:teams(),researchDamageModel:true,
  researchYw2Confusion:true});
 game.applyInspirit({id:'A1',sign:'negative',effect:'friendly-fire',
  source:'B1',level:4});
 game.applyInspirit({id:'A1',sign:'negative',effect:'friendly-fire',
  source:'B1',level:1});
 let event=null;
 for(let i=0;i<320;i++){
  const step=game.step();
  if(step.type!=='action')break;
  if(step.actor==='A1'&&step.confusion?.triggered){event=step;break;}
 }
 assert.ok(event,'a seeded YW2 50% owner-turn test must trigger');
 assert.equal(event.confusion.level,5);
 assert.equal(event.confusion.chancePercent,50);
 assert.equal(event.kind,'attack');
 assert.ok(['A2','A3'].includes(event.target),event.target);
 assert.equal(event.target,event.confusion.targetId);
 assert.ok(event.amount>=0);
 const shot=game.snapshot();
 assert.equal(shot.inspirits.A1.filter(s=>s.effect==='friendly-fire').length,2);
 assert.equal(event.targetHp,shot.squads[0].find(x=>x.id===event.target).hp);
});

test('V3-4-17 natural research Inspirit application, no duplicate status store, purify bench',()=>{
 const t=teams();
 t[0][0].inspirit='friendly-fire';
 t[0][0].inspiritLevel=3;
 t[0][0].weights=[0,0,100,0];
 const game=createCombat({seed:5,teams:t,researchDamageModel:true,
  researchYw2Confusion:true});
 let applied=false;
 for(let i=0;i<100;i++){
  const e=game.step();if(e.type!=='action')break;
  if(e.actor==='A1'&&e.kind==='inspirit'&&e.hit){
   const s=game.snapshot().inspirits[e.target]||[];
   assert.ok(s.some(x=>x.effect==='friendly-fire'&&x.level===3));
   applied=true;break;
  }
 }
 assert.equal(applied,true,'original status shares ordinary Inspirit status ledger');
 game.applyInspirit({id:'A6',sign:'negative',effect:'friendly-fire',
  source:'B1',level:1});
 assert.equal(game.purify(0,'A6').ok,true);
 assert.equal(game.snapshot().inspirits.A6.some(x=>x.effect==='friendly-fire'),false);
});

test('V3-4-17 ally KO never yields an ENEMY KO count or enemy KO skill trigger',()=>{
 const t=teams();
 t[0][0].strength=999;t[0][0].attackPower=999;
 t[0][1].maxHp=1;
 for(const member of t[1])member.weights=[0,0,0,100];
 const game=createCombat({seed:11,teams:t,researchDamageModel:true,
  researchYw2Confusion:true,enableRentalSkills:true});
 game.applyInspirit({id:'A1',sign:'negative',effect:'friendly-fire',
  source:'B1',level:4});
 game.applyInspirit({id:'A1',sign:'negative',effect:'friendly-fire',
  source:'B1',level:1});
 let killed=false;
 for(let i=0;i<450;i++){
  const e=game.step();if(e.type!=='action')break;
  if(e.actor==='A1'&&e.confusion?.triggered&&e.target==='A2'&&e.hit){
   assert.equal(game.snapshot().squads[0][1].hp,0);
   assert.equal(game.snapshot().squads[0][0].knockouts,0);
   killed=true;break;
  }
 }
 assert.ok(killed,'seeded own-side lethal-hit branch must be exercised');
});

test('V3-4-17 explicit research is isolated from standard six rentals and school online allowlist',()=>{
 const t=teams();
 assert.throws(()=>createCombat({researchYw2Confusion:true,
  researchDamageModel:true}),/custom teams/);
 assert.throws(()=>createCombat({teams:t,researchYw2Confusion:true}),
  /researchDamageModel/);
 assert.throws(()=>createCombat({teams:t,researchDamageModel:true,
  researchYw2Confusion:'yes'}),/boolean/);
 assert.throws(()=>createMatchProtocol({battleOptions:{researchYw2Confusion:true}}),
  /forbids option/);
 const invalid=teams();invalid[0][0].inspirit='friendly-fire';
 assert.throws(()=>createCombat({teams:invalid,researchDamageModel:true}),
  /requires researchYw2Confusion/);
 const bare=createCombat({seed:18,teams:teams(),researchDamageModel:true});
 assert.throws(()=>bare.applyInspirit({id:'A1',sign:'negative',
  effect:'friendly-fire'}),/opt-in/);
 const standard=createCombat({seed:18,teams:teams(),researchDamageModel:true});
 const study=createCombat({seed:18,teams:teams(),researchDamageModel:true,
  researchYw2Confusion:true});
 for(let i=0;i<80;i++){
  assert.deepEqual(study.step(),standard.step());
  assert.deepEqual(study.snapshot(),standard.snapshot());
  if(standard.snapshot().winner!==null)break;
 }
});
