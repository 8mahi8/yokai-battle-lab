import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const guards=RENTAL_SQUAD.map(m=>({...m,maxHp:800,weights:[0,0,0,100],
 inspiritResistance:0}));
const statusTeam=guards.map((m,i)=>({...m,
 ...(i===0?{inspirit:'defense-down',inspiritLevel:2,
  weights:[0,0,100,0]}:i===1?{weights:[100,0,0,0]}:{})}));
const hpFixtureTeam=guards.map((m,i)=>({...m,
 ...(i===0?{inspirit:'hp-loss',weights:[0,0,100,0]}:{})}));

test('Phase20B host source-defined stat-down Inspirit changes real battle damage without HP ticking',()=>{
 const match=createMatchProtocol({battleOptions:{seed:41,teams:[statusTeam,guards]}});
 const flags=match.exportJournal().initialOptions;
 assert.equal(flags.researchStatInspirits,true);
 assert.equal(flags.researchTurnInspirits,undefined,
  'HP-over-time and speculative 5% damage must remain disabled');
 const pin=match.dispatch(0,1,{type:'pin',targetId:'B1'});
 assert.equal(pin.accepted,true);
 let debuff=null,affectedAttack=null;
 for(let n=0;n<140;n++){
  const res=match.advanceAuto();
  assert.equal(res.ok,true,JSON.stringify(res));
  const event=res.result;
  if(event.type!=='action')break;
  if(event.kind==='inspirit'&&event.effect==='defense-down'&&event.target==='B1'&&event.hit)
   debuff=event;
  if(debuff&&event.actor==='A2'&&event.kind==='attack'&&event.target==='B1'&&event.hit){
   affectedAttack=event;break;
  }
 }
 assert.ok(debuff,'a real owner auto action must apply the sourced DEF down status');
 assert.ok(affectedAttack,'a subsequent genuine physical hit must use that debuff');
 assert.equal(affectedAttack.damageResearch.defenseStage,-2);
 assert.equal(affectedAttack.damageResearch.defenseMultiplier,.7);
 assert.ok(match.snapshot().game.inspirits.B1.some(s=>
  s.sign==='negative'&&s.effect==='defense-down'&&s.mode==='persistent'));
 assert.equal(match.snapshot().game.events.some(x=>x.type==='turn-inspirit'),false);
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});

test('source-backed stat debuffs are independent of unsupported poison and regeneration coefficients',()=>{
 const battle=createCombat({researchDamageModel:true,researchStatInspirits:true});
 assert.doesNotThrow(()=>battle.applyInspirit({id:'B1',sign:'negative',
  effect:'strength-down',level:2}));
 assert.doesNotThrow(()=>battle.applyInspirit({id:'B2',sign:'negative',
  effect:'spirit-down',level:2}));
 assert.throws(()=>battle.applyInspirit({id:'B3',sign:'negative',
  effect:'hp-loss',level:2}),/HP-over-time/);
 assert.throws(()=>battle.applyInspirit({id:'A1',sign:'positive',
  effect:'hp-regen',level:2}),/HP-over-time/);
 assert.throws(()=>createCombat({researchStatInspirits:true}),/requires researchDamageModel/);
 assert.throws(()=>createCombat({researchDamageModel:true,researchStatInspirits:'yes'}),/must be boolean/);
 assert.throws(()=>createCombat({teams:[hpFixtureTeam,guards],
   researchDamageModel:true,researchStatInspirits:true}),/HP-over-time/);
 assert.doesNotThrow(()=>createCombat({teams:[statusTeam,guards],
   researchDamageModel:true,researchStatInspirits:true}));
 const match=createMatchProtocol({battleOptions:{seed:1,
  researchStatInspirits:false}});
 assert.equal(match.exportJournal().initialOptions.researchStatInspirits,false,
  'explicit disabled setting remains available for comparative research');
});

test('standard rental roster stays unchanged and special-effects/healing model is not secretly replaced',()=>{
 const match=createMatchProtocol();
 assert.deepEqual(match.snapshot().game.squads[0].map(u=>u.inspirit),
  RENTAL_SQUAD.map(u=>u.inspirit));
 assert.deepEqual(match.snapshot().game.squads[1].map(u=>u.inspirit),
  RENTAL_SQUAD.map(u=>u.inspirit));
 assert.equal(match.exportJournal().initialOptions.researchHealingVariance,undefined);
 assert.equal(match.exportJournal().initialOptions.researchTurnInspirits,undefined);
 assert.equal(match.exportJournal().initialOptions.researchSpecialEffects,true);
});
