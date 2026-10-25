import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewSharedRules,previewRulesFiles} from '../tools/preview-shared-rtdb-rules.mjs';

const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const importYokai=async()=>JSON.parse(await readFile(
 path.join(repoRoot,'network/emulator/database.rules.json'),'utf8'));
const base=()=>({rules:{
 '.read':false,'.write':false,
 brawlExistingRooms:{'.read':true,'.write':true},
 shokokuRooms1v1:{'$code':{'.read':true,'.write':'auth !== null'}},
 someOtherGame:{'.read':"root.child('config/enabled').val() === true",'.indexOn':['uid']},
 '.indexOn':['users']
}});
const json=v=>JSON.stringify(v);

test('24C share Firebase preserving BRAWL and Shokoku root rules byte-for-byte',async()=>{
 const old=base(),original=json(old),yokai=await importYokai();
 const merged=previewSharedRules(old,yokai);
 assert.equal(json(old),original,'input mutated');
 assert.deepEqual(Object.keys(merged.rules),
  [...Object.keys(old.rules),'yokaiRoomsV1']);
 for(const name of Object.keys(old.rules))
  assert.equal(json(merged.rules[name]),json(old.rules[name]),'legacy changed: '+name);
 assert.deepEqual(merged.rules.yokaiRoomsV1,yokai.rules.yokaiRoomsV1);
 assert.notEqual(merged.rules.yokaiRoomsV1, yokai.rules.yokaiRoomsV1,'must clone rule object');
});

test('24C refuse insecure root read/write grants that deeper Rules cannot revoke',async()=>{
 const yokai=await importYokai();
 for(const key of ['.read','.write']){
  for(const grant of [true,'true',"auth !== null","now < 9999999999999"]){
   const old=base();old.rules[key]=grant;
   assert.throws(()=>previewSharedRules(old,yokai),/unsafe_parent_/);
  }
 }
});

test('24C fail closed with wildcard, parent validation or path collision',async()=>{
 const yokai=await importYokai();
 const cases=[
  Object.assign(base(),{rules:{...base().rules,'$any':{'.read':true}}}),
  Object.assign(base(),{rules:{...base().rules,'.validate':"newData.exists()"}}),
  Object.assign(base(),{rules:{...base().rules,yokaiRoomsV1:{'.read':true}}})
 ];
 for(const original of cases)assert.throws(()=>previewSharedRules(original,yokai),
  /wildcard|validate|already_present/);
});

test('24C reject missing or overbroad research Rules and missing current files',async()=>{
 const original=base();
 assert.throws(()=>previewSharedRules({},{}),/missing/);
 assert.throws(()=>previewSharedRules(original,{rules:{}}),/missing/);
 assert.throws(()=>previewSharedRules(original,{rules:{
  '.read':true,'.write':false,yokaiRoomsV1:{'$code':{}}
 }}),/yokai_standalone_must_deny/);
});

test('24C CLI helper writes new file without modifying or overwriting Rules',async()=>{
 const work=await mkdtemp(path.join(tmpdir(),'yokai-rules-merge-'));
 const src=path.join(work,'existing.json'),out=path.join(work,'preview.json');
 try{
  const before=JSON.stringify(base(),null,2)+'\n';
  await writeFile(src,before);
  const info=await previewRulesFiles({
   basePath:src,outPath:out,yokaiPath:path.join(repoRoot,'network/emulator/database.rules.json')
  });
  assert.equal(info.ok,true);assert.equal(info.noFirebaseAccess,true);
  assert.equal(info.noDeployment,true);
  assert.equal(await readFile(src,'utf8'),before,'source overwritten');
  assert.deepEqual(Object.keys(JSON.parse(await readFile(out,'utf8')).rules),
   [...Object.keys(base().rules),'yokaiRoomsV1']);
  await assert.rejects(previewRulesFiles({basePath:src,outPath:out,
   yokaiPath:path.join(repoRoot,'network/emulator/database.rules.json')}),/EEXIST/);
  await assert.rejects(previewRulesFiles({basePath:src,outPath:src,
   yokaiPath:path.join(repoRoot,'network/emulator/database.rules.json')}),/refusing_to_overwrite/);
  assert.deepEqual((await readdir(work)).sort(),['existing.json','preview.json']);
 }finally{
  const {rm}=await import('node:fs/promises');
  await rm(work,{recursive:true,force:true});
 }
});
