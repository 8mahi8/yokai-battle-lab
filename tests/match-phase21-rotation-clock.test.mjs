import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

/** The official competitive 3-second rule is the published research claim,
 * not an assertion of exact 3DS frame-by-frame start timing. Phase21 uses
 * the source-backed Phase1 cooldown, but only behind an explicit opt-in.
 * https://hrs-game.main.jp/youkai_watch2/data/article_03.html
 */
test('Phase21 direct combat reuses Phase1 3000ms gate without advancing action points',()=>{
 const g=createCombat({rotationCooldownMs:3000});
 const t0=g.snapshot().clock;
 const first=g.rotate(0,1,1000);
 assert.equal(first.ok,true);
 const immediate=g.rotate(0,1,1200);
 assert.equal(immediate.ok,false);
 assert.equal(immediate.reason,'cooldown');
 assert.equal(immediate.remainingMs,2800);
 assert.deepEqual(g.snapshot().clock.teams[0].frontIds,first.frontIds);
 assert.equal(g.snapshot().clock.turn,t0.turn);
 assert.equal(g.snapshot().clock.pointsElapsed,t0.pointsElapsed);
 assert.equal(g.rotate(1,-1,1200).ok,true,'cooldown is independent for opponent');
 assert.equal(g.rotate(0,-1,3999).remainingMs,1);
 assert.equal(g.rotate(0,-1,4000).ok,true,'exact 3s boundary is allowed');
});
test('3s online research option uses host timestamps and replays both successful and rejected rotations',()=>{
 let hostMs=1000,calls=0;
 const m=createMatchProtocol({battleOptions:{rotationCooldownMs:3000},hostNowMs:()=>{
  calls++;return hostMs;
 }});
 const r1=m.dispatch(0,1,{type:'rotate',direction:1});
 assert.equal(r1.accepted,true);
 assert.equal(r1.result.ok,true);
 assert.equal(calls,1);
 const b=m.dispatch(1,1,{type:'rotate',direction:-1});
 assert.equal(b.result.ok,true,'B cooldown independent');
 const firstFront=m.snapshot().game.clock.teams[0].frontIds;
 hostMs=1290;
 const r2=m.dispatch(0,2,{type:'rotate',direction:1});
 assert.equal(r2.accepted,true,'rule-invalid command consumes seq');
 assert.equal(r2.result.ok,false);
 assert.equal(r2.result.reason,'cooldown');
 assert.equal(r2.result.remainingMs,2710);
 const before=m.snapshot();
 const repeated=m.dispatch(0,2,{type:'rotate',direction:1});
 assert.equal(repeated.duplicate,true);
 assert.equal(calls,3,'retransmission must not sample a new host clock');
 assert.deepEqual(m.snapshot(),before,'duplicate may not modify state');
 const malicious=m.dispatch(0,3,{type:'rotate',direction:1,atMs:999999});
 assert.equal(malicious.ok,false);
 assert.equal(malicious.reason,'invalid_command','client never owns timestamps');
 hostMs=3999;
 const r3=m.dispatch(0,3,{type:'rotate',direction:1});
 assert.equal(r3.result.reason,'cooldown');
 assert.deepEqual(m.snapshot().game.clock.teams[0].frontIds,firstFront);
 hostMs=4000;
 const r4=m.dispatch(0,4,{type:'rotate',direction:1});
 assert.equal(r4.result.ok,true);
 assert.notDeepEqual(m.snapshot().game.clock.teams[0].frontIds,firstFront);
 const journal=m.exportJournal();
 assert.deepEqual(journal.entries.filter(x=>x.side===0).map(x=>x.hostRotationAtMs),
  [1000,1290,3999,4000]);
 assert.deepEqual(replayMatchJournal(journal),
  {ok:true,revision:m.snapshot().revision,hash:m.snapshot().hash});
 const tampered=structuredClone(journal);
 delete tampered.entries[0].hostRotationAtMs;
 assert.equal(replayMatchJournal(tampered).reason,'invalid_replay_host_time');
});
test('default live contract retains old 0ms research setting, no timing hidden in user commands',()=>{
 const m=createMatchProtocol({hostNowMs:()=>{
  throw Error('clock must not be read when cooldown is unconfigured');
 }});
 assert.equal(m.exportJournal().initialOptions.rotationCooldownMs,undefined);
 assert.equal(m.dispatch(0,1,{type:'rotate',direction:1}).result.ok,true);
 assert.equal(m.dispatch(0,2,{type:'rotate',direction:1}).result.ok,true);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
 assert.throws(()=>createMatchProtocol({battleOptions:{rotationCooldownMs:-1}}),/invalid rotation cooldown/);
 assert.throws(()=>createMatchProtocol({hostNowMs:'system-clock'}),/trusted host clock/);
});
test('invalid trusted monotonic time cannot advance sequence, journal or wheel',()=>{
 const m=createMatchProtocol({battleOptions:{rotationCooldownMs:3000},
  hostNowMs:()=>NaN});
 const old=m.snapshot();
 assert.equal(m.dispatch(0,1,{type:'rotate',direction:1}).reason,'invalid_host_clock');
 assert.deepEqual(m.snapshot(),old);
 assert.equal(m.exportJournal().entries.length,0);
});
