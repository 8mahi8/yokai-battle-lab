import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySupabaseAuthFailure,checkSupabaseAuthReachability} from '../ui/supabase-auth-diagnostics.mjs';

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
