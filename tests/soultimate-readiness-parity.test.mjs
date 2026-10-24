import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {soultimateReadiness} from '../ui/soultimate-ready.mjs';
import {makeStageView,matchSelectionHints} from '../ui/match-stage.mjs';

test('normal わざOK requires caster fully charged, not merely living front',()=>{
 const battle=createCombat();
 let before=soultimateReadiness(battle.snapshot(),0);
 assert.deepEqual(['A1','A2','A3'].map(id=>before[id].ready),[false,false,false]);
 battle.giveSoul('A2',100);
 const game=battle.snapshot();
 const ready=soultimateReadiness(game,0);
 assert.equal(ready.A2.ready,true);
 assert.deepEqual(ready.A2.consumers,['A2']);
 assert.equal(ready.A1.ready,false);
 assert.equal(game.soul.teams[0].find(m=>m.id==='A2').soul,100,
  'read-only eligibility cannot spend charge');
 const wire=createMatchProtocol().snapshot();
 wire.game=game;
 const view=makeStageView(wire,0);
 assert.deepEqual(matchSelectionHints(view,'charge').own,['A2']);
 assert.equal(view.teams[0].members.find(x=>x.id==='A2').specialReady,true);
 assert.equal(view.teams[0].members.find(x=>x.id==='A1').specialReady,false);
});

test('GわざOK consumes caster plus fixed-ring neighbours even when A6 is benched',()=>{
 const battle=createCombat();
 battle.setWatchMode(0,'zero');
 battle.giveSoul('A1',100);
 battle.giveSoul('A2',100);
 let interim=soultimateReadiness(battle.snapshot(),0);
 assert.equal(interim.A1.ready,false,'A6 is required despite being on reserve');
 assert.ok(interim.A1.missing.includes('A6'));
 battle.giveSoul('A6',100);
 const before=battle.snapshot();
 const ready=soultimateReadiness(before,0);
 assert.equal(ready.A1.ready,true);
 assert.deepEqual(ready.A1.consumers,['A6','A1','A2']);
 assert.equal(ready.A2.ready,false,'A2 still requires A3');
 const start=battle.beginGuidedCharge(0,'A1');
 assert.equal(start.ok,true,'existing combat engine must permit G with reserve neighbour');
 assert.deepEqual(start.consumers,['A6','A1','A2']);
 assert.deepEqual(before.soul.teams[0].map(x=>x.soul),
  [100,100,0,0,0,100],'UI projection must not change Soul');
 const during=soultimateReadiness(battle.snapshot(),0);
 assert.equal(during.A1.ready,false,'already pending touch input must not be selectable again');
});

test('unable-to-act, KO and busy touch phase never falsely show わざOK',()=>{
 const battle=createCombat();
 battle.giveSoul('A1',100);
 const copied=structuredClone(battle.snapshot());
 copied.clock.teams[0].members.find(x=>x.id==='A1').canAct=false;
 assert.equal(soultimateReadiness(copied,0).A1.ready,false);
 copied.clock.teams[0].members.find(x=>x.id==='A1').canAct=true;
 copied.squads[0].find(x=>x.id==='A1').hp=0;
 assert.equal(soultimateReadiness(copied,0).A1.ready,false);
 const start=battle.beginGuidedCharge(0,'A1');
 assert.equal(start.ok,true);
 assert.equal(soultimateReadiness(battle.snapshot(),0).A1.ready,false);
 assert.throws(()=>soultimateReadiness({},0),/canonical/);
 assert.throws(()=>soultimateReadiness(battle.snapshot(),5),/canonical/);
});
