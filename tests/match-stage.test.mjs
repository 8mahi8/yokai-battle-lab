import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {makeStageView} from '../ui/match-stage.mjs';

test('Phase14 stage reads original two 6-member teams and front/bench wheel',()=>{
 const protocol=createMatchProtocol({battleOptions:{seed:212}});
 const before=protocol.snapshot(),a=makeStageView(before,0),b=makeStageView(before,1);
 assert.equal(a.forecast.length,5,'actual engine forecast is exposed in canonical snapshots');
 assert.equal(a.teams.length,2);
 assert.deepEqual(a.teams.map(t=>t.members.length),[6,6]);
 assert.deepEqual(a.teams[0].frontIds,['A1','A2','A3']);
 assert.deepEqual(a.teams[1].frontIds,['B1','B2','B3']);
 assert.deepEqual(a.teams[0].members.map(x=>x.slot),[0,1,2,3,4,5]);
 assert.ok(a.teams.every(team=>team.members.every(m=>m.capacity>0&&m.maxHp>0)));
 assert.equal(a.side,0);assert.equal(b.side,1);
 assert.deepEqual(a.forecast,b.forecast,'both seats use host-derived forecast, not independent RNG');
});
test('wheel rotation and target pin derive exclusively from canonical match',()=>{
 const p=createMatchProtocol({battleOptions:{seed:212}});
 const original=p.snapshot();
 const result=p.dispatch(0,1,{type:'rotate',direction:1});
 assert.equal(result.accepted,true);
 const after=makeStageView(p.snapshot(),0);
 assert.deepEqual(after.teams[0].frontIds,['A2','A3','A4']);
 assert.equal(after.teams[0].members.find(x=>x.id==='A1').slot,5);
 assert.equal(after.teams[0].members.find(x=>x.id==='A4').front,true);
 assert.notDeepEqual(after.forecast,original.forecast,'forecast reflects rotation');
 assert.equal(p.dispatch(0,2,{type:'pin',targetId:'B1'}).accepted,true);
 assert.equal(makeStageView(p.snapshot(),0).pin,'B1');
 assert.equal(p.dispatch(0,3,{type:'watch',mode:'zero'}).accepted,true);
 assert.equal(makeStageView(p.snapshot(),0).activeMode,'zero');
 assert.deepEqual(makeStageView(p.snapshot(),1).teams[0].frontIds,after.teams[0].frontIds);
});
test('repeated stage views and forecast do not mutate battle or hash',()=>{
 const p=createMatchProtocol({battleOptions:{seed:212}});
 const snapshot=p.snapshot();
 const states=Array.from({length:20},()=>makeStageView(p.snapshot(),1));
 assert.ok(states.every(x=>x.revision===0&&x.forecast.length===5));
 assert.deepEqual(p.snapshot(),snapshot);
 assert.deepEqual(p.snapshot().clientSequences,[0,0]);
});
test('invalid stage input fails closed',()=>{
 assert.throws(()=>makeStageView(null,0),/snapshot/);
 assert.throws(()=>makeStageView({game:{}},0),/snapshot/);
 assert.throws(()=>makeStageView(createMatchProtocol().snapshot(),3),/seat/);
});
