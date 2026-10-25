/**
 * Phase24C: OFFLINE ONLY merge preview for the user's shared mygame-df915 RTDB.
 * It NEVER queries Firebase, deploys Rules, changes Auth or edits the base.
 * Use an exported CURRENT Rules JSON as base, then review the NEW output.
 *
 * Official Firebase behavior: a parent .read or .write grant cannot be
 * tightened at children. Fail closed if the base cannot be proved compatible.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const OWN_ROOT='yokaiRoomsV1';
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function clone(v){return JSON.parse(JSON.stringify(v));}
function alwaysDeny(v){return v===false||v==='false'||v==='(false)';}
function harmlessValidation(v){return v===true||v==='true'||v==='(true)';}

export function previewSharedRules(existing,yokaiStandalone){
 if(!isObject(existing)||!isObject(existing.rules))
  throw Error('current_rules_missing_or_invalid');
 if(!isObject(yokaiStandalone)||!isObject(yokaiStandalone.rules)||
    !isObject(yokaiStandalone.rules[OWN_ROOT]))
  throw Error('yokai_rules_missing');
 const source=existing.rules,addon=yokaiStandalone.rules;
 if(own(source,OWN_ROOT))
  throw Error('yokai_rules_already_present_review_manually');
 if(Object.keys(addon).some(k=>k!==OWN_ROOT&&!k.startsWith('.')))
  throw Error('yokai_rules_file_contains_other_root_paths');
 // Firebase .read/.write propagate downwards. ANY possible parent grant
 // defeats our UID/seat .write and auth .read beneath /yokaiRoomsV1.
 for(const type of ['.read','.write']){
  if(own(source,type)&&!alwaysDeny(source[type]))
   throw Error('unsafe_parent_'+type.substring(1)+'_grant');
 }
 // Validation expressions at the parent may constrain all child writes.
 if(own(source,'.validate')&&!harmlessValidation(source['.validate']))
  throw Error('unreviewed_parent_validate_rule');
 // A root wildcard might overlap /yokaiRoomsV1. Its precedence with
 // literal child rules should not be assumed in a static safety gate.
 if(Object.keys(source).some(k=>k.startsWith('$')))
  throw Error('unreviewed_root_wildcard_requires_manual_rules_review');
 for(const k of ['.read','.write']){
  if(!alwaysDeny(addon[k]))
   throw Error('yokai_standalone_must_deny_root_'+k.substring(1));
 }
 const out=clone(existing);
 out.rules[OWN_ROOT]=clone(addon[OWN_ROOT]);
 // Preserve exactly EVERY existing root key (and its nested rules).
 for(const [k,v] of Object.entries(source)){
  if(JSON.stringify(out.rules[k])!==JSON.stringify(v))
   throw Error('unexpected_change_to_existing_path_'+k);
 }
 return out;
}

export async function previewRulesFiles({basePath,outPath,
 yokaiPath='network/emulator/database.rules.json'}={}){
 if(!basePath||!outPath)throw Error('Usage: --base CURRENT_RULES.json --out NEW_PREVIEW.json');
 const base=resolve(basePath),dest=resolve(outPath),yokai=resolve(yokaiPath);
 if(base===dest||dest===yokai)
  throw Error('refusing_to_overwrite_input_or_research_rules');
 const [existing,specific]=await Promise.all([
  readFile(base,'utf8').then(JSON.parse),
  readFile(yokai,'utf8').then(JSON.parse)
 ]);
 const result=previewSharedRules(existing,specific);
 // wx refuses to overwrite an earlier review file.
 await writeFile(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return {ok:true,output:dest,preservedRootKeys:Object.keys(existing.rules),
  addedRoot:OWN_ROOT,noFirebaseAccess:true,noDeployment:true};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==4||args[0]!=='--base'||args[2]!=='--out'){
  console.error('Usage: node tools/preview-shared-rtdb-rules.mjs --base exported-current.rules.json --out merged-review.rules.json');
  process.exitCode=2;
 }else{
  try{
   const result=await previewRulesFiles({basePath:args[1],outPath:args[3]});
   console.log('SHARED-RTDB-RULES-PREVIEW-PASS',JSON.stringify(result));
   console.log('Review ONLY; NEVER upload it as a replacement without independent owner approval and emulator tests.');
  }catch(e){console.error('SHARED-RTDB-RULES-PREVIEW-REFUSED:',e.message);process.exitCode=1;}
 }
}
