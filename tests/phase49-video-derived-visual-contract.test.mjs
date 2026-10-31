import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTION_VISUAL_CATALOG} from '../presentation/action-catalog.mjs';
import {planActionChoreography,choreographyFrame} from '../presentation/action-choreography.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
const css=readFileSync(new URL('../lab/yw2-layout.css',import.meta.url),'utf8');
const stage=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');

test('user recorded Soultimate: large source-inspired character portrait then effect, not source video sprites',()=>{
 const special=ACTION_VISUAL_CATALOG.special;
 const duration=special.windupMs+special.impactMs+special.recoveryMs;
 assert.ok(special.windupMs>=1000,
  'edited 3DS recording shows a readable portrait cutin before the effect');
 assert.ok(duration<=2600,
  'temporary auto-step interval is 2.6 seconds; trial visuals must not mask next action');
 const cue=latestBattleCue([{type:'special',eventId:100,actor:'A1',
  mode:'normal',impacts:[{targetId:'B2',kind:'damage',amount:50}]}]);
 const plan=planActionChoreography(cue);
 const windup=choreographyFrame(plan,850);
 assert.equal(windup.phase,'anticipation');
 assert.equal(windup.impactVisible,false);
 assert.equal(windup.impacts.length,0);
 const impact=choreographyFrame(plan,special.windupMs);
 assert.equal(impact.phase,'impact');
 assert.equal(impact.impacts[0].amount,50);
 assert.ok(stage.includes('scenePhase===\'anticipation\''));
 assert.ok(stage.includes('renderSpiritPortrait(id)'));
 assert.ok(css.includes('.mb-yw2 .mb-special-flare')&&css.includes('.mb-special-cutin-lines'));
 assert.doesNotMatch(css,/https?:\/\//,'presentation must use local primitives only');
});
test('original video crosshair and statuses are presentation-only, never separate action commands',()=>{
 assert.match(stage,/class="mb-pin-reticle"/);
 assert.match(stage,/mb-status-marker mb-status-bad/);
 assert.match(stage,/mb-status-marker mb-status-good/);
 assert.match(stage,/unit\.negative/);
 assert.match(stage,/unit\.positive/);
 assert.match(css,/mb-pin-reticle:after/);
 assert.match(css,/mb-status-bad/);
 assert.match(css,/mb-status-good/);
 assert.match(stage,/view\.teams\[activeSeat\]\.pin===id/,
  'target indication must follow the authoritative host pin');
 assert.doesNotMatch(stage,/fetch\(['"]https?:\/\//,
  'no outside CDN should be fetched by the battle renderer');
});
