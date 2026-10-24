import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchProtocol,replayMatchJournal} from '../engine/match-protocol.mjs';
import {RENTAL_SQUAD} from '../engine/combat.mjs';
import {makeStageView,matchSelectionHints} from '../ui/match-stage.mjs';
import {soultimateReadiness} from '../ui/soultimate-ready.mjs';

/**
 * Phase22B: full authoritative online match / UI projection / replay
 * regression using *controlled* tiny gauge capacity (5), without bypassing
 * Soul via giveSoul, debug commands or impossible initial match settings.
 * No claims that 5 is original YW2 gauge capacity or that the gesture
 * thresholds/timing are original.
 *
 * Original charge types (four) documented at:
 * https://game8.jp/youkai-watch2/504498
 * Original G-tech ring-neighbor full gauge requirement:
 * https://gamepedia.jp/youkai-yw2/archives/1873
 */
const guardRoster=()=>RENTAL_SQUAD.map(u=>({...u,soulCapacity:5,
  weights:[0,0,0,100]}));
const make=(seed=1)=>createMatchProtocol({battleOptions:{
  seed,teams:[guardRoster(),guardRoster()],
  rotationCooldownMs:0,researchSpecialEffects:false
}});
const meter=(m,id)=>m.snapshot().game.soul.teams.flat().find(u=>u.id===id);
const unit=(view,id)=>view.teams[id[0]==='A'?0:1].members.find(u=>u.id===id);
const autoUntil=(m,predicate,limit=180)=>{
  for(let i=0;i<limit&&!predicate();i++){
    const r=m.advanceAuto();
    assert.equal(r.ok,true,JSON.stringify(r));
  }
  assert.ok(predicate(),'research fixture did not naturally fill Soul');
};
const click=(m,seat,seq,command)=>{
  const r=m.dispatch(seat,seq,command);
  assert.equal(r.accepted,true,JSON.stringify(r));
  return r;
};
const gestureDrive=(m,seat,start,beginSeq)=>{
  let nextSeq=beginSeq;
  let result=null;
  const send=(type,x,y)=>{
    const intent={type:'chargeInput',gesture:{type,...(x===undefined?{}:{x,y})}};
    const r=click(m,seat,++nextSeq,intent);
    assert.equal(r.ok,true,JSON.stringify(r));
    result=r.result;
    return r;
  };
  const initial=start.result.challenge;
  const kind=start.result.kind;
  if(kind==='tap'){
    for(let i=0;i<6;i++){
      const c=m.snapshot().game.guided[seat].challenge;
      send('tap',...c.target);
    }
  }else if(kind==='trace'){
    for(let round=0;round<3;round++){
      const path=m.snapshot().game.guided[seat].challenge.path;
      send('down',...path[0]);
      for(const point of path.slice(1))send('move',...point);
    }
  }else if(kind==='align'){
    for(let i=0;i<3;i++){
      const c=m.snapshot().game.guided[seat].challenge;
      const theta=-Math.PI/2+(c.clockNumber%12)*Math.PI/6;
      send('down',.5,.18);
      send('move',.5+.32*Math.cos(theta),.5+.32*Math.sin(theta));
      send('up');
    }
  }else if(kind==='spin'){
    const point=n=>{
      const t=-Math.PI/2+n*2*Math.PI/40;
      return [.5+.32*Math.cos(t),.5+.32*Math.sin(t)];
    };
    send('down',...point(0));
    for(let i=1;i<=84&&!result.completed;i++)send('move',...point(i));
  }else throw new Error('unknown challenge: '+kind);
  assert.ok(result?.completed,'four-mode fixture was not completed: '+kind);
  assert.equal(result.special?.ok,true,JSON.stringify(result));
  assert.equal(result.special?.effectStatus,'unimplemented');
  return {kind,seq:nextSeq,last:result};
};

for(const [seed,kind] of [[1,'align'],[2,'tap'],[3,'trace'],[4,'spin']]){
  test('22B canonical host touch '+kind+' completes exactly one normal Soultimate and is replayable',()=>{
    const m=make(seed);
    autoUntil(m,()=>meter(m,'A1').soul===5);
    const before=makeStageView(m.snapshot(),0);
    assert.equal(unit(before,'A1').specialReady,true);
    assert.deepEqual(matchSelectionHints(before,'charge').own.includes('A1'),true);
    const begin=click(m,0,1,{type:'chargeStart',id:'A1'});
    assert.equal(begin.ok,true);
    assert.equal(begin.result.kind,kind,'fixed seed should exercise target minigame');
    assert.equal(m.snapshot().game.soul.pending[0].casterId,'A1');
    const active=makeStageView(m.snapshot(),0);
    assert.equal(active.gesture.kind,'charge');
    assert.equal(unit(active,'A1').specialReady,false);
    assert.equal(matchSelectionHints(active,'charge').own.includes('A1'),false);
    const outcome=gestureDrive(m,0,begin,1);
    assert.equal(outcome.kind,kind);
    assert.deepEqual(outcome.last.special.consumers,['A1']);
    assert.equal(meter(m,'A1').soul,0,'normal Soultimate costs the caster gauge');
    assert.equal(m.snapshot().game.soul.pending[0],null);
    assert.equal(m.snapshot().game.guided[0],null);
    const finished=makeStageView(m.snapshot(),0);
    assert.equal(finished.gesture,null);
    assert.equal(unit(finished,'A1').specialReady,false);
    const hash=m.snapshot().hash;
    const finalCommand=m.exportJournal().entries.at(-1);
    const duplicate=m.dispatch(0,outcome.seq,finalCommand.command);
    assert.equal(duplicate.duplicate,true);
    assert.equal(m.snapshot().hash,hash,'duplicate final touch may not spend Soul twice');
    assert.equal(click(m,0,outcome.seq+1,{type:'chargeStart',id:'A1'}).result.reason,'soul_not_full');
    autoUntil(m,()=>meter(m,'A1').soul===5);
    assert.equal(unit(makeStageView(m.snapshot(),0),'A1').specialReady,true);
    assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
  });
}

