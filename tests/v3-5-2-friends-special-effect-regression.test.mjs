import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCombat} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';

const battleOptions=Object.freeze({
 playtestSoulTuning:true,enableLoafing:true,researchSpecialEffects:true,
 researchDamageModel:true,researchStatInspirits:true
});

test('V3-5-2 regression: actual Friends production options must enable real six-rental special effects',()=>{
 const source=readFileSync(new URL('../lab/sites-embed-online-entry.mjs',import.meta.url),'utf8');
 const host=source.match(/createMatchProtocol\(\{battleOptions:__YW_FRIENDS_MODE__\?\{([\s\S]*?)\}:\{\}\}\)/);
 assert.ok(host,'Friends host battle options missing or replaced by test-only path');
 for(const key of Object.keys(battleOptions))
  assert.match(host[1],new RegExp('\\b'+key+':true\\b'),
   key+' disabled in the production Friends host');
 assert.match(source,/if\(__YW_EMULATOR_MODE__&&__YW_FRIENDS_MODE__&&touchQaMode\)/,
  'local-only charge/Purify test driver is not explicitly compile-time gated');
});

test('V3-5-2 same production battle flags: confirmed A1 special applies actual host damage and creates visible scene',()=>{
 const host=createCombat({seed:20261030,...battleOptions});
 const first=host.snapshot().squads[1].map(x=>x.hp);
 host.giveSoul('A1',100);
 const charged=host.prepareSoultimate(0,'A1');
 assert.equal(charged.ok,true);
 const applied=host.resolveSoultimate(0,charged.token,true);
 assert.equal(applied.ok,true);
 assert.equal(applied.effectStatus,'research-fixture',
  'completed charge must not silently return unimplemented');
 const state=host.snapshot();
 const event=state.events.filter(e=>e.type==='special').at(-1);
 assert.ok(event&&event.actor==='A1');
 assert.ok(event.impacts.some(x=>x.amount>0));
 assert.ok(state.squads[1].some((x,i)=>x.hp<first[i]));
 const view=makeStageView({game:state,revision:1,clientSequences:[0,0]},0);
 const cue=latestBattleCue(view.events);
 assert.equal(cue.type,'special');
 assert.equal(cue.actor,'A1');
 assert.ok(cue.targets.length>0);
});
