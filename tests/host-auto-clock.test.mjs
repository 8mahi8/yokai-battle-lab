import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostAutoClock} from '../ui/host-auto-clock.mjs';

function rig(){
 const jobs=new Map(),events=[],errors=[];
 let seq=0,presence=true,visible=true,published=true,winner=null,turns=0;
 const clock=createHostAutoClock({
  intervalMs:1500,
  schedule:(callback,delay)=>{assert.equal(delay,1500);const id=++seq;jobs.set(id,callback);return id;},
  cancel:id=>jobs.delete(id),
  step:()=>{turns++;published=false;return {ok:true,turn:turns};},
  canAdvance:()=>presence&&visible&&published,
  getWinner:()=>winner,onUpdate:x=>events.push(x),onError:e=>errors.push(e.message)
 });
 const tick=()=>{for(const fn of [...jobs.values()])fn();};
 return {clock,jobs,events,errors,tick,turns:()=>turns,
  setPresence:v=>presence=v,setVisible:v=>visible=v,
  setPublished:v=>published=v,setWinner:v=>winner=v};
}
test('24C research clock never advances before explicit host start',()=>{
 const t=rig();
 t.tick();assert.equal(t.turns(),0);
 t.clock.start();t.tick();assert.equal(t.turns(),1);
 t.tick();assert.equal(t.turns(),1,'wait for authoritative Firebase publish');
 t.setPublished(true);t.tick();assert.equal(t.turns(),2);
 t.clock.stop();t.tick();assert.equal(t.turns(),2);
 assert.equal(t.jobs.size,0);assert.deepEqual(t.errors,[]);
});
test('24C a disconnected or backgrounded host does not catch up missed intervals',()=>{
 const t=rig();assert.equal(t.clock.start().ok,true);
 t.setPresence(false);for(let i=0;i<120;i++)t.tick();
 assert.equal(t.turns(),0);
 assert.equal(t.clock.status().paused,true);
 t.setPresence(true);t.setVisible(false);for(let i=0;i<120;i++)t.tick();
 assert.equal(t.turns(),0);
 t.setVisible(true);t.tick();assert.equal(t.turns(),1);
 t.setPublished(true);t.tick();assert.equal(t.turns(),2);
 assert.equal(t.jobs.size,1,'exactly one interval even after presence transitions');
 t.clock.dispose();assert.equal(t.jobs.size,0);
});
test('24C game winner cancels the timer permanently until a new clock instance',()=>{
 const t=rig();t.clock.start();t.setWinner(1);t.tick();
 assert.equal(t.turns(),0);assert.equal(t.clock.status().enabled,false);
 assert.equal(t.jobs.size,0);
 assert.deepEqual(t.clock.start(),{ok:false,reason:'match_finished'});
});
test('24C refuses duplicate loops and start while guest absent',()=>{
 const t=rig();t.setPresence(false);
 assert.deepEqual(t.clock.start(),{ok:false,reason:'clock_paused'});
 assert.equal(t.jobs.size,0);
 t.setPresence(true);t.clock.start();t.clock.start();t.clock.start();
 assert.equal(t.jobs.size,1);t.clock.dispose();
 assert.deepEqual(t.clock.start(),{ok:false,reason:'clock_disposed'});
 assert.throws(()=>createHostAutoClock({step:()=>{},canAdvance:()=>true,
  getWinner:()=>null,intervalMs:150}),RangeError);
});
test('24C failed step stops itself and preserves the error reason',()=>{
 const failures=[],jobs=new Map();
 const clock=createHostAutoClock({step:()=>({ok:false,reason:'research_journal_full'}),
  canAdvance:()=>true,getWinner:()=>null,
  schedule:fn=>{jobs.set('one',fn);return 'one';},cancel:id=>jobs.delete(id),
  onError:e=>failures.push(e.message)});
 clock.start();jobs.get('one')();
 assert.equal(clock.status().enabled,false);
 assert.equal(jobs.size,0);
 assert.deepEqual(failures,['research_journal_full']);
});
