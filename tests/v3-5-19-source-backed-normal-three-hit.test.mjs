import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {projectRecordedAttackHits}
 from '../presentation/legacy-attack-outcome.mjs';
import {YW2_REFERENCE_ATTACKS,yw2ReferenceAttack,
 yw2ReferenceAttackResearchOverride}
 from '../content/yw2-attack-reference.mjs';
import {RENTAL_ATTACK_MOVES} from '../content/rental-attack-moves.mjs';

const id='yw2:bushinyan:senko-giri';
const build=()=>RENTAL_SQUAD.map((unit,i)=>({...unit,
 maxHp:800,weights:[100,0,0,0],
 ...(i===0?yw2ReferenceAttackResearchOverride(id,'jp-guides'):{})}));
 
test('V3-5-19 Japanese source-profile 20x3 remains a LAB candidate, not universal original truth',()=>{
 const move=yw2ReferenceAttack(id);
 assert.equal(YW2_REFERENCE_ATTACKS.length,1);
 assert.deepEqual({name:move.name,actor:move.actor,slot:move.slot,
  power:move.power,hits:move.hitsPerTarget,targetScope:move.targetScope},
  {name:'閃光ぎり',actor:'ブシニャン',slot:'attack',
   power:20,hits:null,targetScope:'single_enemy'});
 assert.equal(move.evidence,'disputed-yw2-sources');
 assert.equal(move.hitEvidence.status,'disputed');
 assert.deepEqual(move.hitEvidence.claims.map(c=>[c.profile,c.value]),
  [['jp-guides',3],['mtwildwood-yw2',2]]);
 assert.throws(()=>yw2ReferenceAttackResearchOverride(id),/explicit YW2 source profile/);
 assert.deepEqual(yw2ReferenceAttackResearchOverride(id,'mtwildwood-yw2'),
  {attackPower:20,attackHits:2});
 assert.equal(move.sourceRefs.length,4);
 for(const url of move.sourceRefs)assert.ok(url.startsWith('https://'));
 assert.ok(Object.isFrozen(move)&&Object.isFrozen(move.sourceRefs));
 assert.deepEqual(yw2ReferenceAttackResearchOverride(id,'jp-guides'),
  {attackPower:20,attackHits:3});
 assert.ok(Object.isFrozen(yw2ReferenceAttackResearchOverride(id,'jp-guides')));
 assert.throws(()=>yw2ReferenceAttack('yw2:jibanyan:paws-of-fury'),/unknown/);
 assert.deepEqual(RENTAL_ATTACK_MOVES.map(x=>x.hits),[1,1,1,1,1,1],
  'the school rental six must never inherit the sourced research override');
});

test('V3-5-19 original 20x3 SHAPE executes on actual CUSTOM host with honest lab provenance',()=>{
 const teams=[build(),build()],actor=teams[0][0];
 assert.equal(actor.attackPower,20);
 assert.equal(actor.attackHits,3);
 assert.equal(actor.name,RENTAL_SQUAD[0].name,
  'do not masquerade the rental portrait as Bushinyan original character');
 const host=createCombat({seed:41,teams,
  researchMultiHit:true,researchDamageModel:true});
 const result=host.step(),game=host.snapshot(),event=game.events.findLast(e=>e.type==='action');
 assert.equal(result.type,'action');
 assert.equal(result.kind,'attack');
 assert.equal(result.actor,'A1');
 assert.equal(event.multiHit.planned,3);
 assert.equal(event.multiHit.hits.length,3);
 const evidence=projectRecordedAttackHits(event);
 assert.ok(evidence);
 assert.equal(evidence.plannedHitCount,3);
 assert.equal(evidence.hitResults.length,3);
 const truth=JSON.stringify(game);
 const views=[makeStageView({game,revision:1,clientSequences:[0,0]},0),
  makeStageView({game,revision:1,clientSequences:[0,0]},1)];
 const projected=views.map(v=>v.events.findLast(x=>x.type==='action'));
 assert.deepEqual(projected[0].hostAttackHits,evidence);
 assert.deepEqual(projected[1].hostAttackHits,evidence);
 for(const e of projected){
  assert.equal(e.attackProjection,undefined,'no rental MoveID attribution');
  assert.equal(e.actionOutcomeV2,undefined,'no false rental V2 contract');
 }
 const cue=latestBattleCue([projected[0]]);
 assert.equal(cue.moveId,undefined);
 const plan=planActionChoreography(cue);
 assert.equal(plan.moveId,null);
 assert.equal(plan.hitResults.length,3);
 const start=plan.phases[1].startMs;
 const slice=(plan.phases[1].endMs-start)/3;
 for(let i=0;i<3;i++){
  const h=evidence.hitResults[i];
  const frame=choreographyFrame(plan,start+(i+.1)*slice);
  assert.equal(frame.hitIndex,i);
  assert.deepEqual(frame.impacts,[{targetId:h.targetId,
   effect:'damage',hit:h.hit,amount:h.damage}]);
  assert.equal(frame.currentHit.hpAfter,h.hpAfter);
 }
 assert.equal(JSON.stringify(host.snapshot()),truth);
});
