import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {YW2_REFERENCE_ATTACKS,yw2ReferenceAttack,
 yw2ReferenceAttackResearchOverride}
 from '../content/yw2-attack-reference.mjs';
import {yw2MultitargetSoultimateResearch}
 from '../content/yw2-multitarget-soultimate-research.mjs';
import {RENTAL_ATTACK_MOVES} from '../content/rental-attack-moves.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';

const attack='yw2:bushinyan:senko-giri';
const special='yw2:bushinyan:katsuobushi-giri';

test('V3-5-22 same multi-game webpage is section-scoped: 22x9 belongs to YW1, not YW2',()=>{
 const m=yw2MultitargetSoultimateResearch(special);
 assert.equal(m.power.status,'disputed');
 assert.deepEqual(m.power.claims.map(c=>c.value),[25,20]);
 assert.deepEqual(m.listedHits.claims.map(c=>c.value),[10,9]);
 assert.deepEqual(m.excludedOtherGames.map(c=>[c.game,c.power,c.listedHits]),
  [['yw1',22,9]]);
 assert.equal(m.excludedOtherGames[0].sourceRef,
  'https://mtwildwood.net/yw2/yokai/shogunyan');
 assert.equal(m.power.claims[0].sourceRefs.includes(
  'https://mtwildwood.net/yw2/yokai/shogunyan'),true,
  'the YW2 section says 25x9, not 22x9');
 assert.equal(m.allocation.status,'unknown');
 assert.equal(m.allocation.perTargetHits,null);
 assert.equal(m.battleReady,false);
 assert.ok(Object.isFrozen(m.excludedOtherGames[0]));
 assert.throws(()=>{m.excludedOtherGames[0].power=1},TypeError);
});
test('V3-5-22 YW2 normal hit count is disputed; caller must explicitly select research profile',()=>{
 const m=yw2ReferenceAttack(attack);
 assert.equal(YW2_REFERENCE_ATTACKS.length,1);
 assert.equal(m.power,20);
 assert.equal(m.hitsPerTarget,null);
 assert.equal(m.hitEvidence.status,'disputed');
 assert.deepEqual(m.hitEvidence.claims.map(c=>[c.profile,c.value]),
  [['jp-guides',3],['mtwildwood-yw2',2]]);
 assert.equal(m.hitEvidence.claims[0].sourceRefs.length,3);
 assert.deepEqual(m.hitEvidence.claims[1].sourceRefs,
  ['https://mtwildwood.net/yw2/yokai/shogunyan']);
 assert.throws(()=>yw2ReferenceAttackResearchOverride(attack),/explicit/);
 assert.throws(()=>yw2ReferenceAttackResearchOverride(attack,'unsourced'),/explicit/);
 assert.deepEqual(yw2ReferenceAttackResearchOverride(attack,'jp-guides'),
  {attackPower:20,attackHits:3});
 assert.deepEqual(yw2ReferenceAttackResearchOverride(attack,'mtwildwood-yw2'),
  {attackPower:20,attackHits:2});
 assert.ok(Object.isFrozen(m.hitEvidence.claims[1]));
 assert.deepEqual(RENTAL_ATTACK_MOVES.map(x=>x.hits),[1,1,1,1,1,1]);
 assert.equal(RENTAL_SOULTIMATE_MOVES.some(x=>x.id===special),false);
});
test('V3-5-22 BOTH explicitly selected source interpretations run on real custom Host; neither alters rental or RNG',()=>{
 for(const [profile,count] of [['jp-guides',3],['mtwildwood-yw2',2]]){
  const roster=()=>RENTAL_SQUAD.map((unit,i)=>({...unit,maxHp:800,
   weights:[100,0,0,0],
   ...(i===0?yw2ReferenceAttackResearchOverride(attack,profile):{})}));
  const host=createCombat({seed:41,teams:[roster(),roster()],
   researchMultiHit:true,researchDamageModel:true});
  const peer=createCombat({seed:41,teams:[roster(),roster()],
   researchMultiHit:true,researchDamageModel:true});
  const a=host.step(),b=peer.step();
  assert.deepEqual(a,b);
  const game=host.snapshot();
  assert.deepEqual(game,peer.snapshot());
  assert.equal(a.kind,'attack');
  assert.equal(a.actor,'A1');
  assert.equal(a.multiHit.planned,count);
  assert.equal(a.multiHit.hits.length,count);
  const wire={game,revision:1,clientSequences:[0,0]};
  const va=makeStageView(wire,0),vb=makeStageView(wire,1);
  const event=va.events.findLast(e=>e.type==='action');
  assert.deepEqual(event.hostAttackHits,
    vb.events.findLast(e=>e.type==='action').hostAttackHits);
  assert.equal(event.hostAttackHits.plannedHitCount,count);
  assert.equal(event.hostAttackHits.hitResults.length,count);
  assert.equal(event.actionOutcomeV2,undefined,'no rental attribution');
  assert.equal(event.attackProjection,undefined,'no rental attribution');
  assert.equal(JSON.stringify(host.snapshot()),JSON.stringify(game),
   'presentation and research source lookup are read-only');
 }
});
