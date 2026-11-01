import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {inspectCausalSourceTrace} from '../engine/causal-source-trace.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';

const ids=()=>[
 RENTAL_CHARACTER_MOVE_REFS.map(x=>x.id),
 RENTAL_CHARACTER_MOVE_REFS.map(x=>x.id)
];

test('V3-3-5 all six authoring characters and 24 move slots can be joined to canonical event IDs',()=>{
 const game=createCombat({seed:3});
 const snapshot=game.snapshot(),events=[];
 let eventId=0;
 for(const side of [0,1])for(let i=1;i<=6;i++){
  const actor=(side===0?'A':'B')+i;
  for(const kind of ['attack','technique','heal','inspirit','special','guard','loaf']){
   events.push({eventId:++eventId,type:kind==='special'?'special':'action',
    actor,kind});
  }
  events.push({eventId:++eventId,type:'skill',actor,skill:'care'});
 }
 snapshot.events=events;
 const original=structuredClone(snapshot);
 const result=inspectCausalSourceTrace({battleSnapshot:snapshot,
  catalog:RENTAL_LAB_CATALOG,teamCharacterIds:ids()});
 assert.equal(result.canonical.length,96);
 for(const row of result.canonical){
  const part=row.actorId.match(/^[AB]([1-6])$/),id='rental-'+part[1].padStart(2,'0');
  assert.equal(row.characterId,id);
  assert.equal(row.passiveSkillId,RENTAL_LAB_CATALOG.getCharacter(id).skill.id);
  const slot=row.type==='special'?'soultimate':
   row.type==='action'?row.moveSlot:null;
  if(slot){
   assert.equal(row.moveId,id+':'+slot);
   assert.equal(row.evidence,'fixture');
  }else{
   assert.equal(row.moveId,null);
   assert.equal(row.evidence,null);
  }
  assert.equal(row.domain,'canonical-commit');
 }
 assert.equal(result.pairing,'not-inferred');
 assert.equal(result.visible,null);
 assert.equal(result.buffered,null);
 assert.ok(Object.isFrozen(result));
 assert.ok(Object.isFrozen(result.canonical));
 assert.ok(result.canonical.every(Object.isFrozen));
 assert.deepEqual(snapshot,original);
});

test('V3-3-5 2-seat protocol exposes ID trace but neither snapshot hash nor journal changes',()=>{
 for(const school of [false,true]){
  const p=createMatchProtocol({battleOptions:{
   seed:212,playtestSoulTuning:school
  }});
  const before=p.snapshot(),journal=p.exportJournal();
  const first=p.inspectCausality();
  assert.deepEqual(p.snapshot(),before);
  assert.deepEqual(p.exportJournal(),journal);
  assert.equal(first.canonical.length,0);
  for(let i=0;i<24;i++)assert.equal(p.advanceAuto().ok,true);
  const after=p.snapshot(),afterJournal=p.exportJournal();
  const trace=p.inspectCausality();
  assert.deepEqual(p.snapshot(),after);
  assert.deepEqual(p.exportJournal(),afterJournal);
  assert.deepEqual(trace.canonical.map(x=>x.eventId),
   after.game.events.map(x=>x.eventId));
  assert.ok(trace.canonical.some(x=>x.moveSlot==='attack'));
  assert.ok(trace.canonical.some(x=>x.moveSlot==='inspirit'));
  for(const x of trace.canonical.filter(x=>x.moveId)){
   const character=(school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG)
    .getCharacter(x.characterId);
   assert.equal(character.moves[x.moveSlot].id,x.moveId);
  }
  assert.equal(replayMatchJournal(p.exportJournal()).ok,true);
 }
});

test('V3-3-5 presentational sequence and canonical eventId never acquire fabricated pairing',()=>{
 const game=createCombat({seed:42,researchPresentation:true});
 game.beginPresentationMotion({durationMs:600,kind:'inspirit'});
 game.setWatchMode(0,'zero');
 const action=game.step();
 assert.equal(action.type,'action');
 const prior=game.snapshot(),hidden=game.inspectCausality();
 assert.deepEqual(game.snapshot(),prior);
 assert.ok(hidden.canonical.length>0);
 assert.equal(hidden.visible.length,0);
 assert.ok(hidden.buffered.some(x=>x.kind==='watchMode'));
 assert.ok(hidden.buffered.some(x=>x.kind==='action'));
 assert.ok(hidden.buffered.every(x=>x.visibleAtMs===null));
 assert.ok(hidden.buffered.every(x=>x.domain==='presentation-research-ms'));
 assert.equal(hidden.pairing,'not-inferred');
 assert.deepEqual(game.advancePresentation(600).map(x=>x.kind),
  ['watchMode','action']);
 const shown=game.inspectCausality();
 assert.equal(shown.buffered.length,0);
 assert.deepEqual(shown.visible.map(x=>x.kind),['watchMode','action']);
 assert.ok(shown.visible.every(x=>x.visibleAtMs===600&&x.delayed));
 assert.deepEqual(shown.canonical,hidden.canonical);
 assert.equal(shown.pairing,'not-inferred');
});

test('V3-3-5 identical custom rental-shaped teams must not inherit original rental source IDs',()=>{
 const game=createCombat({seed:3,teams:[RENTAL_SQUAD,RENTAL_SQUAD]});
 for(let i=0;i<12;i++)game.step();
 const before=game.snapshot(),trace=game.inspectCausality();
 assert.deepEqual(game.snapshot(),before);
 assert.ok(trace.canonical.length>0);
 assert.ok(trace.canonical.every(x=>x.characterId===null&&
  x.moveId===null&&x.passiveSkillId===null));
 assert.equal(trace.visible,null);
});

test('V3-3-5 fail closed for spoofed authoring identity, duplicate events and invalid presentation',()=>{
 const initial=createCombat({seed:1}).snapshot();
 for(const teamCharacterIds of [
  [ids()[0],['rental-01']],
  [ids()[0],ids()[1].map((x,i)=>i===0?'rental-02':x)]
 ]){
  assert.throws(()=>inspectCausalSourceTrace({battleSnapshot:initial,
   catalog:RENTAL_LAB_CATALOG,teamCharacterIds}));
 }
 assert.throws(()=>inspectCausalSourceTrace({battleSnapshot:initial,
  catalog:RENTAL_LAB_CATALOG}));
 const invalid=structuredClone(initial);
 invalid.events=[{eventId:1,type:'action',actor:'A1',kind:'attack'},
  {eventId:1,type:'action',actor:'A1',kind:'attack'}];
 assert.throws(()=>inspectCausalSourceTrace({
  battleSnapshot:invalid,catalog:RENTAL_LAB_CATALOG,teamCharacterIds:ids()
 }));
 const malformed=structuredClone(initial);
 malformed.presentation={now:0,visible:[{sequence:1,at:0,kind:'action',
  side:0,visibleAt:50}],buffered:[]};
 assert.throws(()=>inspectCausalSourceTrace({battleSnapshot:malformed}));
 assert.deepEqual(initial.events,[]);
});
