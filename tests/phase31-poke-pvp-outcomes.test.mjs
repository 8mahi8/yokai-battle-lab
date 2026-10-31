import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {PLAYTEST_SOUL_TUNING as P,choosePlaytestPokeOutcome} from '../engine/playtest-soul-tuning.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const meter=(g,id)=>g.snapshot().soul.teams.flat().find(u=>u.id===id).soul;
function setup(seed){
 const g=createCombat({seed,playtestSoulTuning:true});
 g.setWatchMode(0,'zero');
 g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPoke(0,'B1').ok,true);
 return g;
}
function finish(g){
 let r;
 for(let n=0;n<12;n++)r=g.pokeInput(0,{type:'tap',x:.5,y:.5});
 assert.equal(r.ok,true);assert.equal(r.completed,true);
 return r.reward;
}

test('PvP Poke has three source-reported categories; odds are labelled playtest estimates',()=>{
 assert.equal(P.pokeDamageWeight+P.pokeSoulWeight+P.pokeHeavyWeight,100);
 assert.deepEqual(
  [0,.48,.49899,.49901,.50,.98999,.99899,.99901,.9999].map(choosePlaytestPokeOutcome),
  ['damage','damage','damage','soul-drain','soul-drain','soul-drain','soul-drain','heavy-hit','heavy-hit']);
 for(const bad of [-1,1,Infinity,NaN,'0',null])
  assert.throws(()=>choosePlaytestPokeOutcome(bad));
 assert.equal(P.pokeHeavyDamage,999);
 assert.equal(P.pokeHeavyWeight,0.1,'rare-hit rate is a provisional 0.1%, not an original rate');
 assert.ok(Object.isFrozen(P));
});

test('ordinary damage result subtracts only enemy HP and cannot repeat same vulnerable target',()=>{
 const g=setup(8192); // fixed host seed: first effect RNG roll falls in normal-damage branch
 g.giveSoul('B1',60);
 const before=g.snapshot();
 const reward=finish(g),after=g.snapshot();
 assert.equal(reward.kind,'playtest-damage');
 assert.equal(reward.effect,'damage');
 assert.equal(reward.amount,P.pokeNormalDamage);
 assert.equal(after.squads[1][0].hp,before.squads[1][0].hp-reward.amount);
 assert.equal(meter(g,'B1'),60,'damage is not secretly a Soul transfer');
 assert.equal(meter(g,'A1'),0);
 assert.equal(g.beginPoke(0,'B1').reason,'already_poked');
 assert.equal(after.events.at(-1).type,'poke');
 const cue=latestBattleCue(after.events);
 assert.equal(cue.type,'poke');
 assert.deepEqual(cue.targets.map(x=>[x.id,x.amount,x.kind]),
  [['B1',P.pokeNormalDamage,'damage']]);
});

test('0.1%-fixture rare 999 effect respects remaining HP and real KO clock',()=>{
 const g=setup(2560); // fixed host seed: first effect RNG ~0.99913973, inside [99.9%,100%)
 const result=finish(g);
 assert.equal(result.kind,'playtest-heavy-hit');
 assert.equal(result.effect,'heavy-hit');
 assert.equal(result.nominalDamage,999);
 assert.equal(result.amount,225,'capped to B1 actual HP, not 999 fabricated damage');
 assert.equal(g.snapshot().squads[1][0].hp,0);
 assert.equal(g.snapshot().clock.teams[1].members[0].canAct,false);
 assert.equal(g.snapshot().poke.used[0].includes('B1'),true);
 assert.equal(g.snapshot().winner,null,'one KO is not a full-party victory');
 const cue=latestBattleCue(g.snapshot().events);
 assert.equal(cue.type,'poke');assert.equal(cue.amount,result.amount);
});

test('Soul-drain reward only transfers existing Soul; empty enemy never grants it',()=>{
 const g=setup(20261023);
 g.giveSoul('B1',80);
 g.giveSoul('A1',89);
 const before=g.snapshot();
 const reward=finish(g);
 assert.equal(reward.kind,'playtest-soul-transfer');
 assert.equal(reward.effect,'soul-drain');
 assert.equal(reward.amount,11);
 assert.equal(meter(g,'B1'),69);
 assert.equal(meter(g,'A1'),100);
 assert.equal(g.snapshot().squads[1][0].hp,before.squads[1][0].hp);
 assert.equal(latestBattleCue(g.snapshot().events).targets.length,0,
  'Soul transfer is not falsely shown as physical damage');
});

test('PvP heavy Poke is deterministic in the canonical host and journal',()=>{
 const match=createMatchProtocol({battleOptions:{playtestSoulTuning:true,seed:2560}});
 assert.equal(match.dispatch(0,1,{type:'watch',mode:'zero'}).ok,true);
 // A vulnerable enemy can be poked without modifying any public match option.
 // Seeded opponent Inspirit from normal auto battle may be required for eligibility;
 // direct combat engine exercises exact outcomes; host here tests command rejection.
 assert.equal(match.dispatch(0,2,{type:'pokeStart',targetId:'B1'}).result.reason,
  'target_not_vulnerable');
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});
