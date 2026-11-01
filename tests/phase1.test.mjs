import assert from 'node:assert/strict';
import test from 'node:test';
import { createBattle, waitCostFromSpeed, initialWaitRange } from '../engine/phase1.mjs';

const speedCases = [
  [1,369], [3,366], [171,198], [172,198], [175,198], [176,195],
  [201,180], [202,180], [210,180], [211,177], [501,90], [502,90], [1000,90]
];

test('published speed breakpoint model (non-official research)', () => {
  for (const [speed, points] of speedCases) assert.equal(waitCostFromSpeed(speed), points, `speed ${speed}`);
  for (let s = 2; s < 1000; s++) assert.ok(waitCostFromSpeed(s) <= waitCostFromSpeed(s-1));
  for (const invalid of [0,-1,1.1,NaN,Infinity]) assert.throws(() => waitCostFromSpeed(invalid));
});

test('both players get exactly six distinct members and exactly three active', () => {
  const shot = createBattle().snapshot();
  assert.equal(shot.teams.length, 2);
  for (const team of shot.teams) {
    assert.equal(team.members.length, 6);
    assert.equal(new Set([...team.frontIds, ...team.benchIds]).size, 6);
    assert.deepEqual(team.frontIds, team.members.slice(0,3).map(x=>x.id));
    assert.equal(team.members.filter(x=>x.originalFront).length, 3);
  }
});

test('whole battle with same seed is deterministic and rental teams are mirrored', () => {
  const first=createBattle({seed:73}), second=createBattle({seed:73});
  assert.deepEqual(first.simulate(250), second.simulate(250));
  const roster=first.snapshot().teams.map(x=>x.members.map(y=>y.speed));
  assert.deepEqual(roster[0],roster[1]);
});

test('initial wait table matches traced YW2 boundary rows', () => {
 const rows=[[1,156,187],[5,155,186],[161,103,134],[164,102,132],[167,101,130],[170,100,128],[171,99,126],[175,99,126],[176,98,124],[200,94,116],[201,93,114],[210,93,114],[211,92,112],[250,88,106],[500,38,56],[501,36,54]];
 for(const [speed,low,high] of rows) assert.deepEqual(initialWaitRange(speed),[low,high]);
 for(const invalid of [0,1.2,-1,NaN,Infinity])assert.throws(()=>initialWaitRange(invalid));
});

test('whole wheel returns to same layout while rotating-in debt resets', () => {
 const b=createBattle({seed:11,rotationCooldownMs:0});
 const before=b.snapshot();
 for(let i=0;i<6;i++)assert.equal(b.rotate(0,1,i).ok,true);
 const after=b.snapshot();
 assert.deepEqual(after.teams[0].frontIds,before.teams[0].frontIds);
 assert.equal(after.teams[0].members[0].wait,after.teams[0].members[0].cost);
 assert.equal(after.teams[0].members.filter(m=>m.wait!==null).length,3);
});

test('only active members accrue action eligibility in working model', () => {
  const battle=createBattle({seed:2});
  const before=battle.snapshot();
  const benches=new Map(before.teams.flatMap(x=>x.benchIds.map(id=>[id,x.members.find(y=>y.id===id).wait])));
  battle.simulate(60);
  const after=battle.snapshot();
  for(const [id,wait] of benches) {
    const unit=after.teams.flatMap(x=>x.members).find(x=>x.id===id);
    assert.equal(unit.wait,wait,id);
    assert.equal(unit.acted,0,id);
  }
  assert.ok(after.pointsElapsed>0);
});

test('only new front member resets, survivors keep their wait, outgoing becomes inactive', () => {
 const b=createBattle({seed:8,rotationCooldownMs:0});
 b.simulate(15);
 const before=b.snapshot(), oldWait=before.teams[0].members[1].wait;
 const result=b.rotate(0,1,0);
 const after=b.snapshot();
 assert.deepEqual(result.rotatedIn,['A4']);
 assert.deepEqual(result.rotatedOut,['A1']);
 assert.equal(after.teams[0].members[0].wait,null);
 assert.equal(after.teams[0].members[1].wait,oldWait);
 assert.equal(after.teams[0].members[3].wait,after.teams[0].members[3].cost);
});

test('3-second circle cooldown is independent of action points', () => {
  const battle=createBattle({rotationCooldownMs:3000});
  assert.equal(battle.rotate(0,1,1000).ok,true);
  const snap=battle.snapshot();
  assert.equal(battle.rotate(0,1,3999).ok,false);
  assert.equal(battle.rotate(0,-1,3999).remainingMs,1);
  assert.deepEqual(battle.snapshot(),snap);
  assert.equal(battle.rotate(0,1,4000).ok,true);
  assert.equal(battle.rotate(1,1,2000).ok,true);
});

test('a rotate never changes the opposing side, unit stats or global point clock', () => {
  const battle=createBattle({seed:3,rotationCooldownMs:0});
  battle.simulate(9);
  const before=battle.snapshot();
  battle.rotate(0,1,0);
  const after=battle.snapshot();
  assert.deepEqual(before.teams[1],after.teams[1]);
  assert.equal(before.turn,after.turn);
  assert.equal(before.pointsElapsed,after.pointsElapsed);
  assert.deepEqual(before.teams[0].members.map(m=>m.speed),after.teams[0].members.map(m=>m.speed));
});

test('rotation interleaving and seed yield replayable logs', () => {
  const trace = () => {
    const b=createBattle({seed:42});
    const actions=[...b.simulate(10)];
    assert.equal(b.rotate(0,1,4000).ok,true);
    actions.push(...b.simulate(10));
    assert.equal(b.rotate(1,-1,8000).ok,true);
    actions.push(...b.simulate(15));
    return [actions,b.snapshot()];
  };
  assert.deepEqual(trace(),trace());
});

test('simulation exposes no action/damage choices in phase 1', () => {
  const battle=createBattle({seed:10});
  const actions=battle.simulate(1000);
  assert.equal(actions.length,1000);
  assert.ok(actions.every(x => ['A','B'].includes(x.id[0])));
  assert.ok(actions.every(x=>!('damage' in x) && !('attack' in x)));
  assert.equal(battle.snapshot().turn,1000);
});

test('initial front waits stay inside source ranges for 40 seeds', () => {
 for(let seed=1;seed<=40;seed++){
  const state=createBattle({seed}).snapshot();
  for(const team of state.teams)for(const member of team.members){
   if(member.originalFront){
    const [low,high]=initialWaitRange(member.speed);
    assert.ok(member.wait>=low && member.wait<=high);
   }else assert.equal(member.wait,null);
  }
 }
});
