import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
function rosters(){
 const a=RENTAL_SQUAD.map((u,i)=>({...u,
  special:i===0?{kind:'damage',scope:'one',power:900,damageKind:'attack'}:
   {kind:'heal',scope:'front',power:50}}));
 const b=RENTAL_SQUAD.map((u,i)=>({...u,maxHp:i===0?4:u.maxHp}));
 return [a,b];
}
test('lethal research Soultimate interrupts enemy charge with no resource spend',()=>{
 const game=createCombat({seed:4,researchSpecialEffects:true,teams:rosters()});
 game.giveSoul('B1',100);
 const pendingB=game.prepareSoultimate(1,'B1');
 assert.equal(pendingB.ok,true);
 game.giveSoul('A1',100);
 const pendingA=game.prepareSoultimate(0,'A1');
 const result=game.resolveSoultimate(0,pendingA.token,true);
 assert.equal(result.effectStatus,'research-fixture');
 assert.equal(result.impacts[0].targetId,'B1');
 assert.equal(game.snapshot().squads[1][0].hp,0);
 assert.deepEqual(result.interruptions.map(x=>({target:x.target,stopped:x.stopped})),
  [{target:'B1',stopped:true}]);
 assert.equal(game.snapshot().soul.pending[1],null);
 assert.equal(game.snapshot().soul.teams[1][0].soul,100);
 assert.equal(game.resolveSoultimate(1,pendingB.token,true).reason,'stale_or_unknown_charge');
});
test('damage from a nonlethal special still records interruption chance',()=>{
 const a=RENTAL_SQUAD.map((u,i)=>({...u,special:{
  kind:'damage',scope:'one',power:30,damageKind:'attack'}}));
 const game=createCombat({seed:101,researchSpecialEffects:true,teams:[a,RENTAL_SQUAD]});
 game.giveSoul('B1',100);
 assert.equal(game.prepareSoultimate(1,'B1').ok,true);
 game.giveSoul('A1',100);
 const c=game.prepareSoultimate(0,'A1');
 const result=game.resolveSoultimate(0,c.token,true);
 assert.equal(result.impacts.length,1);
 assert.equal(result.interruptions.length,1);
 assert.ok(result.interruptions[0].chance>=8&&result.interruptions[0].chance<=100);
});
