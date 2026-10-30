import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD,createCombat} from '../engine/combat.mjs';
import {makeStageView} from '../ui/match-stage.mjs';
import {projectKoViewChange} from '../ui/ko-view-transition.mjs';
import {readFileSync} from 'node:fs';

const view=(state,seat=0)=>makeStageView(state,seat);
const strong=RENTAL_SQUAD.map(u=>({...u,maxHp:420,strength:570,spirit:310,
 defense:180,attackPower:175,techniquePower:100,technique:'damage',
 weights:[100,0,0,0],attackAccuracy:4}));
const weak=RENTAL_SQUAD.map(u=>({...u,maxHp:85,strength:10,spirit:10,
 defense:25,attackPower:18,techniquePower:10,technique:'damage',
 weights:[100,0,0,0],attackAccuracy:4}));
const model=()=>createMatchProtocol({battleOptions:{
 seed:20261026,teams:[strong,weak],rotationCooldownMs:3000,
 playtestSoulTuning:true},hostNowMs:()=>10000});

test('V3-4-25 actual host auto match: KO seen only on confirmed damage and replacement on 3 KO fronts',()=>{
 const host=model();let actualKOs=0,actualArrivals=0,latest=null;
 for(let n=0;n<200&&host.snapshot().game.winner===null;n++){
  const before=host.snapshot(),result=host.advanceAuto();
  assert.equal(result.ok,true);
  assert.equal(result.result.type,'action');
  const after=host.snapshot(),projected=projectKoViewChange(view(before),view(after));
  const secondSeat=projectKoViewChange(view(before,1),view(after,1));
  assert.deepEqual(projected,secondSeat,'same true KO on both player seats');
  assert.deepEqual(projectKoViewChange(view(before),view(before)),
   {knockouts:[],arrivals:[]},'same revision cannot replay KO');
  for(const row of projected.knockouts){
   actualKOs++;
   assert.ok(before.game.squads[row.side].find(u=>u.id===row.id).hp>0);
   assert.equal(after.game.squads[row.side].find(u=>u.id===row.id).hp,0);
   assert.ok(before.game.clock.teams[row.side].frontIds[row.position]===row.id);
   assert.ok(after.game.events.some(e=>e.eventId===row.eventId&&e.type==='action'&&
    e.target===row.id&&e.amount>0&&e.targetHp===0));
  }
  for(const row of projected.arrivals){
   actualArrivals++;
   assert.equal(before.game.clock.teams[row.side].frontIds.every(id=>
    before.game.squads[row.side].find(u=>u.id===id).hp===0),true);
   assert.ok(row.ids.length>0);
   for(const id of row.ids){
    assert.ok(!before.game.clock.teams[row.side].frontIds.includes(id));
    assert.ok(after.game.clock.teams[row.side].frontIds.includes(id));
    assert.ok(after.game.squads[row.side].find(u=>u.id===id).hp>0);
   }
  }
  latest=after;
 }
 console.log('V3-4-25-KO-TRACE',JSON.stringify({actualKOs,actualArrivals,turn:latest.game.clock.turn}));
 assert.equal(latest.game.winner,0);
 assert.ok(actualKOs>=1,'at least one visible KO must be confirmed by a new damage event');
 assert.equal(latest.game.squads[1].filter(u=>u.hp===0).length,6,
  'the actual host still completes all six KOs independent of visual evidence');
 assert.ok(actualArrivals>=1,'a fully KO front is really replaced with reserve');
});
test('V3-4-25 no phantom KO on fresh join, fake MISS, heal, duplicate, revision gap or manual wheel',()=>{
 const host=model(),first=host.snapshot();
 assert.deepEqual(projectKoViewChange(null,view(first)),{knockouts:[],arrivals:[]});
 const rotate=host.dispatch(1,1,{type:'rotate',direction:1});
 assert.equal(rotate.accepted,true);
 assert.equal(rotate.result.ok,true);
 assert.deepEqual(projectKoViewChange(view(first),view(host.snapshot())).arrivals,[],
  'manual rotation is never presented as mandatory reserve help');
 const afterRotate=host.snapshot();
 const fake=structuredClone(afterRotate);
 fake.revision++;
 const b1=fake.game.squads[1][0];
 b1.hp=0;
 fake.game.events.push({type:'action',eventId:999,actor:'A1',target:'B1',
  amount:0,hit:false,targetHp:0});
 assert.deepEqual(projectKoViewChange(view(afterRotate),view(fake)).knockouts,[],
  'HP zero plus a MISS is not verified damage');
 fake.game.events.at(-1).amount=10;
 fake.game.events.at(-1).hit=true;
 assert.deepEqual(projectKoViewChange(view(afterRotate),view(fake)).knockouts,[],
  'B1 is no longer a visible frontline target after a voluntary rotation');
 assert.deepEqual(projectKoViewChange(view(afterRotate),
  view({...fake,revision:afterRotate.revision+2})),{knockouts:[],arrivals:[]},
  'packet gaps must never replay KO from a guessed baseline');
 assert.deepEqual(projectKoViewChange(view(afterRotate),view(afterRotate)),
  {knockouts:[],arrivals:[]});
 assert.throws(()=>projectKoViewChange({revision:-1},view(first)),TypeError);
});
test('V3-4-25 host-confirmed zero-HP special is accepted only if it belongs to actual frontline and damage ledger',()=>{
 const tiny=RENTAL_SQUAD.map(u=>({...u,maxHp:1,weights:[0,0,0,100]}));
 const host=createCombat({seed:20261030,teams:[RENTAL_SQUAD,tiny],
  researchSpecialEffects:true,researchDamageModel:true,researchStatInspirits:true});
 const before={game:host.snapshot(),revision:0,forecast:[]};
 assert.equal(host.giveSoul('A1',100),100);
 const prepared=host.prepareSoultimate(0,'A1');
 assert.equal(prepared.ok,true);
 assert.equal(host.resolveSoultimate(0,prepared.token,true).ok,true);
 const after={game:host.snapshot(),revision:1,forecast:[]};
 const result=projectKoViewChange(view(before),view(after));
 assert.ok(result.knockouts.length>=1,'actual host special inflicted at least one KO');
 for(const x of result.knockouts)assert.ok(x.id.startsWith('B'));
 assert.deepEqual(projectKoViewChange(view(after),view(after)).knockouts,[]);
});
test('V3-4-25 stage uses canonical HP and conditional arrival, not guessed knockout animation',()=>{
 const js=readFileSync(new URL('../ui/match-stage.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../lab/yw2-layout.css',import.meta.url),'utf8');
 assert.match(js,/const isKO=shownHp\(unit\)===0/);
 assert.match(js,/projectKoViewChange\(previousView,view\)/);
 assert.match(js,/mb-ko-wisp/);
 assert.match(js,/mb-arriving/);
 assert.match(css,/\.mb-ko-wisp:before/);
 assert.match(css,/\.mb-fighter\.mb-arriving/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
