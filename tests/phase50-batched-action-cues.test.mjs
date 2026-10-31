import test from 'node:test';
import assert from 'node:assert/strict';
import {collectNewBattleCues,MAX_VISUAL_CATCHUP_CUES} from '../ui/battle-cue-sequence.mjs';
import {planActionChoreography} from '../presentation/action-choreography.mjs';

const action=(id,kind='attack')=>({eventId:id,type:'action',turn:id,actor:'A1',
 kind,target:'B1',amount:id,hit:true});
const special=id=>({eventId:id,type:'special',actor:'B1',mode:'normal',
 impacts:[{targetId:'A1',kind:'damage',amount:41}]});

test('batched snapshots preserve all actions in their original host order',()=>{
 const source=[action(10),{eventId:11,type:'skill',actor:'A1'},special(12),action(13,'heal')];
 const batch=collectNewBattleCues(source,9);
 assert.equal(batch.latestEventId,13);
 assert.deepEqual(batch.cues.map(x=>x.key),['event:10','event:12','event:13']);
 assert.deepEqual(batch.cues.map(x=>x.kind),['attack','special','heal']);
 assert.equal(batch.skipped,0);
 for(const cue of batch.cues)
  assert.ok(planActionChoreography(cue).durationMs>0);
});
test('duplicate snapshots and passive events never replay already seen actions',()=>{
 const source=[action(1),{eventId:2,type:'skill'},action(3)];
 assert.deepEqual(collectNewBattleCues(source,3).cues,[]);
 assert.deepEqual(collectNewBattleCues(source,1).cues.map(x=>x.key),['event:3']);
 assert.equal(collectNewBattleCues(source,1).latestEventId,3);
});
test('sliding events window preserves ID ordering despite event array order',()=>{
 const mixed=[action(104),action(101),action(103),action(102)];
 const r=collectNewBattleCues(mixed,101);
 assert.deepEqual(r.cues.map(x=>x.key),['event:102','event:103','event:104']);
 assert.equal(r.latestEventId,104);
});
test('long background catchup plays a bounded recent suffix rather than minutes of old effects',()=>{
 const source=Array.from({length:20},(_,n)=>action(81+n));
 const result=collectNewBattleCues(source,20);
 assert.equal(result.latestEventId,100);
 assert.equal(result.cues.length,MAX_VISUAL_CATCHUP_CUES);
 assert.deepEqual(result.cues.map(x=>x.key),['event:97','event:98','event:99','event:100']);
 assert.equal(result.skipped,16);
});
test('caller can recognize a new match with lower event sequence',()=>{
 const next=collectNewBattleCues([action(1)],50);
 assert.equal(next.latestEventId,1);
 assert.deepEqual(next.cues,[]);
});
test('reject invalid budget or sequence without changing source',()=>{
 const values=[action(10),special(11)];
 const before=JSON.stringify(values);
 assert.throws(()=>collectNewBattleCues(values,-1),RangeError);
 assert.throws(()=>collectNewBattleCues(null,0),TypeError);
 assert.throws(()=>collectNewBattleCues(values,0,{maxCues:0}),RangeError);
 assert.equal(JSON.stringify(values),before);
});
