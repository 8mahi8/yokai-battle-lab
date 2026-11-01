import test from 'node:test';
import assert from 'node:assert/strict';
import {YW2_SOURCE_ACTION_SKILL_MASTER,YW2_SOURCE_ACTION_SKILL_OWNERS,
 getYw2OriginalActionSkill}
 from '../content/yw2-original-action-skill-master.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
function teams(){
 return [copy(RENTAL_SQUAD),copy(RENTAL_SQUAD)].map(t=>t.map(x=>({
  ...x,maxHp:7000,attackPower:1,techniquePower:1,strength:1,spirit:1,
  defense:250,loafChance:0
 })));
}
function game(teamsArg,seed=212){
 return createCombat({seed,teams:teamsArg,researchYw2ActionOverrides:true,
  researchSpecialEffects:true});
}
test('V3-4-15 Wazzat and Houzzat share ONE certified YW2 Skill master record',()=>{
 assert.equal(YW2_SOURCE_ACTION_SKILL_MASTER.length,1);
 assert.equal(YW2_SOURCE_ACTION_SKILL_OWNERS.length,2);
 const w=getYw2OriginalActionSkill('yw2:wazzat');
 const h=getYw2OriginalActionSkill('yw2:houzzat');
 assert.equal(w.characterName,'わすれん帽');
 assert.equal(h.characterName,'メゾン・ドワスレ');
 assert.strictEqual(w.skill,h.skill,'no duplicated per-character Skill rules');
 assert.equal(w.skill.id,'yw2:skill:mamoriwasure');
 assert.equal(w.skill.displayName,'まもりわすれ');
 assert.equal(w.skill.effect,'forgot-to-guard');
 assert.equal(w.skill.activation,'while_alive_including_bench');
 assert.equal(w.skill.target,'both_teams');
 assert.equal(w.skill.stacks,false);
 assert.equal(w.skill.evidence,'documented');
 assert.ok(w.skill.sourceRefs.every(x=>x.startsWith('https://')));
 assert.ok(Object.isFrozen(w.skill));
 assert.ok(Object.isFrozen(w.skill.sourceRefs));
 assert.ok(Object.isFrozen(YW2_SOURCE_ACTION_SKILL_OWNERS[0]));
});

test('V3-4-15 original ID Wazzat in A6 rear activates global Guard restriction without manual tags',()=>{
 const roster=teams();
 roster[0][5].sourceYw2CharacterId='yw2:wazzat';
 roster[0][0].weights=[0,0,0,100];
 roster[1][0].weights=[0,0,0,100];
 const combat=game(roster);
 const snap=combat.snapshot();
 assert.equal(snap.squads[0][5].sourceYw2CharacterId,'yw2:wazzat');
 assert.equal(snap.squads[0][5].sourceYw2SkillId,'yw2:skill:mamoriwasure');
 assert.equal(snap.squads[0][5].researchActionOverrideSkill,'forgot-to-guard');
 assert.ok(snap.clock.teams[0].frontIds.every(id=>id!=='A6'));
 let n=0;
 for(let i=0;i<105;i++){
  const evt=combat.step();
  if(evt.type!=='action')break;
  assert.notEqual(evt.kind,'guard');
  n++;if(evt.winner!==null)break;
 }
 assert.ok(n>=50);
});

test('V3-4-15 Houzzat in B6 rear has same behavior as Wazzat, with identical seeded outcomes',()=>{
 const w=teams(),h=teams();
 w[1][5].sourceYw2CharacterId='yw2:wazzat';
 h[1][5].sourceYw2CharacterId='yw2:houzzat';
 for(const seed of [3,42,212]){
  const a=game(w,seed),b=game(h,seed);
  // Source ID is different, while the one shared skill and all combat
  // values must remain the same.
  assert.equal(a.snapshot().squads[1][5].sourceYw2SkillId,
   b.snapshot().squads[1][5].sourceYw2SkillId);
  for(let i=0;i<110;i++){
   const ea=a.step(),eb=b.step();
   assert.deepEqual(ea,eb);
   const sa=a.snapshot(),sb=b.snapshot();
   const combatShape=s=>({
    clock:s.clock,squads:s.squads.map(t=>t.map(x=>{
     const {sourceYw2CharacterId,...rest}=x;return rest;
    })),events:s.events,winner:s.winner,skillBoosts:s.skillBoosts
   });
   assert.deepEqual(combatShape(sa),combatShape(sb));
   if(ea.winner!==null||ea.type!=='action')break;
  }
 }
});

