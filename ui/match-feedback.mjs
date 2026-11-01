/**
 * Japanese PvP feedback for host-confirmed rule actions.
 * Transport ACK means consumed, not applied. A missing receipt is UNKNOWN,
 * never show success merely because the revision changed.
 */
export function matchRuleFailureMessage(reason,remainingMs){
 if(reason==='cooldown'){
  const seconds=Number.isFinite(remainingMs)&&remainingMs>=0?
    '（あと約'+(Math.ceil(remainingMs/100)/10).toFixed(1)+'秒）':'';
  return 'サークルはまだ回せません'+seconds;
 }
 return '操作は適用されませんでした'+(reason?'：'+String(reason):'');
}
export function matchAckMessage(ack){
 const seq=Number.isSafeInteger(ack?.clientSeq)?ack.clientSeq:'?';
 if(ack?.applied===false)
  return matchRuleFailureMessage(ack.reason,ack.remainingMs);
 if(ack?.applied===true){
  // A host ACK for one touch is not a Soultimate activation. Report the
  // gameplay phase only when it came from the authoritative command result.
  if(ack.commandType==='chargeStart')return '必殺チャージを開始しました';
  if(ack.commandType==='chargeCancel')return '必殺チャージを中止しました';
  if(ack.commandType==='chargeInput'){
   if(ack.completed===true)return '必殺チャージ完了：わざを発動しました';
   if(ack.completed===false)return 'チャージ操作を反映しました（まだ発動していません）';
   return 'チャージ操作を反映しました（完了状態は未確認）';
  }
  return '入力 '+seq+' を対戦に反映しました';
 }
 return '入力 '+seq+' はホストに届きました（操作結果は未確認）';
}
