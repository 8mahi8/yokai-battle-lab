import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpecialSpec,planResearchSpecial} from '../engine/special-effects.mjs';
import {createCombat,RENTAL_SQUAD} from '../engine/combat.mjs';
import {latestBattleCue} from '../ui/battle-vfx.mjs';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';

const unit=(id,hp,maxHp=200)=>({id,hp,maxHp,strength:90,spirit:105,defense:60});

test('YW2-informed group revive + heal: KO and living teammates receive one combined effect',()=>{
 const caster=unit('A5',110);
 const allies=[unit('A1',0),unit('A2',28),unit('A3',200),
  unit('A4',0),caster,unit('A6',175)];
 const before=JSON.stringify(allies);
 const spec={kind:'revive-heal',scope:'team',power:85};
 const rule=validateSpecialSpec(spec);
 assert.ok(Object.isFrozen(rule));
 const impacts=planResearchSpecial({spec,caster,allies,enemies:[]});
 assert.equal(impacts.length,6);
 assert.deepEqual(impacts.map(x=>x.targetId),['A1','A2','A3','A4','A5','A6']);
 assert.deepEqual(impacts.map(x=>x.kind),
  ['revive','heal','heal','revive','heal','heal']);
 assert.deepEqual(impacts.map(x=>x.hpAfter),[85,113,200,85,195,200]);
 assert.deepEqual(impacts.map(x=>x.amount),[85,85,0,85,85,25]);
 assert.deepEqual(impacts.filter(x=>x.revived).map(x=>x.targetId),['A1','A4']);
 assert.ok(impacts.every(x=>x.hpAfter<=200&&x.hpAfter>=0&&x.linkedReviveHeal));
 assert.equal(JSON.stringify(allies),before);
 const g=planResearchSpecial({spec,caster,allies,enemies:[],powerMultiplier:2});
 assert.deepEqual(g.map(x=>x.hpAfter),[170,198,200,170,200,200]);
 assert.ok(g.every(x=>x.hpAfter<=x.hpBefore?x.hpBefore===200:true));
});

test('team revive + heal remains a heal if no KO, and never targets enemy',()=>{
 const caster=unit('A5',100);
 const allies=Array.from({length:6},(_,i)=>unit('A'+(i+1),i===0?150:200));
 const enemy=[unit('B1',0),unit('B2',40)];
 const out=planResearchSpecial({spec:{kind:'revive-heal',scope:'team',power:85},
  caster,allies,enemies:enemy});
 assert.equal(out.length,6);
 assert.ok(out.every(x=>x.targetId.startsWith('A')&&x.kind==='heal'&&!x.revived));
 assert.equal(out[0].amount,50);
 assert.ok(out.slice(1).every(x=>x.amount===0));
 assert.throws(()=>validateSpecialSpec({kind:'revive-heal',scope:'one',power:85}));
 assert.throws(()=>validateSpecialSpec({kind:'revive-heal',scope:'front',power:85}));
 // The exceptional pure one-unit revival category remains source-grounded by Odenjin.
 assert.equal(validateSpecialSpec({kind:'revive',scope:'one',power:85}).kind,'revive');
});

test('Hotaru canonical special revives a KO reserve and heals allies in the same event',()=>{
 const rosters=[RENTAL_SQUAD.map(x=>({...x})),RENTAL_SQUAD.map(x=>({...x}))];
 rosters[1][3].special={kind:'damage',scope:'one',power:999,damageKind:'attack'};
 const g=createCombat({teams:rosters,researchSpecialEffects:true,
  researchDamageModel:true,researchStatInspirits:true});
 // A2 is knocked out by a legal enemy special before Hotaru's own release.
 assert.equal(g.rotate(1,1).ok,true);
 g.pin(1,'A2');
 g.giveSoul('B4',100);
 const startB=g.prepareSoultimate(1,'B4');
 assert.equal(startB.ok,true);
 const kill=g.resolveSoultimate(1,startB.token,true);
 assert.equal(kill.ok,true);
 assert.equal(g.snapshot().squads[0][1].hp,0);
 assert.equal(g.snapshot().clock.teams[0].members[1].canAct,false);
 // Hotaru is initially on the bench; an ordinary wheel input brings A5 forward.
 assert.equal(g.rotate(0,1).ok,true);
 assert.equal(g.rotate(0,1).ok,true);
 g.giveSoul('A5',100);
 const ready=g.prepareSoultimate(0,'A5');
 assert.equal(ready.ok,true);
 const outcome=g.resolveSoultimate(0,ready.token,true);
 assert.equal(outcome.ok,true);
 assert.equal(outcome.impacts.length,6);
 const revive=outcome.impacts.find(x=>x.targetId==='A2');
 assert.deepEqual([revive.kind,revive.amount,revive.revived],['revive',85,true]);
 assert.equal(g.snapshot().squads[0][1].hp,85);
 assert.equal(g.snapshot().clock.teams[0].members[1].canAct,true);
 assert.equal(g.snapshot().winner,null);
 const heal=outcome.impacts.find(x=>x.targetId==='A1');
 assert.equal(heal.kind,'heal');
 assert.equal(heal.hpAfter,heal.hpBefore);
 const cue=latestBattleCue(g.snapshot().events);
 assert.equal(cue.targets.length,6);
 assert.equal(cue.targets.find(x=>x.id==='A2').kind,'revive');
 assert.equal(cue.targets.find(x=>x.id==='A1').kind,'heal');
});

test('updated six-role rental team is symmetrical, seeded journal replay still deterministic',()=>{
 const m=createMatchProtocol({battleOptions:{seed:730303}});
 for(const side of [0,1]){
  const team=m.snapshot().game.squads[side];
  assert.equal(team[4].special.kind,'revive-heal');
  assert.equal(team[4].special.scope,'team');
 }
 for(let turn=0;turn<20;turn++)assert.equal(m.advanceAuto().ok,true);
 assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