test('V3-4-15 source holder KO disables global restriction when no other holder survives',()=>{
 const roster=teams();
 roster[1][0].sourceYw2CharacterId='yw2:houzzat';
 roster[1][0].maxHp=1;
 roster[0][0].special={kind:'damage',scope:'one',power:999,
  damageKind:'attack'};
 roster[0][0].weights=[0,0,0,100];
 roster[1][1].weights=[0,0,0,100];
 const combat=game(roster,42);
 combat.pin(0,'B1');
 combat.giveSoul('A1',100);
 const start=combat.prepareSoultimate(0,'A1');
 assert.equal(start.ok,true);
 const end=combat.resolveSoultimate(0,start.token,true);
 assert.equal(end.ok,true);
 assert.equal(combat.snapshot().squads[1][0].hp,0);
 let anyGuard=false;
 for(let i=0;i<120;i++){
  const evt=combat.step();
  if(evt.type!=='action')break;
  if(evt.kind==='guard')anyGuard=true;
 }
 assert.ok(anyGuard,'KO should restore normal guard eligibility');
});

test('V3-4-15 original ID does not invent moves, original stats, Soul/AI, or an online character roster',()=>{
 const roster=teams();
 roster[1][5].sourceYw2CharacterId='yw2:houzzat';
 const snap=game(roster).snapshot();
 const actual=snap.squads[1][5];
 assert.equal(actual.name,roster[1][5].name,'all non-Skill fields remain fixture');
 assert.equal(actual.maxHp,roster[1][5].maxHp);
 assert.equal(actual.attackPower,roster[1][5].attackPower);
 assert.deepEqual(actual.weights,roster[1][5].weights);
 assert.equal(RENTAL_SQUAD.some(x=>x.sourceYw2CharacterId!==undefined),false);
 assert.equal(getYw2OriginalActionSkill('yw2:houzzat').skill.evidence,'documented');
});

test('V3-4-15 invalid source ID, conflicting override, or absent research opt-in refuse before play',()=>{
 const unknown=teams();
 unknown[0][5].sourceYw2CharacterId='yw2:jibanyan';
 assert.throws(()=>game(unknown),/not documented/);
 const mismatched=teams();
 mismatched[0][5].sourceYw2CharacterId='yw2:wazzat';
 mismatched[0][5].researchActionOverrideSkill='chatty';
 assert.throws(()=>game(mismatched),/parallel manual override/);
 const sealed=teams();
 sealed[0][5].sourceYw2CharacterId='yw2:wazzat';
 assert.throws(()=>createCombat({seed:3,teams:sealed}),
  /requires researchYw2ActionOverrides/);
 assert.throws(()=>getYw2OriginalActionSkill('yw3:wazzat'),
  /original YW2 character ID/);
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:3,researchYw2ActionOverrides:true
 }}),/forbids option/);
});

test('V3-4-15 old six-rental Lab/School and two-seat protocol journal still exact',()=>{
 for(const school of [false,true])for(const seed of [3,42,212]){
  const p=createMatchProtocol({
   battleOptions:{seed,playtestSoulTuning:school},hostNowMs:()=>9000});
  const q=createMatchProtocol({
   battleOptions:{seed,playtestSoulTuning:school},hostNowMs:()=>9000});
  for(let i=0;i<85;i++){
   assert.deepEqual(p.advanceAuto(),q.advanceAuto());
   assert.deepEqual(p.snapshot(),q.snapshot());
   if(p.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(p.exportJournal()).ok,true);
 }
});
