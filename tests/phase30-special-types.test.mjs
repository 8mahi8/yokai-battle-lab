import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpecialSpec,planResearchSpecial} from '../engine/special-effects.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const members=()=>RENTAL_SQUAD.map(x=>({...x,inspiritResistance:0}));
const game=()=>createCombat({teams:[members(),members()],
 researchSpecialEffects:true,researchStatInspirits:true,researchDamageModel:true});
const specById=(g,id)=>g.snapshot().squads.flat().find(x=>x.id===id);
const soulCharge=(g,side,id)=>{g.giveSoul(id,100);
 const p=g.prepareSoultimate(side,id);
 assert.equal(p.ok,true,JSON.stringify(p));
 const out=g.resolveSoultimate(side,p.token,true);
 assert.equal(out.ok,true,JSON.stringify(out));
 return out;};

test('phase30: revive/drain/composite special types validate and mark fixture-only effects',()=>{
 for(const spec of [
  {kind:'revive',scope:'one',power:85},
  {kind:'revive-heal',scope:'team',power:85},
  {kind:'drain',scope:'front',power:80,damageKind:'technique'},
  {kind:'damage-status',scope:'one',power:145,damageKind:'technique',
   effect:'spirit-down',level:2}
 ]){
  const checked=validateSpecialSpec(spec);
  assert.equal(checked.kind,spec.kind);
  assert.equal(Object.isFrozen(checked),true);
 }
 for(const spec of [
  {kind:'revive',scope:'front',power:85},
  {kind:'revive-heal',scope:'one',power:85},
  {kind:'revive-heal',scope:'front',power:85},
  {kind:'damage',scope:'team',power:85,damageKind:'attack'},
  {kind:'revive',scope:'one',power:0},
  {kind:'drain',scope:'front',power:100},
  {kind:'damage-status',scope:'one',power:145,damageKind:'technique',effect:'unknown',level:2},
  {kind:'damage-status',scope:'one',power:145,damageKind:'technique',effect:'sleep',level:5},
  {kind:'damage-status',scope:'one',power:145,damageKind:'technique',effect:'sleep'}
 ])assert.throws(()=>validateSpecialSpec(spec));
});

test('phase30: revive can select one KO bench and cannot revive a full-health ally',()=>{
 const caster={id:'A5',hp:120,maxHp:150,strength:80,spirit:100,defense:60};
 const all=[{...caster,id:'A1',hp:120},{...caster,id:'A2',hp:0},
  {...caster,id:'A3',hp:0},{...caster,id:'A4',hp:30},caster];
 const inputs={spec:{kind:'revive',scope:'one',power:85},caster,allies:all,enemies:[]};
 const before=JSON.stringify(all);
 const output=planResearchSpecial(inputs);
 assert.equal(output.length,1);
 assert.deepEqual([output[0].targetId,output[0].hpBefore,output[0].hpAfter],
  ['A2',0,85]);
 assert.equal(output[0].kind,'revive');
 assert.equal(output[0].revived,true);
 assert.deepEqual(planResearchSpecial({...inputs,allies:all.filter(x=>x.hp>0)}),[]);
 assert.equal(JSON.stringify(all),before,'planning must not mutate a roster');
});

test('phase30: HP drain never invents healing above actual damage or max health',()=>{
 const caster={id:'A2',hp:40,maxHp:100,strength:70,spirit:100,defense:50};
 const allies=[caster,{...caster,id:'A1',hp:50},{...caster,id:'A3',hp:100}];
 const foes=[{...caster,id:'B1',hp:80,maxHp:80,defense:30},
  {...caster,id:'B2',hp:10,maxHp:80,defense:30,guard:true}];
 const input={spec:{kind:'drain',scope:'front',power:120,damageKind:'technique'},
  caster,allies,enemies:foes};
 const before=JSON.stringify({allies,foes});
 const output=planResearchSpecial(input);
 const hurts=output.filter(x=>x.kind==='drain'),heals=output.filter(x=>x.linkedDrain);
 assert.equal(hurts.length,2);
 assert.equal(heals.length,2);
 assert.ok(hurts.every(x=>x.amount>0&&x.hpAfter>=0));
 assert.ok(heals.every(x=>x.amount>=0&&x.hpAfter<=100));
 assert.ok(heals.reduce((n,x)=>n+x.amount,0)<=
  Math.floor(hurts.reduce((n,x)=>n+x.amount,0)/2));
 assert.equal(JSON.stringify({allies,foes}),before);
 const empty=planResearchSpecial({...input,enemies:[]});
 assert.deepEqual(empty,[], 'empty foes cannot generate healing from nothing');
});

