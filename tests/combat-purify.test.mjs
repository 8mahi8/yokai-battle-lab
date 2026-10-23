import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../engine/combat.mjs';
import {PURIFY_KINDS} from '../engine/purify-input.mjs';
const setup=()=>{
 const g=createCombat({seed:22});
 g.applyInspirit({id:'A4',sign:'negative',effect:'sleep'});
 return g;
};
function finish(g,side,kind){
 let snap=g.snapshot().purification[side]?.challenge;
 assert.ok(snap);
 const touch=(type,x,y)=>g.purifyInput(side,{type,x,y});
 if(kind==='pop'){
  for(const [x,y] of snap.popPoints)touch('tap',x,y);
 }else if(kind==='mash'){
  for(let i=0;i<14;i++)touch('tap',.5,.5);
 }else if(kind==='rub'){
  touch('down',.4,.5);
  for(let i=0;i<50;i++)touch('move',i%2?.55:.4,.5);
 }else if(kind==='spin'){
  for(let i=0;i<54;i++){
   const a=Math.PI*2*i/50;
   touch(i===0?'down':'move',.5+.3*Math.cos(a),.5+.3*Math.sin(a));
  }
 }else if(kind==='slash'){
  for(const pair of snap.slashPoints){
   touch('down',...pair[0]);touch('move',...pair[1]);g.purifyInput(side,{type:'up'});
  }
 }
 return g.snapshot();
}
test('all five YW2 Purify gestures actually clear bench negative statuses',()=>{
 for(const kind of PURIFY_KINDS){
  const g=setup();
  const before=g.snapshot();
  const prepared=g.beginPurify(0,'A4',{kind});
  assert.equal(prepared.ok,true,kind);
  assert.equal(g.snapshot().inspirits.A4.some(s=>s.sign==='negative'),true);
  assert.equal(g.snapshot().purification[0].challenge.kind,kind);
  const done=finish(g,0,kind);
  assert.deepEqual(done.purification,[null,null]);
  assert.equal(done.inspirits.A4.length,0);
  assert.equal(done.events.filter(x=>x.type==='purification').length,1);
  assert.equal(done.events.find(x=>x.type==='purification').bonusExperience,'unimplemented');
  assert.equal(done.soul.teams[0][3].soul,before.soul.teams[0][3].soul);
 }
});
test('positive inspirations remain after removing one or more negative Inspirits',()=>{
 const g=setup();
 g.applyInspirit({id:'A4',sign:'positive',effect:'strength-up'});
 g.applyInspirit({id:'A4',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPurify(0,'A4',{kind:'mash'}).ok,true);
 const snap=finish(g,0,'mash');
 assert.equal(snap.inspirits.A4.length,1);
 assert.equal(snap.inspirits.A4[0].sign,'positive');
 assert.equal(snap.events.find(x=>x.type==='purification').removed.length,2);
});
test('frontline or wrong team or un-inspirited bench cannot be purified',()=>{
 const g=setup();
 assert.equal(g.beginPurify(0,'A1').reason,'must_be_on_bench');
 assert.equal(g.beginPurify(1,'A4').reason,'not_your_member');
 assert.equal(g.beginPurify(0,'A5').reason,'no_negative_inspirit');
 assert.equal(g.beginPurify(1,'B4').reason,'no_negative_inspirit');
 assert.throws(()=>g.beginPurify(0,'A4',{kind:'magic'}));
 assert.equal(g.snapshot().purification[0],null);
});
test('cancel halfway preserves negative Inspirit, and restarting resets progress',()=>{
 const g=setup();
 g.beginPurify(0,'A4',{kind:'mash'});
 for(let i=0;i<8;i++)g.purifyInput(0,{type:'tap',x:.5,y:.5});
 assert.equal(g.snapshot().purification[0].challenge.count,8);
 assert.equal(g.cancelPurify(0).cancelled,true);
 assert.equal(g.snapshot().inspirits.A4.length,1);
 assert.equal(g.cancelPurify(0).reason,'no_active_purification');
 assert.equal(g.beginPurify(0,'A4',{kind:'mash'}).challenge.count,0);
});
test('rotation moving the purification subject to front cancels gesture without clearing status',()=>{
 const g=setup();
 g.beginPurify(0,'A4',{kind:'mash'});
 g.rotate(0,1);
 assert.equal(g.snapshot().purification[0],null);
 assert.equal(g.snapshot().inspirits.A4.length,1);
 assert.equal(g.purifyInput(0,{type:'tap',x:.5,y:.5}).reason,'no_active_purification');
 g.rotate(0,-1);
 assert.equal(g.beginPurify(0,'A4',{kind:'mash'}).ok,true);
});
test('changing watch mode cancels purge, and no instant status deletion occurs',()=>{
 const g=setup();g.beginPurify(0,'A4');
 g.setWatchMode(0,'zero');
 assert.equal(g.snapshot().purification[0],null);
 assert.equal(g.snapshot().inspirits.A4.length,1);
});
test('one watch cannot Purify while Poke or a Soultimate charge is in progress',()=>{
 const g=setup();
 g.giveSoul('A1',100);
 assert.equal(g.prepareSoultimate(0,'A1').ok,true);
 assert.equal(g.beginPurify(0,'A4').reason,'other_touch_action_pending');
 const token=g.snapshot().soul.pending[0].token;
 g.resolveSoultimate(0,token,false);
 assert.equal(g.beginPurify(0,'A4').ok,true);
 assert.equal(g.prepareSoultimate(0,'A1').reason,'purification_active');
 g.setWatchMode(0,'zero');g.applyInspirit({id:'B1',sign:'negative',effect:'sleep'});
 assert.equal(g.beginPurify(0,'A4').ok,true);
 assert.equal(g.beginPoke(0,'B1').reason,'purification_active');
 g.cancelPurify(0);
 assert.equal(g.beginPoke(0,'B1').ok,true);
 assert.equal(g.beginPurify(0,'A4').reason,'other_touch_action_pending');
});
test('external developer purify shortcut aborts active gesture, cannot double-remove',()=>{
 const g=setup();
 g.beginPurify(0,'A4',{kind:'pop'});
 assert.equal(g.purify(0,'A4').ok,true);
 assert.equal(g.snapshot().purification[0],null);
 assert.equal(g.snapshot().events.filter(x=>x.type==='purification').length,0);
 assert.equal(g.beginPurify(0,'A4').reason,'no_negative_inspirit');
});
test('normal BOT step during purification does not finish input prematurely',()=>{
 const g=setup();
 g.beginPurify(0,'A4',{kind:'mash'});
 for(let i=0;i<8;i++)g.purifyInput(0,{type:'tap',x:.5,y:.5});
 const out=g.step();assert.equal(out.type,'action');
 assert.equal(g.snapshot().purification[0].challenge.count,8);
 assert.equal(g.snapshot().inspirits.A4.length,1);
 finish(g,0,'mash');
 assert.equal(g.snapshot().inspirits.A4.length,0);
});
test('mode selection is seeded and default Flash remains off',()=>{
 const g=setup();
 const s=g.snapshot();
 assert.equal(Object.hasOwn(s.clock,'openingPriority'),false);
 assert.equal(g.beginPurify(0,'A4').kind,'pop');
});
