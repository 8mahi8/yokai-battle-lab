import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
const soul=(g,id)=>g.snapshot().soul.teams.flat().find(m=>m.id===id).soul;
const fill=(g,side)=>{let out;for(let i=0;i<12;i++)out=g.pokeInput(side,{type:'tap',x:.5,y:.5});return out;};
const ready=(g,side=0,id='B1')=>{
 g.setWatchMode(side,'zero');
 g.applyInspirit({id,sign:'negative',effect:'sleep'});
 return g.beginPoke(side,id);
};
test('standard Watch cannot start Poke and rejects unvulnerable foes',()=>{
 const g=createCombat();
 assert.equal(g.beginPoke(0,'B1').reason,'zero_mode_required');
 g.setWatchMode(0,'zero');
 assert.equal(g.beginPoke(0,'B1').reason,'target_not_vulnerable');
 assert.equal(g.beginPoke(0,'B4').reason,'enemy_not_front');
});
test('negative Inspirit permits timed gesture; completion recorded once per target',()=>{
 const g=createCombat(),started=ready(g);
 assert.equal(started.ok,true);
 assert.equal(started.challenge.hits,0);
 assert.equal(g.beginPoke(0,'B2').reason,'poke_already_pending');
 let result;
 for(let i=0;i<12;i++){
  result=g.pokeInput(0,{type:'tap',x:.5,y:.5});
  assert.equal(result.ok,true);
 }
 assert.equal(result.completed,true);
 assert.equal(result.reward.kind,'unresolved');
 assert.equal(soul(g,'B1'),0);
 assert.equal(g.snapshot().poke.active[0],null);
 assert.deepEqual(g.snapshot().poke.used[0],['B1']);
 assert.equal(g.beginPoke(0,'B1').reason,'already_poked');
 assert.equal(g.snapshot().events.filter(x=>x.type==='poke').length,1);
 assert.equal(g.pokeInput(0,{type:'tap',x:.5,y:.5}).reason,'no_active_poke');
});
test('only tap inputs inside the body increment meter; cancel resets eligibility',()=>{
 const g=createCombat();ready(g);
 assert.equal(g.pokeInput(0,{type:'tap',x:0,y:0}).challenge.hits,0);
 assert.equal(g.pokeInput(0,{type:'tap',x:.5,y:.5}).challenge.hits,1);
 assert.equal(g.cancelPoke(0).cancelled,true);
 assert.deepEqual(g.snapshot().poke.used[0],[]);
 assert.equal(g.cancelPoke(0).reason,'no_active_poke');
 assert.equal(g.beginPoke(0,'B1').challenge.hits,0);
});
test('rotating target off front cancels poke with no one-use consumption',()=>{
 const g=createCombat();ready(g);
 assert.equal(g.rotate(1,1).ok,true);
 assert.equal(g.snapshot().poke.active[0],null);
 assert.equal(g.pokeInput(0,{type:'tap',x:.5,y:.5}).reason,'no_active_poke');
 assert.deepEqual(g.snapshot().poke.used[0],[]);
 assert.equal(g.rotate(1,-1).ok,true);
 assert.equal(g.beginPoke(0,'B1').ok,true);
});
test('switching away from Zero cancels active Poke without spending target eligibility',()=>{
 const g=createCombat();ready(g);
 g.setWatchMode(0,'standard');
 assert.equal(g.snapshot().poke.active[0],null);
 assert.equal(g.snapshot().poke.used[0].length,0);
 assert.equal(g.beginPoke(0,'B1').reason,'zero_mode_required');
 g.setWatchMode(0,'zero');
 assert.equal(g.beginPoke(0,'B1').ok,true);
});
test('purification/changed vulnerability invalidates active Poke on next input',()=>{
 const g=createCombat();ready(g);
 g.rotate(1,1);
 g.purify(1,'B1');
 g.rotate(1,-1);
 assert.equal(g.beginPoke(0,'B1').reason,'target_not_vulnerable');
});
test('research transfer consumes enemy Soul and credits one living ally only',()=>{
 const g=createCombat({researchPokeSoulTransfer:20});
 g.giveSoul('B1',75);
 g.giveSoul('A1',90);
 ready(g);
 const result=fill(g,0);
 assert.equal(result.ok,true);assert.equal(result.completed,true);
 assert.equal(result.reward.kind,'research-soul-transfer');
 assert.equal(result.reward.amount,10,'recipient capacity is a hard ceiling');
 assert.equal(result.reward.recipientId,'A1');
 assert.equal(soul(g,'B1'),65);assert.equal(soul(g,'A1'),100);
 assert.equal(soul(g,'A2'),0);
});
test('research transfer does not create Soul if enemy has none',()=>{
 const g=createCombat({researchPokeSoulTransfer:40});
 ready(g);const result=fill(g,0);
 assert.equal(result.reward.amount,0);
 assert.equal(soul(g,'B1'),0);assert.equal(soul(g,'A1'),0);
});
test('simultaneous opposite-side Pokes cannot spend a target twice',()=>{
 const g=createCombat({researchPokeSoulTransfer:20});
 g.giveSoul('A1',60);g.giveSoul('B1',60);
 g.setWatchMode(0,'zero');g.setWatchMode(1,'zero');
 g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 g.applyInspirit({id:'A1',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPoke(0,'B1').ok,true);
 assert.equal(g.beginPoke(1,'A1').ok,true);
 assert.equal(fill(g,0).ok,true);
 assert.equal(fill(g,1).ok,true);
 assert.equal(g.snapshot().poke.used[0].length,1);
 assert.equal(g.snapshot().poke.used[1].length,1);
 assert.equal(g.snapshot().events.filter(x=>x.type==='poke').length,2);
});
test('loafing actor remains vulnerable beyond unrelated action until own next turn',()=>{
 const guard=RENTAL_SQUAD.map(x=>({...x,weights:[0,0,0,100],loafChance:0}));
 guard[0]={...guard[0],loafChance:100};
 const g=createCombat({seed:5,teams:[guard,guard],enableLoafing:true});
 g.setWatchMode(1,'zero');
 let found=false;
 for(let n=0;n<80;n++){
  const e=g.step();
  if(e.type!=='action')break;
  if(e.actor==='A1'&&e.kind==='loaf'){found=true;break;}
 }
 assert.equal(found,true);
 assert.equal(g.pokeEligibility(1,'A1').ok,true);
 for(let n=0;n<10;n++){
  const e=g.step();if(e.type!=='action')break;
  if(e.actor==='A1')break;
  assert.equal(g.pokeEligibility(1,'A1').ok,true);
 }
});
test('feature is default-off and invalid experimental transfer amounts rejected',()=>{
 const g=createCombat();
 assert.equal(g.snapshot().poke.rewardFixture,0);
 for(const val of [-1,251,1.5,'20',NaN])
  assert.throws(()=>createCombat({researchPokeSoulTransfer:val}));
});
