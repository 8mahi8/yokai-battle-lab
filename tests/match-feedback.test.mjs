import test from 'node:test';
import assert from 'node:assert/strict';
import {matchAckMessage,matchRuleFailureMessage} from '../ui/match-feedback.mjs';

test('guest clearly sees authoritative cooldown refusal and remaining time',()=>{
 assert.equal(matchAckMessage({clientSeq:2,accepted:true,applied:false,
  reason:'cooldown',remainingMs:2550}), 'サークルはまだ回せません（あと約2.6秒）');
 assert.equal(matchAckMessage({clientSeq:3,accepted:true,applied:true}),
  '入力 3 を対戦に反映しました');
 assert.equal(matchAckMessage({clientSeq:3,accepted:true,applied:null}),
  '入力 3 はホストに届きました（操作結果は未確認）');
 assert.equal(matchAckMessage({clientSeq:7,applied:false,reason:'no_usable_unit'}),
  '操作は適用されませんでした：no_usable_unit');
 assert.equal(matchRuleFailureMessage('cooldown',undefined),
  'サークルはまだ回せません');
 assert.equal(matchRuleFailureMessage('cooldown',-1),
  'サークルはまだ回せません');
});

test('22C guest charge feedback distinguishes accepted input, interim progress and actual activation',()=>{
 assert.equal(matchAckMessage({clientSeq:7,commandType:'chargeStart',
  accepted:true,applied:true}),'必殺チャージを開始しました');
 assert.equal(matchAckMessage({clientSeq:8,commandType:'chargeInput',
  accepted:true,applied:false,reason:'no_active_charge'}),
  '操作は適用されませんでした：no_active_charge');
 assert.equal(matchAckMessage({clientSeq:9,commandType:'chargeInput',
  accepted:true,applied:true,completed:false}),
  'チャージ操作を反映しました（まだ発動していません）');
 assert.equal(matchAckMessage({clientSeq:10,commandType:'chargeInput',
  accepted:true,applied:true,completed:true}),
  '必殺チャージ完了：わざを発動しました');
 assert.equal(matchAckMessage({clientSeq:11,commandType:'chargeInput',
  accepted:true,applied:true}),
  'チャージ操作を反映しました（完了状態は未確認）');
 assert.equal(matchAckMessage({clientSeq:12,commandType:'chargeInput',
  accepted:true,applied:null,completed:true}),
  '入力 12 はホストに届きました（操作結果は未確認）',
  'missing/stale verdict must never claim a special fired');
 assert.equal(matchAckMessage({clientSeq:13,commandType:'chargeCancel',
  accepted:true,applied:true}),'必殺チャージを中止しました');
});
