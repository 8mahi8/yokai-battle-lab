import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTION_VISUAL_CATALOG,ACTION_VISUAL_KINDS} from '../presentation/action-catalog.mjs';
import {CHOREOGRAPHY_SCHEMA,planActionChoreography,choreographyFrame} from '../presentation/action-choreography.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';

test('all six basic actions, poke and special have distinct read-only timelines',()=>{
 assert.deepEqual(ACTION_VISUAL_KINDS,['attack','technique','heal','inspirit','guard','loaf','poke','special']);
 const poses=new Set(ACTION_VISUAL_KINDS.map(k=>ACTION_VISUAL_CATALOG[k].pose));
 assert.equal(poses.size,ACTION_VISUAL_KINDS.length);
 for(const kind of ACTION_VISUAL_KINDS){
  const event=kind==='special'?{key:'s:1',type:'special',actor:'A1',targets:[]}:
   kind==='poke'?{key:'p:1',type:'poke',actor:null,targets:[]}:
   {type:'action',turn:9,actor:'A1',kind};
  const plan=planActionChoreography(event);
  assert.equal(plan.schema,CHOREOGRAPHY_SCHEMA);
  assert.equal(plan.kind,kind);
  assert.equal(plan.phases[0].startMs,0);
  assert.equal(plan.phases[2].endMs,plan.durationMs);
  assert.ok(plan.durationMs>0);
  assert.ok(Object.isFrozen(plan)&&Object.isFrozen(plan.phases));
  assert.equal(choreographyFrame(plan,0).phase,'anticipation');
  assert.equal(choreographyFrame(plan,plan.phases[1].startMs).phase,'impact');
  assert.equal(choreographyFrame(plan,plan.phases[2].startMs).phase,'recovery');
  assert.equal(choreographyFrame(plan,plan.durationMs).phase,'done');
 }
});
test('a canonical damaging hit stays hidden until impact and never invents a second hit',()=>{
 const event={type:'action',turn:12,actor:'B2',kind:'attack',target:'A3',
   hit:true,amount:27,targetHp:73};
 const before=JSON.stringify(event);
 const p=planActionChoreography(event);
 const pre=choreographyFrame(p,p.phases[1].startMs-1);
 assert.equal(pre.impactVisible,false);
 assert.equal(pre.impacts.length,0);
 const during=choreographyFrame(p,p.phases[1].startMs);
 assert.deepEqual(during.impacts,[{targetId:'A3',effect:'damage',hit:true,amount:27}]);
 assert.equal(JSON.stringify(event),before,'visual planning must not mutate the authoritative event');
 assert.throws(()=>{p.impacts[0].amount=999},TypeError);
});
test('canonical heal, Inspirits, misses and guarding do not accidentally deal damage',()=>{
 const heal=planActionChoreography({type:'action',turn:1,actor:'A2',kind:'heal',
  target:'A1',amount:33});
 assert.equal(heal.impacts[0].effect,'heal');
 const status=planActionChoreography({type:'action',turn:2,actor:'B6',kind:'inspirit',
  target:'A1',amount:0,hit:true});
 assert.equal(status.impacts[0].effect,'status');
 const guard=planActionChoreography({type:'action',turn:3,actor:'B3',kind:'guard'});
 assert.deepEqual(guard.impacts,[]);
 const miss=planActionChoreography({type:'action',turn:4,actor:'A4',kind:'attack',
  target:'B1',hit:false,amount:0});
 assert.equal(miss.impacts[0].hit,false);
});
test('existing source cue can be adapted without changing the battle-vfx module',()=>{
 const cue=latestBattleCue([{type:'action',turn:8,actor:'A3',target:'B2',
  kind:'technique',hit:true,amount:13}]);
 const plan=planActionChoreography(cue);
 assert.equal(plan.eventKey,'action:8');
 assert.deepEqual(plan.impacts,[{targetId:'B2',effect:'damage',hit:true,amount:13}]);
 const cutin=latestBattleCue([{type:'special',actor:'A4',mode:'g-tech',impacts:[
  {targetId:'B1',kind:'damage',amount:25},
  {targetId:'A1',kind:'heal',amount:18}]}]);
 const special=planActionChoreography(cutin);
 assert.equal(special.impacts.length,2);
 assert.deepEqual(special.impacts.map(x=>x.effect),['damage','heal']);
});
test('broken input is refused, never used as display-ledger authority',()=>{
 assert.throws(()=>planActionChoreography(null),TypeError);
 assert.throws(()=>planActionChoreography({type:'player',kind:'rotate'}),RangeError);
 assert.throws(()=>planActionChoreography({type:'special',actor:'??',key:'x'}),TypeError);
 assert.throws(()=>planActionChoreography({type:'action',turn:1,kind:'attack',actor:'A1',
  targets:[{id:'B7',amount:10}]}),TypeError);
 assert.throws(()=>planActionChoreography({type:'action',turn:1,kind:'attack',
  targets:[{id:'B1',amount:-1}]}),RangeError);
 assert.throws(()=>planActionChoreography({type:'special',actor:'A1'}),TypeError);
 const plan=planActionChoreography({type:'action',turn:1,actor:'A1',kind:'guard'});
 assert.throws(()=>choreographyFrame(plan,-1),RangeError);
 assert.throws(()=>choreographyFrame(plan,Number.NaN),RangeError);
});
