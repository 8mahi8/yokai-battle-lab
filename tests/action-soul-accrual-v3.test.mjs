import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoulSystem} from '../engine/soul.mjs';
import {PLAYTEST_SOUL_TUNING} from '../engine/playtest-soul-tuning.mjs';
import {createActionSoulAccrual} from '../engine/action-soul-accrual.mjs';
import {createCombat,RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES}
 from '../engine/combat.mjs';

const make=options=>{
 const teams=[0,1].map(side=>Array.from({length:6},(_,i)=>({
  id:(side?'B':'A')+(i+1),side,hp:100,maxHp:100
 })));
 const soul=createSoulSystem({teams:teams.map(team=>team.map(m=>({
  id:m.id,capacity:100
 })))});
 const vulnerable=new Set(),statuses={
  list:id=>id==='B1'?[{sign:'negative',effect:'sleep'}]:[]
 };
 const pipeline=createActionSoulAccrual({
  soul,teams,statuses,loafingActors:vulnerable,...options
 });
 return {teams,soul,pipeline,vulnerable,
  value:id=>soul.snapshot().teams.flat().find(x=>x.id===id).soul};
};
const perform=(f,{kind='attack',techniqueKind='damage',hit=true,
 target=f.teams[1][0],actor=f.teams[0][0]}={})=>{
 const action={kind};
 f.pipeline.afterAction({actor,kind,techniqueKind,hit,target,action});
 return action;
};

test('V3-2: playtest Soul gain honors hit vulnerability and capacity exactly',()=>{
 const f=make({playtestSoulTuning:true});
 const action=perform(f);
 assert.equal(f.value('A1'),Math.min(100,
  PLAYTEST_SOUL_TUNING.attackGain+PLAYTEST_SOUL_TUNING.vulnerableHitBonus));
 assert.deepEqual(action.soulPlaytest,{
  model:'playtest-estimate',gained:f.value('A1'),
  vulnerableHit:true,plannedGain:
   PLAYTEST_SOUL_TUNING.attackGain+PLAYTEST_SOUL_TUNING.vulnerableHitBonus
 });
 assert.equal(f.value('A2'),0);
 const missed=perform(f,{hit:false});
 assert.equal(missed.soulPlaytest.vulnerableHit,false);
 const blocked=perform(f,{kind:'guard',hit:false,target:null});
 assert.equal(blocked.soulPlaytest.plannedGain,PLAYTEST_SOUL_TUNING.nonAttackGain);
});

test('V3-2: experimental all-living accrual and owner-only nonattack are separate modes',()=>{
 const global=make({researchSoulGainPerAction:7});
 perform(global,{kind:'attack'});
 assert.equal(global.value('A1'),7);
 assert.equal(global.value('B6'),7);
 global.teams[1][5].hp=0;
 perform(global,{kind:'attack'});
 assert.equal(global.value('B6'),7);
 assert.equal(global.value('B5'),14);
 const owner=make({researchSoulRecoveryMode:'owner-nonattack'});
 perform(owner,{kind:'attack'});
 assert.equal(owner.value('A1'),0);
 perform(owner,{kind:'guard'});
 assert.equal(owner.value('A1'),5);
 perform(owner,{kind:'technique',techniqueKind:'heal'});
 assert.equal(owner.value('A1'),10);
 assert.equal(owner.value('A2'),0);
});

test('V3-2: Soul accrued only at post-action phase; malformed inputs do nothing',()=>{
 const f=make({playtestSoulTuning:true}),actor=f.teams[0][0];
 assert.throws(()=>f.pipeline.afterAction({
  actor,kind:'attack',hit:'true',target:f.teams[1][0],action:{}
 }),/valid resolved/);
 assert.throws(()=>f.pipeline.afterAction({
  actor,kind:'attack',hit:true,target:f.teams[1][0]
 }),/valid resolved/);
 assert.equal(f.value('A1'),0);
 assert.equal(f.value('B1'),0);
});

test('V3-2: all Soul modes preserve seeded built-in vs legacy 6x6 match state',()=>{
 const school=RENTAL_SQUAD.map((unit,i)=>({...unit,
  attitude:SCHOOL_RENTAL_PERSONALITIES[i].attitude,
  loafChance:SCHOOL_RENTAL_PERSONALITIES[i].loafChance,
  weights:[...SCHOOL_RENTAL_PERSONALITIES[i].weights]
 }));
 for(const flags of [
  {playtestSoulTuning:true,enableRentalSkills:true},
  {researchSoulRecoveryMode:'owner-nonattack'},
  {researchSoulGainPerAction:4}
 ]){
  const rentals=flags.playtestSoulTuning?school:RENTAL_SQUAD;
  for(const seed of [3,42,8192]){
   const a=createCombat({seed,...flags});
   const b=createCombat({seed,...flags,teams:[rentals,rentals]});
   assert.deepEqual(a.snapshot(),b.snapshot());
   for(let turn=0;turn<80;turn++){
    assert.deepEqual(a.step(),b.step());
    assert.deepEqual(a.snapshot(),b.snapshot());
    if(a.snapshot().winner!==null)break;
   }
  }
 }
});