test('phase30: composite one-target technique plans the correct status after damage',()=>{
 const caster={id:'A4',hp:100,maxHp:100,strength:80,spirit:120,defense:40};
 const enemies=[{...caster,id:'B1',hp:200,maxHp:200,defense:60},
  {...caster,id:'B2',hp:200,maxHp:200,defense:60}];
 const result=planResearchSpecial({spec:{kind:'damage-status',scope:'one',
  power:100,damageKind:'technique',effect:'spirit-down',level:2},
  caster,allies:[caster],enemies,pinnedId:'B2',powerMultiplier:2});
 assert.equal(result.length,1);
 assert.equal(result[0].targetId,'B2');
 assert.equal(result[0].kind,'damage-status');
 assert.equal(result[0].statusSign,'negative');
 assert.equal(result[0].statusLevel,4);
 assert.equal(result[0].statusEffect,'spirit-down');
 assert.ok(result[0].amount>0);
});

test('phase30: default A4 composite actually damages and Inspirits target in host battle',()=>{
 const g=game();
 assert.equal(g.rotate(0,1).ok,true);
 const effect=soulCharge(g,0,'A4');
 assert.equal(effect.impacts.length,1);
 const impact=effect.impacts[0];
 assert.equal(impact.kind,'damage-status');
 assert.ok(impact.amount>0);
 assert.equal(impact.applied,true,'zero resistance means successful Inspirit');
 assert.ok(specById(g,impact.targetId).hp<specById(g,impact.targetId).maxHp);
 assert.ok(g.snapshot().inspirits[impact.targetId].some(x=>x.sign==='negative'&&
  x.effect==='spirit-down'));
 const cue=latestBattleCue(g.snapshot().events);
 assert.equal(cue.targets[0].kind,'damage');
});

test('phase30: default A2 drain resolves opponent damage via ordinary special engine',()=>{
 const g=game();
 const before=g.snapshot().squads[1].map(x=>x.hp);
 const done=soulCharge(g,0,'A2');
 assert.equal(done.impacts.filter(x=>x.kind==='drain').length,3);
 const after=g.snapshot().squads[1].map(x=>x.hp);
 assert.ok(before.slice(0,3).every((hp,i)=>after[i]<hp));
 assert.ok(done.impacts.every(x=>Number.isInteger(x.amount)&&x.amount>=0));
 assert.equal(g.snapshot().events.at(-1).model,'research-fixture');
});

test('phase30: A5 can revive a KO A2 from the bench and restore clock action eligibility',()=>{
 const left=members(),right=members();
 // Force one precise legal KO through the EXISTING opponent Soultimate engine.
 right[3].special={kind:'damage',scope:'one',power:999,damageKind:'attack'};
 const g=createCombat({teams:[left,right],researchSpecialEffects:true,
  researchDamageModel:true,researchStatInspirits:true});
 assert.equal(g.rotate(1,1).ok,true);
 g.pin(1,'A2');
 const defeat=soulCharge(g,1,'B4');
 assert.equal(defeat.impacts[0].targetId,'A2');
 assert.equal(g.snapshot().squads[0][1].hp,0);
 assert.equal(g.snapshot().clock.teams[0].members[1].canAct,false);
 // A5 is in reserve until the user rotates twice.
 assert.equal(g.rotate(0,1).ok,true);
 assert.equal(g.rotate(0,1).ok,true);
 const heal=soulCharge(g,0,'A5');
 assert.equal(heal.impacts.length,6,'all six allies get a heal or revival');
 const revived=heal.impacts.find(x=>x.targetId==='A2');
 assert.equal(revived.kind,'revive');
 assert.equal(revived.amount,85);
 assert.equal(heal.impacts.filter(x=>x.kind==='revive').length,1);
 assert.equal(g.snapshot().squads[0][1].hp,85);
 assert.equal(g.snapshot().clock.teams[0].members[1].canAct,true);
 assert.equal(g.snapshot().winner,null);
 const visual=latestBattleCue(g.snapshot().events);
 assert.equal(visual.targets[0].kind,'revive');
});

test('phase30: canonical match journal still replays after adding rental special kinds',()=>{
 const m=createMatchProtocol({battleOptions:{seed:20261026}});
 assert.deepEqual(m.snapshot().game.squads[0].map(x=>x.special.kind),
  ['damage','drain','buff','damage-status','revive-heal','debuff']);
 for(let i=0;i<20;i++)assert.equal(m.advanceAuto().ok,true);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
