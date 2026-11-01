import test from 'node:test';
import assert from 'node:assert/strict';
import {planResearchSpecial} from '../engine/special-effects.mjs';
import {assertResearchSpecialImpact,commitResearchSpecialHp,commitResearchSpecialStatus}
 from '../engine/special-impact-commit.mjs';
import {createEffectCommitter} from '../engine/effect-commit.mjs';
import {createInspiritLedger} from '../engine/inspirit.mjs';

// Independent oracle of the old custom Soultimate effect dispatch.
// It compares EFFECT-LEVEL snapshots, not the entire combat host timeline.
const SPECS=[
 {kind:'damage',scope:'front',power:105,damageKind:'attack'},
 {kind:'drain',scope:'front',power:85,damageKind:'technique'},
 {kind:'damage-status',scope:'front',power:110,damageKind:'attack',effect:'sleep',level:2},
 {kind:'heal',scope:'front',power:90},
 {kind:'buff',scope:'front',effect:'strength-up',level:2},
 {kind:'debuff',scope:'front',effect:'defense-down',level:2},
 {kind:'revive-heal',scope:'team',power:75},
 {kind:'revive',scope:'one',power:90}
];
const unit=(id,side,hp)=>({id,side,hp,maxHp:130,strength:74,spirit:82,
 defense:36,guard:false,inspiritResistance:id.endsWith('2')?65:10});
const rngFor=seed=>{
 let state=seed>>>0||1,draws=0;
 return {next(){state^=state<<13;state^=state>>>17;state^=state<<5;draws++;
  return (state>>>0)/4294967296},count(){return draws}};
};
function execute({spec,seed,scenario='normal',shared=false}){
 const caster=unit('A1',0,90),allies=[
  caster,unit('A2',0,scenario==='ko-ally'?0:30),unit('A3',0,70)
 ];
 const enemies=[unit('B1',1,scenario==='low-enemy'?1:110),unit('B2',1,95)];
 const members=[...allies,...enemies],byId=new Map(members.map(x=>[x.id,x]));
 const ledger=createInspiritLedger(members.map(x=>x.id));
 const effects=createEffectCommitter({
  resolveDirectDamage:(t,amount)=>{
   const paid=Math.min(t.hp,amount);
   return {amount:paid,hpAfter:t.hp-paid,activated:false};
  },onSurvival:()=>{},applyStatus:payload=>ledger.apply(payload),onStatus:()=>{}
 });
 const rng=rngFor(seed),events=[];
 const impacts=planResearchSpecial({spec,caster,allies,enemies});
 if(shared)for(const impact of impacts)assertResearchSpecialImpact(impact,{
  casterSide:0,target:byId.get(impact.targetId)
 });
 const status=(impact,target)=>{
  const payload={id:target.id,sign:impact.statusSign,
   effect:impact.statusEffect,level:impact.statusLevel,source:caster.id};
  if(!shared)effects.commitStatus(payload);
  else commitResearchSpecialStatus({impact,target,casterSide:0,casterId:caster.id,
   applyStatus:p=>effects.commitStatus(p)});
 };
 for(const item of impacts){
  const impact={...item},target=byId.get(impact.targetId);
  if(impact.kind==='buff'||impact.kind==='debuff'){
   impact.resisted=impact.kind==='debuff'&&rng.next()*100<target.inspiritResistance;
   if(!impact.resisted)status(impact,target);
   impact.applied=!impact.resisted;events.push(impact);continue;
  }
  if(['damage','drain','damage-status'].includes(impact.kind)){
   const result=shared?commitResearchSpecialHp({impact,target,effects}):
    effects.commitDamage(target,impact.amount);
   impact.amount=result.amount;impact.deltaHp=-result.amount;
   impact.hpAfter=result.hpAfter;impact.predictedKO=target.hp===0;
   if(result.activated)impact.lastStand=true;
  }else if(impact.kind==='heal'||impact.kind==='revive'){
   if(shared)commitResearchSpecialHp({impact,target,effects});
   else effects.commitHeal(target,Math.max(0,impact.hpAfter-target.hp));
  }else throw new RangeError('unexpected fixture kind');
  if(impact.kind==='damage-status'){
   impact.resisted=target.hp<=0||rng.next()*100<target.inspiritResistance;
   if(!impact.resisted)status(impact,target);
   impact.applied=!impact.resisted;
  }
  events.push(impact);
 }
 return {members:members.map(x=>({id:x.id,hp:x.hp,maxHp:x.maxHp})),
  statuses:Object.fromEntries(members.map(x=>[x.id,ledger.list(x.id)])),
  events,randomDrawCount:rng.count(),winner:enemies.every(x=>x.hp===0)?0:null};
}

test('V3-2: old and shared special effect snapshots match for eight categories, three HP setups, four seeds',()=>{
 let cases=0;
 for(const spec of SPECS)for(const scenario of ['normal','ko-ally','low-enemy'])
  for(const seed of [1,7,42,20261029]){
   const options={spec,seed,scenario};
   assert.deepEqual(execute({...options,shared:true}),execute({...options,shared:false}),
    spec.kind+'/'+scenario+'/'+seed);
   cases++;
  }
 assert.equal(cases,96);
});

test('V3-2: damage-status KO skips resistance draw in both effect paths',()=>{
 const spec=SPECS.find(x=>x.kind==='damage-status');
 const options={spec,seed:42,scenario:'low-enemy'};
 const old=execute({...options,shared:false}),now=execute({...options,shared:true});
 assert.deepEqual(now,old);
 const ko=now.events.find(x=>x.targetId==='B1'&&x.kind==='damage-status');
 assert.equal(ko.hpAfter,0);
 assert.equal(ko.applied,false);
 assert.equal(ko.resisted,true);
 assert.ok(now.events.some(x=>x.targetId==='B2'&&x.kind==='damage-status'));
});
