/** Validate all three builder safety gates without contacting a cloud DB. */
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'phase24-online-config-qa-'));
try{
 const name=join(dir,'fake-public-config.json');
 const run=()=>spawnSync(process.execPath,['tools/build-sites-online.mjs','--config',name],
  {encoding:'utf8',env:{...process.env,YW_CLOUD_BUILD_APPROVED:'0'}});
 writeFileSync(name,JSON.stringify({
  apiKey:'TEST_FAKE_PUBLIC_WEB_KEY',authDomain:'yokai-qa-fake-00.firebaseapp.com',
  projectId:'yokai-qa-fake-00',appId:'1:222222:web:abcdef',
  databaseURL:'https://yokai-qa-fake-00-default-rtdb.firebaseio.com'
 }));
 const denied=run();
 assert.notEqual(denied.status,0,'cloud build must reject missing explicit approval');
 assert.match(denied.stderr,/explicitly approved/);
 const accepted=spawnSync(process.execPath,['tools/build-sites-online.mjs','--config',name],
  {encoding:'utf8',env:{...process.env,YW_CLOUD_BUILD_APPROVED:'1'}});
 assert.equal(accepted.status,0,accepted.stderr);
 assert.match(accepted.stdout,/cloud-configured-not-deployed/);
 const html=readFileSync('dist/sites-online-cloud-code.html','utf8');
 assert.match(html,/yokai-qa-fake-00/);
 assert.match(html,/firebase-auth-compat\.js/);
 assert.doesNotMatch(html,/demo-yokai-lab|127\.0\.0\.1:9000|127\.0\.0\.1:9099/);
 writeFileSync(name,JSON.stringify({
  apiKey:'TEST_FAKE_PUBLIC_WEB_KEY',authDomain:'foreign.firebaseapp.com',
  projectId:'yokai-qa-fake-00',appId:'1:222222:web:abcdef',
  databaseURL:'http://localhost:9000'
 }));
 const invalid=spawnSync(process.execPath,['tools/build-sites-online.mjs','--config',name],
  {encoding:'utf8',env:{...process.env,YW_CLOUD_BUILD_APPROVED:'1'}});
 assert.notEqual(invalid.status,0,'malformed/Auth-mismatched URL must be rejected');
 console.log('SITES-ONLINE-CLOUD-GATE-PASS: unapproved blocked, mismatch blocked, fake config build only (no network calls)');
}finally{rmSync(dir,{recursive:true,force:true});}
