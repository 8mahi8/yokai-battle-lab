import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat, RENTAL_SQUAD} from '../engine/combat.mjs';
import {actionWeights,pickAction} from '../engine/selection.mjs';

function setup({kind='sleep',resistance=0,weights=[0,0,100,0],seed=4}={}) {
 const squad=RENTAL_SQUAD.map(u=>({...u,weights:[...weights],inspirit:kind,inspiritResistance:resistance}));
 return createCombat({seed,teams:[squad,squad],autoRotateReserves:false});
}
test('four action slots with 100 fixture weight',()=>{
 for(const u of RENTAL_SQUAD) assert.equal(u.weights.reduce((a,b)=>a+b),100);
 const bad=RENTAL_SQUAD.map(u=>({...u}));
 bad[0].weights=[90,10,0];
 assert.throws(()=>createCombat({teams:[bad,RENTAL_SQUAD]}));
 bad[0].weights=[90,10,0,10];
 assert.throws(()=>createCombat({teams:[bad,RENTAL_SQUAD]}));
});
test('weighted selector respects four boundaries',()=>{
 assert.equal(pickAction([25,25,25,25],()=>0),'attack');
 assert.equal(pickAction([25,25,25,25],()=>.25),'technique');
 assert.equal(pickAction([25,25,25,25],()=>.5),'inspirit');
 assert.equal(pickAction([25,25,25,25],()=>.75),'guard');
});
test('YW2 Gentle checks individual front member HP, not only party average',()=>{
 const u={hp:10,maxHp:100,technique:'heal',weights:[35,40,15,10],attitude:'gentle',inspirit:'strength-up'};
 const allies=[{id:'A1',hp:10,maxHp:100},{id:'A2',hp:100,maxHp:100},{id:'A3',hp:100,maxHp:100}];
 assert.deepEqual(actionWeights(u,{allies,enemies:[{id:'B1',hp:100,maxHp:100,defense:20}]}),[0,40,0,0]);
});
test('Careful rule boosts guard as the fourth action',()=>{
 const u={id:'A1',hp:30,maxHp:100,technique:'damage',weights:[10,10,10,70],attitude:'careful',inspirit:'sleep'};
 assert.deepEqual(actionWeights(u,{allies:[u],enemies:[{id:'B1',hp:100,maxHp:100,defense:200}]}),[10,10,10,350]);
});
test('automatic negative Inspirit and bench-only purification',()=>{
 const game=setup(),action=game.step();
 assert.equal(action.kind,'inspirit');assert.equal(action.effect,'sleep');assert.equal(action.hit,true);
 assert.ok(game.snapshot().inspirits[action.target].some(x=>x.effect==='sleep'));
 const side=Number(action.target[0]==='B');
 assert.equal(game.purify(side,action.target).reason,'must_be_on_bench');
 for(let i=0;i<3&&!game.snapshot().clock.teams[side].benchIds.includes(action.target);i++)game.rotate(side,1);
 assert.equal(game.purify(side,action.target).ok,true);
 assert.ok(!game.snapshot().inspirits[action.target].some(x=>x.effect==='sleep'));
});
test('100% research resistance prevents negative Inspirit',()=>{
 const action=setup({resistance:100}).step();
 assert.equal(action.kind,'inspirit');assert.equal(action.resisted,true);assert.equal(action.hit,false);
});
test('positive Inspirit applies to own team, then expires',()=>{
 const game=setup({kind:'strength-up'}),action=game.step();
 assert.equal(action.kind,'inspirit');assert.equal(action.target[0],action.actor[0]);
 assert.equal(game.snapshot().inspirits[action.target][0].sign,'positive');
 for(let i=0;i<30;i++)game.step();
 assert.ok(!game.snapshot().inspirits[action.target].some(x=>x.effect==='strength-up'));
});
test('four-action seeded replay and valid hp',()=>{
 const replay=()=>{const b=createCombat({seed:8888});return [b.simulate(450),b.snapshot()];};
 assert.deepEqual(replay(),replay());
 const [events,snap]=replay();
 assert.ok(events.some(x=>x.kind==='inspirit'));
 assert.ok(snap.squads.flat().every(x=>x.hp>=0&&x.hp<=x.maxHp));
});
test('invalid resistance and reversed buff rejected',()=>{
 const battle=createCombat();
 assert.throws(()=>battle.applyInspirit({id:'A1',sign:'negative',effect:'strength-up'}));
 const party=RENTAL_SQUAD.map(u=>({...u}));party[0].inspiritResistance=101;
 assert.throws(()=>createCombat({teams:[party,RENTAL_SQUAD]}));
});
