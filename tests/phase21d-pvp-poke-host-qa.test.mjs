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


function prepareRealHostPoke({rotationCooldownMs=0}={}){
  const m=createMatchProtocol({battleOptions:{
    seed:1042,teams:[attackers,defenders],rotationCooldownMs
  }});
  let targetId=null;
  for(let i=0;i<18;i++){
    const ev=m.advanceAuto();
    assert.equal(ev.ok,true,JSON.stringify(ev));
    if(ev.result.kind==='inspirit'&&ev.result.actor.startsWith('A')&&
       ev.result.hit&&ev.result.target?.startsWith('B')){
      targetId=ev.result.target;
      break;
    }
  }
  assert.ok(targetId);
  assert.equal(m.dispatch(0,1,{type:'watch',mode:'zero'}).ok,true);
  assert.equal(m.dispatch(0,2,{type:'pokeStart',targetId}).ok,true);
  return {m,targetId};
}

test('21D-C2: enemy host wheel rotation ends stale Poke without spending one-use eligibility',()=>{
  const {m,targetId}=prepareRealHostPoke();
  assert.equal(m.snapshot().game.poke.active[0].targetId,targetId);
  let sideSeq=0;
  // Three +1 rotations move the old front entirely to the back.
  for(let i=0;i<3;i++){
    const r=m.dispatch(1,++sideSeq,{type:'rotate',direction:1});
    assert.equal(r.ok,true,JSON.stringify(r));
  }
  assert.equal(m.snapshot().game.poke.active[0],null);
  assert.equal(m.snapshot().game.poke.used[0].includes(targetId),false);
  const stale=m.dispatch(0,3,{type:'pokeInput',gesture:{type:'tap',x:.5,y:.5}});
  assert.equal(stale.accepted,true);
  assert.equal(stale.result.reason,'no_active_poke');
  for(let i=0;i<3;i++){
    assert.equal(m.dispatch(1,++sideSeq,{type:'rotate',direction:1}).ok,true);
  }
  assert.ok(m.snapshot().game.clock.teams[1].frontIds.includes(targetId));
  assert.equal(m.dispatch(0,4,{type:'pokeStart',targetId}).ok,true,
    'Poke was cancelled, not consumed');
  assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});

test('21D-C2: Zero->normal Watch cancels Poke and never silently consumes the target',()=>{
  const {m,targetId}=prepareRealHostPoke();
  assert.equal(m.dispatch(0,3,{type:'watch',mode:'standard'}).ok,true);
  assert.equal(m.snapshot().game.poke.active[0],null);
  assert.equal(m.snapshot().game.poke.used[0].includes(targetId),false);
  assert.equal(m.dispatch(0,4,{type:'pokeStart',targetId}).result.reason,
    'zero_mode_required');
  assert.equal(m.dispatch(0,5,{type:'watch',mode:'zero'}).ok,true);
  assert.equal(m.dispatch(0,6,{type:'pokeStart',targetId}).ok,true);
  assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
