import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView,specialTitleFromPlan} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography} from '../presentation/action-choreography.mjs';
import {RENTAL_SOULTIMATE_TITLES} from '../content/presentation-labels.mjs';

const cloneSquad=()=>RENTAL_SQUAD.map(m=>({...m,weights:[...m.weights]}));
function trigger(actorIndex,options={}){
 const host=createCombat({seed:177+actorIndex,catalogSoultimateResolution:true,
  researchSpecialEffects:true,researchDamageModel:true,
  researchStatInspirits:true,...options});
 const actor='A'+(actorIndex+1);
 for(let i=0;i<6&&!host.snapshot().clock.teams[0].frontIds.includes(actor);i++)
  assert.equal(host.rotate(0,1).ok,true);
 assert.equal(host.giveSoul(actor,100),100);
 const trial=host.prepareSoultimate(0,actor);
 assert.equal(trial.ok,true);
 assert.equal(host.resolveSoultimate(0,trial.token,true).ok,true);
 const state=host.snapshot();
 const cue=latestBattleCue(makeStageView({game:state,revision:1,clientSequences:[0,0]},0).events);
 return {host,actor,cue,plan:planActionChoreography(cue)};
}

test('V3-5-17 all six unchanged rentals retain the same authored visual Soultimate names',()=>{
 for(let i=0;i<6;i++){
  const {host,plan,actor}=trigger(i);
  assert.equal(plan.kind,'special');
  assert.equal(plan.actorId,actor);
  assert.ok(plan.specialVisual,'expected an authenticated rental visual '+actor);
  assert.equal(specialTitleFromPlan(plan),RENTAL_SOULTIMATE_TITLES[i]);
  assert.equal(host.snapshot().events.at(-1).referenceSoultimate,undefined);
 }
});

test('V3-5-17 custom move with identical rental name and effect type cannot inherit the rental title',()=>{
 const changed=cloneSquad();
 changed[0].special={kind:'damage',scope:'front',power:125,damageKind:'attack'};
 const host=createCombat({teams:[changed,cloneSquad()],seed:191,
  researchSpecialEffects:true,researchDamageModel:true,researchStatInspirits:true});
 host.giveSoul('A1',100);
 const trial=host.prepareSoultimate(0,'A1');
 assert.equal(trial.ok,true);
 assert.equal(host.resolveSoultimate(0,trial.token,true).ok,true);
 const before=JSON.stringify(host.snapshot());
 const cue=latestBattleCue(makeStageView({game:host.snapshot(),revision:1},0).events);
 const plan=planActionChoreography(cue);
 assert.equal(plan.specialVisual,null);
 assert.equal(specialTitleFromPlan(plan),'ひっさつわざ');
 assert.equal(JSON.stringify(host.snapshot()),before,'view cannot change battle result');
});

test('V3-5-17 an independently sourced research move uses its cited original name',()=>{
 const teams=[cloneSquad(),cloneSquad()];
 const host=createCombat({seed:41,teams,researchYw2Soultimate:'yw2:tararin:hanaji-bomber',
  researchSpecialEffects:true,researchDamageModel:true,researchStatInspirits:true});
 host.giveSoul('A1',100);
 const trial=host.prepareSoultimate(0,'A1');
 assert.equal(trial.ok,true);
 assert.equal(host.resolveSoultimate(0,trial.token,true).ok,true);
 const cue=latestBattleCue(makeStageView({game:host.snapshot(),revision:1},0).events);
 const plan=planActionChoreography(cue);
 assert.ok(plan.referenceSoultimate);
 assert.equal(plan.specialVisual,null);
 assert.equal(specialTitleFromPlan(plan),'原作技の研究：鼻血ボンバー');
 assert.equal(plan.specialHitLedger.originalHitCount,null,
  'research execution is not original YW2 damage/timing evidence');
});

test('V3-5-17 actual stage uses the single validated title for cutin and live action caption',()=>{
 const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
 assert.match(stage,/\$\('mb-special-title'\)\.textContent=flash\?\.type==='special'\?\s*specialTitleFromPlan\(scenePlan\)/);
 assert.match(stage,/const title=specialTitleFromPlan\(scenePlan\)/);
 assert.match(stage,/const named=title&&title!=='ひっさつわざ'\?title\+' \/ ':''/);
 assert.equal(specialTitleFromPlan(null),'');
 assert.equal(specialTitleFromPlan({kind:'attack'}),'');
});
