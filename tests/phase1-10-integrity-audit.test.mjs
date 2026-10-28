import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';
import {RENTAL_MOVE_MASTER} from '../content/rental-move-master.mjs';
import {PLAYTEST_SKILL_CATALOG} from '../content/skill-catalog.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {researchSpecialAllies,planResearchSpecial}
 from '../engine/special-effects.mjs';

test('phase1: six rentals × four moves plus one passive all resolve to one catalog',()=>{
 assert.equal(RENTAL_CHARACTER_MOVE_REFS.length,6);
 assert.equal(RENTAL_MOVE_MASTER.length,24);
 assert.equal(PLAYTEST_SKILL_CATALOG.length,6);
 const slots=['attack','technique','inspirit','soultimate'];
 for(const catalog of [RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG]){
  assert.equal(catalog.characters.length,6);
  assert.equal(catalog.moves.length,24);
  assert.equal(catalog.skills.length,6);
  for(const char of RENTAL_CHARACTER_MOVE_REFS){
   const compiled=catalog.getCharacter(char.id);
   assert.equal(compiled.name,char.name);
   assert.equal(compiled.skill.id,char.skillId);
   assert.strictEqual(catalog.getSkill(char.skillId).id,char.skillId);
   for(const slot of slots){
    const id=char.moveIds[slot];
    assert.equal(compiled.moves[slot].id,id);
    assert.deepEqual(catalog.getMove(id),compiled.moves[slot]);
    assert.equal(compiled.moves[slot].evidence,'fixture',
     'trial data must not claim to be video-confirmed original');
   }
  }
 }
});

test('phase1: Soultimate ally pool uses RESOLVED move (not a stale caster field)',()=>{
 const all=Array.from({length:6},(_,i)=>({
  id:'A'+(i+1),hp:i===4?0:50,maxHp:100,
  strength:50,spirit:70,defense:35,guard:false
 }));
 const front=all.slice(0,3);
 const caster={id:'A1',strength:50,spirit:70,
  // Intentionally stale legacy information: it must not select the pool.
  special:{kind:'damage',scope:'front',power:100,damageKind:'attack'}};
 const revive={kind:'revive-heal',scope:'team',power:30};
 const selected=researchSpecialAllies(revive,all,front);
 assert.strictEqual(selected,all);
 const outcomes=planResearchSpecial({
  spec:revive,caster,allies:selected,enemies:[],powerMultiplier:1
 });
 assert.equal(outcomes.length,6);
 assert.deepEqual(outcomes.find(x=>x.targetId==='A5')?.kind,'revive');
 assert.equal(outcomes.find(x=>x.targetId==='A5')?.hpAfter,30);
 assert.strictEqual(researchSpecialAllies({
  kind:'heal',scope:'front',power:30},all,front),front);
 assert.strictEqual(researchSpecialAllies({
  kind:'damage',scope:'front',power:100,damageKind:'attack'},all,front),front);
 assert.throws(()=>researchSpecialAllies(revive,all,null),/arrays required/);
});

test('phase1: canonical host → 2 seat views → V2 → choreography are read only',()=>{
 let verifiedAttacks=0,visibleSkills=0;
 for(const seed of [11,77,20261028]){
  const game=createMatchProtocol({battleOptions:{
   seed,playtestSoulTuning:true,enableLoafing:true
  }});
  for(let i=0;i<95;i++){
   if(i===4||i===21){
    const side=i===4?0:1;
    const clientSeq=game.snapshot().clientSequences[side]+1;
    const intent={type:'pin',targetId:(side===0?'B':'A')+'1'};
    const receipt=game.dispatch(side,clientSeq,intent);
    assert.equal(receipt.accepted,true);
   }
   const result=game.advanceAuto();
   assert.equal(result.ok,true);
   const wire=game.snapshot();
   const before=JSON.stringify(wire);
   const view0=makeStageView(wire,0),view1=makeStageView(wire,1);
   assert.deepEqual(view0.events,view1.events,
    'both seats see same authoritative facts');
   assert.equal(view0.winner,view1.winner);
   assert.equal(view0.side,0);
   assert.equal(view1.side,1);
   const last=view0.events.at(-1);
   if(last?.type==='skill')visibleSkills++;
   for(const entry of view0.events.filter(e=>e.type==='action'&&e.kind==='attack')){
    assert.ok(entry.attackProjection,
     'all built-in rental physical hits should map to a catalog move');
    assert.ok(entry.actionOutcomeV2,
     'all recorded real physical attacks should project to V2');
    const result=entry.actionOutcomeV2;
    const source=wire.game.events.find(e=>e.eventId===entry.eventId);
    assert.ok(source);
    assert.equal(result.outcome.totalDamage,source.amount);
    assert.equal(result.outcome.hits.at(-1).hpAfter,source.targetHp);
    assert.equal(result.actorId,source.actor);
    const index=Number(source.actor.slice(1))-1;
    const expected='rental-'+String(index+1).padStart(2,'0')+':attack';
    assert.equal(result.moveId,expected);
    verifiedAttacks++;
   }
   const cue=latestBattleCue(view0.events);
   if(cue){
    const plan=planActionChoreography(cue);
    const frame=choreographyFrame(plan,plan.phases[1].startMs);
    if(cue.actionOutcomeV2){
     assert.deepEqual(plan.actionOutcomeV2,cue.actionOutcomeV2);
     assert.deepEqual(plan.hitResults,plan.actionOutcomeV2.outcome.hits);
     assert.equal(frame.currentHit.hpAfter,plan.hitResults[0].hpAfter);
    }else{
     assert.equal(plan.actionOutcomeV2,null,
      'do not synthesize fake physical hits for status/heal/special');
    }
   }
   assert.equal(JSON.stringify(wire),before,'view must never mutate host snapshot');
   assert.deepEqual(game.snapshot(),wire,'UI projections cannot advance the game');
   if(result.result?.type!=='action'||wire.game.winner!==null)break;
  }
  const saved=game.exportJournal();
  const replay=replayMatchJournal(saved);
  assert.equal(replay.ok,true,'canonical host should replay deterministically');
 }
 assert.ok(verifiedAttacks>0,'must have checked actual physical host hit chains');
 assert.ok(visibleSkills>=0);
});

test('phase1: no accidental original-value claims in six trial move definitions',()=>{
 for(const move of RENTAL_MOVE_MASTER){
  assert.equal(move.evidence,'fixture');
  assert.deepEqual(move.sourceRefs,[]);
  if(move.slot==='soultimate'&&
    ['damage','drain','damage-status'].includes(move.category)){
   assert.deepEqual(move.hitPattern,{type:'unknown',count:null},
    'multiple targets must not be presented as multiple recorded hits');
  }
  if(move.slot==='inspirit'||move.category==='heal'){
   assert.equal(move.hitPattern.type,'none');
   assert.equal(move.hitPattern.count,0);
  }
 }
 for(const skill of PLAYTEST_SKILL_CATALOG){
  assert.equal(skill.evidence,'fixture');
  assert.deepEqual(skill.sourceRefs,[]);
 }
});
