import assert from 'node:assert/strict';
import test from 'node:test';
import { createBattle, waitCostFromSpeed } from '../engine/phase1.mjs';

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

test('frontline rotation is circular and preserves unit-specific debt', () => {
  const battle=createBattle({seed:11,rotationCooldownMs:0});
  const old=battle.snapshot().teams[0].members.map(x=>x.wait);
  for(let k=0;k<6;k++) assert.equal(battle.rotate(0,1,k).ok,true);
  assert.deepEqual(battle.snapshot().teams[0].frontIds,['A1','A2','A3']);
  assert.deepEqual(battle.snapshot().teams[0].members.map(x=>x.wait),old);
  assert.equal(battle.rotate(0,-1,9).ok,true);
  assert.deepEqual(battle.snapshot().teams[0].frontIds,['A6','A1','A2']);
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

test('rear member enters active pool without resetting its waiting debt', () => {
  const battle=createBattle({seed:8,rotationCooldownMs:0});
  battle.simulate(15);
  const before=battle.snapshot().teams[0].members[3].wait;
  assert.equal(battle.rotate(0,1,0).ok,true);
  assert.deepEqual(battle.snapshot().teams[0].frontIds,['A2','A3','A4']);
  assert.equal(battle.snapshot().teams[0].members[3].wait,before);
  battle.simulate(5);
  assert.ok(battle.snapshot().teams[0].members[3].wait <= before || battle.snapshot().teams[0].members[3].acted > 0);
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
  assert.deepEqual(before.teams[0].members,after.teams[0].members);
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
