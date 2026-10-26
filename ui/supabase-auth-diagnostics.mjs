/**
 * Schools: read-only auth reachability evidence. Do NOT log UID, API key,
 * credentials, session, tokens, browser fingerprint or IP information.
 * A 200 from health is NOT proof signInAnonymously POST will work in Safari.
 */
export function classifySupabaseAuthFailure(error){
 const msg=String(error?.message||error||'unknown error');
 const lower=msg.toLowerCase();
 if(lower.includes('anonymous sign-ins are disabled'))
  return {code:'AUTH_DISABLED',message:'匿名認証がSupabase側で無効です。'};
 if(/(load failed|failed to fetch|network request failed|networkerror|fetch error|aborterror|timed out|timeout)/i.test(msg))
  return {code:'AUTH_NETWORK',message:'匿名認証APIへの通信が完了しませんでした。学校Wi-Fiの制限・Safariの通信失敗・埋め込み制限が候補です。'};
 if(/(429|rate.?limit|too many requests)/i.test(msg))
  return {code:'AUTH_RATE_LIMIT',message:'アクセスが多すぎるため認証が制限されました。'};
 return {code:'AUTH_REJECTED',message:'認証APIが失敗を返しました。原因はまだ未確定です。'};
}
export async function checkSupabaseAuthReachability({url,publishableKey,fetchFn=globalThis.fetch,timeoutMs=6500}={}){
 if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||
  !/^sb_publishable_/.test(publishableKey||'')||typeof fetchFn!=='function')
  throw new TypeError('public Supabase project settings and fetch required');
 if(!Number.isInteger(timeoutMs)||timeoutMs<300||timeoutMs>15000)
  throw new RangeError('invalid diagnosis timeout');
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timedOut=false;
 const timeout=setTimeout(()=>{timedOut=true;controller?.abort();},timeoutMs);
 try{
  const res=await fetchFn(url+'/auth/v1/health',{
   method:'GET',mode:'cors',cache:'no-store',
   credentials:'omit',headers:{apikey:publishableKey},
   ...(controller?{signal:controller.signal}:{})
  });
  return {code:res.ok?'AUTH_HEALTH_OK':'AUTH_HEALTH_HTTP',
   httpStatus:res.status,description:res.ok?
    '認証サーバーのヘルスチェックには到達しました（匿名登録POSTの成功は別です）。':
    '認証サーバーには到達しましたが、HTTP '+res.status+' が返りました。'};
 }catch(error){
  return {code:timedOut?'AUTH_HEALTH_TIMEOUT':'AUTH_HEALTH_NETWORK',
   description:timedOut?'認証サーバーへの接続がタイムアウトしました。':
    '認証サーバーへ接続できないか、Safari/CORSによって応答を取得できませんでした。'};
 }finally{clearTimeout(timeout)}
}
