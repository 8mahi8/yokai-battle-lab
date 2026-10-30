import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {makeStageView,projectMatchResult} from '../ui/match-stage.mjs';

// A single, deliberately easy localhost test match. No status/Soul/HP
// injections after start: every change comes from the existing Host core.
// Stats and Soul cost are QA fixtures, NOT proven YW2 balance.
const enemy=RENTAL_SQUAD.map((u,i)=>({...u,maxHp:1,speed:80,
 weights:i===0?[0,0,100,0]:[0,0,0,100],inspirit:'sleep'}));
const guest=RENTAL_SQUAD.map(u=>({...u,maxHp:700,soulCapacity:5,
 weights:[0,0,0,100]}));

function sendTouch(match,side,seq,kind){
 const get=()=>match.snapshot().game.guided[side]?.challenge;
 function send(type,x=null,y=null){
  const gesture={type,...(x===null?{}:{x,y})};
  const res=match.dispatch(side,++seq,{type:'chargeInput',gesture});
  assert.equal(res.ok,true,JSON.stringify({kind,result:res.result}));
  return res;
 }
 if(kind==='tap'){
  for(let i=0;i<12&&get();i++){
   const pt=get().target;
   send('tap',...pt);
  }
 }else if(kind==='spin'){
  send('down',.8,.5);
  for(let n=1;n<=140&&get();n++){
   const a=Math.PI*2*n/50;
   send('move',.5+.3*Math.cos(a),.5+.3*Math.sin(a));
  }
 }else if(kind==='trace'){
  for(let i=0;i<5&&get();i++){
   const path=get().path;
   send('down',...path[0]);
   for(const xy of path.slice(1)){if(get())send('move',...xy);}
  }
 }else if(kind==='align'){
  for(let i=0;i<5&&get();i++){
   const a=-Math.PI/2+(get().clockNumber%12)*Math.PI*2/12;
   send('down',.5,.18);
   send('move',.5+.32*Math.cos(a),.5+.32*Math.sin(a));
   send('up');
  }
 }else assert.fail('unknown guided input '+kind);
 assert.equal(get(),undefined,'must finish real host touch challenge');
 return seq;
}

test('V3-5-5 ONE room: enemy Inspirit, bench Purify, normal Soultimate, Zero G, six KO, opposite results',()=>{
 const match=createMatchProtocol({battleOptions:{
  seed:12,teams:[enemy,guest],rotationCooldownMs:0,
  researchSpecialEffects:true,researchDamageModel:true,
  researchStatInspirits:true
 }});
 let a=0,b=0;
 const cmd=(side,intent)=>{
  const r=match.dispatch(side,side===0?++a:++b,intent);
  assert.equal(r.ok,true,'Host accepted '+JSON.stringify(intent)+': '+JSON.stringify(r.result));
  return r;
 };
 const advance=()=>{const r=match.advanceAuto();assert.equal(r.ok,true,JSON.stringify(r));return r;};
 const soul=id=>{
  const m=match.snapshot().game.soul.teams[1].find(u=>u.id===id);
  return m.soul===m.capacity;
 };
 const negative=id=>match.snapshot().game.inspirits[id].some(s=>s.sign==='negative');

 cmd(0,{type:'pin',targetId:'B1'});
 let autoBefore=0;
 while(!negative('B1')&&autoBefore<100){
  advance();autoBefore++;
 }
 assert.equal(negative('B1'),true,'Host never applied natural negative Inspirit to B1');
 const afflicted=match.snapshot().game.events.some(e=>
  e.type==='action'&&e.kind==='inspirit'&&e.target==='B1'&&e.hit);
 assert.ok(afflicted,'real enemy action must cause B1 status');
 cmd(1,{type:'rotate',direction:1});
 assert.ok(match.snapshot().game.clock.teams[1].benchIds.includes('B1'));
 cmd(1,{type:'purifyStart',id:'B1'});
 const trial=match.snapshot().game.purification[1].challenge;
 assert.equal(trial.kind,'pop');
 for(const [x,y] of trial.popPoints)cmd(1,{type:'purifyInput',gesture:{type:'tap',x,y}});
 assert.equal(negative('B1'),false,'host purification did not remove status');
 assert.equal(match.snapshot().game.events.filter(e=>e.type==='purification').length,1);

 let waitB2=0;
 while(!soul('B2')&&waitB2<80){advance();waitB2++;}
 assert.ok(soul('B2'),'B2 must earn Soul from real Guard before Soultimate');
 assert.ok(!negative('B2'),'B2 became unfit for standard Soultimate in deterministic fixture');
 cmd(1,{type:'chargeStart',id:'B2'});
 const kindNormal=match.snapshot().game.guided[1]?.challenge?.kind;
 b=sendTouch(match,1,b,kindNormal);
 const first=match.snapshot();
 assert.ok(first.game.events.some(e=>e.type==='special'&&e.mode==='soultimate'&&e.actor==='B2'));
 assert.equal(first.game.squads[0].filter(u=>u.hp===0).length,3,
  'normal special must KO the first three without a fabricated result');
 assert.equal(first.game.winner,null,'three reserves must remain alive');
 // The opponent uses its ordinary Watch wheel to bring in all three
 // reserves. This is a legal player command, NOT a simulated KO/HP update.
 for(let i=0;i<3;i++)cmd(0,{type:'rotate',direction:1});
 assert.deepEqual(match.snapshot().game.clock.teams[0].frontIds,['A4','A5','A6'],
  'opponent must expose actual three remaining reserves for G');

 cmd(1,{type:'rotate',direction:-1});
 cmd(1,{type:'rotate',direction:-1});
 assert.ok(['B6','B1','B2'].every(id=>
  match.snapshot().game.clock.teams[1].frontIds.includes(id)));
 cmd(1,{type:'watch',mode:'zero'});
 let waitG=0;
 while(!['B6','B1','B2'].every(soul)&&waitG<120){
  advance();waitG++;
 }
 assert.ok(['B6','B1','B2'].every(soul),'G Soul must be earned from true autonomous Guards');
 cmd(1,{type:'chargeStart',id:'B1'});
 const kindG=match.snapshot().game.guided[1]?.challenge?.kind;
 b=sendTouch(match,1,b,kindG);
 const end=match.snapshot();
 assert.equal(end.game.winner,1,'G must truly KO last three and finish');
 assert.equal(end.game.squads[0].filter(u=>u.hp===0).length,6);
 const specials=end.game.events.filter(e=>e.type==='special');
 assert.equal(specials.length,2);
 assert.deepEqual(specials.map(s=>s.mode),['soultimate','g-tech']);
 assert.equal(end.game.soul.teams[1].find(u=>u.id==='B6').soul,0);
 for(const side of [0,1]){
  const v=makeStageView(end,side);
  assert.equal(projectMatchResult(v.winner,side).title,side===1?'勝利！':'敗北…');
 }
 assert.equal(replayMatchJournal(match.exportJournal()).ok,true);
 console.log('V3-5-5-ONE-ROOM-COMPLETE-PASS initialAuto='+autoBefore+
  ' waitB2='+waitB2+' waitG='+waitG+' normal='+kindNormal+
  ' G='+kindG+' revision='+end.revision+' ownerActions='+end.game.clock.turn);
});
