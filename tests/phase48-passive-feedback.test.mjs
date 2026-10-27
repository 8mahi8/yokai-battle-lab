import test from 'node:test';
import assert from 'node:assert/strict';
import {passiveSkillNoticesForAction} from '../ui/passive-feedback.mjs';

test('before/after effects are attached to exactly one canonical action',()=>{
 const events=[
  {type:'action',eventId:21,turn:8,actor:'B2',kind:'attack'},
  {type:'skill',eventId:22,skill:'care',actor:'A5',targetId:'A4',amount:5,kind:'回復'},
  {type:'skill',eventId:23,skill:'momentum',actor:'A1',kind:'発動'},
  {type:'skill',eventId:24,skill:'lastStand',actor:'B2',kind:'発動'},
  {type:'action',eventId:25,turn:9,actor:'A1',kind:'attack'},
  {type:'skill',eventId:26,skill:'care',actor:'A5',targetId:'A1',amount:5,kind:'回復'},
  {type:'skill',eventId:27,skill:'momentum',actor:'A1',kind:'終了'}
 ];
 const notices=passiveSkillNoticesForAction(events,25);
 assert.deepEqual(notices.map(n=>n.key),['skill:23','skill:24','skill:26']);
 assert.ok(notices.some(n=>n.label.includes('どひょうぎわ')));
 assert.ok(notices.some(n=>n.label.includes('+5HP')));
 assert.ok(notices.every(n=>Object.isFrozen(n)));
 assert.ok(Object.isFrozen(notices));
 assert.deepEqual(passiveSkillNoticesForAction(events,25).map(x=>x.eventId),
  notices.map(x=>x.eventId),'repeated snapshots cannot change skill identity');
});
test('last-stand trigger preceding an action is not misattached to earlier turn',()=>{
 const events=[
  {type:'action',eventId:10,turn:5,actor:'B2'},
  {type:'skill',eventId:11,skill:'care',actor:'A5',amount:4},
  {type:'skill',eventId:12,skill:'lastStand',actor:'B2',kind:'発動'},
  {type:'action',eventId:13,turn:6,actor:'A1'}
 ];
 assert.deepEqual(passiveSkillNoticesForAction(events,13).map(x=>x.eventId),[12]);
 assert.deepEqual(passiveSkillNoticesForAction(events,10).map(x=>x.eventId),[11]);
});
test('no skill invented when none, when action index slid out, or on malformed input',()=>{
 assert.deepEqual(passiveSkillNoticesForAction([
  {type:'action',eventId:44,kind:'guard'}],44),[]);
 assert.deepEqual(passiveSkillNoticesForAction([
  {type:'skill',eventId:45,skill:'care',amount:1}],44),[]);
 assert.deepEqual(passiveSkillNoticesForAction([],null),[]);
 assert.throws(()=>passiveSkillNoticesForAction(null,1),TypeError);
});
