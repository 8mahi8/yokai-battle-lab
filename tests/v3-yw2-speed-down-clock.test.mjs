import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,waitCostFromSpeed} from '../engine/phase1.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {deriveStatStage,statStageMultiplier}
 from '../engine/damage-model.mjs';
import {buildJibanyanNormalMoveLab,compileJibanyanNormalMoveTrialTeams}
 from '../content/yw2-jibanyan-normal-moves-lab.mjs';
import {YW2_ORIGINAL_REFERENCE_INDEX}
 from '../content/yw2-original-reference-pack.mjs';
import {createYw2SourceIndex}
 from '../content/yw2-source-intake.mjs';
import {RENTAL_LAB_CATALOG} from '../content/combat-catalog.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const clockUnit=(game,id)=>game.snapshot().clock.teams.flatMap(t=>t.members).find(m=>m.id===id);
const speedOptions=()=>({
 seed:42,
 teams:compileJibanyanNormalMoveTrialTeams({
  lab:buildJibanyanNormalMoveLab({includeSpeedDown:true})
 }),
 researchDamageModel:true,researchSpeedInspirit:true
});

test('V3-4-8 YW2 Jibanyan Slow Down research move uses sourced Level2, permanent negative status',()=>{
 const j=YW2_ORIGINAL_REFERENCE_INDEX.getCharacter('yw2:jibanyan');
 assert.equal(j.moves.inspirit.level.status,'documented');
 assert.equal(j.moves.inspirit.level.claims[0].value,2);
 assert.ok(j.moves.inspirit.level.sourceIds.includes('jibanyan_mtw'));
 const original=buildJibanyanNormalMoveLab();
 const lab=buildJibanyanNormalMoveLab({includeSpeedDown:true});
 const move=lab.catalog.getMove(lab.characterId+':inspirit');
 assert.equal(move.displayName,'しびれるお札');
 assert.equal(move.statusEffect,'speed-down');
 assert.equal(move.level,2);
 assert.equal(move.category,'status_negative');
 assert.equal(move.evidence,'documented');
 assert.equal(move.targetScope,'single_enemy');
 assert.equal(move.hitPattern.count,0);
 assert.ok(move.sourceRefs.some(x=>x.includes('mtwildwood.net')));
 assert.equal(lab.catalog.moves.length,27);
 assert.equal(original.catalog.moves.length,26);
 assert.equal(RENTAL_LAB_CATALOG.moves.length,24);
 assert.deepEqual(lab.researchProvenance.originalMoves,
  ['attack','technique','inspirit']);
 assert.equal(lab.researchProvenance.originalSoultimateHitCount,null);
 assert.equal(lab.researchProvenance.battleReady,false);
 const teams=compileJibanyanNormalMoveTrialTeams({lab});
 assert.equal(teams[0][0].inspirit,'speed-down');
 assert.equal(teams[0][0].inspiritLevel,2);
 assert.equal(teams[0][0].attackHits,2);
 assert.equal(teams[0][0].techniqueElement,'fire');
});

test('V3-4-8 original YW2 -2 Speed stage uses x0.7, clock cost changes without retconning accrued wait',()=>{
 assert.equal(deriveStatStage([{effect:'speed-down',sign:'negative',level:2}],'speed'),-2);
 assert.equal(statStageMultiplier(-2),.7);
 const roster=RENTAL_SQUAD.map(x=>({name:x.name,speed:x.speed}));
 const clock=createBattle({seed:3,teams:[roster,roster]});
 const initial=clock.snapshot(),before=initial.teams[0].members[0];
 const preview=clock.predict(8);
 const effective=Math.max(1,Math.floor(before.speed*.7));
 assert.equal(clock.setEffectiveSpeed('A1',effective),true);
 const after=clock.snapshot(),member=after.teams[0].members[0];
 assert.equal(member.speed,effective);
 assert.equal(member.cost,waitCostFromSpeed(effective));
 assert.ok(member.cost>before.cost);
 assert.equal(member.wait,before.wait);
 assert.equal(after.pointsElapsed,initial.pointsElapsed);
 assert.equal(after.turn,initial.turn);
 assert.equal(after.teams[0].offset,initial.teams[0].offset);
 assert.equal(clock.setEffectiveSpeed('A1',effective),false);
 assert.ok(clock.predict(8).some(x=>x.id==='A1'&&
  x.normalWait===waitCostFromSpeed(effective)));
 assert.equal(clock.setEffectiveSpeed('A1',before.speed),true);
 assert.deepEqual(clock.snapshot(),initial);
 assert.deepEqual(clock.predict(8),preview);
 assert.throws(()=>clock.setEffectiveSpeed('A1',0),/positive/);
 assert.throws(()=>clock.setEffectiveSpeed('wrong',100),/unknown/);
});

