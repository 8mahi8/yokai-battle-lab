import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';
import {RENTAL_SPECIAL_TREATMENTS,projectSoultimateVisual}
 from '../presentation/soultimate-visual-profiles.mjs';
import {readFileSync} from 'node:fs';

const treatments=['strike','siphon','rally','storm','renew','suppress'];
const css=readFileSync(new URL('../lab/yw2-layout.css',import.meta.url),'utf8');
const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
function hostSpecial(i){
 const host=createCombat({seed:20261030+i,
  catalogSoultimateResolution:true,researchSpecialEffects:true,
  researchDamageModel:true,researchStatInspirits:true});
 const actor='A'+(i+1);
 for(let n=0;n<6&&!host.snapshot().clock.teams[0].frontIds.includes(actor);n++)
  assert.equal(host.rotate(0,1).ok,true);
 assert.ok(host.snapshot().clock.teams[0].frontIds.includes(actor));
 assert.equal(host.giveSoul(actor,100),100);
 const begin=host.prepareSoultimate(0,actor);
 assert.equal(begin.ok,true);
 assert.equal(host.resolveSoultimate(0,begin.token,true).ok,true);
 return {actor,host};
}
test('V3-4-24 six styles are generated from one existing Soultimate effect master, not fabricated hit counts',()=>{
 assert.equal(RENTAL_SPECIAL_TREATMENTS.length,6);
 for(let i=0;i<6;i++){
  const profile=RENTAL_SPECIAL_TREATMENTS[i],move=RENTAL_SOULTIMATE_MOVES[i];
  assert.ok(Object.isFrozen(profile));
  assert.equal(profile.slot,i+1);
  assert.equal(profile.moveId,move.id);
  assert.equal(profile.effectKind,move.kind);
  assert.equal(profile.treatment,treatments[i]);
  assert.equal(profile.evidence,'visual-playtest');
  assert.equal(move.hitPattern.count,move.kind==='buff'||move.kind==='revive-heal'||
   move.kind==='debuff'?0:null);
 }
});
test('V3-4-24 all six real host Soultimate effects drive the correct visual without changing host snapshot',()=>{
 for(let i=0;i<6;i++){
  const {host,actor}=hostSpecial(i);
  const truth=JSON.stringify(host.snapshot()),state=host.snapshot();
  const view=makeStageView({game:state,revision:1,clientSequences:[0,0],forecast:[]},0);
  const event=view.events.findLast(x=>x.type==='special');
  assert.ok(event&&event.actor===actor,'host special missing '+actor);
  assert.equal(event.specialVisual?.treatment,treatments[i]);
  const cue=latestBattleCue(view.events);
  assert.strictEqual(cue.specialVisual,event.specialVisual);
  const plan=planActionChoreography(cue);
  assert.strictEqual(plan.specialVisual,event.specialVisual);
  const anticipation=choreographyFrame(plan,plan.phases[0].endMs-1);
  const hit=choreographyFrame(plan,plan.phases[1].startMs);
  assert.equal(anticipation.phase,'anticipation');
  assert.equal(anticipation.impacts.length,0,'never show host hit before cutin ends');
  assert.equal(hit.phase,'impact');
  assert.equal(hit.impacts.length,event.impacts.length?1:0);
  assert.equal(plan.hitResults.length,0,
   'targets of a rental special must NOT be re-labelled multiple real hits');
  assert.equal(JSON.stringify(host.snapshot()),truth,
   'visual style must not write damage/soul/KO/accuracy');
 }
});
test('V3-4-24 never assign a slot-specific visual to an original research move or contradictory custom roster',()=>{
 const {host}=hostSpecial(0);
 const game=host.snapshot();
 const actual=game.events.findLast(e=>e.type==='special');
 assert.equal(projectSoultimateVisual(actual,game.squads)?.treatment,'strike');
 const ref={...actual,referenceSoultimate:{id:'yw2:jibanyan'}};
 assert.equal(projectSoultimateVisual(ref,game.squads),null);
 const changed=game.squads.map(t=>t.map(u=>({...u})));
 changed[0][0].name='別の原作妖怪';
 assert.equal(projectSoultimateVisual(actual,changed),null);
 changed[0][0].name=RENTAL_SQUAD[0].name;
 changed[0][0].skill='different-skill';
 assert.equal(projectSoultimateVisual(actual,changed),null);
 const mismatch={...actual,impacts:[{kind:'buff',targetId:'A1',amount:0}]};
 assert.equal(projectSoultimateVisual(mismatch,game.squads),null);
 const cue=latestBattleCue([ref]);
 assert.equal(cue.specialVisual,undefined);
 assert.throws(()=>planActionChoreography({...latestBattleCue(makeStageView({
  game,revision:1,forecast:[]},0).events),specialVisual:{treatment:'strike',slot:1}}),
  /untrusted Soultimate presentation profile/);
});
test('V3-4-24 field/cutin profile treatments are DOM-only and every rental type has a reusable CSS treatment',()=>{
 assert.match(stage,/id="mb-special-impact-style"/);
 assert.match(stage,/specialImpactStyle\.hidden=/);
 assert.match(stage,/backdrop\.dataset\.specialTreatment=/);
 assert.match(stage,/cutin\.dataset\.treatment=/);
 for(const treatment of treatments){
  assert.ok(css.includes('data-treatment="'+treatment+'"'),'missing '+treatment);
 }
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/https?:\/\//);
});
