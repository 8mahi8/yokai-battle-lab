import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';

const attackers=RENTAL_SQUAD.map(x=>({...x,weights:[0,0,100,0],
  inspirit:'strength-down'}));
const defenders=RENTAL_SQUAD.map(x=>({...x,weights:[0,0,0,100],
  inspiritResistance:0}));
const gauges=match=>match.snapshot().game.soul.teams.map(t=>t.map(x=>x.soul));

test('21D-C canonical online battle: legal PvP Poke is one per enemy, completed reward UNRESOLVED',()=>{
  const match=createMatchProtocol({battleOptions:{
    seed:1042,teams:[attackers,defenders]
  }});
  let targetId=null;
  for(let i=0;i<18;i++){
    const event=match.advanceAuto();
    assert.equal(event.ok,true,JSON.stringify(event));
    if(event.result.kind==='inspirit'&&event.result.actor.startsWith('A')&&
       event.result.hit&&event.result.target?.startsWith('B')){
      targetId=event.result.target;
      break;
    }
  }
  assert.ok(targetId,'controlled attacker must produce target with negative Inspirit');
  const watch=match.dispatch(0,1,{type:'watch',mode:'zero'});
  assert.equal(watch.ok,true);
  const before=gauges(match);
  const start=match.dispatch(0,2,{type:'pokeStart',targetId});
  assert.equal(start.ok,true,JSON.stringify(start));
  let final;
  for(let i=0;i<12;i++){
    const result=match.dispatch(0,3+i,{
      type:'pokeInput',gesture:{type:'tap',x:.5,y:.5}
    });
    assert.equal(result.ok,true,JSON.stringify(result));
    final=result.result;
  }
  assert.equal(final.completed,true);
  assert.equal(final.reward.kind,'unresolved');
  assert.equal(final.reward.amount,0);
  assert.deepEqual(gauges(match),before,
    'host must not invent a Soul drain, gift, or damage after a Poke');
  assert.ok(match.snapshot().game.poke.used[0].includes(targetId));

  const retry=match.dispatch(0,15,{type:'pokeStart',targetId});
  assert.equal(retry.accepted,true);
  assert.equal(retry.result.ok,false);
  assert.equal(retry.result.reason,'already_poked');
  assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
});

test('21D-C PvP host rejects research-only Poke transfer and direct reward injection',()=>{
  assert.throws(()=>createMatchProtocol({battleOptions:{researchPokeSoulTransfer:20}}),
    /forbids option/);
  const game=createMatchProtocol();
  const commands=[
    {type:'pokeInput',gesture:{type:'tap',x:.5,y:.5},reward:'soul'},
    {type:'pokeStart',targetId:'B1',amount:250},
    {type:'giveSoul',id:'A1',amount:250},
    {type:'pokeComplete',recipientId:'A1',transfer:100},
    {type:'pokeStart',targetId:'A1'}
  ];
  const baseline=game.snapshot();
  for(const command of commands)
    assert.equal(game.dispatch(0,1,command).reason,'invalid_command');
  assert.deepEqual(game.snapshot(),baseline);
});
