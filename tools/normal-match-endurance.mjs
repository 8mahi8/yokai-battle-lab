/**
 * Offline deterministic endurance measurement using the ACTUAL symmetric
 * six-member rental teams and trial Soul values. This is not a PvP network
 * test. Measure natural battle length before proposing balance changes.
 */
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const seeds=[20261026,20261023,212,8192];
for(const seed of seeds){
 const m=createMatchProtocol({battleOptions:{seed,playtestSoulTuning:true}});
 let steps=0,stalls=0;
 const limit=600; // 15 minutes at 1.5s/turn — observational budget
 for(;steps<limit&&m.snapshot().game.winner===null;steps++){
  const current=m.snapshot();
  const result=m.advanceAuto();
  if(!result.ok)throw new Error('normal match step failed '+seed+' '+steps+' '+JSON.stringify(result));
  if(result.result.type==='awaiting_rotation'){
   stalls++;
   throw new Error('normal match stuck awaiting KO replacement '+seed+' '+steps);
  }
  if(result.result.type!=='action')
   throw new Error('unexpected normal match action '+seed+' '+steps+' '+JSON.stringify(result));
  const state=m.snapshot();
  for(const squad of state.game.squads){
   if(squad.length!==6)throw new Error('roster lost a member');
   for(const unit of squad){
    if(!Number.isFinite(unit.hp)||unit.hp<0||unit.hp>unit.maxHp)
     throw new Error('invalid HP in normal endurance');
   }
  }
  if(state.game.winner!==null)break;
 }
 const snapshot=m.snapshot();
 // Measuring and limiting the test is intentional: no artificial forced
 // victory and no assertion that a natural match must end at 600 turns.
 const KO=snapshot.game.squads.map(team=>team.filter(u=>u.hp===0).length);
 const totalHP=snapshot.game.squads.map(team=>team.reduce((sum,u)=>sum+u.hp,0));
 const estimateSec=steps*1.5;
 console.log('NORMAL-RENTAL-ENDURANCE '+JSON.stringify({
  seed,steps,estimatedPlayingSeconds:estimateSec,
  winner:snapshot.game.winner,allSixKO:KO,totalHP,
  stoppedBecause:steps===limit?'sampling-limit':'victory'
 }));
 if(snapshot.game.winner!==null){
  const out=m.advanceAuto();
  if(!out.ok||out.result.type!=='finished')
   throw new Error('terminal normal match can still advance');
 }
}
console.log('NORMAL-RENTAL-ENDURANCE-PASS seeded real six-rental match sampled without infinite KO rotation');
