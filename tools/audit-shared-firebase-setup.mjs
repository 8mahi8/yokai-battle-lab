/**
 * Phase24C4: OFFLINE ONLY readiness audit for a reused Firebase project.
 * It never queries Firebase, deploys rules, changes Auth or stores credentials.
 * Inputs must be current owner-exported settings, not a guessed public URL.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewSharedRules} from './preview-shared-rtdb-rules.mjs';

const EXPECTED_PROJECT='mygame-df915';
const EXPECTED_DATABASE='mygame-df915-default-rtdb';
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const allowedAuth=new Set(['yes','no','unknown']);
const hasText=x=>typeof x==='string'&&x.trim().length>=3;
const checksum=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,16);

export function auditSharedFirebaseSetup({
 webConfig=null,currentRules=null,anonymousEnabled='unknown',yokaiRules=null
}={}){
 if(!allowedAuth.has(anonymousEnabled))throw new TypeError('anonymousEnabled must be yes|no|unknown');
 const issues=[];
 let configOk=false,rulesMergePreviewPossible=false,fingerprint=null;
 if(!isObject(webConfig))issues.push('web_app_config_unavailable');
 else {
  const fields=['apiKey','authDomain','projectId','appId','databaseURL'];
  if(fields.some(k=>!hasText(webConfig[k])))
   issues.push('web_app_config_missing_fields');
  else{
   const projectOk=webConfig.projectId===EXPECTED_PROJECT;
   const authOk=webConfig.authDomain===EXPECTED_PROJECT+'.firebaseapp.com';
   let dbOk=false;
   try{
    const url=new URL(webConfig.databaseURL);
    dbOk=url.protocol==='https:'&&
     (url.hostname===EXPECTED_DATABASE+'.firebaseio.com'||
      url.hostname===EXPECTED_DATABASE+'.firebasedatabase.app')&&
     (url.pathname==='/'||url.pathname==='');
   }catch{}
   if(!projectOk)issues.push('wrong_firebase_project');
   if(!authOk)issues.push('auth_domain_mismatch');
   if(!dbOk)issues.push('unexpected_database_url');
   configOk=projectOk&&authOk&&dbOk;
  }
 }
 if(!isObject(currentRules)||!isObject(currentRules.rules))
  issues.push('current_rules_unavailable');
 else{
  fingerprint=checksum(currentRules);
  if(!isObject(yokaiRules)||!isObject(yokaiRules.rules))
   issues.push('yokai_rules_unavailable');
  else{
   try{
    previewSharedRules(currentRules,yokaiRules);
    rulesMergePreviewPossible=true;
   }catch(error){
    // Never echo arbitrary owner-provided rules, tokens, or paths.
    const safeCodes=new Set([
     'yokai_rules_already_present_review_manually',
     'unsafe_parent_read_grant','unsafe_parent_write_grant',
     'unreviewed_parent_validate_rule',
     'unreviewed_root_wildcard_requires_manual_rules_review',
     'yokai_standalone_must_deny_root_read',
     'yokai_standalone_must_deny_root_write',
     'yokai_rules_missing','current_rules_missing_or_invalid',
     'yokai_rules_file_contains_other_root_paths'
    ]);
    issues.push(safeCodes.has(error.message)?error.message:'manual_rules_review_required');
   }
  }
 }
 if(anonymousEnabled==='unknown')issues.push('anonymous_auth_status_unknown');
 if(anonymousEnabled==='no')issues.push('anonymous_auth_disabled');
 return {
  project:EXPECTED_PROJECT,roomRoot:'yokaiRoomsV1',
  checkedLocally:true,liveFirebaseQueried:false,remoteRulesChanged:false,
  firebaseWebConfigMatches:configOk,rulesMergePreviewPossible,
  anonymousAuthOwnerReported:anonymousEnabled,
  currentRulesFingerprint:fingerprint,
  issues,
  status:issues.length?'blocked':'owner_review_required',
  // Safety review is not a deployment approval or a current-state guarantee.
  safeToDeploy:false,
  next:issues.length?'resolve_issues_then_recheck':'review_merged_rules_in_local_emulator_before_any_deployment'
 };
}

async function main(){
 const argv=process.argv.slice(2);
 if(argv.length!==6||argv[0]!=='--web'||argv[2]!=='--rules'||
    argv[4]!=='--anonymous-enabled'){
  console.error('Usage: node tools/audit-shared-firebase-setup.mjs --web private/mygame.web.json --rules private/current.rules.json --anonymous-enabled yes|no|unknown');
  process.exitCode=2;return;
 }
 const configPath=resolve(argv[1]),rulesPath=resolve(argv[3]),state=argv[5];
 if(!allowedAuth.has(state)){console.error('Invalid anonymous status (yes|no|unknown)');process.exitCode=2;return;}
 try{
  const [webConfig,currentRules,yokaiRules]=await Promise.all([
   readFile(configPath,'utf8').then(JSON.parse),
   readFile(rulesPath,'utf8').then(JSON.parse),
   readFile(resolve('network/emulator/database.rules.json'),'utf8').then(JSON.parse)
  ]);
  const report=auditSharedFirebaseSetup({webConfig,currentRules,yokaiRules,
   anonymousEnabled:state});
  console.log('SHARED-FIREBASE-LOCAL-AUDIT',JSON.stringify(report));
  if(report.status==='blocked')process.exitCode=1;
 }catch(error){
  // Avoid leaking owners' local path or JSON contents in errors.
  console.error('SHARED-FIREBASE-LOCAL-AUDIT-BLOCKED: missing or invalid local input JSON');
  process.exitCode=1;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
