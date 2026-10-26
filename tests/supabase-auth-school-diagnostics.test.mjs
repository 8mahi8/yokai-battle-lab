import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySupabaseAuthFailure,checkSupabaseAuthReachability,checkSupabaseGameApiReachability} from '../ui/supabase-auth-diagnostics.mjs';

const settings={url:'https://itqimlgnrjikaamstdlp.supabase.co',publishableKey:'sb_publishable_test_fixture_only'};
test('school Safari Load failed is network/transport category, NOT anonymous provider disabled',()=>{
 const x=classifySupabaseAuthFailure({message:'Load failed'});
 assert.equal(x.code,'AUTH_NETWORK');
 assert.match(x.message,/Safari/);
 assert.equal(classifySupabaseAuthFailure({message:'Failed to fetch'}).code,'AUTH_NETWORK');
 assert.equal(classifySupabaseAuthFailure({message:'NetworkError when attempting to fetch resource'}).code,'AUTH_NETWORK');
 assert.equal(classifySupabaseAuthFailure({message:'Anonymous sign-ins are disabled'}).code,'AUTH_DISABLED');
 assert.equal(classifySupabaseAuthFailure({message:'rate limit exceeded 429'}).code,'AUTH_RATE_LIMIT');
 assert.equal(classifySupabaseAuthFailure({message:'unknown'}).code,'AUTH_REJECTED');
});
test('auth health probe uses only public key, no user ID, cookies or token',async()=>{
 let captured;
 const result=await checkSupabaseAuthReachability({...settings,fetchFn:async (url,params)=>{
  captured={url,params};return {ok:true,status:200};
 }});
 assert.equal(result.code,'AUTH_HEALTH_OK');
 assert.equal(result.httpStatus,200);
 assert.equal(captured.url,settings.url+'/auth/v1/health');
 assert.equal(captured.params.headers.apikey,settings.publishableKey);
 assert.equal(captured.params.credentials,'omit');
 assert.equal(captured.params.mode,'cors');
 assert.equal(captured.params.method,'GET');
 assert.equal(captured.params.cache,'no-store');
 assert.doesNotMatch(JSON.stringify(result),/sb_publishable/);
});
test('school network/CORS rejection is a diagnosis, not a falsely claimed disabled provider',async()=>{
 const result=await checkSupabaseAuthReachability({...settings,
  fetchFn:async()=>{throw new TypeError('Load failed');}});
 assert.equal(result.code,'AUTH_HEALTH_NETWORK');
 assert.match(result.description,/Safari\/CORS/);
 assert.equal((await checkSupabaseAuthReachability({...settings,
  fetchFn:async()=>({status:403,ok:false})})).httpStatus,403);
});
test('bad health probe config is rejected and no privileged key can be passed',async()=>{
 await assert.rejects(checkSupabaseAuthReachability({url:'http://evil.invalid',publishableKey:'sb_secret_000'}),TypeError);
 await assert.rejects(checkSupabaseAuthReachability({...settings,timeoutMs:90000}),RangeError);
});

test('public-key only REST probe treats HTTP 401 as reachable without exposing data',async()=>{
 let sent;
 const result=await checkSupabaseGameApiReachability({...settings,fetchFn:async (url,options)=>{
  sent={url,options};return {ok:false,status:401};
 }});
 assert.equal(result.code,'GAME_API_HTTP');
 assert.equal(result.httpStatus,401);
 assert.match(result.description,/権限拒否/);
 assert.equal(sent.url,settings.url+'/rest/v1/yw_rooms_v1?select=code&limit=0');
 assert.equal(sent.options.method,'GET');
 assert.equal(sent.options.mode,'cors');
 assert.equal(sent.options.credentials,'omit');
 assert.equal(sent.options.headers.apikey,settings.publishableKey);
 assert.equal(sent.options.headers.Authorization,undefined);
 assert.doesNotMatch(JSON.stringify(result),/sb_publishable|room_code|session/);
});
test('REST HTTP 403/200 are network reachable but never proof of playable no-Auth PvP',async()=>{
 const denied=await checkSupabaseGameApiReachability({...settings,fetchFn:async()=>({ok:false,status:403})});
 const allowed=await checkSupabaseGameApiReachability({...settings,fetchFn:async()=>({ok:true,status:200})});
 assert.equal(denied.code,'GAME_API_HTTP');
 assert.equal(allowed.code,'GAME_API_HTTP');
 assert.match(allowed.description,/別途確認/);
});
test('REST Safari Load failed is distinct from HTTP permission rejection',async()=>{
 const x=await checkSupabaseGameApiReachability({...settings,fetchFn:async()=>{throw Error('Load failed')}});
 assert.equal(x.code,'GAME_API_NETWORK');
 assert.equal(x.httpStatus,undefined);
 await assert.rejects(checkSupabaseGameApiReachability({...settings,publishableKey:'sb_secret_bad'}),TypeError);
 await assert.rejects(checkSupabaseGameApiReachability({...settings,timeoutMs:18000}),RangeError);
});
