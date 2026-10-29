import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceYw2GrouchyWeights,actionWeights,pickAction} from '../engine/selection.mjs';
import {buildJibanyanNormalMoveLab,compileJibanyanNormalMoveTrialTeams}
 from '../content/yw2-jibanyan-normal-moves-lab.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const mk=(kind='negative')=>{
 const actor={id:'A1',side:0,hp:300,maxHp:300,strength:150,
  technique:'damage',inspirit:kind==='negative'?'speed-down':'strength-up',
  attitude:'grouchy',weights:[55,30,10,5]};
 const allies=[actor,{id:'A2',hp:300,maxHp:300},{id:'A3',hp:300,maxHp:300}];
 const enemies=[{id:'B1',hp:300,maxHp:300,defense:180},
  {id:'B2',hp:300,maxHp:300,defense:160},
  {id:'B3',hp:300,maxHp:300,defense:170}];
 return {actor,allies,enemies};
};
const resolve=(env,overrides={})=>sourceYw2GrouchyWeights(
 env.actor,{allies:env.allies,enemies:env.enemies,...overrides});
test('V3-4-12 original YW2 Grouchy rule 1 healing takes priority over charging and attack-down',()=>{
 const env=mk();env.actor.technique='heal';
 env.allies[1].hp=20;
 const result=resolve(env,{enemyChargingIds:['B1'],
  attackDamageDownIds:['B1']});
 assert.equal(result.rule,1);
 assert.deepEqual(result.weights,[55,90,10,5]);
 assert.ok(Object.isFrozen(result.weights));
 assert.ok(Object.isFrozen(result));
});
test('V3-4-12 rules 2/3: explicit Attack damage down precedes Soultimate charging, pin scopes both',()=>{
 const env=mk();
 let result=resolve(env,{attackDamageDownIds:['B1'],enemyChargingIds:['B2']});
 assert.equal(result.rule,2);
 assert.deepEqual(result.weights,[275,30,10,0]);
 result=resolve(env,{enemyPin:'B2',attackDamageDownIds:['B1'],
  enemyChargingIds:['B2']});
 assert.equal(result.rule,3,'attack damage-down on unpinned enemy must not override target pin');
 assert.deepEqual(result.weights,[55,30,10,10]);
 result=resolve(env,{enemyPin:'B1',attackDamageDownIds:['B1'],
  enemyChargingIds:['B2']});
 assert.equal(result.rule,2);
 result=resolve(env,{enemyChargingIds:['B3']});
 assert.equal(result.rule,3);
 assert.deepEqual(result.weights,[55,30,10,10]);
});
test('V3-4-12 rule 4 source Strength-versus-lowest-defense has pinned-foe precedence',()=>{
 const env=mk();
 let result=resolve(env);
 assert.equal(result.rule,null);
 assert.deepEqual(result.weights,[55,30,10,5]);
 env.enemies[1].defense=100;
 result=resolve(env);
 assert.equal(result.rule,4);
 assert.deepEqual(result.weights,[165,30,10,5]);
 result=resolve(env,{enemyPin:'B1'});
 assert.equal(result.rule,null);
 result=resolve(env,{enemyPin:'B2'});
 assert.equal(result.rule,4);
});
test('V3-4-12 rules 5/7: negative Inspirit saturation and friend-source ownership',()=>{
 const env=mk();
 let counts={B1:3,B2:3,B3:3};
 let result=resolve(env,{negativeCounts:counts,
  enemiesInspiritedByAlly:['B1','B2','B3']});
 assert.equal(result.rule,5);
 assert.deepEqual(result.weights,[55,30,0,5]);
 result=resolve(env,{negativeCounts:{B1:1,B2:1,B3:1},
  enemiesInspiritedByAlly:['B1','B2','B3']});
 assert.equal(result.rule,7);
 assert.deepEqual(result.weights,[55,30,3,5]);
 result=resolve(env,{negativeCounts:counts,enemyPin:'B3'});
 assert.equal(result.rule,5);
 result=resolve(env,{negativeCounts:{B1:3,B2:0,B3:0}});
 assert.equal(result.rule,null);
 result=resolve(env,{negativeCounts:{B1:3,B2:0,B3:0},enemyPin:'B1'});
 assert.equal(result.rule,5);
});
test('V3-4-12 rules 6/8/9/10: positive Inspirit priority and measured multipliers',()=>{
 const env=mk('positive');
 let result=resolve(env,{
  alliesInspiritedByFoe:['A1','A2','A3'],
  positiveCounts:{A1:3,A2:3,A3:3}});
 assert.equal(result.rule,6,'opponent-origin status has higher priority');
 assert.deepEqual(result.weights,[55,30,2,5]);
 const values=[[3,8,0],[2,9,2],[1,10,3]];
 for(const [level,rule,expected] of values){
  result=resolve(env,{positiveCounts:{
   A1:level,A2:level,A3:level}});
  assert.equal(result.rule,rule);
  assert.deepEqual(result.weights,[55,30,expected,5]);
 }
 assert.equal(resolve(env).rule,null);
});
test('V3-4-12 actual existing action picker applies source YW2 priority only when opted in',()=>{
 const env=mk();env.enemies[2].defense=60;
 const before=actionWeights(env.actor,{allies:env.allies,enemies:env.enemies,
  enemyChargingIds:['B1']});
 const after=actionWeights(env.actor,{allies:env.allies,enemies:env.enemies,
  sourceYw2Grouchy:true,enemyChargingIds:['B1']});
 assert.deepEqual(before,[165,30,10,5],
  'fixture Grouchy still prefers Strength > enemy Defense');
 assert.deepEqual(after,[55,30,10,10],
  'source Grouchy charging rule 3 outranks Strength rule 4');
 // This uses the same weighted picker (not another AI).
 assert.equal(pickAction(after,()=>0),'attack');
 assert.equal(pickAction(after,()=>.99),'guard');
 assert.equal(pickAction(before,()=>.99),'guard');
 assert.equal(pickAction(after,()=>.7),'technique');
});
test('V3-4-12 real trial and school six rentals stay isolated, seed and online replay unchanged',()=>{
 const lab=buildJibanyanNormalMoveLab({
  includeSpeedDown:true,includeSourceWeights:true});
 const teams=compileJibanyanNormalMoveTrialTeams({lab});
 assert.deepEqual(teams[0][0].weights,[55,30,10,5]);
 assert.equal(teams[0][0].attitude,'grouchy');
 const old=createCombat({seed:42,teams,researchDamageModel:true,
  researchSpeedInspirit:true});
 const source=createCombat({seed:42,teams,researchDamageModel:true,
  researchSpeedInspirit:true,researchYw2Grouchy:true});
 assert.deepEqual(source.snapshot(),old.snapshot());
 // Existing host state powers source rules: pending Soultimate/negative
 // status provenance/target pin are read by choice(), not authored in AI.
 for(const game of [old,source]){
  game.giveSoul('B1',100);
  assert.equal(game.prepareSoultimate(1,'B1').ok,true);
  game.pin(0,'B1');
 }
 let sourceActions=0;
 for(let i=0;i<90;i++){
  const evt=source.step();
  if(evt.type!=='action')break;
  sourceActions++;
  if(evt.winner!==null)break;
 }
 assert.ok(sourceActions>=25);
 assert.throws(()=>createCombat({researchYw2Grouchy:true}),/custom teams/);
 for(const school of [false,true])for(const seed of [3,42,212]){
  const a=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school},
   hostNowMs:()=>7000});
  const b=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:school},
   hostNowMs:()=>7000});
  assert.deepEqual(a.snapshot(),b.snapshot());
  for(let i=0;i<80;i++){
   assert.deepEqual(a.advanceAuto(),b.advanceAuto());
   assert.deepEqual(a.snapshot(),b.snapshot());
   if(a.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(a.exportJournal()).ok,true);
 }
 assert.throws(()=>createMatchProtocol({battleOptions:{
  seed:42,researchYw2Grouchy:true}}),/forbids option/);
 assert.deepEqual(RENTAL_SQUAD[0].weights,[60,25,10,5]);
});
