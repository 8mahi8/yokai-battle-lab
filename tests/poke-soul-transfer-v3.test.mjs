import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoulSystem} from '../engine/soul.mjs';
import {createCombat} from '../engine/combat.mjs';
import {PLAYTEST_SOUL_TUNING as P} from '../engine/playtest-soul-tuning.mjs';

// Host-state testing only. These numbers are legacy research/playtest fixtures,
// NOT verified YW2 Poke Soul recipient, probability or transfer amounts.
const make=()=>{
 const teams=[0,1].map(side=>Array.from({length:6},(_,i)=>({
  id:(side?'B':'A')+(i+1),capacity:i===0?100:150,soul:0
 })));
 return createSoulSystem({teams});
};
const read=(s,id)=>s.snapshot().teams.flat().find(x=>x.id===id).soul;

test('V3-2 Poke Soul transfer conserves real Soul and caps source and receiver',()=>{
 for(const [sourceBefore,recipientBefore,maxAmount,expected] of [
  [80,89,35,11],[20,0,35,20],[90,0,35,35],
  [0,40,35,0],[99,100,35,0],[80,40,0,0]
 ]){
  const s=make();
  s.setSoul('B1',sourceBefore);
  s.setSoul('A1',recipientBefore);
  const before=s.snapshot(),moved=s.transferSoul({
   sourceId:'B1',recipientId:'A1',maxAmount
  });
  const after=s.snapshot();
  assert.equal(moved,expected);
  assert.equal(read(s,'B1'),sourceBefore-expected);
  assert.equal(read(s,'A1'),recipientBefore+expected);
  assert.equal(read(s,'B1')+read(s,'A1'),sourceBefore+recipientBefore);
  for(const [side,team] of before.teams.entries()){
   for(const old of team){
    if(old.id==='B1'||old.id==='A1')continue;
    assert.deepEqual(after.teams[side].find(x=>x.id===old.id),old);
   }
  }
 }
});

test('V3-2 Poke transfer rejects invalid input atomically; no same-side or same-member transfer',()=>{
 const s=make();
 s.setSoul('B1',90);s.setSoul('A1',80);
 for(const input of [
  {sourceId:'B1',recipientId:'A2',maxAmount:-1},
  {sourceId:'B1',recipientId:'A2',maxAmount:1.2},
  {sourceId:'B1',recipientId:'A2',maxAmount:Infinity},
  {sourceId:'B1',recipientId:'A2',maxAmount:Number.MAX_SAFE_INTEGER+1},
  {sourceId:'B1',recipientId:'B2',maxAmount:10},
  {sourceId:'B1',recipientId:'B1',maxAmount:10},
  {sourceId:'missing',recipientId:'A1',maxAmount:10},
  {sourceId:'B1',recipientId:'missing',maxAmount:10},
  {sourceId:'B1',maxAmount:10},
  {}
 ]){
  const before=s.snapshot();
  assert.throws(()=>s.transferSoul(input));
  assert.deepEqual(s.snapshot(),before,'invalid Soul transfer cannot partially mutate host state');
 }
 // Independently valid later transfers still work after validation failures.
 assert.equal(s.transferSoul({sourceId:'B1',recipientId:'A1',maxAmount:30}),20);
 assert.equal(read(s,'B1'),70);
 assert.equal(read(s,'A1'),100);
});

const meter=(g,id)=>g.snapshot().soul.teams.flat().find(x=>x.id===id).soul;
function pokeFixture(options,{source=80,recipient=89}={}){
 const g=createCombat(options);
 g.giveSoul('B1',source);
 g.giveSoul('A1',recipient);
 g.setWatchMode(0,'zero');
 g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPoke(0,'B1').ok,true);
 const before=g.snapshot();
 let result;
 for(let i=0;i<12;i++)
  result=g.pokeInput(0,{type:'tap',x:.5,y:.5});
 assert.equal(result.ok,true);
 assert.equal(result.completed,true);
 return {g,before,result,after:g.snapshot()};
}

test('V3-2 research Poke keeps its legacy amount and event fields, even with zero transfer',()=>{
 for(const [source,recipient,limit] of [[80,89,35],[8,0,35],[80,100,35],[80,40,0]]){
  const {g,before,result,after}=pokeFixture({seed:20261023,
    researchPokeSoulTransfer:limit},{source,recipient});
  const expected=Math.min(limit,source,100-recipient);
  assert.equal(result.reward.kind,limit?'research-soul-transfer':'unresolved');
  assert.equal(result.reward.amount,expected);
  assert.deepEqual(result.reward,{
   kind:limit?'research-soul-transfer':'unresolved',amount:expected,
   recipientId:'A1',sourceId:'B1',model:'research-only'
  });
  assert.equal(meter(g,'B1'),source-expected);
  assert.equal(meter(g,'A1'),recipient+expected);
  assert.equal(after.squads[1][0].hp,before.squads[1][0].hp);
  assert.deepEqual(after.events.at(-1),{
   type:'poke',side:0,targetId:'B1',reward:result.reward,actionCount:12
  });
 }
});

test('V3-2 playtest Poke Soul reward retains amount, event and host determinism',()=>{
 const opts={seed:20261023,playtestSoulTuning:true};
 const first=pokeFixture(opts),second=pokeFixture(opts);
 assert.equal(first.result.reward.kind,'playtest-soul-transfer');
 assert.deepEqual(first.result,second.result);
 assert.deepEqual(first.after,second.after);
 const expected=Math.min(P.pokeMaxTransfer,80,100-89);
 assert.deepEqual(first.result.reward,{
  kind:'playtest-soul-transfer',effect:'soul-drain',amount:expected,
  recipientId:'A1',sourceId:'B1',model:'playtest-estimate'
 });
 assert.equal(meter(first.g,'B1'),80-expected);
 assert.equal(meter(first.g,'A1'),89+expected);
 assert.deepEqual(first.after.events.at(-1),{
  type:'poke',side:0,targetId:'B1',reward:first.result.reward,actionCount:12
 });
 assert.equal(first.g.beginPoke(0,'B1').reason,'already_poked');
});

test('V3-2 playtest HP-damage and rare KO Poke paths remain untouched by transfer',()=>{
 for(const [seed,kind] of [[8192,'playtest-damage'],[2560,'playtest-heavy-hit']]){
  const {g,before,result}=pokeFixture({seed,playtestSoulTuning:true});
  assert.equal(result.reward.kind,kind);
  assert.equal(meter(g,'B1'),80);
  assert.equal(meter(g,'A1'),89);
  assert.equal(result.reward.amount,Math.min(before.squads[1][0].hp,
   kind==='playtest-heavy-hit'?999:P.pokeNormalDamage));
 }
});
