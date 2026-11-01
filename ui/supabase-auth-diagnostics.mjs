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

/**
 * Read-only, unauthenticated Data API route probe for school Safari diagnosis.
 * HTTP 401/403 IS evidence the REST endpoint was reached (expected with
 * current anon GRANT/RLS), not evidence the game can run without Auth.
 * limit=0 ensures no room number, user ID or match record is returned.
 */
export async function checkSupabaseGameApiReachability({url,publishableKey,
 fetchFn=globalThis.fetch,timeoutMs=6500}={}){
 if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||
  !/^sb_publishable_/.test(publishableKey||'')||typeof fetchFn!=='function')
  throw new TypeError('public Supabase project settings and fetch required');
 if(!Number.isInteger(timeoutMs)||timeoutMs<300||timeoutMs>15000)
  throw new RangeError('invalid diagnosis timeout');
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timedOut=false;
 const timeout=setTimeout(()=>{timedOut=true;controller?.abort();},timeoutMs);
 try{
  const res=await fetchFn(url+'/rest/v1/yw_rooms_v1?select=code&limit=0',{
   method:'GET',mode:'cors',cache:'no-store',credentials:'omit',
   headers:{apikey:publishableKey},
   ...(controller?{signal:controller.signal}:{})
  });
  return {code:'GAME_API_HTTP',httpStatus:res.status,
   description:res.status===401||res.status===403?
    'ゲームAPIには届きました。未ログインでの権限拒否は現行設定で想定内です。':
    res.ok?
     'ゲームAPIは応答しました。認証不要での読み取り権限は別途確認が必要です。':
     'ゲームAPIには届きました（HTTP '+res.status+'）。'};
 }catch(error){
  return {code:timedOut?'GAME_API_TIMEOUT':'GAME_API_NETWORK',
   description:timedOut?'ゲームAPIへの接続がタイムアウトしました。':
    'ゲームAPIへ接続できないか、Safari/CORSが応答を遮断しました。'};
 }finally{clearTimeout(timeout)}
}
