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
 if(ack?.applied===true)return '入力 '+seq+' を対戦に反映しました';
 return '入力 '+seq+' はホストに届きました（操作結果は未確認）';
}
