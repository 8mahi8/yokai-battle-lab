import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {validateRentalSkill,resolveLastStand} from '../engine/skill-effects.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
const squad=()=>RENTAL_SQUAD.map(x=>({...x}));
const manual=(teams)=>createCombat({teams,enableRentalSkills:true,researchDamageModel:true,
 researchSpecialEffects:true,seed:20261026});

test('all six rental characters have researched original-style passive categories',()=>{
 assert.deepEqual(RENTAL_SQUAD.map(x=>x.skill),
  ['momentum','critImmune','lastStand','sharpCrit','care','guardBreak']);
 for(const x of RENTAL_SQUAD)assert.equal(validateRentalSkill(x.skill),x.skill);
 assert.throws(()=>validateRentalSkill('uncited-skill'),/skill/);
 const match=createMatchProtocol({battleOptions:{playtestSoulTuning:true,seed:20261026}});
 for(const side of [0,1]){
  assert.deepEqual(makeStageView(match.snapshot(),side).teams[side].members.map(u=>u.skill),
   ['momentum','critImmune','lastStand','sharpCrit','care','guardBreak']);
 }
});

test('one-use HP1 survival activates on 1HP or multi-HP lethal hit, never duplicates',()=>{
 const first=resolveLastStand({skill:'lastStand',hp:20,amount:30});
 assert.deepEqual(first,{hpAfter:1,amount:19,activated:true});
 assert.deepEqual(resolveLastStand({skill:'lastStand',hp:1,amount:30}),
  {hpAfter:1,amount:0,activated:true});
 assert.deepEqual(resolveLastStand({skill:'lastStand',hp:1,amount:30,spent:true}),
  {hpAfter:0,amount:1,activated:false});
 assert.deepEqual(resolveLastStand({skill:'lastStand',hp:20,amount:30,enabled:false}),
  {hpAfter:0,amount:20,activated:false});
 assert.deepEqual(resolveLastStand({skill:'lastStand',hp:50,amount:5}),
  {hpAfter:45,amount:5,activated:false});
 assert.throws(()=>resolveLastStand({skill:'lastStand',hp:1,amount:-1}));
});

test('A3 survives the first real Soultimate fatal hit at HP1, but dies on the second',()=>{
 const left=squad(),right=squad();
 right[3].special={kind:'damage',scope:'one',damageKind:'attack',power:999};
 const g=manual([left,right]);
 assert.equal(g.rotate(1,1).ok,true);
 g.pin(1,'A3');
 for(let attempt=0;attempt<2;attempt++){
  g.giveSoul('B4',100);
  const ready=g.prepareSoultimate(1,'B4');
  assert.equal(ready.ok,true);
  const hit=g.resolveSoultimate(1,ready.token,true);
  assert.equal(hit.ok,true);
  assert.equal(hit.impacts.length,1);
  assert.equal(hit.impacts[0].targetId,'A3');
  assert.equal(g.snapshot().squads[0][2].hp,attempt===0?1:0);
  assert.equal(hit.impacts[0].predictedKO,attempt!==0);
  assert.equal(g.snapshot().clock.teams[0].members[2].canAct,attempt===0);
  assert.equal(g.snapshot().spentLastStand.filter(x=>x==='A3').length,1);
  assert.equal(g.snapshot().squads[1][3].knockouts,attempt);
 }
 assert.equal(g.snapshot().events.filter(x=>x.type==='skill'&&x.skill==='lastStand').length,1);
});

test('B2 crit immunity suppresses chance to crit on a real attack, and B1 remains crittable',()=>{
 const left=squad().map((x,i)=>({...x,speed:i===0?900:1,weights:[100,0,0,0]}));
 const right=squad().map(x=>({...x,speed:1,weights:[100,0,0,0]}));
 const g=manual([left,right]);
 g.pin(0,'B2');
 const first=g.step();
 assert.equal(first.actor,'A1');
 assert.equal(first.target,'B2');
 assert.equal(first.criticalResearch.units,0);
 assert.equal(first.critical,false);
 assert.equal(first.damageResearch.critical,false);
});

test('A6 guard-break ignores an actual B1 guard; only physical strikes pierce',()=>{
 const left=squad().map((x,i)=>({...x,speed:i===5?850:1,weights:[100,0,0,0]}));
 const right=squad().map((x,i)=>({...x,speed:i===0?900:1,weights:[0,0,0,100]}));
 const g=manual([left,right]);
 assert.equal(g.rotate(0,1).ok,true);
 assert.equal(g.pin(0,'B1'),undefined);
 const guard=g.step();
 assert.equal(guard.actor,'B1');
 assert.equal(guard.kind,'guard');
 assert.equal(g.snapshot().squads[1][0].guard,true);
 let strike=null;
 for(let i=0;i<7;i++){
  const a=g.step();
  if(a.actor==='A6'){strike=a;break;}
 }
 assert.ok(strike,'A6 gets action');
 assert.equal(strike.target,'B1');
 assert.equal(strike.damageResearch.guardIgnored,true);
 assert.equal(strike.damageResearch.guardApplied,false);
});

test('six-skill authoritative match replays and old research baseline stays opt-out',()=>{
 const m=createMatchProtocol({battleOptions:{playtestSoulTuning:true,seed:20261026}});
 for(let i=0;i<35&&m.snapshot().game.winner===null;i++)
  assert.equal(m.advanceAuto().ok,true);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
 const legacy=createCombat({teams:[squad(),squad()],enableRentalSkills:false});
 assert.equal(legacy.snapshot().skillBoosts.A1,undefined);
 assert.deepEqual(legacy.snapshot().spentLastStand,[]);
});
