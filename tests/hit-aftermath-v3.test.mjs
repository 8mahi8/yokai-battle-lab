import test from 'node:test';
import assert from 'node:assert/strict';
import {createHitAftermath} from '../engine/hit-aftermath.mjs';
import {createCombat,RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES}
 from '../engine/combat.mjs';

const actor={id:'A1',side:0,knockouts:0};
function fixture(){
 const calls=[],knockout={
  commitForCause:data=>{calls.push({type:'ko',...data});return data;}
 };
 const interrupted={target:'B1',stopped:false};
 const run=createHitAftermath({
  interrupt:(target,amount,critical)=>{
   calls.push({type:'interrupt',target:target.id,amount,critical});
   return amount>0?interrupted:null;
  },
  knockout,
  syncRevived:id=>calls.push({type:'revive',id})
 });
 return {run,calls,interrupted};
}
const target=hp=>({id:'B1',side:1,hp,maxHp:200});
const hit=(kind,amount,ko=false,extras={})=>({
 kind,amount,predictedKO:ko,...extras
});

test('V3-2: ordinary impact orders interrupt BEFORE KO and refreshes the pin',()=>{
 const {run,calls,interrupted}=fixture();
 assert.equal(run.afterOrdinaryHit({caster:actor,target:target(23),damage:12,critical:true}),interrupted);
 assert.deepEqual(calls,[{type:'interrupt',target:'B1',amount:12,critical:true}]);
 calls.length=0;
 assert.equal(run.afterOrdinaryHit({caster:actor,target:target(0),damage:23}),interrupted);
 assert.deepEqual(calls,[
  {type:'interrupt',target:'B1',amount:23,critical:false},
  {type:'ko',cause:'ordinary',caster:actor,target:target(0)}
 ]);
});

test('V3-2: special one-impact policy runs interrupt before after-skill KO',()=>{
 const {run,calls,interrupted}=fixture();
 const logged=[];
 run.afterSpecialImpact({caster:actor,target:target(0),
  impact:hit('damage-status',30,true),
  onInterrupt:i=>logged.push(i)});
 assert.deepEqual(logged,[interrupted]);
 assert.equal(calls.length,2);
 assert.deepEqual(calls[0],{type:'interrupt',target:'B1',amount:30,critical:false});
 assert.deepEqual(calls[1],{type:'ko',cause:'special',caster:actor,target:target(0)});
});

test('V3-2: per-hit special calls its interrupt per hit but does not double-roll',()=>{
 const {run,calls}=fixture();
 const t=target(0),recorded=[];
 run.afterSpecialStrike({target:t,damage:5,critical:true});
 run.afterSpecialStrike({target:t,damage:0,critical:false});
 run.afterSpecialImpact({caster:actor,target:t,
  impact:hit('damage',5,true),perHit:true,
  onInterrupt:i=>recorded.push(i)});
 assert.deepEqual(calls.map(x=>x.type),
  ['interrupt','interrupt','ko']);
 assert.equal(recorded.length,0,'aggregate must not repeat interruption after per-hit');
 assert.equal(calls[2].cause,'special');
});

test('V3-2: revive eligible member, but leave heals and statuses untouched',()=>{
 const {run,calls}=fixture(),ally={id:'A4',side:0,hp:90,maxHp:150};
 run.afterSpecialImpact({caster:actor,target:ally,
  impact:hit('revive',0,false,{revived:true})});
 run.afterSpecialImpact({caster:actor,target:ally,
  impact:hit('heal',0,false)});
 run.afterSpecialImpact({caster:actor,target:ally,
  impact:hit('buff',0,false)});
 assert.deepEqual(calls,[{type:'revive',id:'A4'}]);
});

test('V3-2: malformed aftermath requests fail before any state callbacks',()=>{
 const {run,calls}=fixture(),t=target(0);
 assert.throws(()=>run.afterOrdinaryHit({caster:actor,target:t,damage:-1}),/valid resolved/);
 assert.throws(()=>run.afterOrdinaryHit({caster:actor,target:t,damage:1,critical:'yes'}),/valid resolved/);
 assert.throws(()=>run.afterSpecialImpact({caster:actor,target:t,
  impact:{kind:'damage',amount:30}}),/valid resolved special/);
 assert.throws(()=>run.afterSpecialImpact({caster:actor,target:t,
  impact:hit('damage',-3,true)}),/valid resolved target/);
 assert.throws(()=>run.afterSpecialImpact({caster:actor,target:t,
  impact:hit('damage',10,true),perHit:'yes'}),/valid resolved special/);
 assert.deepEqual(calls,[]);
});

test('V3-2: built-in rental ordinary actions are exactly legacy-equal after aftermath migration',()=>{
 const school=RENTAL_SQUAD.map((unit,i)=>({...unit,
  attitude:SCHOOL_RENTAL_PERSONALITIES[i].attitude,
  loafChance:SCHOOL_RENTAL_PERSONALITIES[i].loafChance,
  weights:[...SCHOOL_RENTAL_PERSONALITIES[i].weights]
 }));
 for(const researchDamageModel of [false,true]){
  for(const seed of [3,42,8192,20261029]){
   const options={seed,playtestSoulTuning:true,enableRentalSkills:true,
    enableLoafing:true,researchDamageModel};
   const typed=createCombat(options);
   const legacy=createCombat({...options,teams:[school,school]});
   assert.deepEqual(typed.snapshot(),legacy.snapshot());
   for(let i=0;i<100;i++){
    assert.deepEqual(typed.step(),legacy.step());
    assert.deepEqual(typed.snapshot(),legacy.snapshot());
    if(typed.snapshot().winner!==null)break;
   }
  }
 }
});
