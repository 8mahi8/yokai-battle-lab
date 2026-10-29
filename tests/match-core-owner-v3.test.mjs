import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchCore} from '../engine/match-core.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';

test('V3 MatchCore is the exclusive host combat owner; snapshots cannot mutate it',()=>{
 const protocol=createMatchProtocol({battleOptions:{seed:212},hostNowMs:()=>10000});
 const core=createMatchCore(protocol.exportJournal().initialOptions);
 assert.ok(Object.isFrozen(core));
 assert.deepEqual(Object.keys(core).sort(),
  ['advanceAuto','applyNormalizedCommand','inspectTimeDomains','preview','snapshot'].sort());
 assert.deepEqual(core.snapshot(),protocol.snapshot().game);
 const snap=core.snapshot();
 snap.squads[0][0].hp=0;
 snap.soul.teams[0][0].soul=999;
 assert.deepEqual(core.snapshot(),protocol.snapshot().game,
  'external reads never mutate the authoritative engine');
 assert.throws(()=>createMatchCore(null),/battle options/);
});

test('V3 MatchCore command and AI boundary stays bit-for-bit equal to legacy host protocol',()=>{
 for(const seed of [7,212,8192,20261029]){
  const protocol=createMatchProtocol({battleOptions:{seed},hostNowMs:()=>10000});
  const core=createMatchCore(protocol.exportJournal().initialOptions);
  const commandStream=[
   [0,1,{type:'pin',targetId:'B1'}],
   [1,1,{type:'pin',targetId:'A2'}],
   [0,2,{type:'rotate',direction:1}],
   [1,2,{type:'watch',mode:'zero'}],
   [1,3,{type:'watch',mode:'standard'}],
   [0,3,{type:'rotate',direction:1}] // rule-rejected host cooldown
  ];
  for(const [side,seq,command] of commandStream){
   const receipt=protocol.dispatch(side,seq,command);
   assert.equal(receipt.accepted,true);
   const result=core.applyNormalizedCommand(side,command,
    {rotationAtMs:command.type==='rotate'?10000:0});
   assert.deepEqual(result,receipt.result);
   assert.deepEqual(core.snapshot(),protocol.snapshot().game,
    'protocol and core diverged after identical command');
  }
  for(let n=0;n<32;n++){
   const receipt=protocol.advanceAuto();
   const result=core.advanceAuto();
   assert.deepEqual(result,receipt.result);
   assert.deepEqual(core.snapshot(),protocol.snapshot().game,
    'protocol and core diverged after the same automated action');
   assert.deepEqual(core.preview(5),protocol.snapshot().forecast);
   if(result.type==='finished')break;
  }
  assert.deepEqual(core.inspectTimeDomains(),protocol.inspectTimeDomains());
 }
});
