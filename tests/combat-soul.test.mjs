import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
const meter=(state,id)=>state.soul.teams.flat().find(x=>x.id===id).soul;
test('combat exposes independent six-member Soul meters per team',()=>{
 const g=createCombat(),s=g.snapshot();
 assert.deepEqual(s.soul.modes,['standard','standard']);
 assert.equal(s.soul.teams[0].length,6);
 assert.ok(s.soul.teams.flat().every(x=>x.soul===0));
});
test('standard Soultimate consumes caster only, no fake damage or heals',()=>{
 const g=createCombat();
 g.giveSoul('A1',100);g.giveSoul('A2',50);
 const before=g.snapshot().squads.map(t=>t.map(x=>x.hp));
 const c=g.prepareSoultimate(0,'A1');
 assert.equal(c.ok,true);
 const out=g.resolveSoultimate(0,c.token,true);
 assert.equal(out.kind,'soultimate');assert.equal(out.effectStatus,'unimplemented');
 assert.equal(meter(g.snapshot(),'A1'),0);assert.equal(meter(g.snapshot(),'A2'),50);
 assert.deepEqual(g.snapshot().squads.map(t=>t.map(x=>x.hp)),before);
});
test('G tech consumes original ring neighbors including benched A6',()=>{
 const g=createCombat();
 g.setWatchMode(0,'zero');
 for(const id of ['A6','A1','A2'])g.giveSoul(id,100);
 const c=g.prepareSoultimate(0,'A1');assert.equal(c.ok,true);
 assert.deepEqual(c.consumers,['A6','A1','A2']);
 const done=g.resolveSoultimate(0,c.token,true);
 assert.equal(done.kind,'g-tech');
 for(const id of ['A6','A1','A2'])assert.equal(meter(g.snapshot(),id),0);
});
test('Switching Watch to Zero clears targeting Pin',()=>{
 const g=createCombat();
 g.pin(0,'B1');assert.equal(g.snapshot().pins[0],'B1');
 g.setWatchMode(0,'zero');assert.equal(g.snapshot().pins[0],null);
 assert.throws(()=>g.pin(0,'B1'),/unavailable/);
 g.setWatchMode(0,'standard');g.pin(0,'B1');
 assert.equal(g.snapshot().pins[0],'B1');
});
test('rotating caster out prevents completing already prepared special',()=>{
 const g=createCombat();g.giveSoul('A1',100);
 const c=g.prepareSoultimate(0,'A1');
 g.rotate(0,1);
 assert.equal(g.resolveSoultimate(0,c.token,true).reason,'caster_not_front');
 assert.equal(meter(g.snapshot(),'A1'),100);
});
test('only inspirited or loafing enemies can be poked in Zero mode',()=>{
 const g=createCombat();
 g.setWatchMode(0,'zero');
 assert.equal(g.pokeEligibility(0,'B1').reason,'target_not_vulnerable');
 g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 const p=g.pokeEligibility(0,'B1');
 assert.equal(p.ok,true);assert.equal(p.reward,'unresolved');
 assert.equal(g.pokeEligibility(0,'B4').reason,'enemy_not_front');
});
test('research-only experimental Soul income is opt-in',()=>{
 const a=createCombat({seed:7}),b=createCombat({seed:7,researchSoulGainPerAction:5});
 a.step();b.step();
 assert.ok(a.snapshot().soul.teams.flat().every(x=>x.soul===0));
 assert.ok(b.snapshot().soul.teams.flat().every(x=>x.soul===5));
});
test('invalid experimental Soul income rejected',()=>{
 assert.throws(()=>createCombat({researchSoulGainPerAction:-1}));
 assert.throws(()=>createCombat({researchSoulGainPerAction:1.5}));
});
