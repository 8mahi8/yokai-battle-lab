import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography} from '../presentation/action-choreography.mjs';

test('long battle event IDs are monotonic across the 80-event snapshot sliding window',()=>{
 const battle=createCombat({seed:8192,playtestSoulTuning:true});
 let earlier=null,overlapChecks=0;
 for(let i=0;i<95;i++){
  const result=battle.step();
  assert.equal(result.type,'action');
  const snapshot=battle.snapshot(),now=snapshot.events;
  assert.ok(now.length<=80);
  for(let j=1;j<now.length;j++)
   assert.equal(now[j].eventId,now[j-1].eventId+1);
  if(earlier){
   const ids=new Map(earlier.map(x=>[x.eventId,x]));
   for(const event of now){
    const old=ids.get(event.eventId);
    if(old){assert.deepEqual(event,old);overlapChecks++;}
   }
  }
  earlier=now;
 }
 assert.equal(earlier.length,80);
 assert.ok(earlier[0].eventId>1);
 assert.ok(overlapChecks>150);
});
test('identical poke/special cue keeps identity when window index changes',()=>{
 const poke={type:'poke',eventId:305,side:1,targetId:'A1',
  reward:{kind:'playtest-heavy-hit',amount:999}};
 const a=latestBattleCue([{type:'skill',eventId:304},poke]);
 const b=latestBattleCue([poke]);
 assert.equal(a.key,b.key);
 assert.equal(a.key,'event:305');
 assert.equal(planActionChoreography(a).eventKey,'event:305');
 const special={type:'special',eventId:306,actor:'A2',mode:'normal',
  impacts:[{targetId:'B1',kind:'damage',amount:19}]};
 const s1=latestBattleCue([special]),s2=latestBattleCue([poke,special]);
 assert.equal(s1.key,'event:306');
 assert.equal(s1.key,s2.key);
 assert.equal(planActionChoreography(s1).impacts[0].amount,19);
});


test('a status-type event never becomes a fake damage flash',()=>{
 const event={type:'action',eventId:19,turn:11,actor:'A1',kind:'inspirit',
  target:'B3',hit:true,amount:0,effect:'sleep'};
 const cue=latestBattleCue([event]);
 assert.equal(cue.targets[0].kind,'status');
 const plan=planActionChoreography(cue);
 assert.equal(plan.impacts[0].effect,'status');
});