test('V3-4-8 successful source Level2 Inspirit updates future turns, survives 35 actions and purifies',()=>{
 const game=createCombat(speedOptions());
 const before=clockUnit(game,'B4');
 assert.equal(before.speed,165);
 const committed=game.applyInspirit({
  id:'B4',sign:'negative',effect:'speed-down',
  source:'A1',level:2
 });
 assert.ok(committed);
 const after=clockUnit(game,'B4');
 assert.equal(after.speed,Math.floor(before.speed*.7));
 assert.equal(after.cost,waitCostFromSpeed(after.speed));
 assert.equal(after.wait,before.wait,'already-earned wait is deliberately not rescaled');
 const status=game.snapshot().inspirits.B4.find(x=>x.effect==='speed-down');
 assert.equal(status.level,2);
 assert.equal(status.mode,'persistent');
 assert.equal(status.remaining,null);
 for(let i=0;i<35;i++){
  const result=game.step();
  if(result.type!=='action')break;
 }
 assert.equal(game.snapshot().inspirits.B4.some(x=>x.effect==='speed-down'),true);
 assert.equal(clockUnit(game,'B4').speed,after.speed);
 // Move B4 onto the bench by rotating B side once.
 game.rotate(1,1,0);
 const removal=game.purify(1,'B4');
 assert.equal(removal.ok,true);
 assert.equal(clockUnit(game,'B4').speed,before.speed);
 assert.equal(clockUnit(game,'B4').cost,before.cost);
 assert.equal(game.snapshot().inspirits.B4.length,0);
});

test('V3-4-8 speed effects stay distinct from physical HP/base speed and preserve original rental defaults',()=>{
 const custom=createCombat(speedOptions());
 const b=custom.snapshot();
 assert.throws(()=>createCombat({
  ...speedOptions(),researchSpeedInspirit:false
 }),/requires researchSpeedInspirit/);
 assert.throws(()=>createCombat({researchSpeedInspirit:true,
  researchDamageModel:true}),/custom teams/);
 assert.throws(()=>createCombat({...speedOptions(),researchDamageModel:false}),
  /researchDamageModel/);
 assert.throws(()=>custom.applyInspirit({id:'B4',sign:'positive',
  effect:'speed-down',level:2}),/negative sign/);
 assert.throws(()=>custom.applyInspirit({id:'B4',sign:'negative',
  effect:'speed-down',level:5}),/level 1..4/);
 const unchanged=custom.snapshot();
 assert.deepEqual(unchanged,b);
 custom.applyInspirit({id:'B4',sign:'negative',effect:'speed-down',level:2});
 assert.equal(custom.snapshot().squads[1][3].speed,b.squads[1][3].speed);
 assert.equal(custom.snapshot().squads[1][3].hp,b.squads[1][3].hp);
 assert.equal(clockUnit(custom,'B4').speed,Math.floor(b.squads[1][3].speed*.7));
 const baseline=createCombat({seed:42});
 assert.equal(baseline.snapshot().clock.teams[1].members[3].speed,
  baseline.snapshot().squads[1][3].speed);
});

test('V3-4-8 unresolved Speed level is never invented at original-data intake',()=>{
 const originals=copy(YW2_ORIGINAL_REFERENCE_INDEX.characters);
 originals[0].moves.inspirit.level={
  status:'unknown',sourceIds:['jibanyan_mtw'],claims:[]
 };
 const index=createYw2SourceIndex({
  sources:copy(YW2_ORIGINAL_REFERENCE_INDEX.sources),characters:originals
 });
 assert.throws(()=>buildJibanyanNormalMoveLab({
  index,includeSpeedDown:true
 }),/unresolved original fact: inspirit.level/);
 assert.equal(buildJibanyanNormalMoveLab({index}).catalog.moves.length,26);
 assert.equal(RENTAL_LAB_CATALOG.getCharacter('yw2:jibanyan:normal-moves-lab'),null);
});

test('V3-4-8 opt-in Speed research never changes canonical rental MatchProtocol output or replay',()=>{
 for(const seed of [3,42,212])for(const school of [false,true]){
  const original=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school}});
  const newer=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school}});
  buildJibanyanNormalMoveLab({includeSpeedDown:true});
  assert.deepEqual(original.snapshot(),newer.snapshot());
  for(let i=0;i<70;i++){
   assert.deepEqual(original.advanceAuto(),newer.advanceAuto());
   assert.deepEqual(original.snapshot(),newer.snapshot());
   if(original.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(newer.exportJournal()).ok,true);
 }
 assert.throws(()=>createMatchProtocol({
  battleOptions:{seed:42,researchSpeedInspirit:true}
 }),/forbids option/);
});
