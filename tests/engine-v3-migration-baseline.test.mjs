/**
 * V3-0 MIGRATION GATE.
 *
 * This freezes important behavior of the EXISTING school host before moving
 * rules into shared V3 subsystems. It does NOT assert Yo-kai Watch 2 parity.
 * A refactor must retain canonical outcomes unless independently documented
 * original evidence justifies a deliberately reviewed behavior change.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal,stateFingerprint}
 from '../engine/match-protocol.mjs';

function checkSnapshot(s){
 assert.equal(s.version,1);
 assert.equal(typeof s.revision,'number');
 assert.equal(s.hash,stateFingerprint(s.game),'transport hash matches actual host truth');
 const g=s.game;
 assert.equal(g.squads.length,2);
 assert.equal(g.clock.teams.length,2);
 assert.equal(g.soul.teams.length,2);
 assert.equal(g.soul.modes.length,2);
 assert.equal(g.pins.length,2);
 assert.equal(g.purification.length,2);
 assert.equal(g.guided.length,2);
 assert.equal(g.poke.active.length,2);
 for(let side=0;side<2;side++){
  const prefix=side===0?'A':'B';
  const expected=Array.from({length:6},(_,i)=>prefix+(i+1)).sort();
  const fighters=g.squads[side],clock=g.clock.teams[side],
   soul=g.soul.teams[side];
  assert.equal(fighters.length,6);
  assert.equal(clock.members.length,6);
  assert.equal(soul.length,6);
  assert.deepEqual(fighters.map(m=>m.id).sort(),expected);
  assert.deepEqual(clock.members.map(m=>m.id).sort(),expected);
  assert.deepEqual(soul.map(m=>m.id).sort(),expected);
  assert.equal(clock.frontIds.length,3);
  assert.equal(clock.benchIds.length,3);
  assert.deepEqual([...clock.frontIds,...clock.benchIds].sort(),expected,
   'every medal is in exactly one position');
  assert.ok(clock.offset>=0&&clock.offset<=5&&Number.isInteger(clock.offset));
  assert.ok(['standard','zero'].includes(g.soul.modes[side]));
  for(const fighter of fighters){
   assert.ok(Number.isInteger(fighter.hp)&&fighter.hp>=0&&
     fighter.hp<=fighter.maxHp,'fighter HP remains in [0,maxHp]');
   assert.ok(Array.isArray(g.inspirits[fighter.id]));
  }
  for(const unit of soul){
   assert.ok(Number.isInteger(unit.soul)&&unit.soul>=0&&
     unit.soul<=unit.capacity,'Soul never exceeds capacity');
  }
  const pin=g.pins[side];
  if(pin!==null){
   assert.ok(g.clock.teams[1-side].frontIds.includes(pin),
    'target pin points to living enemy front');
   assert.ok(g.squads[1-side].some(m=>m.id===pin&&m.hp>0));
  }
 }
 if(g.winner!==null){
  assert.ok(g.winner===0||g.winner===1);
  assert.ok(g.squads[1-g.winner].every(m=>m.hp===0),
   'a complete host match finishes only after all six opponents are KO');
 }
 for(const row of g.events){
  assert.ok(Number.isInteger(row.eventId)&&row.eventId>0);
 }
}

test('V3 baseline: existing school combat is deterministic, replayable and valid across four seeded battles',()=>{
 for(const seed of [7,212,8192,20261029]){
  const run=()=>createMatchProtocol({
   battleOptions:{seed,rotationCooldownMs:3000},
   hostNowMs:()=>10000
  });
  const a=run(),b=run();
  const commands=[
   [0,1,{type:'pin',targetId:'B1'}],
   [1,1,{type:'pin',targetId:'A1'}],
   [0,2,{type:'rotate',direction:1}],
   [1,2,{type:'watch',mode:'zero'}],
   [1,3,{type:'watch',mode:'standard'}]
  ];
  checkSnapshot(a.snapshot());
  for(const [side,seq,cmd] of commands){
   const first=a.dispatch(side,seq,cmd),second=b.dispatch(side,seq,cmd);
   assert.deepEqual(first,second,seed+' host command receipt differs');
   assert.equal(first.accepted,true,seed+' input rejected before auth host');
   checkSnapshot(a.snapshot());
   assert.deepEqual(a.snapshot(),b.snapshot(),
    seed+' two hosts diverged on same command stream');
  }
  for(let i=0;i<45;i++){
   const first=a.advanceAuto(),second=b.advanceAuto();
   assert.deepEqual(first,second,seed+' automated rule result diverged');
   assert.equal(first.ok,true,seed+' host action threw');
   checkSnapshot(a.snapshot());
   assert.deepEqual(a.snapshot(),b.snapshot(),
    seed+' matching input stream produced different game state');
   if(a.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(a.exportJournal()).ok,true,
   seed+' command journal lost deterministic current-engine replay');
  assert.deepEqual(a.exportJournal(),b.exportJournal(),
   seed+' identical host journal not stable');
 }
});

test('V3 baseline: stale transport ACK and rejected turn do not corrupt canonical six-member state',()=>{
 const m=createMatchProtocol({battleOptions:{seed:20261029,rotationCooldownMs:3000},
  hostNowMs:()=>10000});
 const intent={type:'rotate',direction:1};
 const first=m.dispatch(0,1,intent);
 assert.equal(first.accepted,true);
 checkSnapshot(m.snapshot());
 const snap=m.snapshot();
 const repeated=m.dispatch(0,1,intent);
 assert.equal(repeated.duplicate,true);
 assert.deepEqual(m.snapshot(),snap);
 const denied=m.dispatch(0,2,{type:'rotate',direction:1});
 assert.equal(denied.accepted,true);
 assert.equal(denied.result.ok,false);
 assert.equal(denied.result.reason,'cooldown');
 checkSnapshot(m.snapshot());
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
