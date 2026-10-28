import test from 'node:test';
import assert from 'node:assert/strict';
import {yw2HitProbability,rollPercent} from '../engine/hit-model.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';

/**
 * Phase 2.1 source: https://mtwildwood.net/hit-chance.php
 * (85 SPD vs 151 SPD -> 84.8, FLOORED to 84, then
 * attack move accuracy 0.4 -> 33.6, FLOORED to 33).
 * The game's random value is integer 0..99. Video samples cannot determine
 * hit probability from one MISS/HIT, so this is documented, not observed.
 */
test('source example: YW2 applies integer truncation in the correct order',()=>{
 const same={kind:'attack',attackerSpeed:85,targetSpeed:151};
 const physical=yw2HitProbability({...same,moveAccuracy:.4});
 assert.deepEqual([physical.base,physical.probability],[84,33]);
 assert.equal(physical.moveAccuracy,.4);
 assert.equal(yw2HitProbability({...same,kind:'technique',moveAccuracy:.4}).probability,84);
 assert.equal(yw2HitProbability({...same,attackerSpeed:35,moveAccuracy:.5}).probability,37);
 assert.equal(yw2HitProbability({...same,attackerSpeed:35,kind:'technique'}).probability,75);
 assert.equal(yw2HitProbability({...same,moveAccuracy:4}).probability,100);
});
test('original 0..99 integer roll boundary never gives a fractional extra chance',()=>{
 const p=yw2HitProbability({kind:'attack',attackerSpeed:200,targetSpeed:201,
  moveAccuracy:.5});
 assert.equal(p.base,97,'do not carry speed fraction into move accuracy');
 assert.equal(p.probability,48,'do not carry attack accuracy fraction');
 for(let n=0;n<100;n++){
  // Map the deterministic JS unit draw exactly to the centre of an
  // original integer random bucket. No new RNG call or re-seeding.
  assert.equal(rollPercent(p.probability,(n+.5)/100),n<48);
 }
 assert.equal(rollPercent(48,.48),false);
 assert.equal(rollPercent(48,.479999),true);
});
test('real standard host attacks and techniques carry original integer thresholds to BOTH seats',()=>{
 let actions=0, attacks=0, techniques=0, fractionalSpeedCases=0;
 for(const seed of [7,47,314,27028,20261028]){
  const host=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:true,
   researchDamageModel:true,researchMultiHit:true,enableLoafing:true}});
  for(let i=0;i<95;i++){
   const receipt=host.advanceAuto();
   assert.equal(receipt.ok,true);
   const event=receipt.result;
   const wire=host.snapshot();
   if(event?.type!=='action')break;
   if(event.hitResearch){
    const actor=wire.game.squads.flat().find(x=>x.id===event.actor);
    const target=wire.game.squads.flat().find(x=>x.id===event.target);
    assert.ok(actor&&target);
    assert.ok(['attack','technique'].includes(event.kind));
    const kind=event.kind;
    const expected=yw2HitProbability({kind,
     attackerSpeed:actor.speed,targetSpeed:target.speed,
     moveAccuracy:actor.attackAccuracy});
    assert.deepEqual(event.hitResearch,expected,
     'game must emit the exact threshold actually used');
    assert.ok(Number.isInteger(event.hitResearch.base));
    assert.ok(Number.isInteger(event.hitResearch.probability));
    assert.ok(event.hitResearch.base>=75&&event.hitResearch.base<=98);
    assert.equal(event.hitResearch.probability,
     Math.floor(Math.min(100,expected.base*(kind==='attack'?actor.attackAccuracy:1))));
    if((98+(actor.speed-target.speed)/5)%1!==0&&
      98+(actor.speed-target.speed)/5>75&&
      98+(actor.speed-target.speed)/5<98)fractionalSpeedCases++;
    if(kind==='attack')attacks++;else techniques++;
    actions++;
    const playerA=makeStageView(wire,0),playerB=makeStageView(wire,1);
    assert.deepEqual(playerA.events,playerB.events);
    assert.equal(playerA.events.at(-1)?.hitResearch?.probability,
      event.hitResearch.probability);
   }
   if(wire.game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(host.exportJournal()).ok,true,
   'quantized hit results and random call ordering must replay identically');
 }
 assert.ok(attacks>15,'must check real physical hits');
 assert.ok(techniques>15,'must check real offensive technique hits');
 assert.ok(fractionalSpeedCases>0,'must actually exercise a truncated speed difference');
 assert.ok(actions>=attacks+techniques);
});
