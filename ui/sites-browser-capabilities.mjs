/**
 * Phase24C2: local, read-only iPad/Safari feature readiness.
 * No User-Agent fingerprinting, analytics, credentials, network traffic,
 * settings changes or hidden browser permission prompts.
 *
 * A missing capability rejects online initialization with an actionable
 * Japanese error rather than failing later in a PointerEvent gesture or room.
 */
const descriptions={
 secure_context:'HTTPSで安全に開かれた埋め込み画面が必要です',
 pointer_events:'タッチ操作に必要なPointer Eventsが利用できません（Safariを更新してください）',
 random:'部屋番号用の安全な乱数機能がありません',
 text_encoder:'通信に必要なTextEncoderがありません'
};
export function checkSitesBrowserCapabilities(scope=globalThis){
 const missing=[];
 if(scope?.isSecureContext!==true)missing.push('secure_context');
 if(typeof scope?.PointerEvent!=='function')missing.push('pointer_events');
 if(typeof scope?.crypto?.getRandomValues!=='function')missing.push('random');
 if(typeof scope?.TextEncoder!=='function')missing.push('text_encoder');
 return {
  ok:missing.length===0,
  missing,
  message:missing.length?missing.map(code=>descriptions[code]).join('／'):'基本ブラウザ機能OK'
 };
}
