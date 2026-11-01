/**
 * Engine V3-4-23 — original-video-derived REAL host acceptance.
 * Original observations, not fresh MP4 viewing:
 * docs/ORIGINAL_PVP_VIDEO_20261027_MATCH01_OF04.md
 * 00:11 battle/wheel; 00:24-42 pin; 00:43-52 cutin→impact;
 * 01:08-23 KO/substitution; 02:01-06 result.
 *
 * Controlled rental teams are intentional. Their moves, original 3DS
 * timings and Soultimate hit counts are NOT verified original mechanics.
 * These tests prove current end-to-end game functionality, not original parity.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD,createCombat} from '../engine/combat.mjs';
import {makeStageView,projectMatchResult} from '../ui/match-stage.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {planActionChoreography,choreographyFrame}
 from '../presentation/action-choreography.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';

const guards=RENTAL_SQUAD.map(u=>({...u,weights:[0,0,0,100]}));

function finishGuidedSoultimate(match,side,seq){
 const get=()=>match.snapshot().game.guided[side]?.challenge;
 let final=null,kind=get()?.kind;
 function send(gesture){
  const receipt=match.dispatch(side,++seq,{type:'chargeInput',gesture});
  assert.equal(receipt.accepted,true);
  assert.equal(receipt.ok,true,JSON.stringify(receipt.result));
  final=receipt;
 }
 if(kind==='tap'){
  for(let n=0;n<8&&get();n++){
   const [x,y]=get().target;send({type:'tap',x,y});
  }
 }else if(kind==='spin'){
  send({type:'down',x:.8,y:.5});
  for(let n=1;n<=130&&get();n++){
   const a=Math.PI*2*n/50;
   send({type:'move',x:.5+.3*Math.cos(a),y:.5+.3*Math.sin(a)});
  }
 }else if(kind==='trace'){
  for(let n=0;n<4&&get();n++){
   const pts=get().path;
   send({type:'down',x:pts[0][0],y:pts[0][1]});
   for(const [x,y] of pts.slice(1))if(get())send({type:'move',x,y});
  }
 }else if(kind==='align'){
  for(let n=0;n<4&&get();n++){
   const angle=-Math.PI/2+(get().clockNumber%12)*Math.PI*2/12;
   send({type:'down',x:.5,y:.18});
   send({type:'move',x:.5+.32*Math.cos(angle),y:.5+.32*Math.sin(angle)});
   send({type:'up'});
  }
 }else assert.fail('unknown guided Soultimate type '+kind);
 assert.equal(get(),undefined,'lower-screen touch sequence did not complete');
 assert.equal(final?.result?.completed,true,'touch completion was not host-confirmed');
 assert.equal(final?.result?.special?.ok,true,'confirmed charge did not fire Soultimate');
 return {kind,seq,final};
}

test('V3-4-23 original 00:11→00:52: real 6-medal seat, target pin, charge and host special resolve into ordered cutin/impact',()=>{
 const host=createMatchProtocol({battleOptions:{seed:22,teams:[guards,guards]}});
 const opening=host.snapshot();
 for(const seat of [0,1]){
  const view=makeStageView(opening,seat);
  assert.equal(view.teams[seat].frontIds.length,3);
  assert.equal(view.teams[seat].members.length,6);
  assert.equal(view.teams[1-seat].members.length,6);
 }
 const pin=host.dispatch(0,1,{type:'pin',targetId:'B1'});
 assert.equal(pin.accepted,true);
 assert.equal(pin.ok,true);
 assert.equal(makeStageView(host.snapshot(),0).teams[0].pin,'B1',
  'the video observed crosshair must represent a real host target');
 for(let n=0;n<600;n++){
  const soul=host.snapshot().game.soul.teams[0][0];
  if(soul.soul>=soul.capacity)break;
  assert.equal(host.advanceAuto().ok,true);
 }
 assert.equal(host.snapshot().game.soul.teams[0][0].soul,
  host.snapshot().game.soul.teams[0][0].capacity);
 const beginSeq=host.snapshot().clientSequences[0]+1;
 const started=host.dispatch(0,beginSeq,{type:'chargeStart',id:'A1'});
 assert.equal(started.ok,true);
 const before=host.snapshot();
 const charged=finishGuidedSoultimate(host,0,beginSeq);
 assert.ok(['tap','spin','trace','align'].includes(charged.kind));
 const after=host.snapshot();
 assert.equal(after.game.soul.teams[0][0].soul,0);
 const event=after.game.events.filter(e=>e.type==='special').at(-1);
 assert.ok(event,'a confirmed touch must result in one host special event');
 const projected=makeStageView(after,0);
 const cue=latestBattleCue(projected.events);
 assert.equal(cue.type,'special');
 assert.equal(cue.key,'event:'+event.eventId);
 const plan=planActionChoreography(cue);
 const intro=choreographyFrame(plan,0);
 const cutin=choreographyFrame(plan,plan.phases[0].endMs-1);
 const firstHit=choreographyFrame(plan,plan.phases[1].startMs);
 const back=choreographyFrame(plan,plan.durationMs);
 assert.equal(intro.phase,'anticipation');
 assert.equal(cutin.phase,'anticipation');
 assert.deepEqual(cutin.impacts,[],'do not show impact in portrait cutin');
 assert.equal(firstHit.phase,'impact');
 assert.ok(firstHit.impacts.length>0,'real host impact was lost before field return');
 assert.equal(back.finished,true);
 assert.equal(plan.hitResults.length,0,
  'a rental special with unknown original hit count must not invent exact hits');
 assert.deepEqual(RENTAL_SOULTIMATE_MOVES[0].hitPattern,{type:'unknown',count:null});
 assert.equal(replayMatchJournal(host.exportJournal()).ok,true);
 assert.ok(after.revision>before.revision);
});

test('V3-4-23 original 01:08→02:06: real KO replacement, all six KO, identical host winner and opposite seat result',()=>{
 const strong=RENTAL_SQUAD.map(u=>({...u,maxHp:420,strength:570,
  spirit:310,defense:180,attackPower:175,techniquePower:100,
  technique:'damage',weights:[100,0,0,0],attackAccuracy:4}));
 const weak=RENTAL_SQUAD.map(u=>({...u,maxHp:85,strength:10,
  spirit:10,defense:25,attackPower:18,techniquePower:10,
  technique:'damage',weights:[100,0,0,0],attackAccuracy:4}));
 const host=createMatchProtocol({battleOptions:{seed:20261026,teams:[strong,weak],
  playtestSoulTuning:true,rotationCooldownMs:3000},hostNowMs:()=>10000});
 const opening=host.snapshot();
 let koCount=0,replacements=0,eventsRead=0;
 for(let n=0;n<200&&host.snapshot().game.winner===null;n++){
  const before=host.snapshot();
  const turn=host.advanceAuto();
  assert.equal(turn.ok,true);
  assert.equal(turn.result.type,'action','match stalled instead of advancing');
  if(turn.result.targetHp===0)koCount++;
  const after=host.snapshot();
  if(after.game.clock.teams.some((team,side)=>
   team.offset!==before.game.clock.teams[side].offset))replacements++;
  const fresh=after.game.events.filter(e=>e.type==='action'&&e.eventId>eventsRead);
  if(fresh.length){
   const cue=latestBattleCue(fresh);
   const plan=planActionChoreography(cue);
   assert.equal(plan.eventKey,cue.key,'host action ID differs from visible cue');
   eventsRead=fresh.at(-1).eventId;
  }
 }
 const end=host.snapshot();
 assert.equal(end.game.winner,0);
 assert.equal(end.game.squads[1].filter(x=>x.hp===0).length,6);
 assert.ok(koCount>=6&&replacements>0,
  'video-observed KO and reserve replacement did not occur');
 for(const side of [0,1]){
  const view=makeStageView(end,side);
  const result=projectMatchResult(view.winner,side);
  assert.equal(result.title,side===0?'勝利！':'敗北…');
 }
 assert.equal(host.advanceAuto().result.type,'finished');
 assert.equal(replayMatchJournal(host.exportJournal()).ok,true);
 assert.equal(opening.game.winner,null);
});

test('V3-4-23 original lower-screen Purify: real negative bench status remains until touch completion, even as battle advances',()=>{
 const battle=createCombat({seed:22});
 const applied=battle.applyInspirit({id:'A4',sign:'negative',effect:'sleep'});
 assert.ok(applied);
 assert.ok(battle.snapshot().inspirits.A4.length>0);
 const start=battle.beginPurify(0,'A4',{kind:'mash'});
 assert.equal(start.ok,true);
 for(let n=0;n<13;n++){
  const part=battle.purifyInput(0,{type:'tap',x:.5,y:.5});
  assert.equal(part.ok,true);
 }
 assert.ok(battle.snapshot().purification[0],'13 taps must not finish the fixture');
 assert.ok(battle.snapshot().inspirits.A4.length>0);
 const step=battle.step();
 assert.equal(step.type,'action');
 assert.ok(battle.snapshot().purification[0],
  'host auto action must not cancel lower-screen minigame');
 const finish=battle.purifyInput(0,{type:'tap',x:.5,y:.5});
 assert.equal(finish.ok,true);
 assert.equal(battle.snapshot().purification[0],null);
 assert.equal(battle.snapshot().inspirits.A4.length,0);
 const event=battle.snapshot().events.filter(e=>e.type==='purification').at(-1);
 assert.equal(event.targetId,'A4');
 assert.ok(event.removed.length>0);
});
