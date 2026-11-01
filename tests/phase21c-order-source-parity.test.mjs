import assert from 'node:assert/strict';
import test from 'node:test';
import {createBattle, initialWaitRange, waitCostFromSpeed} from '../engine/phase1.mjs';

/**
 * Phase 21C: STATIC transcription of the complete 94-row YW2/3 table
 * https://mtwildwood.net/turn-order.php (checked 2026-10-25).
 * Columns: inclusive Speed cap, initial wait MIN, MAX, post-action Speed weight.
 * This is a datamined community reference, NOT certified original 3DS parity.
 * Keep distinct from the production lookup's generated groups, so any future
 * mistaken boundary or value change is detected independently.
 */
const YW2_SOURCE_ROWS = [
  [1, 156, 187, 123],
  [5, 155, 186, 122],
  [8, 154, 185, 121],
  [11, 153, 184, 120],
  [14, 152, 183, 119],
  [17, 151, 182, 118],
  [20, 150, 181, 117],
  [23, 149, 180, 116],
  [26, 148, 179, 115],
  [29, 147, 178, 114],
  [32, 146, 177, 113],
  [35, 145, 176, 112],
  [38, 144, 175, 111],
  [41, 143, 174, 110],
  [44, 142, 173, 109],
  [47, 141, 172, 108],
  [50, 140, 171, 107],
  [53, 139, 170, 106],
  [56, 138, 169, 105],
  [59, 137, 168, 104],
  [62, 136, 167, 103],
  [65, 135, 166, 102],
  [68, 134, 165, 101],
  [71, 133, 164, 100],
  [74, 132, 163, 99],
  [77, 131, 162, 98],
  [80, 130, 161, 97],
  [83, 129, 160, 96],
  [86, 128, 159, 95],
  [89, 127, 158, 94],
  [92, 126, 157, 93],
  [95, 125, 156, 92],
  [98, 124, 155, 91],
  [101, 123, 154, 90],
  [104, 122, 153, 89],
  [107, 121, 152, 88],
  [110, 120, 151, 87],
  [113, 119, 150, 86],
  [116, 118, 149, 85],
  [119, 117, 148, 84],
  [122, 116, 147, 83],
  [125, 115, 146, 82],
  [128, 114, 145, 81],
  [131, 113, 144, 80],
  [134, 112, 143, 79],
  [137, 111, 142, 78],
  [140, 110, 141, 77],
  [143, 109, 140, 76],
  [146, 108, 139, 75],
  [149, 107, 138, 74],
  [152, 106, 137, 73],
  [155, 105, 136, 72],
  [158, 104, 135, 71],
  [161, 103, 134, 70],
  [164, 102, 132, 69],
  [167, 101, 130, 68],
  [170, 100, 128, 67],
  [175, 99, 126, 66],
  [180, 98, 124, 65],
  [185, 97, 122, 64],
  [190, 96, 120, 63],
  [195, 95, 118, 62],
  [200, 94, 116, 61],
  [210, 93, 114, 60],
  [220, 92, 112, 59],
  [230, 91, 110, 58],
  [240, 90, 108, 57],
  [250, 88, 106, 56],
  [260, 86, 104, 55],
  [270, 84, 102, 54],
  [280, 82, 100, 53],
  [290, 80, 98, 52],
  [300, 78, 96, 51],
  [310, 76, 94, 50],
  [320, 74, 92, 49],
  [330, 72, 90, 48],
  [340, 70, 88, 47],
  [350, 68, 86, 46],
  [360, 66, 84, 45],
  [370, 64, 82, 44],
  [380, 62, 80, 43],
  [390, 60, 78, 42],
  [400, 58, 76, 41],
  [410, 56, 74, 40],
  [420, 54, 72, 39],
  [430, 52, 70, 38],
  [440, 50, 68, 37],
  [450, 48, 66, 36],
  [460, 46, 64, 35],
  [470, 44, 62, 34],
  [480, 42, 60, 33],
  [490, 40, 58, 32],
  [500, 38, 56, 31],
  [999, 36, 54, 30],
];

const mirroredRoster = Array.from({length:6}, (_,i)=>({
  name:'Source-test unit '+i, speed:210
}));

test('21C reference contains 94 ascending complete YW2 speed rows',()=>{
  assert.equal(YW2_SOURCE_ROWS.length,94);
  assert.equal(YW2_SOURCE_ROWS[0][0],1);
  assert.equal(YW2_SOURCE_ROWS.at(-1)[0],999);
  for(let i=1;i<YW2_SOURCE_ROWS.length;i++)
    assert.ok(YW2_SOURCE_ROWS[i][0]>YW2_SOURCE_ROWS[i-1][0]);
});

test('21C all 94 table bands match initial wait and action weight at every speed',()=>{
  for(let speed=1;speed<=999;speed++){
    const row=YW2_SOURCE_ROWS.find(([maxSpeed])=>speed<=maxSpeed);
    assert.ok(row,'missing source row for speed '+speed);
    const [,min,max,weight]=row;
    assert.deepEqual(initialWaitRange(speed),[min,max], 'opening wait: speed '+speed);
    assert.equal(waitCostFromSpeed(speed),3*weight,'action cost: speed '+speed);
  }
  for(const speed of [1000,2000,9999]){
    assert.deepEqual(initialWaitRange(speed),[36,54]);
    assert.equal(waitCostFromSpeed(speed),90);
  }
});

test('21C normal opening debits both teams together; only actor gets full reset',()=>{
  for(const seed of [1,2,3,8,31,87,112]){
    const game=createBattle({seed,teams:[mirroredRoster,mirroredRoster]});
    const pre=game.snapshot();
    const active=pre.teams.flatMap(t=>t.frontIds.map(id=>t.members.find(m=>m.id===id)));
    const lowest=Math.min(...active.map(m=>m.wait));
    const predicted=game.predict(1);
    const step=game.step(3);
    assert.equal(step.elapsed,lowest);
    assert.equal(step.pointsElapsed,lowest);
    assert.equal(step.id,predicted[0].id);
    const now=game.snapshot().teams.flatMap(t=>t.members);
    for(const member of active){
      const after=now.find(m=>m.id===member.id);
      assert.equal(after.wait,member.id===step.id ? member.cost : member.wait-lowest,member.id);
    }
  }
});

test('21C equal waiting counters use a reproducible but UNSOURCED tie convention',()=>{
  let tieCase=null;
  for(let seed=1;seed<=1024;seed++){
    const game=createBattle({seed,teams:[mirroredRoster,mirroredRoster]});
    const state=game.snapshot();
    const front=state.teams.flatMap(t=>t.frontIds.map(id=>t.members.find(m=>m.id===id)));
    const minimum=Math.min(...front.map(m=>m.wait));
    const ties=front.filter(m=>m.wait===minimum);
    if(ties.length>=2){tieCase={game,ties};break;}
  }
  assert.ok(tieCase,'fixture should expose a tied minimum');
  assert.equal(tieCase.game.step().id,tieCase.ties[0].id);
  // This deliberately tests present deterministic behavior, NOT a YW2 rule.
  // Original simultaneous-zero priority is unknown; do not relabel as parity.
});
