import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoulSystem} from '../engine/soul.mjs';
const create=()=>createSoulSystem({teams:[Array.from({length:6},(_,i)=>({id:'A'+(i+1)})),Array.from({length:6},(_,i)=>({id:'B'+(i+1)}))]});
const front=['A1','A2','A3'],enemy=['B1','B2','B3'];
test('two complete teams with distinct ids are required',()=>{
 assert.throws(()=>createSoulSystem({teams:[[],[]]}));
 assert.throws(()=>createSoulSystem({teams:[Array(6).fill({id:'A1'}),Array.from({length:6},(_,i)=>({id:'B'+i}))]}));
});
test('normal Soultimate consumes only caster',()=>{
 const g=create();g.addSoul('A1',100);g.addSoul('A2',80);
 const charge=g.prepare({side:0,casterId:'A1',frontIds:front});
 assert.equal(charge.ok,true);assert.equal(g.resolve({side:0,token:charge.token,frontIds:front,success:true}).kind,'soultimate');
 assert.equal(g.snapshot().teams[0][0].soul,0);assert.equal(g.snapshot().teams[0][1].soul,80);
});
test('G tech uses ring neighbors even when neighbor is benched',()=>{
 const g=create();g.setMode(0,'zero');
 assert.deepEqual(g.neighbors(0,'A1'),['A6','A1','A2']);
 for(const id of ['A6','A1','A2'])g.setSoul(id,100);
 assert.deepEqual(g.eligibility({side:0,casterId:'A1',frontIds:front}).consumers,['A6','A1','A2']);
 const c=g.prepare({side:0,casterId:'A1',frontIds:front});
 const r=g.resolve({side:0,token:c.token,frontIds:front,success:true});
 assert.equal(r.kind,'g-tech');assert.equal(r.powerMultiplier,2);
 for(const id of ['A6','A1','A2'])assert.equal(g.snapshot().teams[0].find(m=>m.id===id).soul,0);
});
test('G tech requires every neighbor full',()=>{
 const g=create();g.setMode(0,'zero');g.setSoul('A1',100);g.setSoul('A2',100);
 assert.deepEqual(g.eligibility({side:0,casterId:'A1',frontIds:front}).missing,['A6']);
});
test('backline caster cannot use G tech',()=>{
 const g=create();g.setMode(0,'zero');
 for(const id of ['A3','A4','A5'])g.setSoul(id,100);
 assert.equal(g.eligibility({side:0,casterId:'A4',frontIds:front}).reason,'caster_not_front');
});
test('no Soul spending until charge completion; cancellation refunds',()=>{
 const g=create();g.setSoul('A1',100);
 const c=g.prepare({side:0,casterId:'A1',frontIds:front});
 assert.equal(g.snapshot().teams[0][0].soul,100);
 assert.equal(g.resolve({side:0,token:c.token,frontIds:front,success:false}).reason,'charge_cancelled');
 assert.equal(g.snapshot().teams[0][0].soul,100);
});
test('pending charge cannot double-spend or be replayed',()=>{
 const g=create();g.setSoul('A1',100);
 const c=g.prepare({side:0,casterId:'A1',frontIds:front});
 assert.equal(g.prepare({side:0,casterId:'A1',frontIds:front}).reason,'charge_already_pending');
 assert.equal(g.resolve({side:0,token:c.token,frontIds:front,success:true}).ok,true);
 assert.equal(g.resolve({side:0,token:c.token,frontIds:front,success:true}).reason,'stale_or_unknown_charge');
});
test('rotation during charge invalidates spending',()=>{
 const g=create();g.setSoul('A1',100);
 const c=g.prepare({side:0,casterId:'A1',frontIds:front});
 assert.equal(g.resolve({side:0,token:c.token,frontIds:['A2','A3','A4'],success:true}).reason,'caster_not_front');
 assert.equal(g.snapshot().teams[0][0].soul,100);
});
test('Watch mode switch cancels a pending charge',()=>{
 const g=create();g.setSoul('A1',100);
 const c=g.prepare({side:0,casterId:'A1',frontIds:front});
 g.setMode(0,'zero');
 assert.equal(g.resolve({side:0,token:c.token,frontIds:front,success:true}).reason,'stale_or_unknown_charge');
});
test('forged nonconsecutive front rejected',()=>{
 const g=create();g.setSoul('A1',100);
 assert.throws(()=>g.eligibility({side:0,casterId:'A1',frontIds:['A1','A3','A5']}));
});
test('Poke is only possible in Zero mode for vulnerable front enemies',()=>{
 const g=create();
 assert.equal(g.pokeEligibility({side:0,targetId:'B1',enemyFrontIds:enemy,negativeIds:['B1']}).reason,'zero_mode_required');
 g.setMode(0,'zero');
 assert.equal(g.pokeEligibility({side:0,targetId:'B4',enemyFrontIds:enemy,negativeIds:['B4']}).reason,'enemy_not_front');
 assert.equal(g.pokeEligibility({side:0,targetId:'B1',enemyFrontIds:enemy}).reason,'target_not_vulnerable');
 assert.equal(g.pokeEligibility({side:0,targetId:'B1',enemyFrontIds:enemy,negativeIds:['B1']}).ok,true);
});
test('Soul saturates without automatic accumulation',()=>{
 const g=create();
 assert.equal(g.addSoul('A1',42),42);assert.equal(g.addSoul('A1',999),100);
 assert.throws(()=>g.addSoul('A1',-1));assert.throws(()=>g.setSoul('A1',101));
 assert.equal(g.snapshot().teams[1][0].soul,0);
});
test('custom Soul capacities',()=>{
 const teams=[Array.from({length:6},(_,i)=>({id:'A'+(i+1),capacity:i===0?250:100})),Array.from({length:6},(_,i)=>({id:'B'+(i+1)}))];
 const g=createSoulSystem({teams});g.setSoul('A1',250);
 assert.equal(g.eligibility({side:0,casterId:'A1',frontIds:front}).ok,true);
});