test('22B host watch mode switch cancels a live touch charge without consuming Soul',()=>{
  const m=make(2);
  autoUntil(m,()=>meter(m,'A1').soul===5);
  const begin=click(m,0,1,{type:'chargeStart',id:'A1'});
  assert.equal(begin.ok,true);
  assert.equal(m.snapshot().game.guided[0]?.kind,'tap');
  assert.equal(click(m,0,2,{type:'watch',mode:'zero'}).ok,true);
  assert.equal(m.snapshot().game.guided[0],null);
  assert.equal(m.snapshot().game.soul.pending[0],null);
  assert.equal(meter(m,'A1').soul,5);
  assert.equal(click(m,0,3,{type:'chargeInput',gesture:{type:'tap',x:.5,y:.5}})
    .result.reason,'no_active_charge');
  assert.equal(click(m,0,4,{type:'watch',mode:'standard'}).ok,true);
  assert.equal(unit(makeStageView(m.snapshot(),0),'A1').specialReady,true);
  assert.equal(click(m,0,5,{type:'chargeStart',id:'A1'}).ok,true);
  assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});

test('22B caster rotated off frontline cancels charge but not its full Soul meter',()=>{
  const m=make(3);
  autoUntil(m,()=>meter(m,'A1').soul===5);
  assert.equal(click(m,0,1,{type:'chargeStart',id:'A1'}).ok,true);
  const rotation=click(m,0,2,{type:'rotate',direction:1});
  assert.equal(rotation.ok,true);
  assert.equal(rotation.result.chargeCancelled,true);
  assert.equal(m.snapshot().game.soul.pending[0],null);
  assert.equal(m.snapshot().game.guided[0],null);
  assert.equal(meter(m,'A1').soul,5);
  assert.equal(click(m,0,3,{type:'chargeInput',gesture:{type:'tap',x:.5,y:.5}})
    .result.reason,'no_active_charge');
  assert.equal(click(m,0,4,{type:'rotate',direction:-1}).ok,true);
  assert.equal(unit(makeStageView(m.snapshot(),0),'A1').specialReady,true);
  assert.equal(click(m,0,5,{type:'chargeStart',id:'A1'}).ok,true);
  assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});

test('22B host G-tech needs both permanent ring neighbors and spends exactly three full gauges',()=>{
  const m=make(2);
  const frontAtStart=m.snapshot().game.clock.teams[0].frontIds;
  assert.deepEqual(frontAtStart,['A1','A2','A3']);
  // After one anticlockwise rotation, A6,A1,A2 are the three in front.
  assert.equal(click(m,0,1,{type:'rotate',direction:-1}).ok,true);
  assert.deepEqual(m.snapshot().game.clock.teams[0].frontIds,['A6','A1','A2']);
  autoUntil(m,()=>['A6','A1','A2'].every(id=>meter(m,id).soul===5));
  assert.equal(click(m,0,2,{type:'watch',mode:'zero'}).ok,true);
  const projection=soultimateReadiness(m.snapshot().game,0);
  assert.equal(projection.A1.ready,true);
  assert.deepEqual(projection.A1.consumers,['A6','A1','A2']);
  assert.equal(unit(makeStageView(m.snapshot(),0),'A1').specialReady,true);
  const begun=click(m,0,3,{type:'chargeStart',id:'A1'});
  assert.equal(begun.ok,true);
  assert.equal(begun.result.mode,'zero');
  assert.deepEqual(begun.result.consumers,['A6','A1','A2']);
  const result=gestureDrive(m,0,begun,3);
  assert.equal(result.last.special.kind,'g-tech');
  assert.deepEqual(result.last.special.consumers,['A6','A1','A2']);
  for(const id of ['A6','A1','A2'])assert.equal(meter(m,id).soul,0,id);
  assert.equal(meter(m,'A3').soul,0);
  assert.equal(unit(makeStageView(m.snapshot(),0),'A1').specialReady,false);
  assert.equal(replayMatchJournal(m.exportJournal()).ok,true);
});
