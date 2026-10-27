import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {SCHOOL_RENTAL_PERSONALITIES as personalities} from '../content/rental-roster.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

test('trial seriousness is data separate from attack/heal/guard personality, and symmetric for friends',()=>{
 const rates=[3,2,1,3,2,5];
 assert.deepEqual(personalities.map(p=>p.loafChance),rates);
 const battle=createCombat({seed:212,playtestSoulTuning:true,enableLoafing:true});
 const state=battle.snapshot();
 for(let side=0;side<2;side++){
  assert.deepEqual(state.squads[side].map(x=>x.loafChance),rates);
  assert.deepEqual(state.squads[side].map(x=>x.attitude),personalities.map(x=>x.attitude));
 }
 const legacy=createCombat({seed:212}).snapshot();
 assert.deepEqual(legacy.squads[0].map(x=>x.loafChance),[0,0,0,0,0,0]);
});
test('school-authorized online protocol can receive real loaf action, not UI fabricated',()=>{
 let seen=[];
 for(const seed of [212,8192,20261023,20261026,732,495,116,77]){
  const game=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:true,enableLoafing:true}});
  for(let step=0;step<220;step++){
   const outcome=game.advanceAuto();
   if(!outcome.ok||outcome.result.type!=='action')break;
   if(outcome.result.kind==='loaf')seen.push({seed,action:outcome.result});
  }
  if(seen.length>=3)break;
 }
 assert.ok(seen.length>=3,'school trial must expose loafs as real authoritative actions');
 for(const {action} of seen){
  assert.equal(action.amount,0);
  assert.equal(action.target,null);
  assert.equal(action.kind,'loaf');
 }
});
test('same school rental odds do not create loafs when mode explicitly disabled',()=>{
 const game=createCombat({seed:212,playtestSoulTuning:true,enableLoafing:false});
 let total=0;
 for(let i=0;i<140;i++){
  const result=game.step();if(result.type!=='action')break;
  if(result.kind==='loaf')total++;
 }
 assert.equal(total,0,'loafing must be conditional, never introduced into lab fixtures');
});
