import test from 'node:test';
import assert from 'node:assert/strict';
import {actionForVisibleCue,collectNewBattleCues}
 from '../ui/battle-cue-sequence.mjs';
import {latestBattleCue,visualReactionClass} from '../ui/battle-vfx.mjs';
import {projectSoultimateImpactLedger,assertSoultimateImpactLedger}
 from '../contracts/soultimate-impact-ledger-v1.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {buildYw2MemoryDuoFourMoveLab,compileYw2MemoryDuoTrialTeams}
 from '../content/yw2-memory-duo-normal-lab.mjs';
import {createCombat} from '../engine/combat.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
const event=(eventId,turn=eventId,kind='attack')=>({
 eventId,type:'action',turn,actor:'A1',kind,target:'B1',
 hit:turn!==2,amount:turn*3,targetHp:100-turn*3
});

test('V3-4-19 batched host actions show the currently ANIMATED action, not newest snapshot',()=>{
 const events=[event(10),{eventId:11,type:'skill',actor:'A1'},
  event(12,12,'heal'),event(14,14,'attack')];
 const copyBefore=JSON.stringify(events);
 const batch=collectNewBattleCues(events,9);
 assert.deepEqual(batch.cues.map(x=>x.key),['event:10','event:12','event:14']);
 assert.equal(actionForVisibleCue(events,batch.cues[0]).eventId,10);
 assert.equal(actionForVisibleCue(events,batch.cues[1]).eventId,12);
 assert.equal(actionForVisibleCue(events,batch.cues[2]).eventId,14);
 assert.equal(actionForVisibleCue(events,null).eventId,14);
 assert.equal(actionForVisibleCue(events,{type:'special',key:'event:11'}).eventId,14,
  'non-action cut-in never fabricates a new action');
 assert.deepEqual(actionForVisibleCue(events,{type:'action',key:'event:11'}),null,
  'skill event must not be shown as an attack');
 assert.deepEqual(actionForVisibleCue(events,{type:'action',key:'event:999'}),null,
  'window eviction does not substitute latest hit for missing cue');
 assert.equal(JSON.stringify(events),copyBefore,'presentation lookup cannot mutate host events');
});
test('V3-4-19 old turn-key render and mismatched IDs stay safe',()=>{
 const events=[{...event(3,1),eventId:undefined},
  {...event(9,8),eventId:undefined}];
 assert.equal(actionForVisibleCue(events,{type:'action',key:'action:1'}).turn,1);
 assert.equal(actionForVisibleCue(events,{type:'action',key:'action:8'}).turn,8);
 assert.equal(actionForVisibleCue(events,{type:'action',key:'action:9'}),null);
 assert.equal(actionForVisibleCue(events,{type:'action',key:'bad'}),null);
 assert.equal(actionForVisibleCue([],null),null);
 assert.throws(()=>actionForVisibleCue(null),/events/);
 assert.throws(()=>actionForVisibleCue([],'wrong'),/cue/);
});
function sourceBattle(){
 const lab=buildYw2MemoryDuoFourMoveLab();
 const teams=copy(compileYw2MemoryDuoTrialTeams({lab}));
 for(const member of teams.flat())member.inspiritResistance=0;
 const host=createCombat({seed:1919,teams,researchYw2ActionOverrides:true,
  researchYw2Confusion:true,researchDamageModel:true,
  researchSpecialEffects:true,researchMultiHit:true});
 return {host,lab};
}
function release(host,actorId,charge){
 host.giveSoul(actorId,charge);
 const prep=host.prepareSoultimate(0,actorId);
 assert.equal(prep.ok,true);
 const result=host.resolveSoultimate(0,prep.token,true);
 assert.equal(result.ok,true);
 const event=host.snapshot().events.at(-1);
 assert.equal(event.type,'special');
 assert.equal(event.eventId>0,true);
 return event;
}
const visual=(event)=>{
 const before=JSON.stringify(event);
 const ledger=projectSoultimateImpactLedger(event);
 assert.ok(ledger,'non-HP statuses must have complete host target ledger');
 assert.equal(assertSoultimateImpactLedger(ledger),true);
 const cue=latestBattleCue([{...event,specialImpactLedger:ledger}]);
 const plan=planActionChoreography(cue);
 assert.equal(JSON.stringify(event),before,'read-only presentation');
 return {ledger,cue,plan};
};
test('V3-4-19 Wazzat dispel resolves through real host status and visual target clocks without phantom damage',()=>{
 const {host}=sourceBattle();
 for(const id of ['B1','B2','B3','B4'])
  host.applyInspirit({id,sign:'positive',effect:'strength-up',source:'B4'});
 host.applyInspirit({id:'B1',sign:'negative',effect:'sleep',source:'A5'});
 const event=release(host,'A1',100);
 assert.deepEqual(event.impacts.map(x=>x.kind),['dispel','dispel','dispel']);
 const {ledger,cue,plan}=visual(event);
 assert.equal(ledger.impacts.length,3);
 assert.deepEqual(ledger.impacts.map(x=>x.removedCount),[1,1,1]);
 assert.ok(ledger.impacts.every(x=>x.removeSign==='positive'&&x.applied));
 assert.ok(cue.targets.every(x=>x.kind==='dispel'&&x.amount===0&&x.hit));
 assert.ok(plan.impacts.every(x=>x.effect==='dispel'&&x.amount===0));
 assert.equal(plan.specialImpactLedger,ledger);
 const first=choreographyFrame(plan,plan.phases[1].startMs);
 assert.equal(first.specialTargetIndex,0);
 assert.equal(first.impacts.length,1);
 assert.equal(first.impacts[0].effect,'dispel');
 assert.equal(visualReactionClass(cue.targets[0]),'mb-inspirited');
 const final=host.snapshot();
 assert.ok(final.inspirits.B1.some(x=>x.sign==='negative'));
 assert.ok(final.inspirits.B4.some(x=>x.sign==='positive'));
});
test('V3-4-19 no-op dispel is never displayed as a MISS or damage',()=>{
 const {host}=sourceBattle();
 const event=release(host,'A1',100);
 const {ledger,cue,plan}=visual(event);
 assert.equal(event.impacts.length,3);
 assert.ok(ledger.impacts.every(x=>x.removedCount===0&&!x.applied));
 assert.ok(cue.targets.every(x=>x.kind==='dispel'&&x.amount===0&&!x.hit));
 assert.equal(visualReactionClass(cue.targets[0]),'');
 assert.ok(plan.impacts.every(x=>x.effect==='dispel'&&!x.hit));
});
test('V3-4-19 Houzzat non-damage confusion special still has host-linked statuses and targets',()=>{
 const {host}=sourceBattle();
 const event=release(host,'A2',200);
 const {ledger,cue,plan}=visual(event);
 assert.equal(ledger.impacts.length,3);
 assert.ok(ledger.impacts.every(x=>x.kind==='debuff'&&x.applied&&
  x.statusEffect==='friendly-fire'));
 assert.ok(cue.targets.every(x=>x.kind==='debuff'&&x.hit));
 const frame=choreographyFrame(plan,plan.phases[1].startMs);
 assert.equal(frame.impacts[0].effect,'debuff');
 assert.equal(host.snapshot().inspirits.B1.some(x=>x.effect==='friendly-fire'),true);
});
test('V3-4-19 tampered cleanse / wrong count / forged damage fail visual contract',()=>{
 const {host}=sourceBattle();
 host.applyInspirit({id:'B1',sign:'positive',effect:'strength-up',source:'B5'});
 const event=release(host,'A1',100),trueLedger=projectSoultimateImpactLedger(event);
 assert.ok(trueLedger);
 const alter=x=>copy(x);
 for(const patch of [
  {removedCount:-1},{removeSign:'negative'},{applied:false},{amount:1},
  {kind:'damage'},{hpAfter:999}
 ]){
  const changed=alter(trueLedger);Object.assign(changed.impacts[0],patch);
  assert.throws(()=>assertSoultimateImpactLedger(changed),/invalid|altered|unsupported/);
 }
 const fake=alter(event);
 fake.impacts[0].removed=[{sign:'negative'}];
 assert.equal(projectSoultimateImpactLedger(fake),null);
});
