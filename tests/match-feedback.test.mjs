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
