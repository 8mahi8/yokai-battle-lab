import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {YW2_MULTITARGET_SOULTIMATE_RESEARCH,
 yw2MultitargetSoultimateResearch}
 from '../content/yw2-multitarget-soultimate-research.mjs';
import {YW2_REFERENCE_SOULTIMATES,yw2ReferenceSoultimate,
 yw2ReferenceSpecialDefinition}
 from '../content/yw2-soultimate-reference.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';

const id='yw2:bushinyan:katsuobushi-giri';

test('V3-5-20 independent YW2 sources CONFLICT on Shogunyan hits and power, not picked by majority',()=>{
 const source=yw2MultitargetSoultimateResearch(id);
 assert.equal(YW2_MULTITARGET_SOULTIMATE_RESEARCH.length,1);
 assert.equal(source.character,'ブシニャン');
 assert.equal(source.name,'かつおブシ斬り');
 assert.equal(source.battleReady,false);
 assert.equal(source.power.status,'disputed');
 assert.equal(source.listedHits.status,'disputed');
 assert.deepEqual(source.power.claims.map(x=>x.value),[25,20]);
 assert.deepEqual(source.excludedOtherGames.map(x=>[x.game,x.power,x.listedHits]),
  [['yw1',22,9]],'YW1 numbers must not be attributed to YW2');
 assert.ok(source.power.claims[0].sourceRefs.includes(
  'https://mtwildwood.net/yw2/yokai/shogunyan'));
 assert.deepEqual(source.listedHits.claims.map(x=>x.value),[10,9]);
 assert.equal(source.allocation.status,'unknown');
 assert.equal(source.allocation.perTargetHits,null);
 assert.equal(source.allocation.globalHitSequence,null);
 assert.equal(source.allocation.retargetOnKO,null);
 assert.deepEqual(source.listedHits.claims[0].sourceRefs,[
  'https://gamepedia.jp/youkai-yw2/specials/3892',
  'https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html',
  'https://game-e.com/youkai-watch-2/youkai/322.php'
 ]);
 assert.deepEqual(source.listedHits.claims[1].sourceRefs,[
  'https://mtwildwood.net/yw2/yokai/shogunyan'
 ]);
 assert.equal(yw2MultitargetSoultimateResearch('yw2:not-a-real-move'),null);
 assert.ok(Object.isFrozen(source)&&Object.isFrozen(source.power.claims[0]));
 assert.ok(Object.isFrozen(source.listedHits.claims[0].sourceRefs));
 assert.throws(()=>{source.allocation.perTargetHits=10},TypeError);
 assert.throws(()=>{source.power.claims[0].value=999},TypeError);
});

test('V3-5-20 disputed all-enemy multi-hits remain outside executable source-backed and school libraries',()=>{
 assert.ok(!YW2_REFERENCE_SOULTIMATES.some(x=>x.id===id));
 assert.throws(()=>yw2ReferenceSoultimate(id),/unknown/);
 assert.throws(()=>yw2ReferenceSpecialDefinition(id),/unknown/);
 assert.equal(RENTAL_SOULTIMATE_MOVES.length,6);
 assert.ok(RENTAL_SOULTIMATE_MOVES.every(x=>x.id!==id));
 assert.deepEqual(RENTAL_SOULTIMATE_MOVES.map(x=>x.hitPattern.count),
  [null,null,0,null,0,0],
  'non-damage rentals have zero hits and damage rentals retain unknown hit count');
});

test('V3-5-20 reading unresolved research cannot change seed, Host combat, or even custom Soultimate ledger',()=>{
 const roster=()=>RENTAL_SQUAD.map(x=>({...x,weights:[...x.weights]}));
 const create=()=>createCombat({seed:31,teams:[roster(),roster()],
  researchSpecialEffects:true,researchDamageModel:true,
  researchStatInspirits:true,researchSoultimateHitCount:3});
 const a=create(),b=create(),before=JSON.stringify(a.snapshot());
 assert.ok(yw2MultitargetSoultimateResearch(id));
 assert.equal(JSON.stringify(a.snapshot()),before);
 for(const battle of [a,b]){
  battle.giveSoul('A1',100);
  const charge=battle.prepareSoultimate(0,'A1');
  assert.equal(charge.ok,true);
  assert.equal(battle.resolveSoultimate(0,charge.token,true).ok,true);
 }
 assert.deepEqual(a.snapshot(),b.snapshot());
 const event=a.snapshot().events.findLast(x=>x.type==='special');
 assert.equal(event.researchSoultimateHits.plannedPerTarget,3,
  'existing explicitly custom fixture is unchanged, not 9 or 10 hits');
 assert.equal(event.researchSoultimateHits.originalHitCount,null);
 assert.equal(event.referenceSoultimate,undefined);
});

test('V3-5-20 preserve post-impact HP but no duplicate final-hit float on recovery redraw',()=>{
 const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
 assert.match(stage,/const showImpact=\(\)=>scenePhase==='impact'\|\|scenePhase==='recovery'/);
 assert.match(stage,/const visibleHit=id=>\{\s*if\(scenePhase!=='impact'\)return null/);
 assert.match(stage,/if\(!showImpact\(\)\)return first\.hpBefore/);
 assert.match(stage,/return scenePlan\.hitResults\[sceneHitIndex\?\?0\]\.hpAfter/);
 const browser=readFileSync(new URL('../lab/match-stage.html',import.meta.url),'utf8');
 assert.match(browser,/scenePhase==='recovery'&&observed\.length===hits\.length/);
 assert.match(browser,/const noRepeatedDigit=field\.querySelectorAll\('\.mb-floating-number'\)\.length===0/);
});
