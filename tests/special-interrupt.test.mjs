import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';

test('incoming special hit may interrupt enemy Soultimate without burning enemy Soul',()=>{
 let found=false;
 for(let seed=1;seed<=160;seed++){
  const battle=createCombat({seed,enableResearchSoultimateEffects:true});
  battle.giveSoul('B1',100);
  const enemy=battle.prepareSoultimate(1,'B1');
  assert.equal(enemy.ok,true);
  battle.giveSoul('A1',100);
  const mine=battle.prepareSoultimate(0,'A1');
  assert.equal(mine.ok,true);
  const result=battle.resolveSoultimate(0,mine.token,true);
  const e=result.effects.find(x=>x.target==='B1');
  if(e?.interruption?.stopped){
    assert.equal(e.interruption.target,'B1');
    assert.equal(battle.snapshot().soul.teams[1][0].soul,100);
    assert.equal(battle.snapshot().soul.pending[1],null);
    found=true;break;
  }
 }
 assert.equal(found,true,'expected at least one charge-interrupting research hit');
});
test('a special effect in a snapshot is deeply copied',()=>{
 const battle=createCombat({enableResearchSoultimateEffects:true,seed:3});
 battle.giveSoul('A1',100);
 const c=battle.prepareSoultimate(0,'A1');
 battle.resolveSoultimate(0,c.token,true);
 const state=battle.snapshot();
 const last=state.events.at(-1);
 assert.equal(last.type,'special');
 last.effects[0].amount=99999;
 assert.notEqual(battle.snapshot().events.at(-1).effects[0].amount,99999);
});
