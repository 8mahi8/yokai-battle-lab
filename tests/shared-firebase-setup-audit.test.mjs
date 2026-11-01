import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {auditSharedFirebaseSetup} from '../tools/audit-shared-firebase-setup.mjs';

const web=()=>({
 apiKey:'FAKE_TEST_KEY_NEVER_REAL',authDomain:'mygame-df915.firebaseapp.com',
 projectId:'mygame-df915',databaseURL:'https://mygame-df915-default-rtdb.firebaseio.com/',
 appId:'1:000000:web:FAKE_TEST_ONLY'
});
const prior=()=>({rules:{'.read':false,'.write':false,
 brawlRooms:{'.read':true,'.write':true},
 shokokuRooms1v1:{'$code':{'.read':true,'.write':true}}
}});
const own=()=>({rules:{'.read':false,'.write':false,
 yokaiRoomsV1:{'$code':{'.read':'auth !== null','.write':'auth !== null'}}}});
const run=(opts={})=>auditSharedFirebaseSetup({
 webConfig:web(),currentRules:prior(),yokaiRules:own(),
 anonymousEnabled:'yes',...opts
});

test('24C4 matching existing Firebase project and safe legacy Rules require review, never auto deploy',()=>{
 const r=run();
 assert.equal(r.status,'owner_review_required');
 assert.deepEqual(r.issues,[]);
 assert.equal(r.project,'mygame-df915');
 assert.equal(r.firebaseWebConfigMatches,true);
 assert.equal(r.rulesMergePreviewPossible,true);
 assert.equal(r.safeToDeploy,false);
 assert.equal(r.liveFirebaseQueried,false);
 assert.equal(r.currentRulesFingerprint.length,16);
});
test('24C4 deny guessed Auth status, wrong project or host',()=>{
 assert.deepEqual(run({anonymousEnabled:'unknown'}).issues,['anonymous_auth_status_unknown']);
 assert.deepEqual(run({anonymousEnabled:'no'}).issues,['anonymous_auth_disabled']);
 const wrong=web();wrong.projectId='foreign-project';
 assert.deepEqual(run({webConfig:wrong}).issues,['wrong_firebase_project']);
 const malformed=web();malformed.databaseURL='http://localhost:9000';
 assert.deepEqual(run({webConfig:malformed}).issues,['unexpected_database_url']);
});
test('24C4 reject parent broad access, preserve safe issue code only',()=>{
 const inherited=prior();inherited.rules['.read']='auth !== null';
 const r=run({currentRules:inherited});
 assert.equal(r.status,'blocked');
 assert.deepEqual(r.issues,['unsafe_parent_read_grant']);
 assert.equal(r.rulesMergePreviewPossible,false);
 assert.equal(r.safeToDeploy,false);
});
test('24C4 reject existing Yokai root or wildcard; never overwrite existing deployment',()=>{
 const occupied=prior();occupied.rules.yokaiRoomsV1={'.read':true};
 assert.deepEqual(run({currentRules:occupied}).issues,
  ['yokai_rules_already_present_review_manually']);
 const wildcard=prior();wildcard.rules['$any']={'.write':true};
 assert.deepEqual(run({currentRules:wildcard}).issues,
  ['unreviewed_root_wildcard_requires_manual_rules_review']);
});
test('24C4 absent or invalid owner-exported inputs never claim ready',()=>{
 const report=run({webConfig:null,currentRules:null});
 assert.deepEqual(report.issues,['web_app_config_unavailable',
  'current_rules_unavailable']);
 assert.equal(report.currentRulesFingerprint,null);
 assert.equal(report.status,'blocked');
});
test('24C4 audit summary never reveals apiKey, appId or Rule expressions',()=>{
 const config=web(),rules=prior();
 config.apiKey='SECRET_SENTINEL_NEVER_PRINT';
 rules.rules.brawlRooms['.write']='OWNER_RULE_SENTINEL';
 const r=run({webConfig:config,currentRules:rules});
 const s=JSON.stringify(r);
 assert.ok(!s.includes('SECRET_SENTINEL'));
 assert.ok(!s.includes('OWNER_RULE_SENTINEL'));
 assert.ok(!s.includes(config.appId));
 assert.ok(!s.includes(config.databaseURL));
});
test('24C4 CLI reads local private JSON and emits redacted report without uploads',()=>{
 const dir=mkdtempSync(join(tmpdir(),'yw-firebase-check-'));
 const webFile=join(dir,'web.json'),rulesFile=join(dir,'rules.json');
 try{
  writeFileSync(webFile,JSON.stringify(web()));
  writeFileSync(rulesFile,JSON.stringify(prior()));
  const cli=spawnSync(process.execPath,['tools/audit-shared-firebase-setup.mjs',
   '--web',webFile,'--rules',rulesFile,'--anonymous-enabled','yes'],
   {encoding:'utf8'});
  assert.equal(cli.status,0,cli.stderr);
  assert.match(cli.stdout,/SHARED-FIREBASE-LOCAL-AUDIT/);
  assert.match(cli.stdout,/owner_review_required/);
  assert.doesNotMatch(cli.stdout,/FAKE_TEST_KEY|brawlRooms|\.read/);
  assert.equal(readFileSync(webFile,'utf8'),JSON.stringify(web()));
  assert.equal(readFileSync(rulesFile,'utf8'),JSON.stringify(prior()));
  const absent=spawnSync(process.execPath,['tools/audit-shared-firebase-setup.mjs',
   '--web',join(dir,'missing.json'),'--rules',rulesFile,'--anonymous-enabled','unknown'],
   {encoding:'utf8'});
  assert.notEqual(absent.status,0);
  assert.doesNotMatch(absent.stderr,/\/tmp\/|\.json/,'error output must not expose a private local file path');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
