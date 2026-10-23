import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,normalizeMatchCommand,replayMatchJournal,
 stateFingerprint} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
const guardRoster=RENTAL_SQUAD.map(u=>({...u,weights:[0,0,0,100]}));
const options={seed:101,teams:[guardRoster,guardRoster],
 researchSoulRecoveryMode:'owner-nonattack'};
const make=()=>createMatchProtocol({battleOptions:options});
const issue=(match,side,seq,command)=>match.dispatch(side,seq,command);
const auto=(match,n=1)=>{for(let i=0;i<n;i++)match.advanceAuto();};
const soul=(match,id)=>match.snapshot().game.soul.teams.flat().find(x=>x.id===id).soul;

test('two player commands are sequenced globally with only host-advanced auto turns',()=>{
 const m=make();
 const a=issue(m,0,1,{type:'rotate',direction:1});
 const b=issue(m,1,1,{type:'rotate',direction:-1});
 const c=m.advanceAuto();
 assert.deepEqual([a.revision,b.revision,c.revision],[1,2,3]);
 assert.equal(m.snapshot().game.clock.turn,1);
 assert.equal(m.snapshot().game.clock.teams[0].frontIds[0],'A2');
 assert.equal(m.snapshot().game.clock.teams[1].frontIds[0],'B6');
 assert.deepEqual(m.snapshot().clientSequences,[1,1]);
 assert.deepEqual(m.exportJournal().entries.map(x=>x.kind),['player','player','auto']);
 assert.deepEqual(replayMatchJournal(m.exportJournal()),{
  ok:true,revision:3,hash:m.snapshot().hash
 });
});
test('last ACK retransmit is idempotent, including two rotations that would otherwise cancel',()=>{
 const m=make(),intent={type:'rotate',direction:1};
 const first=issue(m,0,1,intent);
 const before=m.snapshot(),sent=m.exportJournal().entries.length;
 const duplicate=issue(m,0,1,intent);
 assert.equal(duplicate.duplicate,true);
 assert.equal(duplicate.hash,first.hash);
 assert.equal(duplicate.revision,first.revision);
 assert.equal(m.exportJournal().entries.length,sent);
 assert.deepEqual(m.snapshot(),before);
 const conflict=issue(m,0,1,{type:'rotate',direction:-1});
 assert.equal(conflict.reason,'sequence_conflict');
 assert.deepEqual(m.snapshot(),before);
});
test('missing, stale and noninteger sequences do not mutate state',()=>{
 const m=make(),base=m.snapshot();
 for(const n of [2,4])assert.equal(
  issue(m,0,n,{type:'rotate',direction:1}).reason,'sequence_gap');
 for(const n of [0,-1,1.5,NaN])
  assert.equal(issue(m,0,n,{type:'rotate',direction:1}).reason,
   'invalid_client_sequence');
 assert.deepEqual(m.snapshot(),base);
 issue(m,0,1,{type:'rotate',direction:1});
 issue(m,0,2,{type:'rotate',direction:1});
 assert.equal(issue(m,0,1,{type:'rotate',direction:1}).reason,'stale_sequence');
 assert.equal(m.snapshot().clientSequences[0],2);
});
test('client cannot impersonate a side or alter HP, Soul, RNG, time or target authority',()=>{
 const m=make(),before=m.snapshot();
 const prohibited=[
  {type:'giveSoul',id:'A1',amount:100},
  {type:'step'},
  {type:'setHP',id:'B1',hp:0},
  {type:'purify',id:'A4'},
  {type:'resolveSoultimate',token:1,success:true},
  {type:'rotate',direction:1,side:1},
  {type:'pin',targetId:'A1'},
  {type:'pokeStart',targetId:'A1'},
  {type:'chargeStart',id:'B1'},
  {type:'watch',mode:'g'},
  {type:'chargeInput',gesture:{type:'move',x:Infinity,y:.5}},
  {type:'rotate',direction:3}
 ];
 for(const p of prohibited)
  assert.equal(issue(m,0,1,p).reason,'invalid_command',JSON.stringify(p));
 assert.deepEqual(m.snapshot(),before);
 assert.throws(()=>m.dispatch('0',1,{type:'rotate',direction:1}));
 assert.throws(()=>m.dispatch(2,1,{type:'rotate',direction:1}));
});
test('a semantically invalid but well-shaped command consumes sequence and replays as failure',()=>{
 const m=make();
 const first=issue(m,0,1,{type:'chargeStart',id:'A1'});
 assert.equal(first.accepted,true);
 assert.equal(first.ok,false);
 assert.equal(first.result.reason,'soul_not_full');
 auto(m,170);
 assert.equal(issue(m,0,1,{type:'chargeStart',id:'A1'}).reason,'stale_sequence');
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
test('switching to Watch Zero forbids a normal target pin while still allowing wheel commands',()=>{
 const m=make();
 assert.equal(issue(m,0,1,{type:'watch',mode:'zero'}).ok,true);
 const bad=issue(m,0,2,{type:'pin',targetId:'B1'});
 assert.equal(bad.accepted,true);
 assert.equal(bad.result.reason,'rule_exception');
 const wheel=issue(m,0,3,{type:'rotate',direction:1});
 assert.equal(wheel.ok,true);
 assert.equal(m.snapshot().game.pins[0],null);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
test('both sides can concurrently set their own Watch, but cannot select own-team pin targets',()=>{
 const m=make();
 const A=issue(m,0,1,{type:'pin',targetId:'B1'});
 const B=issue(m,1,1,{type:'pin',targetId:'A1'});
 assert.equal(A.ok,true);assert.equal(B.ok,true);
 assert.deepEqual(m.snapshot().game.pins,['B1','A1']);
 assert.equal(issue(m,1,2,{type:'pin',targetId:'B2'}).reason,'invalid_command');
 assert.deepEqual(m.snapshot().clientSequences,[1,1]);
 assert.equal(issue(m,0,2,{type:'pin',targetId:null}).ok,true);
 assert.equal(m.snapshot().game.pins[0],null);
});
test('only an acting member, not the entire roster, gains research Soul after an auto turn',()=>{
 const m=make();
 const e=m.advanceAuto();
 assert.equal(e.result.type,'action');
 const id=e.result.actor;
 assert.equal(soul(m,id),5);
 const others=m.snapshot().game.soul.teams.flat().filter(x=>x.id!==id);
 assert.ok(others.every(x=>x.soul===0));
 assert.equal(m.snapshot().game.clock.turn,1);
});
test('host can open a legitimate touch charge but no client can instantly resolve it',()=>{
 const m=make();
 for(let i=0;i<300&&soul(m,'A1')<100;i++)m.advanceAuto();
 assert.equal(soul(m,'A1'),100);
 const begun=issue(m,0,1,{type:'chargeStart',id:'A1'});
 assert.equal(begun.ok,true);
 assert.ok(['spin','tap','trace','align'].includes(begun.result.kind));
 assert.equal(m.snapshot().game.soul.pending[0].casterId,'A1');
 const illegal=issue(m,0,2,{type:'resolveSoultimate',success:true,token:begun.result.token});
 assert.equal(illegal.reason,'invalid_command');
 assert.equal(m.snapshot().clientSequences[0],1);
 const cancelled=issue(m,0,2,{type:'chargeCancel'});
 assert.equal(cancelled.accepted,true);
 assert.equal(m.snapshot().game.soul.pending[0],null);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
test('replay checks both command results and state fingerprints, not just final move count',()=>{
 const m=make();
 m.dispatch(0,1,{type:'rotate',direction:1});
 m.dispatch(1,1,{type:'pin',targetId:'A1'});
 auto(m,50);
 const valid=m.exportJournal();
 assert.equal(replayMatchJournal(valid).ok,true);
 const damage=JSON.parse(JSON.stringify(valid));
 damage.entries[2].hash='00000000';
 assert.deepEqual(replayMatchJournal(damage),{ok:false,reason:'replay_divergence',index:2});
 const changed=JSON.parse(JSON.stringify(valid));
 changed.entries[0].command.direction=-1;
 assert.equal(replayMatchJournal(changed).reason,'replay_divergence');
 const truncated=JSON.parse(JSON.stringify(valid));
 truncated.entries.pop();
 assert.equal(replayMatchJournal(truncated).reason,'final_hash_mismatch');
});
test('snapshots and exported journals are independent of authoritative state',()=>{
 const m=make();m.dispatch(0,1,{type:'rotate',direction:1});
 const before=m.snapshot();
 const js=m.exportJournal();
 const snapshot=m.snapshot();
 snapshot.game.squads[0][0].hp=0;
 snapshot.clientSequences[0]=9999;
 js.entries[0].command.direction=-1;
 js.entries[0].result.ok=false;
 assert.deepEqual(m.snapshot(),before);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
test('invalid initial research config and unauthorized Flash/lab Soul injections are forbidden',()=>{
 for(const bad of [
  {researchOpeningPriority:{flashIds:['A1']}},
  {researchSoulGainPerAction:40},
  {researchPokeSoulTransfer:20},
  {researchCounterTiming:true},
  {researchWheelCoalescing:true},
  {fake:1}
 ])assert.throws(()=>createMatchProtocol({battleOptions:bad}));
 assert.throws(()=>createMatchProtocol({battleOptions:[]}));
 assert.equal(Object.hasOwn(createMatchProtocol().snapshot().game.clock,'openingPriority'),false);
});
test('a canonical command has exact type/fields and finite normalized touch samples',()=>{
 assert.deepEqual(normalizeMatchCommand(0,{type:'chargeInput',
  gesture:{type:'move',x:.4,y:.3}}),
  {type:'chargeInput',gesture:{type:'move',x:.4,y:.3}});
 assert.deepEqual(normalizeMatchCommand(1,{type:'purifyInput',gesture:{type:'up'}}),
  {type:'purifyInput',gesture:{type:'up'}});
 for(const bad of [
  {type:'chargeInput',gesture:{type:'up',x:.5}},
  {type:'pokeInput',gesture:{type:'move',x:-1,y:0}},
  {type:'purifyInput',gesture:{type:'down',x:.5,y:1.5}},
  {type:'purifyInput',gesture:null},
  {type:'rotate',direction:1,junk:0}
 ])assert.throws(()=>normalizeMatchCommand(0,bad));
});
test('a transcript of 500 mixed host and client actions is reproducible',()=>{
 const m=make();let sa=0,sb=0;
 for(let n=0;n<500;n++){
  if(n%9===0){
   sa++;const r=issue(m,0,sa,{type:'rotate',direction:n%2?1:-1});
   assert.equal(r.accepted,true);
  }else if(n%11===0){
   sb++;const r=issue(m,1,sb,{type:'rotate',direction:1});
   assert.equal(r.accepted,true);
  }else m.advanceAuto();
 }
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
 assert.equal(m.exportJournal().entries.length,500);
});
test('QA fingerprints are deterministic but not secret authentication values',()=>{
 const a={x:1,items:[2,3]},b={x:1,items:[2,3]};
 assert.equal(stateFingerprint(a),stateFingerprint(b));
 assert.notEqual(stateFingerprint(a),stateFingerprint({x:2,items:[2,3]}));
 assert.match(stateFingerprint(a),/^[a-f0-9]{8}$/);
});
