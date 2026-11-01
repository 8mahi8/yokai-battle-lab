import test from 'node:test';
import assert from 'node:assert/strict';
import {createEffectCommitter} from '../engine/effect-commit.mjs';
import {resolveLastStand} from '../engine/skill-effects.mjs';
import {createInspiritLedger} from '../engine/inspirit.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

function fixture({lastStand=false}={}){
 const log=[],spent=new Set(),ledger=createInspiritLedger(['A1']);
 const effects=createEffectCommitter({
  resolveDirectDamage:(target,amount)=>{
   log.push('resolve-damage');
   return resolveLastStand({skill:lastStand?'lastStand':null,enabled:true,
    spent:spent.has(target.id),hp:target.hp,amount});
  },
  onSurvival:(target,outcome)=>{
   assert.equal(target.hp,outcome.hpAfter,
    'survival callback must observe new canonical HP before a KO');
   spent.add(target.id);log.push('survival-hook');
  },
  applyStatus:status=>{log.push('status-write');return ledger.apply(status);},
  onStatus:(id)=>{assert.equal(ledger.has(id,'sleep'),true);
   log.push('canAct-sync');}
 });
 return {effects,log,spent,ledger};
}
const member=(hp=10)=>({id:'A1',maxHp:10,hp});

test('V3-2 direct damage commits HP before last-stand and only triggers the one-shot hook once',()=>{
 const {effects,log,spent}=fixture({lastStand:true});
 const target=member();
 const first=effects.commitDamage(target,10);
 assert.deepEqual(first,{hpAfter:1,amount:9,activated:true});
 assert.equal(target.hp,1);
 assert.deepEqual(log,['resolve-damage','survival-hook']);
 assert.equal(spent.has('A1'),true);
 const second=effects.commitDamage(target,1);
 assert.deepEqual(second,{hpAfter:0,amount:1,activated:false});
 assert.equal(target.hp,0);
 assert.deepEqual(log,['resolve-damage','survival-hook','resolve-damage']);
});

test('V3-2 common healing clamps to max HP; no direct-damage survival trigger on recovery',()=>{
 const {effects,log}=fixture();
 const target=member(4);
 assert.deepEqual(effects.commitHeal(target,5),{hpAfter:9,amount:5});
 assert.deepEqual(effects.commitHeal(target,20),{hpAfter:10,amount:1});
 assert.deepEqual(effects.commitHeal(target,4),{hpAfter:10,amount:0});
 assert.deepEqual(log,[]);
 for(const invalid of [-1,1.2,NaN,Infinity])
  assert.throws(()=>effects.commitHeal(target,invalid),/magnitude/);
 assert.equal(target.hp,10);
});

test('V3-2 status commits ledger first, then synchronizes logical action eligibility',()=>{
 const {effects,log,ledger}=fixture();
 const status=effects.commitStatus({id:'A1',sign:'negative',effect:'sleep',source:'B1'});
 assert.equal(status.effect,'sleep');
 assert.deepEqual(log,['status-write','canAct-sync']);
 assert.equal(ledger.has('A1','sleep'),true);
});

test('V3-2 failed effects do not silently mutate HP or trigger skill/status hooks',()=>{
 const {effects,log}=fixture();
 const target=member();
 assert.throws(()=>effects.commitDamage(target,-1),/magnitude/);
 assert.throws(()=>effects.commitDamage(target,1.5),/magnitude/);
 assert.throws(()=>effects.commitHeal({id:'A1',hp:20,maxHp:10},1),/HP target/);
 assert.throws(()=>effects.commitStatus({id:''}),/status target/);
 assert.equal(target.hp,10);
 assert.deepEqual(log,[]);
 assert.throws(()=>createEffectCommitter({}),/resolveDirectDamage/);
});

test('V3-2 canonical game still completes seeded mixed physical/technique/status turns and journal replay',()=>{
 for(const seed of [19,212,20261029]){
  const host=createMatchProtocol({battleOptions:{seed},hostNowMs:()=>10000});
  assert.equal(host.dispatch(0,1,{type:'pin',targetId:'B1'}).ok,true);
  assert.equal(host.dispatch(1,1,{type:'pin',targetId:'A2'}).ok,true);
  for(let i=0;i<75;i++){
   const advance=host.advanceAuto();
   assert.equal(advance.ok,true);
   const game=host.snapshot().game;
   for(const side of game.squads){
    for(const fighter of side){
     assert.ok(fighter.hp>=0&&fighter.hp<=fighter.maxHp);
     assert.ok(Array.isArray(game.inspirits[fighter.id]));
    }
   }
   if(game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(host.exportJournal()).ok,true,
   'shared effect commit must preserve deterministic host command replay');
 }
});
