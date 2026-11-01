import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSitesBrowserCapabilities} from '../ui/sites-browser-capabilities.mjs';
function complete(){
 return {isSecureContext:true,PointerEvent:function PointerEvent(){},
  crypto:{getRandomValues:()=>{}},TextEncoder:function TextEncoder(){}};
}
test('24C2 compatible secure embedded touch browser passes without telemetry',()=>{
 assert.deepEqual(checkSitesBrowserCapabilities(complete()),{
  ok:true,missing:[],message:'基本ブラウザ機能OK'});
});
test('24C2 unsupported older Safari pointer events explains the missing input API',()=>{
 const fake=complete();delete fake.PointerEvent;
 const r=checkSitesBrowserCapabilities(fake);
 assert.equal(r.ok,false);
 assert.deepEqual(r.missing,['pointer_events']);
 assert.match(r.message,/Safariを更新/);
});
test('24C2 unsafe frame and missing crypto are independently disclosed',()=>{
 const fake=complete();fake.isSecureContext=false;fake.crypto={};
 const r=checkSitesBrowserCapabilities(fake);
 assert.equal(r.ok,false);
 assert.deepEqual(r.missing,['secure_context','random']);
 assert.match(r.message,/HTTPS/);
 assert.match(r.message,/乱数/);
});
test('24C2 missing TextEncoder has actionable diagnostic without version sniffing',()=>{
 const fake=complete();delete fake.TextEncoder;
 const r=checkSitesBrowserCapabilities(fake);
 assert.equal(r.ok,false);
 assert.deepEqual(r.missing,['text_encoder']);
 assert.match(r.message,/TextEncoder/);
});
test('24C2 absent browser globals fail closed rather than throwing',()=>{
 const r=checkSitesBrowserCapabilities({});
 assert.deepEqual(r.missing,['secure_context','pointer_events','random','text_encoder']);
 assert.equal(r.ok,false);
});
